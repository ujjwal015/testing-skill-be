const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

exports.stampPDF = async (pdfBuffer, stampPath) => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();

  const imgBuffer = fs.readFileSync(stampPath);
  const ext = path.extname(stampPath).toLowerCase();

  let stamp;
  if (ext === ".png") stamp = await pdfDoc.embedPng(imgBuffer);
  else if (ext === ".jpg" || ext === ".jpeg") stamp = await pdfDoc.embedJpg(imgBuffer);
  else throw new Error("Stamp file must be PNG/JPG");

  const scale = stamp.scale(0.19);

  pages.forEach(page => {
    const { width } = page.getSize();
    page.drawImage(stamp, {
      x: width - scale.width - 30,
      y: 30,
      width: scale.width,
      height: scale.height
    });
  });

  const modified = await pdfDoc.save();    // returns Uint8Array
  return Buffer.from(modified);            // <-- Convert to Buffer ✔
};


