require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(require("cors")());


// Import routes
app.use("/api/users", require("./api/users"));
app.use("/api/upload", require("./api/upload"));
const PORT = process.env.PORT || 3000;






mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));
