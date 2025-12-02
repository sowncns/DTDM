const express = require("express");

const router = express.Router();
router.use("/",require("./create"));
router.use("/" ,require("./upload"));
router.use("/", require("./show"));
router.use("/", require("./delete"));
router.use("/", require("./trash"));
router.use("/", require("./rename"));
router.use("/",require("./user"))
router.use("/",require("./setvisibility"))
module.exports = router;