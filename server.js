require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const app = express();


app.use(express.json());
app.use(require("cors")());

app.use(express.urlencoded({ extended: true }));


// Import routes
app.use("/api",require("./api/uploadRoot"));
app.use("/api",require("./api/createFolder"));
app.use("/api" ,require("./api/uploadToFolder"));
app.use("/api",require("./api/createSubfolder"));
app.use("/api", require("./api/users"));
app.use("/api", require("./api/showTree"));


const PORT = process.env.PORT || 3000;






mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));
