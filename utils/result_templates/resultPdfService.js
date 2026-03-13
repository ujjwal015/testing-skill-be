const {
    generateResultPDFWithHeaderCSDCI,
    generateResultPDFWithHeaderTHSC,
    generateResultPDFTelecom,
    generateResultPDFRetail,
    generateResultPDFLSSSDC,
    generateResultPDFWithHeaderFFICSI,
    generateResultPDFWithHeaderDefault
} = require("../resultPdfGenerator");

exports.getResultPDFByClient = async (client, payload) => {

    switch (client) {
        case "CSDCI":
            return await generateResultPDFWithHeaderCSDCI(payload);  /// Done
        case "THSC":
            return await generateResultPDFWithHeaderTHSC(payload);   // Done

        case "TSSC":
            return await generateResultPDFTelecom(payload);  /// Done

        case "RASCI":
            return await generateResultPDFRetail(payload);   /// Done

        case "LSSSD":
            return await generateResultPDFLSSSDC(payload); // Done

        case "FICSI":
            return await generateResultPDFWithHeaderFFICSI(payload); // Done
        default:
            console.log("Unknown client:", client, "→ Using Default template");
            return await generateResultPDFWithHeaderDefault(payload);
    }
};

