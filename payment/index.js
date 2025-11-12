const express = require("express");
const router = express.Router();
const User = require("../models/userModel");
const { requireAuth } = require("../middleware/auth");

// Packs available for purchase. Prices are illustrative (cents).
// extra is bytes to add to storageLimit.
const GB = 1024 * 1024 * 1024;
const packs = {
  basic: { id: "basic", name: "Basic +1GB", priceCents: 499, extra: 1 * GB },
  pro: { id: "pro", name: "Pro +5GB", priceCents: 1999, extra: 5 * GB },
  ultra: { id: "ultra", name: "Ultra +20GB", priceCents: 4999, extra: 20 * GB },
};

// GET /packs - list available packs
router.get("/packs", (req, res) => {
  res.json({ packs: Object.values(packs) });
});

// POST /purchase - simulate purchasing a pack and extend user's storageLimit
// Body: { packId: string }
// Protected: requires Authorization: Bearer <accessToken>
router.post("/purchase", requireAuth, async (req, res) => {
  try {
    const { packId } = req.body || {};
    if (!packId || !packs[packId]) return res.status(400).json({ message: "Invalid packId" });

    const pack = packs[packId];

    // Find user by email from middleware
    const ownerEmail = req.user?.email;
    if (!ownerEmail) return res.status(401).json({ message: "Unauthenticated" });

    const user = await User.findOne({ email: ownerEmail });
    if (!user) return res.status(404).json({ message: "User not found" });

if(!false){
    res.status(402).json({ message: "Payment failed" });
    return; 
}
    user.storageLimit = (user.storageLimit || 0) + pack.extra;
    await user.save();

    return res.json({
      message: "Purchase successful",
      pack: { id: pack.id, name: pack.name, addedBytes: pack.extra, priceCents: pack.priceCents },
      storage: { used: user.storageUsed || 0, limit: user.storageLimit },
    });
  } catch (err) {
    console.error("Purchase error:", err);
    return res.status(500).json({ message: "Purchase failed", error: err.message });
  }
});

module.exports = router;
