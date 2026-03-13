const downloadYearlyReport = async (req, res) => {
    try {
        // Using the financial year date range from the last update
        const currentCalYear = new Date().getFullYear();
        const startDate = new Date(`${currentCalYear - 1}-04-01T00:00:00.000Z`);
        const endDate = new Date(`${currentCalYear}-03-31T23:59:59.999Z`);

        // --- Fetch and Aggregate Filtered Data Concurrently ---

        const batchDataPromise = Batch.aggregate([
            {
                $match: {
                    batchStartDate: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: { $year: '$batchStartDate' },
                    totalBatches: { $sum: 1 },
                    assessors: { $addToSet: '$accessorId' },
                    trainingCenters: { $addToSet: '$examCenterId' },
                    languages: {
                        $push: {
                            primary: '$questionPaper.primaryLanguage',
                            secondary: '$questionPaper.secondaryLanguage',
                        },
                    },
                },
            },
            { $sort: { _id: -1 } },
        ]);

        const candidateDataPromise = Candidate.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate, $type: "date" }
                }
            },
            {
                $group: {
                    _id: { $year: '$createdAt' },
                    totalCandidates: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } },
        ]);

        const qbDataPromise = QuestionBank.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate, $type: "date" }
                }
            },
            {
                $group: {
                    _id: { $year: '$createdAt' },
                    totalQuestionBanks: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } },
        ]);

        const resultsAggregationPipeline = [
            { $lookup: { from: 'batches', localField: 'batch_mongo_id', foreignField: '_id', as: 'batchInfo' } },
            { $unwind: '$batchInfo' },
            {
                $match: {
                    'batchInfo.batchStartDate': { $gte: startDate, $lte: endDate }
                }
            },
            {
                $project: {
                    year: { $year: '$batchInfo.batchStartDate' },
                    client: '$batchInfo.clientname',
                    jobRole: '$batchInfo.jobRoleNames',
                    result: 1,
                },
            },
            {
                $group: {
                    _id: { year: '$year', client: '$client', jobRole: '$jobRole' },
                    total: { $sum: 1 },
                    pass: { $sum: { $cond: [{ $eq: ['$result', 'Pass'] }, 1, 0] } },
                    fail: { $sum: { $cond: [{ $eq: ['$result', 'Fail'] }, 1, 0] } },
                },
            },
            {
                 $project: {
                    _id: 0,
                    year: '$_id.year',
                    client: '$_id.client',
                    jobRole: '$_id.jobRole',
                    total: 1, pass: 1, fail: 1
                 }
            },
            { $sort: { year: -1, client: 1 } },
        ];
        
        const onlineResultsPromise = OnlineResult.aggregate(resultsAggregationPipeline);
        const offlineResultsPromise = OfflineResult.aggregate(resultsAggregationPipeline);

        const [batchData, candidateData, qbData, onlineResults, offlineResults] = await Promise.all([
            batchDataPromise,
            candidateDataPromise,
            qbDataPromise,
            onlineResultsPromise,
            offlineResultsPromise,
        ]);
        
        // --- Process and Consolidate Data ---
        
        const yearlyData = {};

        // 👇👇👇 MODIFIED SECTION 1: Reverted initYear helper function 👇👇👇
        const initYear = (year) => {
            if (!year) return;
            if (!yearlyData[year]) {
                yearlyData[year] = {
                    totalBatches: 0,
                    numAssessors: 0,
                    numTrainingCenters: 0,
                    totalCandidates: 0,
                    totalQuestionBanks: 0,
                    languages: {}, // Changed back to an object
                };
            }
        };
        // 👆👆👆 END OF MODIFIED SECTION 1 👆👆👆

        batchData.forEach(item => {
            const year = item._id;
            initYear(year);
            yearlyData[year].totalBatches = item.totalBatches;
            yearlyData[year].numAssessors = item.assessors.filter(id => id).length;
            yearlyData[year].numTrainingCenters = item.trainingCenters.filter(id => id).length;
            
            // 👇👇👇 MODIFIED SECTION 2: Reverted language counting logic 👇👇👇
            item.languages.forEach(langPair => {
                const ensureLang = (langKey) => {
                    if (!yearlyData[year].languages[langKey]) {
                        yearlyData[year].languages[langKey] = { primary: 0, secondary: 0 };
                    }
                };

                if (langPair.primary && typeof langPair.primary === 'string') {
                    const langKey = langPair.primary.trim().toLowerCase();
                    ensureLang(langKey);
                    yearlyData[year].languages[langKey].primary++;
                }
                if (langPair.secondary && typeof langPair.secondary === 'string') {
                    const langKey = langPair.secondary.trim().toLowerCase();
                    ensureLang(langKey);
                    yearlyData[year].languages[langKey].secondary++;
                }
            });
            // 👆👆👆 END OF MODIFIED SECTION 2 👆👆👆
        });

        candidateData.forEach(item => {
            const year = item._id;
            initYear(year);
            yearlyData[year].totalCandidates = item.totalCandidates;
        });

        qbData.forEach(item => {
            const year = item._id;
            initYear(year);
            yearlyData[year].totalQuestionBanks = item.totalQuestionBanks;
        });

        const combinedResults = [...onlineResults, ...offlineResults];
        const finalResultsList = Object.values(combinedResults.reduce((acc, res) => {
            if (!res.year || !res.client) return acc;
            const key = `${res.year}-${res.client}-${String(res.jobRole)}`;
            if (!acc[key]) {
                acc[key] = { ...res };
            } else {
                acc[key].total += res.total;
                acc[key].pass += res.pass;
                acc[key].fail += res.fail;
            }
            return acc;
        }, {}));

        // --- Generate Excel Workbook ---
        const workbook = new excel.Workbook();
        workbook.creator = 'System';
        
        const summarySheet = workbook.addWorksheet('Yearly Summary');
        summarySheet.columns = [
            { header: 'Year', key: 'year', width: 10 },
            { header: 'Total Batches', key: 'totalBatches', width: 20 },
            { header: 'Total Candidates', key: 'totalCandidates', width: 25 },
            { header: 'Question Banks Uploaded', key: 'questionBanks', width: 30 },
            { header: 'Unique Assessors', key: 'numAssessors', width: 25 },
            { header: 'Unique Training Centers', key: 'numTrainingCenters', width: 30 },
        ];
        
        Object.keys(yearlyData).sort((a, b) => b - a).forEach(year => {
            summarySheet.addRow({
                year: year,
                totalBatches: yearlyData[year].totalBatches,
                totalCandidates: yearlyData[year].totalCandidates,
                questionBanks: yearlyData[year].totalQuestionBanks,
                numAssessors: yearlyData[year].numAssessors,
                numTrainingCenters: yearlyData[year].numTrainingCenters,
            });
        });

        // 👇👇👇 MODIFIED SECTION 3: "Language Summary" sheet reverted to detailed view 👇👇👇
        const langSheet = workbook.addWorksheet('Language Summary');
        langSheet.columns = [
            { header: 'Year', key: 'year', width: 10 },
            { header: 'Language', key: 'language', width: 20 },
            { header: 'Primary Language Count', key: 'primary', width: 25 },
            { header: 'Secondary Language Count', key: 'secondary', width: 25 },
            { header: 'Total Batches', key: 'total', width: 20 },
        ];
        
        Object.keys(yearlyData).sort((a, b) => b - a).forEach(year => {
            const languages = yearlyData[year].languages;
            Object.keys(languages).forEach(lang => {
                const langData = languages[lang];
                const capitalizedLang = lang.charAt(0).toUpperCase() + lang.slice(1);
                langSheet.addRow({
                    year: year,
                    language: capitalizedLang,
                    primary: langData.primary,
                    secondary: langData.secondary,
                    total: langData.primary + langData.secondary
                });
            });
        });
        // 👆👆👆 END OF MODIFIED SECTION 3 👆👆👆

        const resultsSheet = workbook.addWorksheet('Results Summary');
        resultsSheet.columns = [
            { header: 'Year', key: 'year', width: 10 },
            { header: 'Client', key: 'client', width: 35 },
            { header: 'Job Role', key: 'jobRole', width: 35 },
            { header: 'Total Candidates', key: 'total', width: 20 },
            { header: 'Pass', key: 'pass', width: 15 },
            { header: 'Fail', key: 'fail', width: 15 },
        ];
        resultsSheet.addRows(finalResultsList);
        
        [summarySheet, langSheet, resultsSheet].forEach(sheet => {
            const headerRow = sheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FF4472C4'}};
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // --- Send Response ---
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Financial_Report_${startDate.getFullYear()}-${endDate.getFullYear()}.xlsx`);
        
        await workbook.xlsx.write(res);
        res.status(200).end();

    } catch (error) {
        console.error("❌ Failed to generate yearly report:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

module.exports = downloadYearlyReport;
