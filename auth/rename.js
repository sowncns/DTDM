const express = require("express");
const User = require("../models/userModel");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();


router.post("/rename", requireAuth, async (req, res) => {
    try {
        const { newName } = req.body;
        const email = req.user.email; // lấy từ token
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        user.name = newName;
        await user.save();

        res.status(200).json({ message: "Name changed successfully" });
    } catch (err) {
        res.status(500).json({ message: "Change name failed", error: err.message });
    }
});

module.exports = router;
