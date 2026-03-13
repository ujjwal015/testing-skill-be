require("newrelic");
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const connectDB = require("./config/db");
const {
  SESSION_SECRET,
  PORT,
  USER_MANAGEMENT_SERVER_PROXY_URL,
} = require("./config/envProvider");
const path = require("path");
const authRoutes = require("./routes/auth-route");
const feedbackRoutes = require("./routes/feedbackRoutes");
const appTour = require("./routes/app-tour");
const app = express();
const indexRoutes=require('./routes/index-routes');
const swaggerUi = require('swagger-ui-express');
const startAllServer=require("./startAllServer");
const swaggerDocument=require('./swagger.json');
// const winston=require('./winston');
const securityMiddleware = require('./middleware/security');
// const socketIo = require('socket.io');
// Testing server error in testing environtment

const helmet = require("helmet");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
      },
    },
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
  })
);

const proxy = require('express-http-proxy');
const mongoose = require("mongoose");
let options = {
  explorer: true,
  customCssUrl: ["/custom.css", `${process.env.backendUrl}/custumcss`],
};
//aa
app.use("/api/user", proxy(USER_MANAGEMENT_SERVER_PROXY_URL));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument,options));
// Apply security middleware first (includes CSP and other security headers)
app.use(securityMiddleware);

app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.get("/images/:id", (req, res) => {
  return res.sendFile(path.join(__dirname, `public/files/${req.params.id}`));
});
app.get("/custumcss", (req, res) => {
  return res.sendFile(path.join(__dirname, `public/swagger-ui.css`));
});

const repo = [
  {
    repoName: "UserManagement",
    path: "./UserManagement",
    port: 5004,
  },
];
startAllServer.startAllServer(repo);

app.use(
  cors({
    methods: "GET,POST,PUT,DELETE",
    origin: "*",
  })
);

const port = PORT || 5000;
connectDB();

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true

}))

app.get("/", (req, res) => res.send(`<h1>Server started</h1>`));
app.use("/api/cache", require("./routes/cache.route"));
app.use("/api", authRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/admin-routes", appTour);

app.use("/api", indexRoutes);

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("🔌 MongoDB connection closed.");
  process.exit(0);
});



app.listen(port, () => console.log(`Server Listening at PORT ${port}`));
