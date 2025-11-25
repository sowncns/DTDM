const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const { requireAuth } = require("../middleware/auth");
const User = require("../models/userModel"); // ⚠️ cần import model User
const router = express.Router();
const checkStatus  = false;
router.post("/purchase", requireAuth, async (req, res) => {
  try {
    const { upStore ,amount} = req.body;
    const userEmail = req.user.email;

    const partnerCode = "MOMO";
    const accessKey = "F8BBA842ECF85";
    const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
    const requestId = partnerCode + Date.now();
    const orderId = requestId;
    const orderInfo = `${userEmail}`;
    const redirectUrl = "https://youtube.com";
    const ipnUrl = "http://localhost:3000/payment/ipn"; 
    const requestType = "captureWallet";
    const extraData = JSON.stringify({ user: userEmail , upStore}); 

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

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
    console.error(" MoMo API Error:", error.response?.data || error.message);
    return res.status(500).json({
      message: "MoMo payment failed",
      error: error.response?.data || error.message,
    });
  }
});

router.post("/ipn", async (req, res) => {
  try {
    const { resultCode, extraData } = req.body;
  console.log("MOmo req:",req.body)
    if (resultCode === '0') {
      const { user, upStore } = JSON.parse(extraData);
      const foundUser = await User.findOne({ email: user });

      if (foundUser) {
      
        const addStorage = parseInt(upStore) * 1024 **3; // bytes
        foundUser.storageLimit += addStorage;
        console.log̣̣̣̣("1")

        await foundUser.save();

      }
    }
    
    res.status(204).send({message:"Payment result received payment"});
  } catch (error) {
    console.error("Payment processing error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


module.exports = router;
