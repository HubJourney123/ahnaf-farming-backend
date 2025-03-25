// D:\Temp\ahnaf-farming-backend\index.js
require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: 'https://ahnaffarming.vercel.app',
  credentials: true,
}));
app.use(express.json());

// Nodemailer Setup
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Use App Password if 2FA is on
  },
  logger: true,
  debug: true,
});

// Verify SMTP connection
transporter.verify((error, success) => {
  if (error) console.error('SMTP Verification Error:', error);
  else console.log('SMTP Server is ready');
});

app.post('/api/send-order', async (req, res) => {
  console.log('Received request body:', req.body);
  const { name, phone, detailedLocation, division, district, upazila, transactionId, yourIdentity, cart, totalPrice, deliveryCharge, grandTotal } = req.body;

  const cartItems = cart
    .map((item) => `${item.name} x${item.quantity} = ৳ ${item.price * item.quantity}`)
    .join('\n');
  const message = `
অর্ডার বিবরণ:
নাম: ${name}
ফোন নম্বর: ${phone}
বিস্তারিত লোকেশন: ${detailedLocation}
ডিভিসন: ${division}
জেলা: ${district}
উপজেলা: ${upazila}
লেনদেন আইডি: ${transactionId}
Customer পরিচয়: ${yourIdentity || 'Not provided'}
পণ্যসমূহ:
${cartItems}
সাবটোটাল: ৳ ${totalPrice}
ডেলিভারি চার্জ: ৳ ${deliveryCharge}
মোট: ৳ ${grandTotal}
  `.trim();

  try {
    console.log('Sending email to:', 'ahnaffarming@gmail.com');
    await transporter.sendMail({
      from: `"Ahnaf Farming" <${process.env.EMAIL_USER}>`,
      to: 'ahnaffarming@gmail.com',
      subject: `New Order from ${name}`,
      text: message,
    });

    console.log('Email sent successfully');
    res.status(200).json({ success: true, message: 'Order sent successfully via email' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ success: false, message: 'Failed to send order via email', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});
