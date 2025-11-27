const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const { requireAuth } = require("../middleware/auth");
const User = require("../models/userModel"); // ⚠️ cần import model User
const router = express.Router();
const IPx = 'http://52.76.57.239/payment/ipn'
router.post("/purchase", requireAuth, async (req, res) => {
  try {
    const { upStore, amount } = req.body;
    const userEmail = req.user.email;

    const partnerCode = "MOMO";
    const accessKey = "F8BBA842ECF85";
    const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";

    const requestId = partnerCode + Date.now();
    const orderId = requestId;

    const redirectUrl = `http://52.76.57.239/payment/success`;
    const ipnUrl = "https://korey-unteeming-remi.ngrok-free.dev/payment/ipn";
    // ⚠ PHẢI MÃ HOÁ BASE64
    const rawExtra = JSON.stringify({ user: userEmail, upStore });
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
    console.log("RAW SIGNATURE:", rawSignature);
console.log("SIGNATURE:", signature);
console.log("BODY SEND TO MOMO:", body);

    return res.json({payUrl :momoResponse.data.payUrl });
  } catch (error) {
    console.error("MoMo API Error:", error.response?.data || error.message);
    return res.status(500).json({ error: error.message });
  }
});

router.post("/ipn", async (req, res) => {
  try {
    console.log("MoMo IPN:", req.body);
 console.log("MoMo ipb");

    const { resultCode, extraData } = req.body;

    if (resultCode === 0 || resultCode === '0') {
      // GIẢI MÃ BASE64
      const decoded = Buffer.from(extraData, "base64").toString();
      const { user, upStore } = JSON.parse(decoded);

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










// const express = require("express");
// const crypto = require("crypto");
// const axios = require("axios");
// const { requireAuth } = require("../middleware/auth");
// const User = require("../models/userModel"); // ⚠️ cần import model User
// const router = express.Router();

// router.post("/purchase", requireAuth, async (req, res) => {
//   try {
//     const { upStore ,amount} = req.body;
//     const userEmail = req.user.email;

//     const partnerCode = "MOMO";
//     const accessKey = "F8BBA842ECF85";
//     const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
//     const requestId = partnerCode + Date.now();
//     const orderId = requestId;
//     const orderInfo = `Thanh toan upgrade`;
//     const redirectUrl = "http://localhost:3000/payment/check-payment";
//     const ipnUrl = "http://localhost:3000/payment/ipn"; 
//     const requestType = "captureWallet";
//     const extraData = JSON.stringify({ user: userEmail , upStore}); 

//     const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

//     const signature = crypto
//       .createHmac("sha256", secretKey)
//       .update(rawSignature)
//       .digest("hex");

//     const requestBody = {
//       partnerCode,
//       accessKey,
//       requestId,
//       amount,
//       orderId,
//       orderInfo,
//       redirectUrl,
//       ipnUrl,
//       extraData,
//       requestType,
//       signature,
//       lang: "vi",
//     };

//     const momoResponse = await axios.post(
//       "https://test-payment.momo.vn/v2/gateway/api/create",
//       requestBody,
//       {
//         headers: { "Content-Type": "application/json" },
//       }
//     );

//     return res.status(201).json({
//       message: "success",
//       payUrl: momoResponse.data.payUrl,
//     });
//   } catch (error) {
//     console.error(" MoMo API Error:", error.response?.data || error.message);
//     return res.status(500).json({
//       message: "MoMo payment failed",
//       error: error.response?.data || error.message,
//     });
//   }
// });

// router.post("/ipn", async (req, res) => {
//   try {
//     const { resultCode, extraData } = req.body;
//     console.log(666)
//     if (resultCode === 0) {
//       const { user, upStore } = JSON.parse(extraData);
//       const foundUser = await User.findOne({ email: user });

//       if (foundUser) {
      
//         const addStorage = parseInt(upStore) * 1024 **3; // bytes
//         foundUser.storageLimit += addStorage;
//         await foundUser.save();

//       }
//     }

//     // luôn trả 204 cho MoMo
//     res.status(204).send();
//   } catch (error) {
//     console.error("Payment processing error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });
 
// router.get("/check-payment", async (req, res) => {
//   try {
//     const { resultCode, extraData } = req.query;
//     console.log("MoMo:", extraData);
//     if (resultCode === '0' || resultCode === 0) {
//       console.log("Payment successful paycheck!");
//       const { user, upStore } = JSON.parse(extraData);
//       const foundUser = await User.findOne({ email: user });

//       if (foundUser) {
      
//         const addStorage = parseInt(upStore) * 1024 **3; // bytes
//         foundUser.storageLimit += addStorage;
//         await foundUser.save();

//       }
//     }

//     // luôn trả 204 cho MoMo
//     return res.json({
//       message: "Payment result received payment",
//     });
//   } catch (error) {
//     console.error("Check payment error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   } 
// }); 


// module.exports = router; 