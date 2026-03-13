const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");


exports.generateResultPDFWithHeaderCSDCI = async (payload) => {
    try {
        const file = path.resolve(__dirname, "result_templates/csdci/csdci.html");
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
            <td style="border:1px solid #000;padding:10px;"></td>
            </tr>
            `);

        html = html.replace("{{tableRows}}", rows);

        //   HEADER TEMPLATE 
        let headerTemplate = fs.readFileSync(
            path.join(__dirname,"result_templates/csdci/header_template.html"),"utf8"
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

exports.generateResultPDFWithHeaderTHSC = async (payload) => {
    try {
        const file = path.resolve(__dirname, "result_templates/thsc/thsc.html");
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
            <td style="border:1px solid #000;padding:10px;text-align:center;"></td>
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

exports.generateResultPDFTelecom = async (payload) => {
    try {
        const file = path.resolve(__dirname, "result_templates/telecom/telecom.html");
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
            <td style="border:1px solid #000;padding:10px;"></td>
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

exports.generateResultPDFRetail = async (payload) => {
    try {
        const file = path.resolve(__dirname, "result_templates/retail/retail.html");
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
            <td style="border:1px solid #000;padding:10px;"></td>
            <td style="border:1px solid #000;padding:10px;"></td>
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

exports.generateResultPDFLSSSDC = async (payload) => {
    try {
        const file = path.resolve(__dirname, "result_templates/lsssdc/lsssdc.html");
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
            <td style="border:1px solid #000;padding:10px;"></td>
            <td style="border:1px solid #000;padding:10px;"></td>
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

exports.generateResultPDFWithHeaderFFICSI = async (payload) => {
    try {
        const file = path.resolve(__dirname, "result_templates/ficsi/ficsi.html");
        
        
        let html = fs.readFileSync(file,"utf8");

        const thscLogoBase64  = fs.readFileSync(path.resolve(__dirname,"../public/thsc-logo.jpg"),"base64");
        const ficsiLogoBase64  = fs.readFileSync(path.resolve(__dirname,"../public/ficsi.png"),"base64");
        const radiantBase64   = fs.readFileSync(path.resolve(__dirname,"../public/radiant-logo.svg"),"base64");
        
        html = html
            .replace(/{{thscLogoBase64}}/g, thscLogoBase64)
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

        
        //  Inject table rows data
        let rows = "";
            payload.candidates.forEach((c,i)=> rows += `
            <tr>
            <td style="border:1px solid #000;padding:10px;">${i+1}</td>
            <td style="border:1px solid #000;padding:10px;">${c.candidateId}</td>
            <td style="border:1px solid #000;padding:10px;">${c.name}</td>
            <td style="border:1px solid #000;padding:10px;text-align:center;"></td>
            <td style="border:1px solid #000;padding:10px;"></td>
            <td style="border:1px solid #000;padding:10px;text-align:center;"></td>
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

exports.generateResultPDFWithHeaderDefault = async (payload) => {
    try {
        const file = path.resolve(__dirname, "result_templates/default/default.html");
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
            <td style="border:1px solid #000;padding:10px;text-align:center;"></td>
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
