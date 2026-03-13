const Joi = require("@hapi/joi");
const moment = require('moment');
const { Paginate } = require("../utils/paginate");
const { sendResponse, errorResponse } = require("../utils/response");
const {getFilter} = require("../utils/custom-validators");
const responseMessage = require("../utils/responseMessage");
const {getassessorListFileUrl} = require('../utils/s3bucket');
const Assesor = require("../models/AssesorModel");
const AttendenceModel = require("../models/attendence-model");
const Regularize = require("../models/regularizeAttendence-model");
const Batch = require("../models/batch-model");
const QAVerificationModel = require("../models/QAVerification-model");
const QAfileUploadModel = require("../models/QAfileUpload-model");
const AssesorNotificationModel = require("../models/assesor-notification-model");

const {
  uploadSingleFile,
  getSingleFileUrl,
  getassessorProfileUrl,
  getassessorRegularizeProfileUrl,
  getassessorRegularizeClockinUrl,
  uploadRegularizeFile
} = require("../middleware/s3bucket");

const {
  getassessorPhotoFileUrl
} = require("../utils/s3bucketAssessor");

const { assessor_found } = require("../utils/responseMessage");

//---->get all assessor list
module.exports.assesorList = async (req, res, next) => {
    try {
      const options = ["assessorId", "firstName", "lastName", "modeofAgreement"];
      let filter = getFilter(req, options,false);
      const { page, limit, skip, sortOrder } = Paginate(req);
  
          
      // Build the filter query
      let query = filter ? filter.query : {};
  
      const assessorData = await Assesor
        .find(query)
        .sort(sortOrder)
        .skip(skip)
        .limit(limit);
 
      const totalCounts = await Assesor.countDocuments(query);
      const totalPages = Math.ceil(totalCounts / limit);
      // if (!assessorData)
      //   return errorResponse(
      //     res,
      //     404,
      //     responseMessage.assessor_profile_not_found,
      //     responseMessage.errorMessage
      //   );
  
      if (assessorData.length < 1)
        return sendResponse(
          res,
          200,
          responseMessage.assessor_profile_not_found,
          {}
        );
      //find batchId and send with assesor 

      const batchDetail = await Promise.all(assessorData.map(async (assessor) => {
        const batches = await Batch.find({ accessorId: assessor._id }).select("_id accessorId");
        return batches.length > 0 ? batches : [];
      }));
      
      const imgUrl = assessorData.map((data) => {
        if (data) {//.isAllDocumentUploaded
           // Dynamically create the fileKeys array based on uploaded files
           const fileKeys = [];
  
           if (
             data.assessorCertificate &&
             data.assessorCertificate.profileKey
           ) {
             fileKeys.push('assessorPhoto');
           }


           
           batchDetail.forEach((batch) => {
            const matchingBatches = batch.filter(item => item.accessorId.equals(data._id));
          
            if (matchingBatches.length > 0) {
                data.assignedBatchesId = matchingBatches.map(item => item._id);
            } else {
                data.assignedBatchesId = [];
            }
        });
        
           
          return getassessorListFileUrl(data,fileKeys);

        } else {
          return errorResponse(
            res,
            400,
            responseMessage.assessor_file_not_found,
            data
          );
        }
      });
  
      Promise.all(imgUrl)
        .then((result) => {
          return sendResponse(res, 200, responseMessage.assessor_profile_get, {
            result,
            page,
            totalCounts,
            totalPages,
          });
        })
        .catch((err) => {
          return errorResponse(
            res,
            422,
            responseMessage.image_not_found,
            err.message
          );
        });
    } catch (error) {
      return errorResponse(res, 500, responseMessage.errorMessage, error.message);
    }
};


//assessor attendanceList with filter and search
module.exports.attendenceRequestList = async (req, res) => {
  try {

    if(req.query.search){
      const query = {};
      const search = req.query.search;
      const assessorData = await Regularize.find({ ...query, // Include any existing conditions in your query
      isApprove: 'pending'})//// Add condition for isApprove field
      .populate({ path: "assesor_id", select: "fullName email assessorCertificate", match: { fullName: { $regex: search, $options: 'i' }}})//req.query.search } })
      .populate({ path: "batch_id", select: "batchId"})
     // console.log("assessorData==>",assessorData)

    const attendenceRequestList = assessorData.filter(item=> item.assesor_id !== null)

    if (!attendenceRequestList) {
      return errorResponse(
        res,
        200,
        [],
        []
      );
  }  

    const totalCounts = attendenceRequestList.length
    const limit = req.query.limit || 10 ;
    const totalPages = Math.ceil(totalCounts / limit)

    const profileKeyUrls = await Promise.all(
      attendenceRequestList.map(async (item) => {
       // console.log("item===>",item)
          if (item?.assesor_id?.assessorCertificate?.profileKey) {
             const profileKey = item?.assesor_id?.assessorCertificate.profileKey;    
            const profileKeyUrl = await getassessorRegularizeProfileUrl(item,profileKey);
  
            return profileKeyUrl
        }
        return null;
      })
    );
  
    const clockInKeyUrls = await Promise.all(
      attendenceRequestList.map(async (item) => {
          if ( item?.clockInImageKey) {
            const clockInKey = item.clockInImageKey 
  
            const profileKeyUrl = await getassessorRegularizeClockinUrl(item,clockInKey);
            
            //getassessorRegularizeClockinUrl
            return profileKeyUrl
        }
        return null;
      })
    );
   
    // Combine profile key URLs with the original attendenceRequestList
    const updatedAttendenceRequestList = attendenceRequestList.map((item, index) => {
      return {
        ...item.toObject(),
        clockInImageKey:clockInKeyUrls[index],
        profileKeyUrl: profileKeyUrls[index]
      };
    });
  
      return sendResponse(res, 200, responseMessage.assessor_attendance_regularize_list, {
        //attendenceRequestList,
        updatedAttendenceRequestList,
        totalCounts,
        totalPages,
      });

     } else {
      const { limit, skip, sortOrder } = Paginate(req);
      const filter = getFilter(req, ["assessor_id.fullName"]);
      const query = filter ? filter.query : {};
      const totalCounts = await Regularize.countDocuments(query);
      const totalPages = Math.ceil(totalCounts / limit);
     
    const attendenceRequestList = await Regularize.find({
      ...query, // Include any existing conditions in your query
      isApprove: 'pending', // Add condition for isApprove field
    }).populate({
      path: "assesor_id",
       select: "fullName email assessorCertificate",
      //match: { fullName: assesor_id.fullName } //{ $regex: search, $options: 'i' }
    }).populate({
      path:"batch_id",
      select:"batchId"
    })
    .select("clockInTime clockOutTime location assesor_id batch_id QAverificationTimeStampId isApprove remark clockInImageKey createdAt updatedAt")
    .skip(skip)
    .limit(limit)
    .sort(sortOrder)
  

    if (!attendenceRequestList) {
      return sendResponse(
        res,
        200,
        [],
        []
      );
  }  
  
    const profileKeyUrls = await Promise.all(
      attendenceRequestList.map(async (item) => {
          if (item?.assesor_id?.assessorCertificate?.profileKey ) {
             const profileKey = item?.assesor_id?.assessorCertificate?.profileKey;
           
            const profileKeyUrl = await getassessorRegularizeProfileUrl(item,profileKey);
  
            return profileKeyUrl
        }
        return null;
      })
    );
  
    const clockInKeyUrls = await Promise.all(
      attendenceRequestList.map(async (item) => {
          if ( item?.clockInImageKey) {
            const clockInKey = item.clockInImageKey 
  
            const profileKeyUrl = await getassessorRegularizeClockinUrl(item,clockInKey);
            
            return profileKeyUrl
        }
        return null;
      })
    );
   
    // Combine profile key URLs with the original attendenceRequestList
    const updatedAttendenceRequestList = attendenceRequestList.map((item, index) => {
      return {
        ...item.toObject(),
        clockInImageKey:clockInKeyUrls[index],
        profileKeyUrl: profileKeyUrls[index]
      };
    });
  
      return sendResponse(res, 200, responseMessage.assessor_attendance_regularize_list, {
        //attendenceRequestList,
        updatedAttendenceRequestList,
        totalCounts,
        totalPages,
      });
  
     }
  
  } catch (err) {
    console.log("errmessage==>",err.message)
    return errorResponse(res, 500, responseMessage.something_wrong, err.message);
  }
};

module.exports.attendenceRequestDetailFindById = async (req, res) => {
  try {
    const requestId = req.params.id;
    if (!requestId) {
      return errorResponse(res, 400, "Provide valid assessor Id", responseMessage.no_assessor_regularize_id_provided);//responseMessage.no_assessor_regularize_id_provided
    }

    const attendenceRegulariseDetail = await Regularize.findById(requestId);
    if (!attendenceRegulariseDetail) {
      return errorResponse(
        res,
        400,
        responseMessage.assessor_regularize_detail_not_found,
        responseMessage.assessor_regularize_detail_not_found
      );
    }
   
    const getUserDetail = await getSingleFileUrl(attendenceRegulariseDetail);
         
    if (getUserDetail) {
      return sendResponse(
        res,
        200,
        "Attendence regularize details",
        getUserDetail
      );
    }
   
  } catch (err) {
    return errorResponse(res, 500, responseMessage.something_wrong, err);
  }
};

module.exports.attendenceRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const {isApprove,comment} = req.body
    
    if (!requestId) {
      return errorResponse(res, 400, "No id provided.", "No id provided.");
    }

    const attendenceRegulariseList = await Regularize.findById(requestId);
    console.log("attendenceRegulariseList===1-->",attendenceRegulariseList)
   //const attendenceRegulariseList = await Regularize.findById(requestId).populate({path: "batch_id"})//('batchId'); // Populate batchId field //({path: "batchId", select: "schemeName" })
    if (!attendenceRegulariseList) {
      return errorResponse(
        res,
        400,
        "Attendence regularize request details not found",
        "Attendence regularize request details not found"
      );
    }
   

    //reject 
   if(isApprove === 'approve'){
      const updateRegularize  = await Regularize.findOneAndUpdate(
        { _id: requestId },
        { comment:comment,
          isApprove:isApprove
        },
        { new: true }
      );
        let formatClockIn=moment(attendenceRegulariseList.clockInTime, 'hh:mm A').format('HH:mm')
        let formatClockOut=moment(attendenceRegulariseList.clockOutTime, 'hh:mm A').format('HH:mm')
        let [hours,minutes]=formatClockIn.split(':');
        let [hoursO,minutesO]=formatClockOut.split(':');
        
        let dateOne = moment(attendenceRegulariseList.createdAt);
                  let duration1 = moment.duration({ hours: hours, minutes: minutes });
                  dateOne.add(duration1);
                  
        let dateTwo = moment(attendenceRegulariseList.createdAt);
                  let duration2 = moment.duration({ hours: hoursO, minutes: minutesO });
                  dateTwo.add(duration2);
                  const duration = moment.duration(dateTwo.diff(dateOne));
                  let hourss = duration.hours();
                  let minutess = duration.minutes();
                   let seconds = duration.seconds();
                  const addZero=val=>`${val>=10?val:'0'+val}`
                 let effectiveHours=`${addZero(hourss)}:${addZero(minutess)}:${addZero(seconds)}`
      const updateObject = {
        clockInTime: attendenceRegulariseList.clockInTime,
        clockOutTime: attendenceRegulariseList.clockOutTime,
        clockOutImageKey:attendenceRegulariseList.clockInImageKey,
        duration: effectiveHours,
        comment:comment
      };
       // }      
        const updateAttendence = await AttendenceModel.findOneAndUpdate(
          {_id:updateRegularize.attendence_id},
          { $set: updateObject },
          { new: true } 
        ).populate({path: "batch_id", select: "batchId"})//('batch_id');//select: "batchName"
        
        if (!updateAttendence) {
          return errorResponse(
            res,
            404,
            "Assesor not found",
            "Assesor not found"
          );
        }
      
      //--------->start<-------------
       //or notification in approve attendance regularize attendance
       // const batchAssign =  await batchData.save();
        const notification = new AssesorNotificationModel({
          recipient: updateAttendence.assesor_id,
          sender: updateAttendence.assesor_id, //req.user._id || 
          title: `${updateAttendence.batch_id.batchId}`,
          content: `Attendance Regularize Request has accepted`,//`${updateAttendence.assesor_id} has accepted`
          type: "message",
          isActionTaken: true
        });
        
       const notificationData =  await notification.save()

       console.log('notificationData==>',notificationData)
      
      
        const checkOutPhotoPayload = {
          images: [{ 
            imgKey: attendenceRegulariseList.clockInImageKey, 
            // adminUploaded: false,
            // imgName: req.file.originalname, 
            // status: ""
          }]
        }

        const updatedData  =  await QAfileUploadModel.findOneAndUpdate(
          { QAverificationTimeStampId: attendenceRegulariseList.QAverificationTimeStampId },
          { $set: {checkOutPhoto: checkOutPhotoPayload } },
          { upsert: false }
    )

    console.log("updatedData==>",updatedData)
    const updatedQAClocktime = await QAVerificationModel.findOneAndUpdate(
      { _id: attendenceRegulariseList.QAverificationTimeStampId },
      { $set: { checkInTime: updateObject.clockInTime, checkOutTime: updateObject.clockOutTime} },//checkOutTime: updateObject.clockOutTime 
      { upsert: false }
    );
    
     console.log("updatedQAClocktime==>",updatedQAClocktime)
  
        return sendResponse(res, 200, "Attendence regularize successfully", updateAttendence);
    }  
    else if(isApprove == 'reject'){
      const updateRegularize  = await Regularize.findOneAndUpdate(
        { _id: requestId },
        { comment:comment,
          isApprove:isApprove
        },
        { new: true }
      );

      
      if (!updateRegularize) {
        return errorResponse(
          res,
          404,
          "Assesor not found",
          "Assesor not found"
        );
      }
      const updateObject = {
        comment: comment,
      };
        const updateAttendence = await AttendenceModel.findOneAndUpdate(
          {_id:updateRegularize.attendence_id},
          { $set: updateObject },
          { new: true }
        ).populate({path: "batch_id", select: "batchId" })//('batch_id');
        
        console.log("Inside reject updateAttendence -->", updateAttendence)
        if (!updateAttendence) {
          return errorResponse(
            res,
            404,
            "Assesor not found",
            "Assesor not found"
          );
        }

        const notification = new AssesorNotificationModel({
          recipient: updateAttendence.assesor_id,
          sender: updateAttendence.assesor_id, //req.user._id || 
          title: `${updateAttendence.batch_id.batchId}`,
          content: `Attendance Regularize Request has rejected`,//`${updateAttendence.assesor_id} has accepted`
          type: "message",
          isActionTaken: true
        });
        
       const notificationData =  await notification.save()

       console.log('notificationData==>',notificationData)

      return sendResponse(res, 200, "Attendence regularize has rejected", updateRegularize)//updateAttendence);
    }
   
    else {
      return errorResponse(
        res,
        400,
        "Attendence regularize not approved",
        "Attendence regularize not approved"
      );
    }
  } catch (err) {
    return errorResponse(res, 500, responseMessage.something_wrong, err.message);
  }
};

module.exports.regularizeDoc = async (req, res) => {
  try {
   
    const regId = req.params.id
    const attendanceRequestList = await Regularize.findById(regId)
    .select("clockInTime clockOutTime remark isApprove")

    if (!attendanceRequestList) {
        return errorResponse(
          res,
          200,
          {},
          {}
        );
    }  

    return sendResponse(res, 200, "Attendance reugalrize request list",attendanceRequestList);
  } catch (err) {
    return errorResponse(res, 500, responseMessage.something_wrong, err);
  }
};

module.exports.assessorAssignToBatchList = async (req, res, next) => {
  try {
      const { verified = false, pending = false } = req.query;

      console.log(typeof pending)

      const options = ["assessorId", "fullName", "email"];
      let filter = getFilter(req, options, false);
      const { page, limit, skip, sortOrder } = Paginate(req);

      const modeofAgreement = req?.query?.modeofAgreement;
      const agreementSigned = req?.query?.agreementSigned;
      const from = req?.query?.from;
      const to = req?.query?.to;
       
      let query = filter ? filter.query : {};

      if (modeofAgreement) {
          query.modeofAgreement = modeofAgreement;
      }

      if (agreementSigned) {
          query.agreementSigned = agreementSigned;
      }

      if (from && to) {
        const fromDateParts = from.split('-');
        const toDateParts = to.split('-');
        
        const fromDate = new Date(`${fromDateParts[2]}-${fromDateParts[0]}-${fromDateParts[1]}`);
        const toDate = new Date(`${toDateParts[2]}-${toDateParts[0]}-${toDateParts[1]}`);
    
        query.createdAt = {
            $gte: fromDate,
            $lte: toDate,
        };
    } else if (from) {
        const fromDateParts = from.split('-');
        const fromDate = new Date(`${fromDateParts[2]}-${fromDateParts[0]}-${fromDateParts[1]}`);
        
        query.createdAt = {
            $gte: fromDate,
        };
    } else if (to) {
        const toDateParts = to.split('-');
        const toDate = new Date(`${toDateParts[2]}-${toDateParts[0]}-${toDateParts[1]}`);
        
        query.createdAt = {
            $lte: toDate,
        };
    }
   
      const assessorData = await Assesor
          .find(query)
          .sort(sortOrder)
          //.skip(skip)
          //.limit(limit);

   // console.log("assessorData===>", assessorData);

      let totalCounts = await Assesor.countDocuments(query);
      let totalPages = Math.ceil(totalCounts / limit);

      if (assessorData.length < 1) {
          return sendResponse(
              res,
              200,
              responseMessage.assessor_profile_not_found,
              {}
          ); 
      }

      let filteredData = assessorData;
      let imgUrl
      //const passedDoc = []
      //let docLength = 0
      if (verified === 'true') {
        console.log("inside assessor attendence verified")
          // Filter to include only assessors with all documents in "accepted" status
          filteredData = assessorData.filter(assessor => assessor.isAssessorAssignToBatch);

          //console.log("filteredData==>",filteredData)
          totalCounts = filteredData.length;
          filteredData = filteredData.slice(skip, skip+limit)
          totalPages = Math.ceil(totalCounts / limit); // Update totalCounts after filtering  
   
      } 
      else{ 

        const imgUrlPromises = filteredData.map(async (data) => {
          if (data) {
              const fileKeys = [];

              if (data.assessorCertificate && data.assessorCertificate.profileKey) {
                  fileKeys.push(data.assessorCertificate.profileKey);
              } 

              return getassessorPhotoFileUrl(data, fileKeys);
          }
        });

        imgUrl = await Promise.all(imgUrlPromises);

        totalCounts = filteredData.length;
          
            totalPages = Math.ceil(totalCounts / limit); 
      }

      const imgUrlPromises = filteredData.map(async (data) => {
        if (data) {
            const fileKeys = [];

            if (data.assessorCertificate && data.assessorCertificate.profileKey) {
                fileKeys.push(data.assessorCertificate.profileKey);
            } 

            return getassessorPhotoFileUrl(data, fileKeys);
        }
      });

      imgUrl = await Promise.all(imgUrlPromises);
      imgUrl = imgUrl.slice(skip, skip+limit)

      return sendResponse(res, 200, responseMessage.assessor_profile_get, {
          result: imgUrl,
          // assessorData: assessorData,
          // passedDoc: passedDoc,
          // docLength: docLength,
          //sortOrder,
          page,
          totalCounts,
          totalPages,
      });

  } catch (error) {
      return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.assessorAttendenceList = async (req, res) => {
  try {
    const { limit, skip, sortOrder } = Paginate(req);
    const filter = getFilter(req, ["clockInTime"]);
    let query = filter ? filter.query : {};
    const {
      assesor_id,
      batchId,
      month,
      jobRole,
      from,
      to
    } = req.query;

    // Build the filter query
    if (assesor_id) {
      query.assesor_id = assesor_id;
    }

    if (batchId) {
      query.batch_id = batchId;
    }

    // Add additional filters for jobRole, from, and to
    if (jobRole) {
      query.jobRole = jobRole;
    }
    if (month) {
      const [year,monthNumber] = month.split('-');
      const startOfMonth = new Date(year, monthNumber - 1, 1)
      const endOfMonth = new Date(year, monthNumber, 0)
      query.createdAt = {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    }
    else if (from && to) {
      query.createdAt = {
        $gte: new Date(from),
        $lte: new Date(to),
      };
    } else if (from) {
      query.createdAt = {
        $gte: new Date(from),
      };
    } else if (to) {
      query.createdAt = {
        $lte: new Date(to),
      };
    }

    const totalCounts = await AttendenceModel.countDocuments(query);
    const totalPages = Math.ceil(totalCounts / limit);
    const attendanceList = await AttendenceModel.find(query)
      //.populate({path: "batch_id", select: "" })
      .populate({
        path: "batch_id",
        populate: { path: "jobRole", select: "" }
      })
      .populate({path:"regularise_Id", select:""})
      .skip(skip)
      .limit(limit)
      .sort(sortOrder);


    if (!attendanceList || attendanceList.length === 0) {
      return sendResponse(
        res,
        200,
        responseMessage.assessor_attendnce_detil,
        {}
      );
    }
    return sendResponse(res, 200, responseMessage.assessor_attendnce_list, {
      attendanceList,
      totalCounts,
      totalPages,
    });
  } catch (err) {
    return errorResponse(res, 500, responseMessage.something_wrong, err.message);
  }
};