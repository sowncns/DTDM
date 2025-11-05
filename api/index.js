const express = require("express");

const router = express.Router();
router.use("/",require("./createFolder"));
router.use("/" ,require("./uploadToFolder"));
router.use("/", require("./showTree"));
router.use("/", require("./deleteFolder"));

module.exports = router;