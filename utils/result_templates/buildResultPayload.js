module.exports = function buildAttendancePayload(batch, candidates) {
  const tp = batch.examCenterId?.trainingPartner;
  const ec = batch.examCenterId;
  const ac = batch.accessorId;

  return {
    // Training Provider
    trainingProvider: tp?.trainingPartner || "",
    trainingProviderID: tp?.tpId || "",
    trainingProviderAddress: tp?.address || "",
    trainingProviderState: tp?.state || "",

    spocName: tp?.spocName || "",
    spocContact: tp?.spocContact || tp?.spocMobile || "",
    spocEmail: tp?.spocEmail || "",

    // Exam Center
    examCentreName: ec?.examCenterName || "",
    trainingCenterId: ec?.trainingCenterId || "",
    examCenterAddress: ec?.examCenterAddress || ec?.address || "",
    examCenterState: ec?.state || "",
    examCenterDistrict: ec?.district || "",

    //  Batch Details
    batchSize: batch.batchSize || candidates.length,
    batchType: batch.batchMode || "",
    batchId: batch.batchId || "",
    batchName: batch.batchId || "",
    batchStartDate: batch.startDate || "",
    batchEndDate: batch.endDate || "",
    schemeName: batch.schemeName || "",
    subSchemeName: batch.subSchemeName || "",
    enrolledCandidates: candidates.length,
    assessmentDate: batch.startDate || "",

    //  Job Role
    jobRole: batch.jobRole?.jobRole || "",
    qpCode: batch.jobRole?.qpCode || "",

    // Client
    clientName:
      batch.clientId?.clientname || batch.clientId?.clientName || "",
    clientCode:
      batch.clientId?.clientcode || batch.clientId?.clientCode || "",

    // Assessor
    accessorName: ac?.fullName || "",
    accessorContact: ac?.mobile || "",
    accessorEmail: ac?.email || "",
    assessorSipId: ac?.assessorSipId || "",

    //  Candidates
    candidates: candidates.map((c) => ({
      name: c.name || "",
      candidateId: c.candidateId || "NA",
      aadharLast4: c.aadharNo ? c.aadharNo.slice(-4) : "----",
      date: batch.startDate,
      mobile: c.mobile || "",
      candidateType: c.candidateType || "",
      fatherName: c.fatherName || "",
      eligibility: c.eligibility || "",
    })),
  };
};
