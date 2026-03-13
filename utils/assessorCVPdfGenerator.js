const PDFDocument = require("pdfkit");
const Assesor = require("../models/AssesorModel");
const SchemeModel = require("../models/scheme-model");
const { getassessorProfileFileUrl } = require("./s3bucketAssessor");
const axios = require("axios");
const JSZip = require("jszip");
const path = require("path");

class CVPdfGenerator {
  constructor() {
    this.pageWidth = 612;
    this.pageHeight = 792;
    this.margin = 20;
    this.contentWidth = this.pageWidth - this.margin * 2;
  }

  async generateCVPdf(assessorId) {
    try {
      // Fetch assessor data with populated scheme
      const assessor = await Assesor.findOne({ assessorId:assessorId }).populate("scheme");

      if (!assessor) {
        throw new Error("Assessor not found");
      }

      // Get profile picture URL if available
      let profilePictureUrl = null;
      try {
        if (assessor.assessorCertificate?.profileKey) {
          const profileData = await getassessorProfileFileUrl(assessor, [
            assessor.assessorCertificate.profileKey,
          ]);
          profilePictureUrl = profileData[0]?.url;
          console.log(`profileData: ${profilePictureUrl}`);
        }
      } catch (error) {
        console.log("Error fetching profile picture:", error.message);
        // Continue without profile picture
      }

      // Transform data to match the frontend structure
      const userData = this.transformAssessorData(assessor, profilePictureUrl);

      return this.createPDF(userData);
    } catch (error) {
      throw error;
    }
  }

  transformAssessorData(assessor, profilePictureUrl) {
    const handleSchemeType = (schemes) => {
      if (!schemes || schemes.length === 0) return "-";
      return schemes
        .map((scheme) => scheme.schemeName || scheme.schemeCode || "Unknown")
        .join(", ");
    };

    // Transform experiences
    const experienceData =
      assessor.experiences?.length > 0
        ? assessor.experiences
            .filter((exp) => exp.status === "accepted")
            .map((exp) => ({
              organization: exp.companyName || "-",
              position: exp.designation || "-",
              duration: `${exp.startDate || "-"} : ${exp.endDate || "-"}`,
            }))
        : [];

    // Transform education
    const educationData =
      assessor.education?.length > 0
        ? assessor.education
            .filter((edu) => edu.status === "accepted")
            .map((edu) => ({
              organization: edu.collegeName || "-",
              position: edu.degree || "-",
              duration: `${edu.startDate || "-"} : ${edu.endDate || "-"}`,
            }))
        : [];

    // Transform agreements
    const agreementData =
      assessor.agreement?.length > 0
        ? assessor.agreement
            .filter((agr) => agr.status === "accepted")
            .map((agr) => ({
              companyName: agr.agreementName || "-",
              duration: `${agr.agreementValidFrom || "-"} : ${
                agr.agreementValidTo || "-"
              }`,
            }))
        : [];

    // Transform job roles
    const jobRoleData =
      assessor.jobRole?.length > 0
        ? assessor.jobRole
            .filter((jr) => jr.status === "accepted")
            .map((jr) => ({
              companyName: jr.jobroleName || "-",
              duration: `${jr.issueDate || "-"} : ${jr.validUpto || "-"}`,
            }))
        : [];

    // Transform personal details
    const personalDetail = {};
    if (assessor.personalDetail?.length > 0) {
      const acceptedPersonalDetails = assessor.personalDetail.filter(
        (pd) => pd.status === "accepted"
      );
      acceptedPersonalDetails.forEach((pd) => {
        if (pd.cardType === "AadharCard") {
          personalDetail.aadharCard = pd.cardNo || "-";
        } else if (pd.cardType === "Pancard") {
          personalDetail.panCard = pd.cardNo || "-";
        }
      });
    }

    return {
      id: assessor._id,
      name: assessor.fullName || "-",
      profilePicture: profilePictureUrl || null,
      personalDetail: {
        panCard: personalDetail.panCard || "-",
        aadharCard: personalDetail.aadharCard || "-",
      },
      basicInfo: {
        arId: assessor.assessorId || "-",
        assessorMode: assessor.modeofAgreement || "-",
        toaType: assessor.ToaType || "-",
        scheme: handleSchemeType(assessor.scheme),
      },
      contactInfo: {
        email: assessor.email || "-",
        phone: assessor.mobile || "-",
        address:
          `${assessor.address || ""},${assessor.state || ""},${
            assessor.district || ""
          },${assessor.pinCode || ""}` || "-",
        dob: assessor.dob || "-",
        gender: assessor.gender || "-",
      },
      experience: experienceData,
      education: educationData,
      agreement: agreementData,
      jobRole: jobRoleData,
    };
  }

  createPDF(userData) {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: this.margin });
        const buffers = [];

        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        await this.addHeader(doc, userData);
        this.addBasicAndContactInfo(doc, userData);
        this.addPersonalDetails(doc, userData);
        this.addDataTables(doc, userData);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async addHeader(doc, userData) {
    const headerY = doc.y;

    // Profile picture
    const imageX = this.margin;
    const imageY = headerY;
    const imageSize = 80;

    // Draw border for image area
    doc.rect(imageX, imageY, imageSize, imageSize).stroke();

    if (userData.profilePicture) {
      try {
        // Fetch image from URL and add to PDF
        const imageBuffer = await this.fetchImageFromUrl(
          userData.profilePicture
        );
        doc.image(imageBuffer, imageX + 2, imageY + 2, {
          width: imageSize - 4,
          height: imageSize - 4,
          fit: [imageSize - 4, imageSize - 4],
          align: "center",
          valign: "center",
        });
      } catch (error) {
        console.log("Error loading profile image:", error.message);
        // Fallback to placeholder text
        doc
          .fontSize(10)
          .fillColor("#666666")
          .text("Image\nUnavailable", imageX + 15, imageY + 30);
      }
    } else {
      doc
        .fontSize(10)
        .fillColor("#666666")
        .text("No Image", imageX + 20, imageY + 35);
    }

    // Name
    const nameX = imageX + imageSize + 20;
    doc
      .fontSize(20)
      .fillColor("#1E90FF")
      .font("Helvetica-Bold")
      .text(userData.name, nameX, imageY + 20);

    doc.moveDown(3);
  }

  addBasicAndContactInfo(doc, userData) {
    const startY = doc.y;
    const leftColumnX = this.margin;
    const rightColumnX = this.pageWidth / 2;
    const columnWidth = this.pageWidth / 2 - this.margin - 10;

    // Basic Details (Left Column)
    doc
      .fontSize(14)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("Basic Details", leftColumnX, startY);

    let currentY = startY + 25;
    const basicDetails = [
      ["AR ID (SIP)", userData.basicInfo.arId],
      ["Assessor Mode", userData.basicInfo.assessorMode],
      ["ToA Type", userData.basicInfo.toaType],
      ["Scheme", userData.basicInfo.scheme],
    ];

    basicDetails.forEach(([label, value]) => {
      doc
        .fontSize(10)
        .fillColor("#005BA2")
        .font("Helvetica-Bold")
        .text(`${label}:`, leftColumnX, currentY, { width: 120 });
      doc
        .fillColor("#97A1AF")
        .font("Helvetica")
        .text(value, leftColumnX + 120, currentY, { width: columnWidth - 120 });
      currentY += 20;
    });

    // Contact Information (Right Column)
    doc
      .fontSize(14)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("Contact Information", rightColumnX, startY);

    currentY = startY + 25;
    const contactDetails = [
      ["Email Id", userData.contactInfo.email],
      ["Phone", userData.contactInfo.phone],
      ["Address", userData.contactInfo.address],
      ["D.O.B", userData.contactInfo.dob],
      ["Gender", userData.contactInfo.gender],
    ];

    contactDetails.forEach(([label, value]) => {
      doc
        .fontSize(10)
        .fillColor("#005BA2")
        .font("Helvetica-Bold")
        .text(`${label}:`, rightColumnX, currentY, { width: 120 });
      doc
        .fillColor("#97A1AF")
        .font("Helvetica")
        .text(value, rightColumnX + 120, currentY, {
          width: columnWidth - 120,
        });
      currentY += 20;
    });

    doc.y = Math.max(startY + 125, currentY + 10);
  }

  addPersonalDetails(doc, userData) {
    if (
      userData.personalDetail.panCard === "-" &&
      userData.personalDetail.aadharCard === "-"
    ) {
      return;
    }

    doc
      .fontSize(14)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("Personal Details", this.margin, doc.y);

    doc.moveDown(0.5);
    const currentY = doc.y;

    const personalDetails = [
      [
        "Aadhaar Number",
        userData.personalDetail.aadharCard === "-"
          ? "-"
          : userData.personalDetail.aadharCard.slice(0, 7) + "XXXX",
      ],
      [
        "PAN Number",
        userData.personalDetail.panCard === "-"
          ? "-"
          : userData.personalDetail.panCard.slice(0, 5) + "XXXX",
      ],
    ];

    personalDetails.forEach(([label, value]) => {
      doc
        .fontSize(10)
        .fillColor("#005BA2")
        .font("Helvetica-Bold")
        .text(`${label}:`, this.margin, doc.y, { width: 120 });
      doc
        .fillColor("#97A1AF")
        .font("Helvetica")
        .text(value, this.margin + 120, doc.y, {
          width: this.contentWidth - 120,
        });
      doc.moveDown(1);
    });

    doc.moveDown(0.5);
  }

  addDataTables(doc, userData) {
    const allFieldMissing =
      userData.experience.length === 0 &&
      userData.agreement.length === 0 &&
      userData.education.length === 0 &&
      userData.jobRole.length === 0;

    if (allFieldMissing) return;

    // border around all tables
    const tableStartY = doc.y;

    // Experience Table
    if (userData.experience.length > 0) {
      this.addTable(doc, "Experience", userData.experience, [
        { header: "Organization", key: "organization" },
        { header: "Position", key: "position" },
        { header: "Duration", key: "duration" },
      ]);
    }

    // Education Table
    if (userData.education.length > 0) {
      this.addTable(doc, "Educational Details", userData.education, [
        { header: "Institution", key: "organization" },
        { header: "Degree", key: "position" },
        { header: "Duration", key: "duration" },
      ]);
    }

    // Agreement Table
    if (userData.agreement.length > 0) {
      this.addTable(doc, "Agreement Details", userData.agreement, [
        { header: "Company Name", key: "companyName" },
        { header: "Duration", key: "duration" },
      ]);
    }

    // Job Role Table
    if (userData.jobRole.length > 0) {
      this.addTable(doc, "Job Role Certificate", userData.jobRole, [
        { header: "Company Name", key: "companyName" },
        { header: "Duration", key: "duration" },
      ]);
    }
  }

  addTable(doc, title, data, columns) {
    // Check if we need a new page
    const estimatedHeight = 40 + data.length * 20 + 30;
    if (doc.y + estimatedHeight > this.pageHeight - this.margin) {
      doc.addPage();
    }

    // Section header
    doc
      .fontSize(14)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text(title, this.margin, doc.y);
    doc.moveDown(0.5);

    const tableY = doc.y;
    const rowHeight = 20;
    const colWidth = this.contentWidth / columns.length;

    // Table border
    doc
      .rect(
        this.margin,
        tableY,
        this.contentWidth,
        rowHeight * (data.length + 1)
      )
      .stroke();

    // Header row
    let currentX = this.margin;
    columns.forEach((col, index) => {
      doc.rect(currentX, tableY, colWidth, rowHeight).stroke();
      doc
        .fontSize(10)
        .fillColor("#005BA2")
        .font("Helvetica-Bold")
        .text(col.header, currentX + 5, tableY + 5, { width: colWidth - 10 });
      currentX += colWidth;
    });

    // Data rows
    data.forEach((row, rowIndex) => {
      const rowY = tableY + rowHeight * (rowIndex + 1);
      currentX = this.margin;

      columns.forEach((col, colIndex) => {
        doc.rect(currentX, rowY, colWidth, rowHeight).stroke();
        doc
          .fontSize(10)
          .fillColor("#97A1AF")
          .font("Helvetica")
          .text(row[col.key] || "-", currentX + 5, rowY + 5, {
            width: colWidth - 10,
          });
        currentX += colWidth;
      });
    });

    doc.y = tableY + rowHeight * (data.length + 1) + 20;
  }

  async fetchImageFromUrl(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 10000, // 10 second timeout
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Failed to fetch image: ${error.message}`);
    }
  }

  async masterExportCVs(assessors) {
    try {
      if (!assessors || assessors.length === 0) {
        throw new Error('No assessors provided for CV generation');
      }

      console.log(`Generating CVs for ${assessors.length} assessors...`);

      // Create ZIP file
      const zip = new JSZip();
      const cvFolder = zip.folder("assessor_cvs");

      // Generate PDFs for each assessor
      const pdfPromises = assessors.map(async (assessor, index) => {
        try {
          console.log(`Processing assessor ${index + 1}/${assessors.length}: ${assessor.fullName}`);

          // Get profile picture URL if available
          let profilePictureUrl = null;
          try {
            if (assessor.assessorCertificate?.profileKey) {
              const profileData = await getassessorProfileFileUrl(assessor, [
                assessor.assessorCertificate.profileKey,
              ]);
              profilePictureUrl = profileData[0]?.url;
            }
          } catch (error) {
            console.log(`Error fetching profile picture for ${assessor.fullName}:`, error.message);
          }

          // Transform data
          const userData = this.transformAssessorData(assessor, profilePictureUrl);
          
          // Generate PDF
          const pdfBuffer = await this.createPDF(userData);
          
          // Create safe filename
          const safeFileName = this.createSafeFileName(assessor.fullName, assessor.assessorId);
          
          // to ZIP
          cvFolder.file(`${safeFileName}.pdf`, pdfBuffer);
          
          return {
            success: true,
            assessorId: assessor.assessorId,
            name: assessor.fullName
          };
        } catch (error) {
          console.error(`Error generating CV for assessor ${assessor.fullName}:`, error.message);
          return {
            success: false,
            assessorId: assessor.assessorId,
            name: assessor.fullName,
            error: error.message
          };
        }
      });

      // Wait for all PDFs to be generated
      const results = await Promise.all(pdfPromises);
      
      // Count successful and failed generations
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log(`CV generation completed: ${successful} successful, ${failed} failed`);

      // Generate the ZIP buffer
      const zipBuffer = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });

      return {
        zipBuffer,
        summary: {
          total: assessors.length,
          successful,
          failed,
          results: results
        }
      };

    } catch (error) {
      console.error('Error in masterExportCVs:', error);
      throw error;
    }
  }

  createSafeFileName(fullName, assessorId) {
    // Remove special characters and replace spaces with underscores
    const safeName = fullName
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50); // Limit length
    
    return `${safeName}_${assessorId}`;
  }
}

module.exports = CVPdfGenerator;
