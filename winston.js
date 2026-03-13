const winston = require("winston");
const moment = require("moment");
const path = require("path");
require("dotenv").config();

const currentDate = moment().format("DD-MM-YYYY");

// Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
    })
  ),
  defaultMeta: { service: "user-service" },
  transports: [
    // file logs (info & above)
    new winston.transports.File({
      // filename: `/var/log/api-testing-testa/log/${currentDate}-combined.log`,
      filename: path.join(__dirname, '..', 'logs', `${currentDate}-combined.log`),
      level: "info",
      maxsize: 5 * 1024 * 1024, // 5MB per file
      maxFiles: 10, // keep last 10 files
    }),

    // error-only file
    new winston.transports.File({
      // filename: `/var/log/api-testing-testa/log/${currentDate}-error.log`,
      filename: path.join(__dirname, '..', 'logs', `${currentDate}-error.log`),
      level: "error",
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

// Console transport only in dev
if (process.env.NODE_ENV === "development") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
} else {
  // Override console.log in production
  console.log = (...args) => logger.info(args.join(" "));
  console.error = (...args) => logger.error(args.join(" "));
  console.warn = (...args) => logger.warn(args.join(" "));
}

module.exports = logger;
