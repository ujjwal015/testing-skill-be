const express = require("express");
const cors = require("cors");
const session = require("express-session");
const connectDB = require("./config/db");
const { SESSION_SECRET, PORT } = require("./config/keys");
const path = require("path");
const app = express();
const http = require("http").Server(app);
const indexRoutes = require("./routes/index-routes");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");
const securityMiddleware = require("./middleware/security");
let options = {
  explorer: true,
  customCssUrl: ["/custom.css", `${process.env.backendUrl}/custumcss`],
};
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, options)
);

// Apply security middleware first (includes CSP and other security headers)
app.use(securityMiddleware);

app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.get("/images/:id", (req, res) => {
  return res.sendFile(path.join(__dirname, `public/files/${req.params.id}`));
});
//checking login
app.get("/custumcss", (req, res) => {
  return res.sendFile(path.join(__dirname, `public/swagger-ui.css`));
});

app.use(
  cors({
    // origin: ["http://localhost:3000","https://testa-front-end.vercel.app"],
    methods: "GET,POST,PUT,DELETE,PATCH",
    // credentials: true,
    origin: "*",
  })
);

// app.use(
//   express.json({
//     type: [
//       "application/json",
//       "text/plain", // AWS sends this content-type for its messages/notifications
//     ],
//   })
// );

const port = PORT || 5001;
// Connecting to the db
connectDB();
app.get("/", (req, res) => {
  res.json({ message: "userManagement" });
});
//
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.get("/", (req, res) => res.send(`<h1>Server started</h1>`));
app.use("/", indexRoutes);
// app.use("/api/admin-routes", adminRoutes);

server = app.listen(5004, () => console.log(`server listening port at 5004`));
