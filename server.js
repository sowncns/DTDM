require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const app = express();
const cors = require("cors");



app.use(cors({
  origin: "*",
  methods: "GET,POST,PUT,DELETE,OPTIONS",
  allowedHeaders: "Content-Type, Authorization"
}));



app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Import routes

app.use("/api", require("./api"));
app.use("/auth", require("./auth"));
app.use("/share", require("./share"));
app.use("/payment", require("./payment"));
app.use("/payment", require("./payment"));
app.use("/search", require("./search"));

const PORT = process.env.PORT || 3000;






mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT,"0.0.0.0", () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection error:", err));
