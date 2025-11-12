const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const { requireAuth } = require("../middleware/auth");
const User = require("../models/userModel"); // ⚠️ cần import model User
const router = express.Router();

/**
 * 1️⃣ API tạo đơn thanh toán MoMo
 */
router.post("/purchase", requireAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    const userEmail = req.user.email;

    const partnerCode = "MOMO";
    const accessKey = "F8BBA842ECF85";
    const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
    const requestId = partnerCode + Date.now();
    const orderId = requestId;
    const orderInfo = `Chau Ngoc Son`;
    const redirectUrl = "http://localhost:3000/payment/check-payment";
    const ipnUrl = "http://localhost:3000/payment/ipn"; 
    const requestType = "captureWallet";
    const extraData = JSON.stringify({ user: userEmail });

    const rawSignature = `accessKey=${accessKey}&amount=${amount || "1000"}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    const requestBody = {
      partnerCode,
      accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      extraData,
      requestType,
      signature,
      lang: "vi",
    };

    const momoResponse = await axios.post(
      "https://test-payment.momo.vn/v2/gateway/api/create",
      requestBody,
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    return res.status(201).json({
      message: "success",
      payUrl: momoResponse.data.payUrl,
    });
  } catch (error) {
    console.error("❌ MoMo API Error:", error.response?.data || error.message);
    return res.status(500).json({
      message: "MoMo payment failed",
      error: error.response?.data || error.message,
    });
  }
});

router.post("/ipn", async (req, res) => {
  try {
    const { resultCode, amount, extraData } = req.body;

    if (resultCode === 0) {
      const { user } = JSON.parse(extraData);
      const foundUser = await User.findOne({ email: user });

      if (foundUser) {
        // ví dụ: 1.000 đồng = +10MB dung lượng
        const addStorage = parseInt(amount) * 10 * 1024; // bytes
        foundUser.storageLimit += addStorage;
        await foundUser.save();

      }
    }

    // luôn trả 204 cho MoMo
    res.status(204).send();
  } catch (error) {
    console.error("❌ Payment processing error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
 
router.get("/check-payment", async (req, res) => {
  try {
    const { resultCode, amount, extraData } = req.query;
    console.log("📩 MoMo Redirect:", req.query);
    return res.status(200).json({
      message: "Payment result received",
    });
  } catch (error) {
    console.error("❌ Check payment error:", error);
    res.status(500).json({ message: "Internal server error" });
  } 
}); 


module.exports = router;
