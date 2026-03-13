const Batch = require('../models/batch-model');
const connectDB = require("../config/db");


const batchEnhancement = async () => {
    await connectDB()
    console.log('Starting batch enhancement...')
    try {
        const incompleteBatches = await Batch.find({
            $or: [
                { batchStartDate: { $exists: false } },
                { batchStartDate: null },
                { batchEndDate: { $exists: false } },
                { batchEndDate: null }
            ]
        }).select('startDate endDate batchStartDate batchEndDate startDateTime endDateTime');

        // Update incomplete batches with batchStartDate and batchEndDate
        const updatePromises = incompleteBatches.map(batch => {
            const updateData = {};

            updateData.batchStartDate = batch.startDateTime;
            updateData.batchEndDate = batch.endDateTime;


            // Only update if there's data to update
            if (Object.keys(updateData).length > 0) {
                return Batch.findByIdAndUpdate(batch._id, updateData, { new: true });
            }

            return Promise.resolve(batch);
        });

        // Execute all updates
        await Promise.all(updatePromises);

        console.log("Batch enhancement completed")
    } catch (error) {
        console.error('Error fetching incomplete batches:', error);
    }
}

batchEnhancement()