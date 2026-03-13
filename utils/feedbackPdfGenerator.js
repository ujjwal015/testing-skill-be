
const PDFDocument = require('pdfkit');
class FeedbackPdfGenerator {
  constructor() {
    this.pageWidth = 612;
    this.pageHeight = 792;
    this.margin = 50;
    this.contentWidth = this.pageWidth - this.margin * 2;
    this.checkboxSize = 12;
    this.footerHeight = 60;
  }

  addHeader(doc, title, subtitle = '') {
    doc.font('Helvetica-Bold').fontSize(20)
       .text(title, this.margin, this.margin, { align: 'center' });

    if (subtitle) {
      doc.font('Helvetica').fontSize(12)
         .text(subtitle, { align: 'center' });
    }

    doc.moveDown(0.5);
    doc.moveTo(this.margin, doc.y).lineTo(this.pageWidth - this.margin, doc.y).stroke();
    doc.moveDown(1);
  }

  addSectionHeader(doc, text) {
    this.checkPageBreak(doc, 60);
    doc.font('Helvetica-Bold').fontSize(14)
       .text(text, this.margin, doc.y);
    doc.moveDown(0.5);
  }

  addFieldRow(doc, label, value, isBoolean = false) {
    this.checkPageBreak(doc, 40);
    const startX = this.margin;
    const labelWidth = 180;
    const valueX = startX + labelWidth + 10;
    const y = doc.y;

    doc.font('Helvetica').fontSize(11)
       .text(label + ':', startX, y, { width: labelWidth });

    if (isBoolean) {
      const yesX = valueX;
      const noX = yesX + 80;
      const checkboxSize = this.checkboxSize;

      doc.rect(yesX, y, checkboxSize, checkboxSize).stroke();
      if (value && value.toLowerCase() === 'yes') this.drawCheckMark(doc, yesX, y, checkboxSize);
      doc.text('Yes', yesX + checkboxSize + 4, y);

      doc.rect(noX, y, checkboxSize, checkboxSize).stroke();
      if (value && value.toLowerCase() === 'no') this.drawCheckMark(doc, noX, y, checkboxSize);
      doc.text('No', noX + checkboxSize + 4, y);
    } else {
      doc.text(value || 'N/A', valueX, y, {
        width: this.contentWidth - labelWidth - 20,
        ellipsis: true
      });
    }

    doc.moveDown(1.2);
  }

  addTextAreaField(doc, label, value) {
    this.checkPageBreak(doc, 100);
    const startX = this.margin;
    const y0 = doc.y;

    doc.font('Helvetica-Bold').fontSize(11)
       .text(label + ':', startX, y0);
    const boxY = doc.y + 4;
    const boxHeight = 60;
    const pad = 4;

    doc.rect(startX, boxY, this.contentWidth, boxHeight).stroke();

    doc.font('Helvetica').fontSize(10)
       .text(value || '', startX + pad, boxY + pad, {
         width: this.contentWidth - pad * 2,
         height: boxHeight - pad * 2,
         ellipsis: true
       });

    doc.y = boxY + boxHeight + 8;
  }

  drawCheckMark(doc, x, y, size) {
    const s = size;
    doc.save().moveTo(x + 2, y + s / 2)
      .lineTo(x + s / 2, y + s - 2)
      .lineTo(x + s - 2, y + 2)
      .stroke().restore();
  }

  checkPageBreak(doc, needed) {
    if (doc.y + needed > this.pageHeight - this.margin - this.footerHeight) {
      doc.addPage();
      doc.y = this.margin;
    }
  }

  addFooter(doc) {
    const footerY = this.pageHeight - this.margin - 90;
    doc.font('Helvetica').fontSize(8).fillColor('gray')
       .text('This feedback form was generated automatically by the Testa Assessment System.', this.margin, footerY, {
         width: this.contentWidth,
         align: 'center'
       })
       .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
  }

  generateAssessorFeedbackPdf(data) {
    return new Promise((res, rej) => {
      try {
        const doc = new PDFDocument({ margin: this.margin });
        const bufs = [];
        doc.on('data', bufs.push.bind(bufs));
        doc.on('end', () => res(Buffer.concat(bufs)));

        this.addHeader(doc, 'ASSESSOR FEEDBACK FORM', 'Post-Assessment Evaluation Report');

        this.addSectionHeader(doc, 'ASSESSMENT DETAILS');
        this.addFieldRow(doc, 'Assessor Name', data.assessorName);
        this.addFieldRow(doc, 'Assessment Date', data.assessmentDate ? (new Date(data.assessmentDate)).toLocaleDateString() : '');
        this.addFieldRow(doc, 'Batch ID', data.batchId);
        this.addFieldRow(doc, 'Training Partner', data.trainingPartnerName);
        this.addFieldRow(doc, 'Training Centre Address', data.trainingCentreAddress);

        this.addSectionHeader(doc, 'CENTRE COORDINATION & READINESS');
        this.addFieldRow(doc, 'SPOC Available', data.spocAvailable, true);
        if (data.spocRemarks) this.addTextAreaField(doc, 'SPOC Remarks', data.spocRemarks);
        this.addFieldRow(doc, 'Centre Ready on Time', data.centreReady, true);
        if (data.centreReadyRemarks) this.addTextAreaField(doc, 'Centre Ready Remarks', data.centreReadyRemarks);
        this.addFieldRow(doc, 'Geo Location Shared', data.geoLocationShared, true);
        this.addFieldRow(doc, 'All Candidates Present', data.candidatesPresent, true);
        if (data.candidateIssuesCount) this.addFieldRow(doc, 'Candidate Issues Count', data.candidateIssuesCount.toString());

        this.addSectionHeader(doc, 'INFRASTRUCTURE & LOGISTICS');
        this.addFieldRow(doc, 'Required Tools Available', data.toolsAvailable, true);
        if (data.toolsSpecify) this.addTextAreaField(doc, 'Tools Specification', data.toolsSpecify);
        this.addFieldRow(doc, 'Classrooms Suitable', data.classroomsSuitable, true);

        this.addSectionHeader(doc, 'ASSESSMENT CONDUCT');
        this.addFieldRow(doc, 'Assessment Started on Time', data.assessmentOnTime, true);
        this.addFieldRow(doc, 'Aadhaar Issues Faced', data.aadhaarIssues, true);
        if (data.aadhaarDescription) this.addTextAreaField(doc, 'Aadhaar Issues Description', data.aadhaarDescription);
        this.addFieldRow(doc, 'Theory Exam Conducted Smoothly', data.theoryExamSmooth, true);
        if (data.theoryExamComments) this.addTextAreaField(doc, 'Theory Exam Comments', data.theoryExamComments);

        this.addSectionHeader(doc, 'INTEGRITY & COMPLIANCE');
        this.addFieldRow(doc, 'Pressure/Malpractice Experienced', data.pressureMalpractice, true);
        if (data.pressureDetails) this.addTextAreaField(doc, 'Pressure/Malpractice Details', data.pressureDetails);
        this.addFieldRow(doc, 'Result Manipulation Requested', data.manipulationRequest, true);
        if (data.manipulationDetails) this.addTextAreaField(doc, 'Manipulation Request Details', data.manipulationDetails);

        if (data.otherRemarks) this.addTextAreaField(doc, 'ADDITIONAL REMARKS', data.otherRemarks);

        this.addFooter(doc);
        doc.end();
      } catch (e) {
        rej(e);
      }
    });
  }

  generateTrainingPartnerFeedbackPdf(data) {
    return new Promise((res, rej) => {
      try {
        const doc = new PDFDocument({ margin: this.margin });
        const bufs = [];
        doc.on('data', bufs.push.bind(bufs));
        doc.on('end', () => res(Buffer.concat(bufs)));

        this.addHeader(doc, 'TRAINING PARTNER FEEDBACK FORM', 'Assessor Performance Evaluation Report');

        this.addSectionHeader(doc, 'TRAINING PARTNER DETAILS');
        this.addFieldRow(doc, 'Training Partner Name', data.trainingPartnerName);
        this.addFieldRow(doc, 'Training Partner ID', data.trainingPartnerId);
        this.addFieldRow(doc, 'Centre Name', data.centreName);
        this.addFieldRow(doc, 'Centre Address', data.centreAddress);
        this.addFieldRow(doc, 'Training Centre ID', data.trainingCentreId);
        this.addFieldRow(doc, 'Batch ID', data.batchId);
        this.addFieldRow(doc, 'Assessment Date', data.dateOfAssessment ? (new Date(data.dateOfAssessment)).toLocaleDateString() : '');

        this.addSectionHeader(doc, `ASSESSOR'S READINESS`);
        this.addFieldRow(doc, 'Assessor Arrived on Time', data.assessorOnTime, true);
        this.addFieldRow(doc, 'Assessor Had Required Documents', data.assessorDocuments, true);
        this.addFieldRow(doc, 'Assessor Aware of Assessment Process', data.assessorAware, true);

        this.addSectionHeader(doc, `ASSESSOR'S PROFESSIONAL BEHAVIOR`);
        this.addFieldRow(doc, 'Assessor Was Respectful', data.assessorRespectful, true);
        this.addFieldRow(doc, 'Assessor Was Cooperative', data.assessorCooperative, true);

        this.addSectionHeader(doc, `ASSESSOR'S ADHERENCE TO GUIDELINES`);
        this.addFieldRow(doc, 'Proper Aadhaar Verification Done', data.aadhaarVerification, true);
        this.addFieldRow(doc, 'Assessment Photos Taken Properly', data.assessmentPhotos, true);
        this.addFieldRow(doc, 'Assessor in Formal Attire', data.assessorFormalAttire, true);

        this.addSectionHeader(doc, 'COMMUNICATION & COORDINATION');
        this.addFieldRow(doc, 'Good Communication Throughout', data.assessorCommunication, true);
        this.addFieldRow(doc, 'Any Delays Communicated Properly', data.assessorDelays, true);

        this.addSectionHeader(doc, 'OVERALL ASSESSMENT');
        this.addFieldRow(doc, 'Would Recommend This Assessor', data.recommendAssessor, true);

        this.checkPageBreak(doc, 80);
        const ratings = ['Poor', 'Below Average', 'Average', 'Good', 'Excellent'];
        doc.font('Helvetica').fontSize(11).text('Overall Rating:', this.margin, doc.y);
        doc.moveDown(1);
        const ry = doc.y;
        ratings.forEach((rating, i) => {
          const x = this.margin + 40 + 90 * i;
          doc.rect(x, ry, this.checkboxSize, this.checkboxSize).stroke();
          if (data.overallRating && data.overallRating.toLowerCase() === rating.toLowerCase()) {
            this.drawCheckMark(doc, x, ry, this.checkboxSize);
          }
          doc.font('Helvetica').fontSize(9).text(rating, x + this.checkboxSize + 4, ry);
        });
        doc.moveDown(2);

        if (data.incidents) this.addTextAreaField(doc, 'INCIDENTS/ISSUES REPORTED', data.incidents);

        this.addFooter(doc);
        doc.end();
      } catch (e) {
        rej(e);
      }
    });
  }
}

module.exports = FeedbackPdfGenerator;
