const cron = require("node-cron");
const Batch = require("../models/batch-model");
const moment = require("moment");
const { sendBatchEndEmails } = require("./batchEndEmailService");

// Run every hour to check for batches that ended 24 hours ago
cron.schedule("0 * * * *", async () => {
  console.log("=== Running batch end notification check ===", new Date().toLocaleString());
  try {
    // Calculate the date 24 hours ago
    const twentyFourHoursAgo = moment().subtract(24, 'hours').toDate();
    const currentTime = moment().subtract(24, 'hours').toDate();
    const startOf2025 = moment.utc("2025-01-01").toDate();
    
    console.log(`Looking for batches that ended before: ${twentyFourHoursAgo}`);
    
    // Find batches that ended exactly 24 hours ago and haven't been notified
    const batchesToNotify = await Batch.find({
      endDate: {
        $lte: twentyFourHoursAgo,
      },
      createdAt: {
        $gte: startOf2025,
      },
      $or: [
        {
          // Assessor not notified and assessor is assigned
          accessorId: { $ne: null },
          isAssessorBatchEndNotified: false,
        },
        {
          // Training Partner not notified and exam center with training partner exists
          examCenterId: { $ne: null },
          isTrainingPartnerBatchEndNotified: false,
        },
      ],
    })
      .populate("accessorId", "email fullName firstName lastName")
      .populate({
        path: "examCenterId",
        populate: {
          path: "trainingPartner",
          select: "spocEmail trainingPartner spocName",
        },
      })
      .lean();

    console.log(`Found ${batchesToNotify.length} batches requiring notification`);

    for (const batch of batchesToNotify) {
      try {
        console.log(`\n=== Processing batch: ${batch.batchId} ===`);
        console.log(`Batch End Date: ${batch.batchEndDate}`);
        console.log(`Assessor assigned: ${!!batch.accessorId}`);
        console.log(`Assessor notified: ${batch.isAssessorBatchEndNotified}`);
        console.log(`Exam Center assigned: ${!!batch.examCenterId}`);
        console.log(`Training Partner notified: ${batch.isTrainingPartnerBatchEndNotified}`);
        
        if (batch.examCenterId) {
          console.log(`Training Partner assigned: ${!!batch.examCenterId.trainingPartner}`);
          if (batch.examCenterId.trainingPartner) {
            console.log(`Training Partner SPOC Email: ${batch.examCenterId.trainingPartner.spocEmail || 'Not provided'}`);
          }
        }
        
        let assessorEmailSent = false;
        let trainingPartnerEmailSent = false;

        // Send email to assessor if not already notified and assessor exists
        if (batch.accessorId && !batch.isAssessorBatchEndNotified) {
          console.log(`\n--- Sending assessor notification for batch: ${batch.batchId} ---`);
          assessorEmailSent = await sendBatchEndEmails(batch, 'assessor');
          console.log(`Assessor email result: ${assessorEmailSent ? 'SUCCESS' : 'FAILED'}`);
        } else {
          console.log(`\n--- Skipping assessor notification for batch: ${batch.batchId} ---`);
          if (!batch.accessorId) {
            console.log(`Reason: No assessor assigned`);
          } else if (batch.isAssessorBatchEndNotified) {
            console.log(`Reason: Assessor already notified`);
          }
        }

        // Send email to training partner if not already notified and training partner exists
        if (batch.examCenterId?.trainingPartner && !batch.isTrainingPartnerBatchEndNotified) {
          console.log(`\n--- Sending training partner notification for batch: ${batch.batchId} ---`);
          trainingPartnerEmailSent = await sendBatchEndEmails(batch, 'trainingPartner');
          console.log(`Training partner email result: ${trainingPartnerEmailSent ? 'SUCCESS' : 'FAILED'}`);
        } else {
          console.log(`\n--- Skipping training partner notification for batch: ${batch.batchId} ---`);
          if (!batch.examCenterId) {
            console.log(`Reason: No exam center assigned`);
          } else if (!batch.examCenterId.trainingPartner) {
            console.log(`Reason: No training partner assigned to exam center`);
          } else if (batch.isTrainingPartnerBatchEndNotified) {
            console.log(`Reason: Training partner already notified`);
          }
        }

        // Update notification flags based on successful email sending
        const updateFields = {};
        
        if (assessorEmailSent) {
          updateFields.isAssessorBatchEndNotified = true;
          updateFields.assessorNotificationSentAt = new Date();
        }
        
        if (trainingPartnerEmailSent) {
          updateFields.isTrainingPartnerBatchEndNotified = true;
          updateFields.trainingPartnerNotificationSentAt = new Date();
        }

        // Update the batch with notification flags
        if (Object.keys(updateFields).length > 0) {
          await Batch.findByIdAndUpdate(batch._id, updateFields);
          console.log(`✅ Updated notification flags for batch: ${batch.batchId}`, updateFields);
        } else {
          console.log(`⚠️ No notification flags updated for batch: ${batch.batchId}`);
        }

      } catch (batchError) {
        console.error(`❌ Error processing batch ${batch.batchId}:`, batchError.message);
        console.error(`Full batch error:`, batchError);
      }
    }
    
    console.log("=== Batch end notification check completed ===");
    
  } catch (error) {
    console.error("❌ Batch end notification cron error:", error.message);
    console.error("Full cron error:", error);
  }
});

module.exports = {
  // Export for testing purposes
  checkBatchEndNotifications: async () => {
    console.log("Manual batch end notification check triggered");
    // The same logic can be extracted to a function if needed for manual triggers
  }
}; 