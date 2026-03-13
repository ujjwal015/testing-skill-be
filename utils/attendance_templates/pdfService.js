
const {
    generateAttendancePDFWithHeaderCSDCI,
    generateAttendancePDFWithHeaderTHSC,
    generateAttendancePDFTelecom,
    generateAttendancePDFRetail,
    generateAttendancePDFLSSSDC,
    generateAttendancePDFFICSI,
    generateAttendancePDFWithHeaderDefault
} = require("../attendancePdfGenerator"); 

exports.getPDFByClient = async (client, payload) => {

    switch (client) {
        case "CSDCI":
            return await generateAttendancePDFWithHeaderCSDCI(payload);

        case "THSC":
            return await generateAttendancePDFWithHeaderTHSC(payload);

        case "TSSC":
            return await generateAttendancePDFTelecom(payload);

        case "RASCI":
            return await generateAttendancePDFRetail(payload);

        case "LSSSD":
            return await generateAttendancePDFLSSSDC(payload);

        case "FICSI":
            return await generateAttendancePDFFICSI(payload);

        default:
            console.log("Unknown client:", client, "→ Using Default template");
            return await generateAttendancePDFWithHeaderDefault(payload);
    }
};
