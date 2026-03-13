function sanitizeExcelCell(cell) {
    if (typeof cell === "string") {
      return cell.trim().replace(/[\r\n]+/g, " ");
    }
    return cell;
  }

module.exports = sanitizeExcelCell;