const express = require("express");

const router = express.Router();
router.use("/",require("./keyword"));
router.use("/",require("./user"))

module.exports = router;