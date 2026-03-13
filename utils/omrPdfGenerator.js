const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");



exports.generateOMRPDF = async () => {
    try {
        const file = path.resolve(__dirname, "omr_template/sheet.html");
        let html = fs.readFileSync(file,"utf8");

        const thscLogoBase64  = fs.readFileSync(path.resolve(__dirname,"../public/thsc-logo.jpg"),"base64");
        const radiantBase64   = fs.readFileSync(path.resolve(__dirname,"../public/radiant-logo.svg"),"base64");
        
        html = html.replace(/{{radiantBase64}}/g, radiantBase64);

        // ==================== Generate PDF ====================
        const browser = await puppeteer.launch({ headless:"new", args:["--no-sandbox","--disable-setuid-sandbox"] });
        const page = await browser.newPage();
        await page.setContent(html,{ waitUntil:"networkidle0" });

        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true, 
            margin: {
                top: "0mm",
                bottom: "0mm",
                left: "0mm",
                right: "0mm",
            },
            });


        await browser.close();
        return pdf;

    } catch(err){
        console.log("🚫 PDF Generation Error:",err.message);
        throw err;
    }
};

