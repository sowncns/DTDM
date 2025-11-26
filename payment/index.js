const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const { requireAuth } = require("../middleware/auth");
const User = require("../models/userModel"); // ⚠️ cần import model User
const router = express.Router();
const checkStatus  = false;
const IP = 'http://localhost:3000';
const IPx = 'http://52.76.57.239'
router.post("/purchase", requireAuth, async (req, res) => {
  try {
    const { upStore, amount } = req.body;
    const userEmail = req.user.email;

    const partnerCode = "MOMO";
    const accessKey = "F8BBA842ECF85";
    const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";

    const requestId = partnerCode + Date.now();
    const orderId = requestId;

    const redirectUrl = `${IP}/payment/ipn`;
    const ipnUrl = `${IP}:3000/payment/ipn`;
    const nextUrl = "https://youtobe.com"
    // ⚠ PHẢI MÃ HOÁ BASE64
    const rawExtra = JSON.stringify({ user: userEmail, upStore ,nextUrl});
    const extraData = Buffer.from(rawExtra).toString("base64");

    const requestType = "captureWallet";
    const orderInfo = "Buy Storage";

    const rawSignature =
      `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}` +
      `&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    const body = {
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
      body
    );

    return res.json({payUrl :momoResponse.data.payUrl
  });
  } catch (error) {
    console.error("MoMo API Error:", error.response?.data || error.message);
    return res.status(500).json({ error: error.message });
  }
});

router.get("/ipn", async (req, res) => {
  try {
    console.log("MoMo IPN:", req.query);
    console.log("MoMo POST URL:", req.originalUrl);


    const { resultCode, extraData } = req.query;

    if (resultCode === 0 || resultCode === '0') {
      // GIẢI MÃ BASE64
      const decoded = Buffer.from(extraData, "base64").toString();
      const { user, upStore,nextUrl } = JSON.parse(decoded);

      const foundUser = await User.findOne({ email: user });

      if (foundUser) {
        const addBytes = Number(upStore) * 1024 ** 3;
        foundUser.storageLimit += addBytes;

        await foundUser.save();

        console.log("UPDATE STORAGE →", user, upStore + "GB");
      
      }
    }

    // ⚠ NEVER RETURN BODY IN 204
    return res.status(204).send();

  } catch (error) {
    console.error("IPN ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});



module.exports = router;
