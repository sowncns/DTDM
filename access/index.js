const express = require("express");

const router = express.Router();
router.use("/",require("./all"));
router.use("/" ,require("./view"));
router.use("/" ,require("./edit"));


module.exports = router;