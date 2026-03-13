const { sendResponse, errorResponse } = require("../utils/response");
const Candidate = require("../models/candidate-model");
const SuspiciousActivity = require("../models/suspicious-activity-capturing-model");
const PracticalFilesModel=require("../models/practical-file-model");
const BatchModel = require("../models/batch-model")
const {
  uploadFile,
  getFileUrl,
  getProctorFileUrl,
  uploadProctoringFile,
  uploadedTheoryFiles,
  uploadCandidateActivityFile
} = require("../utils/s3bucketSuspicious");
const Batch = require("../models/batch-model");
const sharp = require('sharp');

const { RekognitionClient, IndexFacesCommand  } = require('@aws-sdk/client-rekognition');
const { fromBase64 } = require('@aws-sdk/util-base64');
const archiver = require('archiver');
const fsa = require('fs');
const axios = require('axios');
const fs = require('fs');

const {
  AWS_ACCESS_KEY_ID,
  AWS_ACCESS_KEY_SECRET,
  AWS_REGION,
} = require("../utils/envHelper");

const rekognitionClient = new RekognitionClient({

  credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_ACCESS_KEY_SECRET,
  },

  region:AWS_REGION, 
});

// function to check and validate through amazon face AI
const checkImage = async (req) => { 
    try {
      let imageSaveResponse

      // Convert webp image to JPEG format
      const jpegBuffer = await sharp(req.file.buffer)
          .toFormat('jpeg')
          .toBuffer();

      const customImageId = req.file.originalname.split('.')[0].replace(/\s/g, '')
      imageSaveResponse =  await rekognitionClient.send(new IndexFacesCommand({
        CollectionId: "thirdCollection",
        DetectionAttributes: ['ALL'],
        ExternalImageId: customImageId,
        Image: {
            Bytes: fromBase64(jpegBuffer.toString('base64')),
        },
      }));

      if(imageSaveResponse.$metadata.httpStatusCode === 200){


        const faceLength = imageSaveResponse.FaceRecords.length
        return { status: true , isValid: faceLength===1 ? true:false, faces: faceLength,  data: imageSaveResponse }
      }
      else{ 
        return { status: false , isValid: false, faces: 0 }
      }


  } catch (error) {
       return { status: false , isValid: false, faces: 0, error: error.message }
  }
}


exports.uploadImage = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return;
    }
    const suspiciousActivity = await SuspiciousActivity.findOne({
      candidateId: candidateId,
    });

    if(!req.file){
      return errorResponse(res, 400, "Image not provided", "Image not provided")
    }

    let suspiciousAttempts
    let isMultiFace = false
    const imageChecked = await checkImage(req);

    const batch = await BatchModel.findOne({_id: candidate.batchId})
    if(!batch) return errorResponse(res, 400, "no batch details found...")

    if(imageChecked.status && !imageChecked.isValid){
        
        if(batch?.proctoring?.browserExit?.browserExitAlert){
          const updatedCount = await Candidate.findOneAndUpdate({_id: candidateId}, { $inc : { suspiciousActivity: 1 } }, {new:true})

        if(updatedCount){
          suspiciousAttempts = parseInt(batch?.proctoring?.browserExit?.noOfBrowserExit) -  parseInt(updatedCount.suspiciousActivity)
          if(parseInt(batch?.proctoring?.browserExit?.noOfBrowserExit) < parseInt(updatedCount.suspiciousActivity)){
            const res = await Candidate.findOneAndUpdate({_id: candidateId}, { $set : { status: false } })
        
          }
          
        } 

        isMultiFace = true
      }
      
    }
    else{ 
      suspiciousAttempts = batch?.proctoring?.browserExit?.noOfBrowserExit -  candidate.suspiciousActivity
    }

    const fileData = await uploadCandidateActivityFile(req, candidate.candidateId, batch.batchId);
    if (fileData.statusCode !== 200) {
      return;
    }
    if (suspiciousActivity) {
      await SuspiciousActivity.updateOne(
        { candidateId: candidateId },
        { $push: { suspiciousImageIds: fileData.key } }
      );
    }
    if (!suspiciousActivity) {
      const newSuspiciousActivity = new SuspiciousActivity({
        candidateId: candidateId,
        suspiciousImageIds: [fileData.key],
        suspiciousVideoIds: [],
      });
      await newSuspiciousActivity.save();
    }

    return sendResponse(res, 200, "File uploaded successfully", {suspiciousActivityLeft : suspiciousAttempts,isMultiFace: isMultiFace, fileData: fileData});
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, error.message);
  }
};

exports.getSuspiciousImageByCandidateId = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const {section}=req.query;
    const fileUrls = await SuspiciousActivity.findOne({
      candidateId: candidateId,
    });
    const candidateDetails = await Candidate.findById(candidateId);
    // console.log('candidateDetails',candidateDetails)
    const batchDetails = await Batch.findById(candidateDetails?.batchId);
    if(batchDetails && section=='viva'||section=='practical'){
        let conSection=(section=='viva')?true:false
        console.log('condition Section',conSection)
      const updatedFile = await PracticalFilesModel.find({
        $and: [{ batch_id:batchDetails._id }, { candidate_id:candidateId },{isViva:conSection},{isVideo:false}],
      });
      console.log('updatedFiles',updatedFile)
      const filesUrl = await Promise.all(
        updatedFile.map(async (item) => {
          let { fileKey: key, _id, fileKey, isViva, isVideo } = item;
          if (key) {
            const url = await getFileUrl({ key });
  
            return { url, _id, fileKey, isViva, isVideo };
          } else {
            return { error: "not found" };
          }
        })
      );
      let objCandidate= {
        candidateName: candidateDetails.name,
        examDuration: batchDetails?.questionPaper?.sectionTable.filter(
          (item) => item.sectionName === section
        )[0]?.examDuration
      }
      return sendResponse(res,200,'Image Urls',{...objCandidate,imageUrls:[...filesUrl]})
    }
    if (!fileUrls) {
      return sendResponse(res, 200, "No images found", {
        candidateName: candidateDetails.name,
        examDuration: batchDetails?.questionPaper?.sectionTable.filter(
          (item) => item.sectionName === "theory"
        )[0]?.examDuration,
        imageUrls: [],
      });
    }
    const hasImages = fileUrls.suspiciousImageIds.length > 0;
    if (!hasImages) {
      return sendResponse(res, 200, "No images found", {
        candidateName: candidateDetails.name,
        examDuration: batchDetails?.questionPaper?.sectionTable.filter(
          (item) => item.sectionName === "theory"
        )[0]?.examDuration,
        imageUrls: [],
      });
    }

    const imageUrls = await Promise.all(
      fileUrls.suspiciousImageIds.map((imageKey) => {
        const isNewFormat = imageKey.includes("/") || imageKey.startsWith("202");
        const finalKey = isNewFormat ? imageKey : `${candidateId}_${imageKey}`;
        return getProctorFileUrl(finalKey);
      })
    );

    return sendResponse(res, 200, "File fetched successfully", {
      candidateName: candidateDetails.name,
      examDuration: batchDetails?.questionPaper?.sectionTable.filter(
        (item) => item.sectionName === "theory"
      )[0]?.examDuration,
      imageUrls: imageUrls,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, error.message);
  }
};

// exports.uploadVideo = async (req, res) => {
//   try {
//     const fileData = await uploadFile(req);

//     return sendResponse(res, 200, "Video uploaded successfully", fileData);
//   } catch (error) {
//     console.error(error);
//     return errorResponse(res, 500, error.message);
//   }
// };

// exports.getSuspiciousVideo = async (req, res) => {
//   try {
//     const key = req.params.videoKey;
//     const url = await getProctorFileUrl(key);
//     return sendResponse(res, 200, "Video fetched successfully", url);
//   } catch (error) {
//     console.error(error);
//     return errorResponse(res, 500, error.message);
//   }
// };

exports.uploadVideo = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const candidate = await Candidate.findById(candidateId).populate("batchId");
    if (!candidate || !candidate?.batchId || !candidate?.batchId?.batchId) {
      return;
    }
    const suspiciousActivity = await SuspiciousActivity.findOne({
      candidateId: candidateId,
    });
    const fileData = await uploadCandidateActivityFile(req, candidate.candidateId, candidate.batchId.batchId);
    if (fileData.statusCode !== 200) {
      return;
    }

    if (suspiciousActivity) {
      await SuspiciousActivity.updateOne(
        { candidateId: candidateId },
        { $push: { suspiciousVideoIds: fileData.key } }
      );
    } else {
      const newSuspiciousActivity = new SuspiciousActivity({
        candidateId: candidateId,
        suspiciousImageIds: [],
        suspiciousVideoIds: [fileData.key],
      });
      await newSuspiciousActivity.save();
    }

    return sendResponse(res, 200, "Video uploaded successfully", fileData);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, error.message);
  }
};

exports.getSuspiciousVideoByCandidateId = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const {section}=req.query;
    const fileUrls = await SuspiciousActivity.findOne({
      candidateId: req.params.candidateId,
    });
    const candidateDetails = await Candidate.findById(candidateId);
    const batchDetails = await Batch.findById(candidateDetails.batchId);
    if(batchDetails && section=='viva'||section=='practical'){
      let conSection=(section=='viva')?true:false;
    const updatedFile = await PracticalFilesModel.find({
      $and: [{ batch_id:batchDetails._id }, { candidate_id:candidateId },{isViva:conSection},{isVideo:true}],
    });
      const filesUrl = await Promise.all(
        updatedFile.map(async (item) => {
          let { fileKey: key, _id, fileKey, isViva, isVideo } = item;
          if (key) {
            const url = await getFileUrl({ key });
  
            return { url, _id, fileKey, isViva, isVideo };
          } else {
            return { error: "not found" };
          }
        })
      );
   let objCandidate= {
        candidateName: candidateDetails.name,
        examDuration: batchDetails?.questionPaper?.sectionTable.filter(
          (item) => item.sectionName === section
        )[0]?.examDuration
      }
      return sendResponse(res,200,'Video Urls',{...objCandidate,videoUrls:[...filesUrl]})
    }
    if (!fileUrls) {
      return sendResponse(res, 200, "No videos found", {
        candidateName: candidateDetails.name,
        examDuration: batchDetails?.questionPaper?.sectionTable.filter(
          (item) => item.sectionName === "theory"
        )[0]?.examDuration,
        videoUrls: [],
      });
    }
    const hasVideos = fileUrls.suspiciousVideoIds.length > 0;
    if (!hasVideos) {
      return sendResponse(res, 200, "No videos found", {
        candidateName: candidateDetails.name,
        examDuration: batchDetails?.questionPaper?.sectionTable.filter(
          (item) => item.sectionName === "theory"
        )[0]?.examDuration,
        videoUrls: [],
      });
    }

    const videoUrls = await Promise.all(
      fileUrls.suspiciousVideoIds.map((videoKey) => {
        const isNewFormat = videoKey.includes("/") || videoKey.startsWith("202");
        const finalKey = isNewFormat ? videoKey : `${candidateId}_${videoKey}`;
        return getProctorFileUrl(finalKey);
      })
    );

    return sendResponse(res, 200, "Video fetched successfully", {
      candidateName: candidateDetails.name,
      examDuration: batchDetails?.questionPaper?.sectionTable.filter(
        (item) => item.sectionName === "theory"
      )[0]?.examDuration,
    videoUrls: videoUrls,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, error.message);
  }
};


//--->Proctoring logs upload and download file functionality<----
exports.uploadPracticalImage = async (req, res) => {
  try {
    const { candidateId, batchId } = req.params;

    // Check if the candidate exists
    const candidate = await Candidate.findById(candidateId);

    if (!candidate) {
      return errorResponse(res, 400, "Candidate not found");
    }

    // Handle multiple file uploads
    const fileDataArray = await uploadProctoringFile(req.files, candidateId); // Assuming this handles multiple files

    if (!fileDataArray || fileDataArray.length === 0) {
      return errorResponse(res, 500, "File upload failed");
    }

    const savedFiles = [];

    // Iterate through the uploaded file data and save each file's details
    for (const fileData of fileDataArray.uploadedFiles) {
      const practicalFile = new PracticalFilesModel({
        fileKey: fileData.key,
        isViva: false,
        isVideo: false,
        batch_id: batchId,
        candidate_id: candidateId
      });

      const savedFile = await practicalFile.save();
      savedFiles.push(savedFile);
    }

    return sendResponse(res, 200, "Practical files uploaded successfully", { uploadedFiles: savedFiles });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, error.message);
  }
};


exports.uploadPracticalVideo = async (req, res) => {
  try {
    const { candidateId, batchId } = req.params;

    // Check if the candidate exists
    const candidate = await Candidate.findById(candidateId);

    if (!candidate) {
      return errorResponse(res, 400, "Candidate not found");
    }

    // Handle multiple file uploads
    const fileDataArray = await uploadProctoringFile(req.files, candidateId); // Assuming this handles multiple files

    if (!fileDataArray || fileDataArray.length === 0) {
      return errorResponse(res, 500, "File upload failed");
    }

    const savedFiles = [];

    // Iterate through the uploaded file data and save each file's details
    for (const fileData of fileDataArray.uploadedFiles) {
      const practicalFile = new PracticalFilesModel({
        fileKey: fileData.key,
        isViva: false,
        isVideo: true,
        batch_id: batchId,
        candidate_id: candidateId
      });

      const savedFile = await practicalFile.save();
      savedFiles.push(savedFile);
    }
    return sendResponse(res, 200, "Practical files uploaded successfully", { uploadedFiles: savedFiles });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, error.message);
  }
};


exports.uploadVivaImage = async (req, res) => {
  try {

    const { candidateId, batchId } = req.params;
    // Check if the candidate exists
    const candidate = await Candidate.findById(candidateId);


    if (!candidate) {
      return errorResponse(res, 400, "Candidate not found");
    }

    // Handle multiple file uploads
    const fileDataArray = await uploadProctoringFile(req.files, candidateId); // Assuming this handles multiple files

    if (!fileDataArray || fileDataArray.length === 0) {
      return errorResponse(res, 500, "File upload failed");
    }

    const savedFiles = [];

    // Iterate through the uploaded file data and save each file's details
    for (const fileData of fileDataArray.uploadedFiles) {
      const vivaFile = new PracticalFilesModel({
        fileKey: fileData.key,
        isViva: true,
        isVideo: false,
        batch_id: batchId,
        candidate_id: candidateId
      });

      const savedFile = await vivaFile.save();
      savedFiles.push(savedFile);
    }
    return sendResponse(res, 200, "Viva files uploaded successfully", { uploadedFiles: savedFiles });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, error.message);
  }
};

exports.uploadVivaVideo = async (req, res) => {
  try {

    const { candidateId, batchId } = req.params;

    // Check if the candidate exists
    const candidate = await Candidate.findById(candidateId);

    if (!candidate) {
      return errorResponse(res, 400, "Candidate not found");
    }

    const fileDataArray = await uploadProctoringFile(req.files, candidateId); // Assuming this handles multiple files

    if (!fileDataArray || fileDataArray.length === 0) {
      return errorResponse(res, 500, "File upload failed");
    }

    const savedFiles = [];

    // Iterate through the uploaded file data and save each file's details
    for (const fileData of fileDataArray.uploadedFiles) {
      const vivaFile = new PracticalFilesModel({
        fileKey: fileData.key,
        isViva: true,
        isVideo: true,
        batch_id: batchId,
        candidate_id: candidateId
      });

      const savedFile = await vivaFile.save();
      savedFiles.push(savedFile);
    }
    return sendResponse(res, 200, "Viva files uploaded successfully", { uploadedFiles: savedFiles });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, error.message);
  }
};

module.exports.createZipForCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;

    const candidateDetails = await Candidate.findById(candidateId);
    if (!candidateDetails) {
      return errorResponse(res, 400, "Candidate not found", "Candidate not found");
    }

    const batchDetails = await Batch.findById(candidateDetails.batchId);
    if (!batchDetails) {
      return errorResponse(res, 400, "Batch not found", "Batch not found");
    }

    const s3Urls = [];

    // Fetch and organize theory files
    const theoryFiles = await SuspiciousActivity.findOne({ candidateId });
    if (theoryFiles && theoryFiles.suspiciousImageIds.length > 0) {
      for (const imageKey of theoryFiles.suspiciousImageIds) {
        const url = await getProctorFileUrl(`${candidateId}_${imageKey}`);
        s3Urls.push({
          url,
          extension: 'jpg',
          fileName: `theoryphoto/suspicious_image_${imageKey}` // Store in "theoryphoto" folder
        });
      }
    }

    if (theoryFiles && theoryFiles.suspiciousVideoIds.length > 0) {
      for (const videoKey of theoryFiles.suspiciousVideoIds) {
        const url = await getProctorFileUrl(`${candidateId}_${videoKey}`);
        s3Urls.push({
          url,
          extension: 'mp4',
          fileName: `theoryvideo/suspicious_video_${videoKey}` 
        });
      }
    }

    // Fetch and organize viva files (both images and videos)
    const vivaFiles = await PracticalFilesModel.find({
      $and: [
        { batch_id: batchDetails._id },
        { candidate_id: candidateId },
        { isViva: true },
      ]
    });

    for (const file of vivaFiles) {
      const urlData = await getFileUrl({ key: file.fileKey });

      if (file.isVideo) {
        s3Urls.push({
          url: urlData,
          extension: 'mp4',
          fileName: `vivavideo/candidate_${file._id}_video`
        });
      } else {
        const extension = 'jpg';
        s3Urls.push({
          url: urlData,
          extension: extension,
          fileName: `vivaphoto/candidate_${file._id}_image`
        });
      }
    }

    // Fetch and organize practical files (both images and videos)
    const practicalFiles = await PracticalFilesModel.find({
      $and: [
        { batch_id: batchDetails._id },
        { candidate_id: candidateId },
        { isViva: false },
      ]
    });

    for (const file of practicalFiles) {
      const urlData = await getFileUrl({ key: file.fileKey });
      if (file.isVideo) {
        s3Urls.push({
          url: urlData,
          extension: 'mp4',
          fileName: `practicalvideo/candidate_${file._id}_video`
        });
      } else {
        const extension = 'jpg';
        s3Urls.push({
          url: urlData,
          extension: extension,
          fileName: `practicalphoto/candidate_${file._id}_image`
        });
      }
    }

    if (s3Urls.length === 0) {
      return errorResponse(res, 404, "No files found", "No files found");
    }

    // Create ZIP
    const archive = archiver('zip', { zlib: { level: 9 } });
    const zipFileName = `Candidate_${candidateDetails.name}.zip`;
    const output = fsa.createWriteStream(zipFileName);

    output.on('close', () => {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${zipFileName}`);
      const fileStream = fsa.createReadStream(zipFileName);
      fileStream.pipe(res);
    
      //ensure the file is fully sent before deleting
      res.on('close', () => {
        fs.unlink(zipFileName, (err) => {
          if (err) {
            console.log('Error deleting ZIP file:', err);
          } else {
            console.log('ZIP file deleted successfully.');
          }
        });
      });
  })

    archive.on('error', (err) => {
      console.log('Error creating archive:', err);
      return errorResponse(res, 500, 'Error creating ZIP archive', err.message);
    });

    archive.pipe(output);

    const fileNamesCount = {};
    const downloadPromises = s3Urls.map(async (item) => {

      // Determine the URL based on whether item.url is an object or a string
      const url = typeof item.url === 'object' && item.url.url ? item.url.url : item.url;

      if (!url) {
        //console.log(`URL is undefined for file: ${item.fileName}`);
        return null;
      }

      const baseFileName = item.fileName;
      let extension = item.extension || 'unknown'; // Use 'unknown' if not present

      if (!fileNamesCount[baseFileName]) {
        fileNamesCount[baseFileName] = 1;
      } else {
        fileNamesCount[baseFileName]++;
      }

      const count = fileNamesCount[baseFileName];
      const fileName = `${baseFileName}_${count}.${extension}`;

      const response = await axios.get(url, { responseType: 'stream' });
      archive.append(response.data, { name: fileName });
    });

    await Promise.all(downloadPromises);
    await archive.finalize();

  } catch (error) {
    return errorResponse(res, 500, 'Something went wrong', error.message);
  }
};

module.exports.createZipForBatch = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Fetch all candidates by batchId
    const candidateList = await Candidate.find({ batchId }).populate({ path: 'batchId', select: '' });
    if (candidateList.length === 0) {
      return errorResponse(res, 404, 'No candidates found', 'No candidates found for the given batchId');
    }

    const s3Urls = [];

    // Loop through all candidates and fetch their files
    for (const candidate of candidateList) {
      const { _id, name } = candidate;


      const theoryFiles = await SuspiciousActivity.findOne({ candidateId: _id });
      if (theoryFiles) {
        if (theoryFiles.suspiciousImageIds.length > 0) {
          for (const imageKey of theoryFiles.suspiciousImageIds) {
            const url = await getProctorFileUrl(`${_id}_${imageKey}`);
            s3Urls.push({
              url,
              extension: 'jpg',
              fileName: `${name}/theoryphoto/suspicious_image_${imageKey}`
            });
          }
        }

        if (theoryFiles.suspiciousVideoIds.length > 0) {
          for (const videoKey of theoryFiles.suspiciousVideoIds) {
            const url = await getProctorFileUrl(`${_id}_${videoKey}`);
            s3Urls.push({
              url,
              extension: 'mp4',
              fileName: `${name}/theoryvideo/suspicious_video_${videoKey}`
            });
          }
        }
      }

      // Fetch and organize viva files
      const vivaFiles = await PracticalFilesModel.find({
        batch_id: batchId,
        candidate_id: _id,
        isViva: true,
      });

      for (const file of vivaFiles) {
        const urlData = await getFileUrl({ key: file.fileKey }); // Assuming getFileUrl returns a single object
        const url = typeof urlData === 'object' && urlData.url ? urlData.url : urlData;
        if (!url) {
          //console.log(`URL is undefined for file: ${file._id}`);
          continue;
        }

        if (file.isVideo) {
          s3Urls.push({
            url,
            extension: 'mp4',
            fileName: `${name}/vivavideo/candidate_${file._id}_video`
          });
        } else {
          s3Urls.push({
            url,
            extension: urlData.extension ? urlData.extension.toLowerCase() : 'jpg',
            fileName: `${name}/vivaphoto/candidate_${file._id}_image`
          });
        }
      }

      // Fetch and organize practical files
      const practicalFiles = await PracticalFilesModel.find({
        batch_id: batchId,
        candidate_id: _id,
        isViva: false,
      });

      for (const file of practicalFiles) {
        const urlData = await getFileUrl({ key: file.fileKey });
        const url = typeof urlData === 'object' && urlData.url ? urlData.url : urlData;

        if (!url) {
          //console.log(`URL is undefined for file: ${file._id}`);
          continue;
        }

        if (file.isVideo) {
          s3Urls.push({
            url,
            extension: 'mp4',
            fileName: `${name}/practicalvideo/candidate_${file._id}_video`
          });
        } else {
          s3Urls.push({
            url,
            extension: urlData.extension ? urlData.extension.toLowerCase() : 'jpg',
            fileName: `${name}/practicalphoto/candidate_${file._id}_image`
          });
        }
      }
    }

    if (s3Urls.length === 0) {
      return errorResponse(res, 404, 'No files found', 'No files found for the candidates');
    }

    // Create ZIP
    const archive = archiver('zip', { zlib: { level: 9 } });
    const zipFileName = `${candidateList[0]?.batchId?.batchId}_.zip`;
    const output = fs.createWriteStream(zipFileName);

    output.on('close', () => {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${zipFileName}`);
      const fileStream = fs.createReadStream(zipFileName);
      fileStream.pipe(res);
      
      //ensure the file is fully sent before deleting
      res.on('close', () => {
        fs.unlink(zipFileName, (err) => {
          if (err) {
            console.log('Error deleting ZIP file:', err);
          } else {
            console.log('ZIP file deleted successfully.');
          }
        });
      });
    });
   
    archive.on('error', (err) => {
      console.log('Error creating archive:', err);
      return errorResponse(res, 500, 'Error creating ZIP archive', err.message);
    });

    archive.pipe(output);

    // Append files to the archive
    const fileNamesCount = {};
    const downloadPromises = s3Urls.map(async (item) => {

      const url = typeof item.url === 'object' && item.url.url ? item.url.url : item.url;

      if (!url) {
        //console.log(`URL is undefined for file: ${item.fileName}`);
        return null;
      }
      const baseFileName = item.fileName;
      const extension = item.extension;

      if (!fileNamesCount[baseFileName]) {
        fileNamesCount[baseFileName] = 1;
      } else {
        fileNamesCount[baseFileName]++;
      }

      const count = fileNamesCount[baseFileName];
      const fileName = `${baseFileName}_${count}.${extension}`;
  
      const response = await axios.get(url, { responseType: 'stream' });
    
      archive.append(response.data, { name: fileName });
    });

    await Promise.all(downloadPromises);
    await archive.finalize();

  } catch (error) {

    return errorResponse(res, 500, 'Something went wrong', error.message);
  }
};


//upload offline theory file 
exports.uploadTheoryFile = async (req, res) => {
  try {
    const { candidateId} = req.params;

    // Check if the candidate exists
    const candidate = await Candidate.findById(candidateId).populate({ path: 'batchId', select: 'batchMode' });
    if (!candidate) {
      return errorResponse(res, 400, "Candidate not found", "Candidate not found");
    }

    // Check if candidate's batchMode is offline
    if (candidate?.batchId?.batchMode !== "offline") {
      return errorResponse(res, 400, "Files can only be uploaded in offline batch mode", "Files can only be uploaded in offline batch mode");
    }

    // Handle multiple file uploads for theory
    const fileDataArray = await uploadedTheoryFiles(req, candidateId);
    if (!fileDataArray || fileDataArray.length === 0) {
      return errorResponse(res, 400, "File upload failed", "File upload failed");
    }

    // Check if a SuspiciousActivity document exists for the candidate
    let suspiciousActivity = await SuspiciousActivity.findOne({ candidateId });

    // If not, create a new document
    if (!suspiciousActivity) {
      suspiciousActivity = new SuspiciousActivity({
        candidateId,
        suspiciousImageIds: [],
        suspiciousVideoIds: []
      });
    }

    // Add each fileData key to the appropriate array in suspiciousActivity
    for (const fileData of fileDataArray.uploadedTheoryFiles) {
      if (fileData) {
        suspiciousActivity.suspiciousImageIds.push(fileData.Key);
      } 
    }

    // Save the updated document
    const savedFile = await suspiciousActivity.save();

    return sendResponse(res, 200, "Theory files uploaded successfully", { uploadedFiles: savedFile });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Something went wrong', error.message);
  }
};

exports.uploadTheoryVideoFile = async (req, res) => {
  try {
    const { candidateId} = req.params;

    // Check if the candidate exists
    const candidate = await Candidate.findById(candidateId).populate({ path: 'batchId', select: 'batchMode' });
    if (!candidate) {
      return errorResponse(res, 400, "Candidate not found", "Candidate not found");
    }

    // Check if candidate's batchMode is offline
    if (candidate?.batchId?.batchMode !== "offline") {
      return errorResponse(res, 400, "Files can only be uploaded in offline batch mode", "Files can only be uploaded in offline batch mode");
    }

    // Handle multiple file uploads for theory
    const fileDataArray = await uploadedTheoryFiles(req, candidateId);
    if (!fileDataArray || fileDataArray.length === 0) {
      return errorResponse(res, 400, "File upload failed", "File upload failed");
    }

    // Check if a SuspiciousActivity document exists for the candidate
    let suspiciousActivity = await SuspiciousActivity.findOne({ candidateId });

    // If not, create a new document
    if (!suspiciousActivity) {
      suspiciousActivity = new SuspiciousActivity({
        candidateId,
        suspiciousImageIds: [],
        suspiciousVideoIds: []
      });
    }

    // Add each fileData key to the appropriate array in suspiciousActivity
    for (const fileData of fileDataArray.uploadedTheoryFiles) {
      if (fileData) {
        suspiciousActivity.suspiciousVideoIds.push(fileData.Key);
      } 
     
    }

    // Save the updated document
    const savedFile = await suspiciousActivity.save();

    return sendResponse(res, 200, "Theory files uploaded successfully", { uploadedFiles: savedFile });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Something went wrong', error.message);
  }
};
