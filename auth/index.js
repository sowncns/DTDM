const express = require("express");
const router = express.Router();

router.use("/", require("./register"));
router.use("/", require("./login"));
router.use("/", require("./logout"));
router.use("/", require("./refresh"));
router.use("/", require("./delete"));
router.use("/",require("./changepass"))
router.use("/",require("./rename"))
module.exports = router;
