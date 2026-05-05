require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
const port = process.env.PORT || 10000;

app.use(cors({
  origin: 'https://ahnaffarming.vercel.app',
  credentials: true,
}));
app.use(express.json());

// Google Sheets Setup
let auth;
let sheets;
let spreadsheetId;

try {
  const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
  console.log('📋 Service Account Email:', credentials.client_email);
  
  auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  sheets = google.sheets({ version: 'v4', auth });
  spreadsheetId = process.env.SPREADSHEET_ID;
  
  console.log('✓ Google Sheets initialized');
  console.log('📊 Spreadsheet ID:', spreadsheetId);
} catch (error) {
  console.error('✗ Error initializing Google Sheets:', error.message);
}

app.post('/api/send-order', async (req, res) => {
  console.log('\n=== NEW ORDER RECEIVED ===');
  const { 
    name, 
    phone, 
    detailedLocation, 
    district, 
    upazila, 
    transactionId, 
    yourIdentity, 
    cart, 
    totalPrice, 
    deliveryCharge, 
    grandTotal, 
    paidAmount, 
    dueAmount 
  } = req.body;

  const cartItems = cart
    .map((item) => `${item.name} x${item.quantity}`)
    .join('\n');

  const cartItemsEn = cart
    .map((item) => `${item.en}`)
    .join('\n');

  // Google Sheet Append
  try {
    console.log('📝 Attempting to append to Google Sheet...');
    console.log('Spreadsheet ID:', spreadsheetId);
    
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID environment variable is not set');
    }

    const orderDate = new Date().toISOString();
    const values = [
      [
        name || '',
        phone || '',
        detailedLocation || '',
        district || '',
        upazila || '',
        cartItemsEn || '',
        cartItems || '',
        orderDate,
        transactionId || '',
        paidAmount || '',
        dueAmount || '',
        grandTotal || '',
        yourIdentity || 'Not provided',
      ],
    ];

    console.log('📤 Values to append:');
    console.log(JSON.stringify(values, null, 2));

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId.trim(),
      range: 'Sheet1!A:M',
      valueInputOption: 'RAW',
      resource: {
        values,
      },
    });

    console.log('✓ SUCCESS: Order appended to Google Sheet');
    console.log('📊 Append response:', response.data);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Order received and saved to records',
      updatedCells: response.data.updates?.updatedCells 
    });

  } catch (error) {
    console.error('\n✗ ERROR: Failed to append to Google Sheet');
    console.error('  Message:', error.message);
    console.error('  Code:', error.code);
    console.error('  Status:', error.status);
    if (error.errors) {
      console.error('  API Errors:', error.errors);
    }
    console.error('  Stack:', error.stack);
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to save order to records: ' + error.message
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    spreadsheetId: spreadsheetId ? '✓ SET' : '✗ NOT SET'
  });
});

app.listen(port, () => {
  console.log(`✓ Backend server running on port ${port}`);
});
