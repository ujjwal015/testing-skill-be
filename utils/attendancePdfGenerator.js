const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

exports.generateAttendancePDF = async (payload) => {
    try {
        const file = path.resolve(__dirname, "attendance_templates/csdci.html");
        let html = fs.readFileSync(file,"utf8");

        const skillLogoPath = path.resolve(__dirname,"../public/skill-india-big-logo.svg");
        const nsdcLogoPath  = path.resolve(__dirname,"../public/logo_nsdc.svg");
        const radiant = path.resolve(__dirname,"../public/radiant-logo.svg");
        const csdciLogoPath = path.resolve(__dirname,"../public/CSDC-logo.jpg");

        const skillLogoBase64 = fs.readFileSync(skillLogoPath,"base64");
        const nsdcLogoBase64  = fs.readFileSync(nsdcLogoPath,"base64");
        const radiantBase64   = fs.readFileSync(radiant,"base64");
        const csdciLogoBase64 = fs.readFileSync(csdciLogoPath,"base64");
        //  Inject logos into HTML
        html = html
            .replace("{{skillLogoBase64}}", skillLogoBase64)
            .replace("{{nsdcLogoBase64}}", nsdcLogoBase64)
            .replace("{{radiantBase64}}", radiantBase64)
            .replace("{{csdciLogoBase64}}", csdciLogoBase64);
        //  Inject dynamic fields
        html = html.replace(/{{(\w+)}}/g, (_, key) => payload[key] || "");

        //  Candidate Table Rows
        let rows = "";
        payload.candidates.forEach((c,i)=>{
            rows += `
            <tr>
                <td>${i+1}</td>
                <td>${c.date}</td>
                <td>${c.candidateId}</td>
                <td>${c.aadharLast4}</td>
                <td>${c.name}</td>
                <td>${c.vaccinated}</td>
                <td></td>
            </tr>`;
        });

        html = html.replace("{{tableRows}}", rows);

        //  Generate PDF
        const browser = await puppeteer.launch({
            headless:"new",
            args:["--no-sandbox","--disable-setuid-sandbox"]
        });

        const page = await browser.newPage();
        await page.setContent(html,{ waitUntil:"networkidle0" });

        const pdf = await page.pdf({
            format:"A4",
            width:"210mm", height:"297mm",

            printBackground:true,
            omitBackground:false,
            preferCSSPageSize:true,
            landscape:false,
            scale:1,

            margin:{
                top:"90px",
                bottom:"50px",
                left:"15mm",
                right:"15mm"
            },

            displayHeaderFooter:true,
            headerTemplate:`<div style="font-size:10px;text-align:center;">My Name is ankush</div>`,
            footerTemplate:`<div style="font-size:10px;width:100%;text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,

            pageRanges:"1-999",
            timeout:0,
            waitForFonts:true,
            tagged:true
        });


        await browser.close();
        return pdf;
    }
    catch(err){
        console.log("🚫 PDF Generation Error:",err.message);
        throw err;
    }
};


exports.generateAttendancePDFWithHeaderCSDCI = async (payload) => {
    try {
        const file = path.resolve(__dirname, "attendance_templates/csdci/csdci.html");
        let html = fs.readFileSync(file,"utf8");

        const skillLogoBase64 = fs.readFileSync(path.resolve(__dirname,"../public/skill-india-big-logo.svg"),"base64");
        const nsdcLogoBase64  = fs.readFileSync(path.resolve(__dirname,"../public/logo_nsdc.svg"),"base64");
        const radiantBase64   = fs.readFileSync(path.resolve(__dirname,"../public/radiant-logo.svg"),"base64");
        const csdciLogoBase64 = fs.readFileSync(path.resolve(__dirname,"../public/CSDC-logo.jpg"),"base64");

        html = html
            .replace(/{{skillLogoBase64}}/g, skillLogoBase64)
            .replace(/{{nsdcLogoBase64}}/g, nsdcLogoBase64)
            .replace(/{{radiantBase64}}/g, radiantBase64)
            .replace(/{{csdciLogoBase64}}/g, csdciLogoBase64)
            .replace(/{{trainingProvider}}/g, payload.trainingProvider)
            .replace(/{{trainingCentre}}/g, payload.trainingCentre)
            .replace(/{{examCentreName}}/g, payload.examCentreName)
            .replace(/{{trainingProviderAddress}}/g, payload.trainingProviderAddress)
            .replace(/{{qpCode}}/g, payload.qpCode)
            .replace(/{{trainingProviderID}}/g, payload.trainingProviderID)
            .replace(/{{assessorSipId}}/g, payload.assessorSipId)
            .replace(/{{accessorName}}/g, payload.accessorName)
            .replace(/{{batchStartDate}}/g, payload.batchStartDate)
            .replace(/{{batchEndDate}}/g, payload.batchEndDate)
            .replace(/{{scheme}}/g, payload.schemeName)
            .replace(/{{subSchemeName}}/g, payload.subSchemeName)
            .replace(/{{agency}}/g, payload.agency)
            .replace(/{{address}}/g, payload.address)
            .replace(/{{assessmentDate}}/g, payload.batchStartDate)
            .replace(/{{batchSize}}/g, payload.batchSize)
            .replace(/{{batchType}}/g, payload.batchType)
            .replace(/{{batchName}}/g, payload.batchName)
            .replace(/{{enrolledCandidates}}/g, payload.enrolledCandidates)
            .replace(/{{jobRole}}/g, payload.jobRole)
            .replace(/{{spocName}}/g, payload.spocName)
            .replace(/{{spocEmail}}/g, payload.spocEmail)
            .replace(/{{spocContact}}/g, payload.spocContact)
            .replace(/{{accessorContact}}/g, payload.accessorContact)
            .replace(/{{accessorEmail}}/g, payload.accessorEmail)
            .replace(/{{trainingProviderState}}/g, payload.trainingProviderState)
            .replace(/{{dropout}}/g, payload.dropout);

        let rows = "";
            payload.candidates.forEach((c,i)=> rows += `
            <tr>
            <td style="border:1px solid #000;padding:10px;">${i+1}</td>
            <td style="border:1px solid #000;padding:10px;">${c.date}</td>
            <td style="border:1px solid #000;padding:10px;">${c.candidateId}</td>
            <td style="border:1px solid #000;padding:10px;"></td>
            <td style="border:1px solid #000;padding:10px;text-align:center;">${c.name}</td>
            <td style="border:1px solid #000;padding:10px;text-align:center;"></td>
            <td style="border:1px solid #000;padding:10px;">${c.eligibility === "no" ? "Not Eligible" : ""}</td>
            </tr>
            `);

        html = html.replace("{{tableRows}}", rows);

        //   HEADER TEMPLATE 
        let headerTemplate = fs.readFileSync(
            path.join(__dirname,"attendance_templates/csdci/header_template.html"),"utf8"
        );

        headerTemplate = headerTemplate
            .replace(/{{skillLogoBase64}}/g, skillLogoBase64)
            .replace(/{{nsdcLogoBase64}}/g, nsdcLogoBase64)
            .replace(/{{radiantBase64}}/g, radiantBase64)
            .replace(/{{csdciLogoBase64}}/g, csdciLogoBase64)
            .replace(/{{trainingProvider}}/g, payload.trainingProvider)
            .replace(/{{trainingCentre}}/g, payload.trainingCentre)
            .replace(/{{examCentreName}}/g, payload.examCentreName)
            .replace(/{{trainingProviderAddress}}/g, payload.trainingProviderAddress)
            .replace(/{{qpCode}}/g, payload.qpCode)
            .replace(/{{trainingProviderID}}/g, payload.trainingProviderID)
            .replace(/{{assessorSipId}}/g, payload.assessorSipId)
            .replace(/{{accessorName}}/g, payload.accessorName)
            .replace(/{{batchStartDate}}/g, payload.batchStartDate)
            .replace(/{{batchEndDate}}/g, payload.batchEndDate)
            .replace(/{{scheme}}/g, payload.schemeName)
            .replace(/{{subSchemeName}}/g, payload.subSchemeName)
            .replace(/{{agency}}/g, payload.agency)
            .replace(/{{address}}/g, payload.address)
            .replace(/{{assessmentDate}}/g, payload.batchStartDate)
            .replace(/{{batchSize}}/g, payload.batchSize)
            .replace(/{{batchType}}/g, payload.batchType)
            .replace(/{{batchName}}/g, payload.batchName)
            .replace(/{{enrolledCandidates}}/g, payload.enrolledCandidates)
            .replace(/{{jobRole}}/g, payload.jobRole)
            .replace(/{{spocName}}/g, payload.spocName)
            .replace(/{{spocEmail}}/g, payload.spocEmail)
            .replace(/{{spocContact}}/g, payload.spocContact)
            .replace(/{{accessorContact}}/g, payload.accessorContact)
            .replace(/{{accessorEmail}}/g, payload.accessorEmail)
            .replace(/{{trainingProviderState}}/g, payload.trainingProviderState)
            .replace(/{{dropout}}/g, payload.dropout);

        // ==================== Generate PDF ====================
        const browser = await puppeteer.launch({ headless:"new", args:["--no-sandbox","--disable-setuid-sandbox"] });
        const page = await browser.newPage();
        await page.setContent(html,{ waitUntil:"networkidle0" });

        const pdf = await page.pdf({
            format:"A4",
            printBackground:true,
            displayHeaderFooter:true,
            margin:{ top:"273px", bottom:"140px", left:"30px", right:"30px" }, 
            headerTemplate: headerTemplate,
            footerTemplate:`<div style="font-size:10px;width:100%;text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
            pageRanges:"1-999",
            timeout:0,
            waitForFonts:true,
            tagged:true
        });

        await browser.close();
        return pdf;

    } catch(err){
        console.log("🚫 PDF Generation Error:",err.message);
        throw err;
    }
};

exports.generateAttendancePDFWithHeaderTHSC = async (payload) => {
    try {
        const file = path.resolve(__dirname, "attendance_templates/thsc/thsc.html");
        let html = fs.readFileSync(file,"utf8");

        const thscLogoBase64  = fs.readFileSync(path.resolve(__dirname,"../public/thsc-logo.jpg"),"base64");
        const radiantBase64   = fs.readFileSync(path.resolve(__dirname,"../public/radiant-logo.svg"),"base64");
        
        html = html
            .replace(/{{thscLogoBase64}}/g, thscLogoBase64)
            .replace(/{{radiantBase64}}/g, radiantBase64)
            .replace(/{{trainingProvider}}/g, payload.trainingProvider)
            .replace(/{{trainingCentre}}/g, payload.trainingCentre)
            .replace(/{{examCentreName}}/g, payload.examCentreName)
            .replace(/{{trainingProviderAddress}}/g, payload.trainingProviderAddress)
            .replace(/{{qpCode}}/g, payload.qpCode)
            .replace(/{{trainingProviderID}}/g, payload.trainingProviderID)
            .replace(/{{assessorSipId}}/g, payload.assessorSipId)
            .replace(/{{accessorName}}/g, payload.accessorName)
            .replace(/{{batchStartDate}}/g, payload.batchStartDate)
            .replace(/{{scheme}}/g, payload.schemeName)
            .replace(/{{subSchemeName}}/g, payload.subSchemeName)
            .replace(/{{agency}}/g, payload.agency)
            .replace(/{{address}}/g, payload.address)
            .replace(/{{assessmentDate}}/g, payload.batchStartDate)
            .replace(/{{batchSize}}/g, payload.batchSize)
            .replace(/{{batchType}}/g, payload.batchType)
            .replace(/{{batchName}}/g, payload.batchName)
            .replace(/{{enrolledCandidates}}/g, payload.enrolledCandidates)
            .replace(/{{jobRole}}/g, payload.jobRole)
            .replace(/{{spocName}}/g, payload.spocName)
            .replace(/{{spocEmail}}/g, payload.spocEmail)
            .replace(/{{spocContact}}/g, payload.spocContact)
            .replace(/{{accessorContact}}/g, payload.accessorContact)
            .replace(/{{accessorEmail}}/g, payload.accessorEmail)
            .replace(/{{trainingProviderState}}/g, payload.trainingProviderState)
            .replace(/{{dropout}}/g, payload.dropout);

        //  Inject table rows data
        let rows = "";
            payload.candidates.forEach((c,i)=> rows += `
            <tr>
            <td style="border:1px solid #000;padding:10px;">${i+1}</td>
            <td style="border:1px solid #000;padding:10px;">${c.candidateId}</td>
            <td style="border:1px solid #000;padding:10px;">${c.name}</td>
            <td style="border:1px solid #000;padding:10px;text-align:center;"></td>
            <td style="border:1px solid #000;padding:10px;"></td>
            <td style="border:1px solid #000;padding:10px;text-align:center;">${c.eligibility === "no" ? "Not Eligible" : ""}</td>
            </tr>
            `);

        html = html.replace("{{tableRows}}", rows);

        // ==================== Generate PDF ====================
        const browser = await puppeteer.launch({ headless:"new", args:["--no-sandbox","--disable-setuid-sandbox"] });
        const page = await browser.newPage();
        await page.setContent(html,{ waitUntil:"networkidle0" });

        const pdf = await page.pdf({
            format:"A4",
            printBackground:true,
            displayHeaderFooter:true,
            margin:{ top:"30px", bottom:"140px", left:"30px", right:"30px" }, 
            footerTemplate:`<div style="font-size:10px;width:100%;text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
            pageRanges:"1-999",
            timeout:0,
            waitForFonts:true,
            tagged:true
        });

        await browser.close();
        return pdf;

    } catch(err){
        console.log("🚫 PDF Generation Error:",err.message);
        throw err;
    }
};

exports.generateAttendancePDFTelecom = async (payload) => {
    try {
        const file = path.resolve(__dirname, "attendance_templates/telecom/telecom.html");
        let html = fs.readFileSync(file,"utf8");

        const telecomLogoBase64  = fs.readFileSync(path.resolve(__dirname,"../public/telecomlogo.png"),"base64");
        const radiantBase64   = fs.readFileSync(path.resolve(__dirname,"../public/radiant-logo.svg"),"base64");
        
        html = html
            .replace(/{{telecomLogoBase64}}/g, telecomLogoBase64)
            .replace(/{{radiantBase64}}/g, radiantBase64)
            .replace(/{{trainingProvider}}/g, payload.trainingProvider)
            .replace(/{{trainingCentre}}/g, payload.trainingCentre)
            .replace(/{{examCentreName}}/g, payload.examCentreName)
            .replace(/{{trainingProviderAddress}}/g, payload.trainingProviderAddress)
            .replace(/{{qpCode}}/g, payload.qpCode)
            .replace(/{{trainingProviderID}}/g, payload.trainingProviderID)
            .replace(/{{assessorSipId}}/g, payload.assessorSipId)
            .replace(/{{accessorName}}/g, payload.accessorName)
            .replace(/{{batchStartDate}}/g, payload.batchStartDate)
            .replace(/{{scheme}}/g, payload.schemeName)
            .replace(/{{subSchemeName}}/g, payload.subSchemeName)
            .replace(/{{agency}}/g, payload.agency)
            .replace(/{{address}}/g, payload.address)
            .replace(/{{assessmentDate}}/g, payload.batchStartDate)
            .replace(/{{batchSize}}/g, payload.batchSize)
            .replace(/{{batchType}}/g, payload.batchType)
            .replace(/{{batchName}}/g, payload.batchName)
            .replace(/{{enrolledCandidates}}/g, payload.enrolledCandidates)
            .replace(/{{jobRole}}/g, payload.jobRole)
            .replace(/{{spocName}}/g, payload.spocName)
            .replace(/{{spocEmail}}/g, payload.spocEmail)
            .replace(/{{spocContact}}/g, payload.spocContact)
            .replace(/{{accessorContact}}/g, payload.accessorContact)
            .replace(/{{accessorEmail}}/g, payload.accessorEmail)
            .replace(/{{dropout}}/g, payload.dropout);

        //  Inject table rows data
        let rows = "";
            payload.candidates.forEach((c,i)=> rows += `
            <tr>
            <td style="border:1px solid #000;padding:10px;">${i+1}</td>
            <td style="border:1px solid #000;padding:10px;">${c.candidateId}</td>
            <td style="border:1px solid #000;padding:10px;">${c.name}</td>
            <td style="border:1px solid #000;padding:10px;text-align:center;">${c.fatherName}</td>
            <td style="border:1px solid #000;padding:10px;"></td>
            <td style="border:1px solid #000;padding:10px;text-align:center;"></td>
            <td style="border:1px solid #000;padding:10px;">${c.eligibility === "no" ? "Not Eligible" : ""}</td>
            <td style="border:1px solid #000;padding:10px;">${c.eligibility === "no" ? "Not Eligible" : ""}</td>
            </tr>
            `);

        html = html.replace("{{tableRows}}", rows);

        // ==================== Generate PDF ====================
        const browser = await puppeteer.launch({ headless:"new", args:["--no-sandbox","--disable-setuid-sandbox"] });
        const page = await browser.newPage();
        await page.setContent(html,{ waitUntil:"networkidle0" });

        const pdf = await page.pdf({
            format:"A4",
            printBackground:true,
            displayHeaderFooter:true,
            margin:{ top:"30px", bottom:"140px", left:"30px", right:"30px" }, 
            footerTemplate:`<div style="font-size:10px;width:100%;text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
            pageRanges:"1-999",
            timeout:0,
            waitForFonts:true,
            tagged:true
        });

        await browser.close();
        return pdf;

    } catch(err){
        console.log("🚫 PDF Generation Error:",err.message);
        throw err;
    }
};

exports.generateAttendancePDFRetail = async (payload) => {
    try {
        const file = path.resolve(__dirname, "attendance_templates/retail/retail.html");
        let html = fs.readFileSync(file,"utf8");

        const retailLogoBase64  = fs.readFileSync(path.resolve(__dirname,"../public/retail-logo.jpg"),"base64");
        const radiantBase64   = fs.readFileSync(path.resolve(__dirname,"../public/radiant-logo.svg"),"base64");
        
        html = html
            .replace(/{{retailLogoBase64}}/g, retailLogoBase64)
            .replace(/{{radiantBase64}}/g, radiantBase64)
            .replace(/{{trainingProvider}}/g, payload.trainingProvider)
            .replace(/{{trainingCentre}}/g, payload.trainingCentre)
            .replace(/{{examCentreName}}/g, payload.examCentreName)
            .replace(/{{trainingProviderAddress}}/g, payload.trainingProviderAddress)
            .replace(/{{qpCode}}/g, payload.qpCode)
            .replace(/{{trainingProviderID}}/g, payload.trainingProviderID)
            .replace(/{{assessorSipId}}/g, payload.assessorSipId)
            .replace(/{{accessorName}}/g, payload.accessorName)
            .replace(/{{batchStartDate}}/g, payload.batchStartDate)
            .replace(/{{scheme}}/g, payload.schemeName)
            .replace(/{{subSchemeName}}/g, payload.subSchemeName)
            .replace(/{{agency}}/g, payload.agency)
            .replace(/{{address}}/g, payload.address)
            .replace(/{{assessmentDate}}/g, payload.batchStartDate)
            .replace(/{{batchSize}}/g, payload.batchSize)
            .replace(/{{batchName}}/g, payload.batchName)
            .replace(/{{enrolledCandidates}}/g, payload.enrolledCandidates)
            .replace(/{{jobRole}}/g, payload.jobRole)
            .replace(/{{dropout}}/g, payload.dropout);

        //  Inject table rows data
        let rows = "";
            payload.candidates.forEach((c,i)=> rows += `
            <tr>
            <td style="border:1px solid #000;padding:10px;">${i+1}</td>
            <td style="border:1px solid #000;padding:10px;">${c.name}</td>
            <td style="border:1px solid #000;padding:10px;">${c.candidateId}</td>
            <td style="border:1px solid #000;padding:10px;"></td>
            <td style="border:1px solid #000;padding:10px;">${c.mobile}</td>
            <td style="border:1px solid #000;padding:10px;">${c.eligibility === "no" ? "Not Eligible" : ""}</td>
            </tr>
            `);

        html = html.replace("{{tableRows}}", rows);

        // ==================== Generate PDF ====================
        const browser = await puppeteer.launch({ headless:"new", args:["--no-sandbox","--disable-setuid-sandbox"] });
        const page = await browser.newPage();
        await page.setContent(html,{ waitUntil:"networkidle0" });

        const pdf = await page.pdf({
            format:"A4",
            printBackground:true,
            displayHeaderFooter:true,
            margin:{ top:"30px", bottom:"140px", left:"30px", right:"30px" }, 
            footerTemplate:`<div style="font-size:10px;width:100%;text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
            pageRanges:"1-999",
            timeout:0,
            waitForFonts:true,
            tagged:true
        });

        await browser.close();
        return pdf;

    } catch(err){
        console.log("🚫 PDF Generation Error:",err.message);
        throw err;
    }
};

exports.generateAttendancePDFLSSSDC = async (payload) => {
    try {
        const file = path.resolve(__dirname, "attendance_templates/lsssdc/lsssdc.html");
        let html = fs.readFileSync(file,"utf8");

        const lsssdcLogoBase64  = fs.readFileSync(path.resolve(__dirname,"../public/lsssdc.png"),"base64");
        const radiantBase64   = fs.readFileSync(path.resolve(__dirname,"../public/radiant-logo.svg"),"base64");
        
        html = html
            .replace(/{{lsssdcLogoBase64}}/g, lsssdcLogoBase64)
            .replace(/{{radiantBase64}}/g, radiantBase64)
            .replace(/{{trainingProvider}}/g, payload.trainingProvider)
            .replace(/{{trainingCentre}}/g, payload.trainingCentre)
            .replace(/{{examCentreName}}/g, payload.examCentreName)
            .replace(/{{trainingProviderAddress}}/g, payload.trainingProviderAddress)
            .replace(/{{qpCode}}/g, payload.qpCode)
            .replace(/{{trainingProviderID}}/g, payload.trainingProviderID)
            .replace(/{{assessorSipId}}/g, payload.assessorSipId)
            .replace(/{{accessorName}}/g, payload.accessorName)
            .replace(/{{batchStartDate}}/g, payload.batchStartDate)
            .replace(/{{scheme}}/g, payload.schemeName)
            .replace(/{{subSchemeName}}/g, payload.subSchemeName)
            .replace(/{{agency}}/g, payload.agency)
            .replace(/{{address}}/g, payload.address)
            .replace(/{{assessmentDate}}/g, payload.batchStartDate)
            .replace(/{{batchSize}}/g, payload.batchSize)
            .replace(/{{batchName}}/g, payload.batchName)
            .replace(/{{enrolledCandidates}}/g, payload.enrolledCandidates)
            .replace(/{{jobRole}}/g, payload.jobRole)
            .replace(/{{dropout}}/g, payload.dropout);

        //  Inject table rows data
        let rows = "";
            payload.candidates.forEach((c,i)=> rows += `
            <tr>
            <td style="border:1px solid #000;padding:10px;">${i+1}</td>
            <td style="border:1px solid #000;padding:10px;">${c.name}</td>
            <td style="border:1px solid #000;padding:10px;">${c.candidateId}</td>
            <td style="border:1px solid #000;padding:10px;"></td>
            <td style="border:1px solid #000;padding:10px;"></td>
            <td style="border:1px solid #000;padding:10px;">${c.eligibility === "no" ? "Not Eligible" : ""}</td>
            </tr>
            `);

        html = html.replace("{{tableRows}}", rows);

        // ==================== Generate PDF ====================
        const browser = await puppeteer.launch({ headless:"new", args:["--no-sandbox","--disable-setuid-sandbox"] });
        const page = await browser.newPage();
        await page.setContent(html,{ waitUntil:"networkidle0" });

        const pdf = await page.pdf({
            format:"A4",
            printBackground:true,
            displayHeaderFooter:true,
            margin:{ top:"30px", bottom:"140px", left:"30px", right:"30px" }, 
            footerTemplate:`<div style="font-size:10px;width:100%;text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
            pageRanges:"1-999",
            timeout:0,
            waitForFonts:true,
            tagged:true
        });

        await browser.close();
        return pdf;

    } catch(err){
        console.log("🚫 PDF Generation Error:",err.message);
        throw err;
    }
};

exports.generateAttendancePDFWithHeaderDefault = async (payload) => {
    try {
        const file = path.resolve(__dirname, "attendance_templates/default/default.html");
        let html = fs.readFileSync(file,"utf8");

        const thscLogoBase64  = fs.readFileSync(path.resolve(__dirname,"../public/thsc-logo.jpg"),"base64");
        const radiantBase64   = fs.readFileSync(path.resolve(__dirname,"../public/radiant-logo.svg"),"base64");
        
        html = html
            .replace(/{{thscLogoBase64}}/g, thscLogoBase64)
            .replace(/{{radiantBase64}}/g, radiantBase64)
            .replace(/{{trainingProvider}}/g, payload.trainingProvider)
            .replace(/{{trainingCentre}}/g, payload.trainingCentre)
            .replace(/{{examCentreName}}/g, payload.examCentreName)
            .replace(/{{trainingProviderAddress}}/g, payload.trainingProviderAddress)
            .replace(/{{qpCode}}/g, payload.qpCode)
            .replace(/{{trainingProviderID}}/g, payload.trainingProviderID)
            .replace(/{{assessorSipId}}/g, payload.assessorSipId)
            .replace(/{{accessorName}}/g, payload.accessorName)
            .replace(/{{batchStartDate}}/g, payload.batchStartDate)
            .replace(/{{scheme}}/g, payload.schemeName)
            .replace(/{{subSchemeName}}/g, payload.subSchemeName)
            .replace(/{{agency}}/g, payload.agency)
            .replace(/{{address}}/g, payload.address)
            .replace(/{{assessmentDate}}/g, payload.batchStartDate)
            .replace(/{{batchSize}}/g, payload.batchSize)
            .replace(/{{batchType}}/g, payload.batchType)
            .replace(/{{batchName}}/g, payload.batchName)
            .replace(/{{enrolledCandidates}}/g, payload.enrolledCandidates)
            .replace(/{{jobRole}}/g, payload.jobRole)
            .replace(/{{spocName}}/g, payload.spocName)
            .replace(/{{spocEmail}}/g, payload.spocEmail)
            .replace(/{{spocContact}}/g, payload.spocContact)
            .replace(/{{accessorContact}}/g, payload.accessorContact)
            .replace(/{{accessorEmail}}/g, payload.accessorEmail)
            .replace(/{{trainingProviderState}}/g, payload.trainingProviderState)
            .replace(/{{dropout}}/g, payload.dropout);

        
        //  Inject table rows data
        let rows = "";
            payload.candidates.forEach((c,i)=> rows += `
            <tr>
            <td style="border:1px solid #000;padding:10px;">${i+1}</td>
            <td style="border:1px solid #000;padding:10px;">${c.candidateId}</td>
            <td style="border:1px solid #000;padding:10px;">${c.name}</td>
            <td style="border:1px solid #000;padding:10px;text-align:center;"></td>
            <td style="border:1px solid #000;padding:10px;"></td>
            <td style="border:1px solid #000;padding:10px;text-align:center;">${c.eligibility === "no" ? "Not Eligible" : ""}</td>
            </tr>
            `);

        html = html.replace("{{tableRows}}", rows);

        // ==================== Generate PDF ====================
        const browser = await puppeteer.launch({ headless:"new", args:["--no-sandbox","--disable-setuid-sandbox"] });
        const page = await browser.newPage();
        await page.setContent(html,{ waitUntil:"networkidle0" });

        const pdf = await page.pdf({
            format:"A4",
            printBackground:true,
            displayHeaderFooter:true,
            margin:{ top:"30px", bottom:"140px", left:"30px", right:"30px" }, 
            footerTemplate:`<div style="font-size:10px;width:100%;text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
            pageRanges:"1-999",
            timeout:0,
            waitForFonts:true,
            tagged:true
        });

        await browser.close();
        return pdf;

    } catch(err){
        console.log("🚫 PDF Generation Error:",err.message);
        throw err;
    }
};

exports.generateCandidateListPDF = async (payload) => {
    try {
        const file = path.resolve(__dirname, "attendance_templates/candidate/candidate.html");
        let html = fs.readFileSync(file,"utf8");
        const radiantBase64   = fs.readFileSync(path.resolve(__dirname,"../public/radiant-logo.svg"),"base64");
        
        html = html.replace(/{{radiantBase64}}/g, radiantBase64);
        let linkHeader = payload.links
            ? `<th style="border:1px solid #000; padding:10px;">Login Link</th>`
            : ``;

        html = html.replace("{{linkHeader}}", linkHeader);

        let rows = "";
            payload.candidateList.forEach((c, i) => {

            let linkColumn = payload.links
                ? `<td style="border:1px solid #000; padding:10px; text-align:center;">
                        <a href="${c.urlEncodedLink}"
                           style="color:#0047ab; font-size:11px; text-decoration:none;">
                            Click Here
                        </a>
                   </td>`
                : ``;

            rows += `
            <tr>
                <td style="border:1px solid #000; padding:10px; text-align:center;">${i + 1}</td>
                <td style="border:1px solid #000; padding:10px;">${c.name || ""}</td>
                <td style="border:1px solid #000; padding:10px;">${c.userName || ""}</td>
                <td style="border:1px solid #000; padding:10px;">${c.rawPassword || ""}</td>
                <td style="border:1px solid #000; padding:10px;">${c.mobile || ""}</td>
                <td style="border:1px solid #000; padding:10px;">${c.candidateId || ""}</td>
                <td style="border:1px solid #000; padding:10px;">${c.batchId?.batchId || ""}</td>
                <td style="border:1px solid #000; padding:10px;">${c.email || ""}</td>

                ${linkColumn}
            </tr>
            `;
        });


        html = html.replace("{{tableRows}}", rows);

        // ==================== Generate PDF ====================
        const browser = await puppeteer.launch({ headless:"new", args:["--no-sandbox","--disable-setuid-sandbox"] });
        const page = await browser.newPage();
        await page.setContent(html,{ waitUntil:"networkidle0" });

        const pdf = await page.pdf({
            format:"A4",
            printBackground:true,
            displayHeaderFooter:true,
            margin:{ top:"30px", bottom:"140px", left:"30px", right:"30px" }, 
            footerTemplate:`<div style="font-size:10px;width:100%;text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
            pageRanges:"1-999",
            timeout:0,
            waitForFonts:true,
            tagged:true
        });

        await browser.close();
        return pdf;

    } catch(err){
        console.log("🚫 PDF Generation Error:",err.message);
        throw err;
    }
};

exports.generateAttendancePDFFICSI = async (payload) => {
    try {
        const file = path.resolve(__dirname, "attendance_templates/ficsi/ficsi.html");
        let html = fs.readFileSync(file,"utf8");

        const ficsiLogoBase64  = fs.readFileSync(path.resolve(__dirname,"../public/ficsi.png"),"base64");
        const radiantBase64   = fs.readFileSync(path.resolve(__dirname,"../public/radiant-logo.svg"),"base64");
        
        html = html
            .replace(/{{ficsiLogoBase64}}/g, ficsiLogoBase64)
            .replace(/{{radiantBase64}}/g, radiantBase64)
            .replace(/{{trainingProvider}}/g, payload.trainingProvider)
            .replace(/{{trainingCentre}}/g, payload.trainingCentre)
            .replace(/{{examCentreName}}/g, payload.examCentreName)
            .replace(/{{trainingProviderAddress}}/g, payload.trainingProviderAddress)
            .replace(/{{qpCode}}/g, payload.qpCode)
            .replace(/{{trainingProviderID}}/g, payload.trainingProviderID)
            .replace(/{{assessorSipId}}/g, payload.assessorSipId)
            .replace(/{{accessorName}}/g, payload.accessorName)
            .replace(/{{batchStartDate}}/g, payload.batchStartDate)
            .replace(/{{scheme}}/g, payload.schemeName)
            .replace(/{{subSchemeName}}/g, payload.subSchemeName)
            .replace(/{{agency}}/g, payload.agency)
            .replace(/{{address}}/g, payload.address)
            .replace(/{{assessmentDate}}/g, payload.batchStartDate)
            .replace(/{{batchSize}}/g, payload.batchSize)
            .replace(/{{batchType}}/g, payload.batchType)
            .replace(/{{batchName}}/g, payload.batchName)
            .replace(/{{enrolledCandidates}}/g, payload.enrolledCandidates)
            .replace(/{{jobRole}}/g, payload.jobRole)
            .replace(/{{spocName}}/g, payload.spocName)
            .replace(/{{spocEmail}}/g, payload.spocEmail)
            .replace(/{{spocContact}}/g, payload.spocContact)
            .replace(/{{accessorContact}}/g, payload.accessorContact)
            .replace(/{{accessorEmail}}/g, payload.accessorEmail)
            .replace(/{{trainingProviderState}}/g, payload.trainingProviderState)
            .replace(/{{dropout}}/g, payload.dropout);

        
        let rows = "";
            payload.candidates.forEach((c,i)=> rows += `
            <tr>
            <td style="border:1px solid #000;padding:10px;">${i+1}</td>
            <td style="border:1px solid #000;padding:10px;">${c.candidateId}</td>
            <td style="border:1px solid #000;padding:10px;">${c.name}</td>
            <td style="border:1px solid #000;padding:10px;text-align:center;"></td>
            <td style="border:1px solid #000;padding:10px;"></td>
            <td style="border:1px solid #000;padding:10px;text-align:center;">${c.eligibility === "no" ? "Not Eligible" : ""}</td>
            </tr>
            `);

        html = html.replace("{{tableRows}}", rows);

        // ==================== Generate PDF ====================
        const browser = await puppeteer.launch({ headless:"new", args:["--no-sandbox","--disable-setuid-sandbox"] });
        const page = await browser.newPage();
        await page.setContent(html,{ waitUntil:"networkidle0" });

        const pdf = await page.pdf({
            format:"A4",
            printBackground:true,
            displayHeaderFooter:true,
            margin:{ top:"30px", bottom:"140px", left:"30px", right:"30px" }, 
            footerTemplate:`<div style="font-size:10px;width:100%;text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
            pageRanges:"1-999",
            timeout:0,
            waitForFonts:true,
            tagged:true
        });

        await browser.close();
        return pdf;

    } catch(err){
        console.log("🚫 PDF Generation Error:",err.message);
        throw err;
    }
};