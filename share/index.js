const express = require("express");
const router = express.Router();
router.use("/",require("./fileShare"));

router.use("/",require("./folderShare"));
module.exports = router;