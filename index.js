require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { google } = require('googleapis'); // Import googleapis

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

// Google Sheets Setup
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS), // Load
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = process.env.SPREADSHEET_ID;

app.post('/api/send-order', async (req, res) => {
  console.log('Received request body:', req.body);
  const { name, phone, detailedLocation, district, upazila, transactionId, yourIdentity, cart} = req.body;

  const cartItems = cart
    .map((item) => `${item.name} x${item.quantity} = ৳ ${item.price * item.quantity}`)
    .join('\n');
  const message = `
অর্ডার বিবরণ:
নাম: ${name}
ফোন নম্বর: ${phone}
বিস্তারিত লোকেশন: ${detailedLocation}
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

  let emailSent = false;

  // Step 1: Send Email
  try {
    console.log('Sending email to:', 'ahnaffarming@gmail.com');
    await transporter.sendMail({
      from: `"Ahnaf Farming" <${process.env.EMAIL_USER}>`,
      to: 'ahnaffarming@gmail.com',
      subject: `New Order from ${name}`,
      text: message,
    });
    console.log('Email sent successfully');
    emailSent = true;
  } catch (error) {
    console.error('Error sending email:', error.message, error.stack);
  }

  // Step 2: Append to Google Sheet (regardless of email success)
  try {
    const orderDate = new Date().toISOString(); // Current date and time
    const values = [
      [
        name,
        phone,
        detailedLocation,
        district,
        upazila,
        transactionId,
        yourIdentity || 'Not provided',
        cartItems,
        orderDate,
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A1', // Adjust if your sheet has a different name
      valueInputOption: 'RAW',
      resource: {
        values,
      },
    });
    console.log('Order appended to Google Sheet successfully');
  } catch (error) {
    console.error('Error appending to Google Sheet:', error.message, error.stack);
    // Don’t fail the request if Google Sheet fails; just log the error
  }

  // Step 3: Respond to the client
  if (emailSent) {
    res.status(200).json({ success: true, message: 'Order sent successfully via email' });
  } else {
    res.status(500).json({ success: false, message: 'Failed to send order via email, but order data saved to sheet' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});
