const express = require("express");
const router = express.Router();
router.use("/",require("./fileShare"));
module.exports = router;