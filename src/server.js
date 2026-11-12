const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
const userRoutes = require("./routes/userRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const indicatorRoutes = require("./routes/indicatorRoutes");
const entryRoutes = require("./routes/entryRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend is running!"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    database: "Connected"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/users", userRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/indicators", indicatorRoutes);
app.use("/api/entries", entryRoutes);
app.use("/api/feedback", feedbackRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});