const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
app.use(bodyParser.json());

// ==========================================
// 1. CONFIGURATION (Apni Details Yahan Daalein)
// ==========================================
// Meta Permanent System User Token yahan daalein
const TOKEN = process.env.WHATSAPP_TOKEN || 'EAAMT5R4QlZAYBSETNwgZBAKtTdXZBNZCghxzvpevM3ryGDiwdMS2WNtwLBjzth6o1Prw3qhZBn1ybZBX0RGg8CQhrz5f0kvhCYPyZBorsUgmN0YZAGPshFzT6rttZAJaFZBZCpxZA5BNahB7mANngyjXLd37Rf6uRMPcn1RdPL3qX6VZAGlFZCPgXXFiFEvK5EZB2ebQH7FZCe3G0DpJMakvgLluNWGCoiEG5jFD9j8v3kX14jSXiWGlFDSdVxREKP2GuzPdm3g52H6jeBZCCSQUTR2BfpZCz8leYc1EK4ooYhsdMpOyAZD'; 
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || '1277173642137189';
const VERIFY_TOKEN = 'my_secret_token_123';

// Apne Render Server ka Webhook URL (Self-ping ke liye)
const SERVER_URL = 'https://whatsapp-bot-final-j468.onrender.com/webhook';

// Saman ki list load karein (items.json)
let items = {};
try {
  items = JSON.parse(fs.readFileSync('items.json', 'utf8'));
} catch (err) {
  console.log('Error loading items.json:', err.message);
}

// ==========================================
// 2. HELPER FUNCTIONS (WhatsApp API Calling)
// ==========================================

// Simple Text Message Bhejne ke liye
async function sendTextMessage(to, text) {
  try {
    await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: text },
      },
    });
    console.log(`Message sent to ${to}`);
  } catch (error) {
    console.error('Error sending text message:', error.response ? error.response.data : error.message);
  }
}

// Photo Message Bhejne ke liye
async function sendImageMessage(to, imageUrl, caption) {
  try {
    await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        messaging_product: 'whatsapp',
        to: to,
        type: 'image',
        image: {
          link: imageUrl,
          caption: caption || 'Daily Special Offer!'
        }
      },
    });
    console.log(`Daily Photo sent to ${to}`);
  } catch (error) {
    console.error('Error sending image:', error.response ? error.response.data : error.message);
  }
}

// ==========================================
// 3. WEBHOOK VERIFICATION (GET Route)
// ==========================================
app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;

        // Check karein ki incoming request WhatsApp message hi hai
        if (body.object === 'whatsapp_business_account') {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const message = value?.messages?.[0];

            if (message) {
                // 🎯 Sahi number nikalein jiss user ne message bheja hai:
                const fromNumber = message.from; 

                // User ka message text:
                const userText = message.text?.body || '';

                console.log(`Incoming message from ${fromNumber}: ${userText}`);

                // 🚀 AB REPLY BHEJEIN: "fromNumber" dynamic pass hoga!
                await sendTextMessage(fromNumber, "Hello! Main aapka bot hoon. Aapka message mil gaya.");
            }

            // Meta ko batayein ki request sahi se receive ho gayi hai
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error("Webhook processing error:", error);
        res.sendStatus(500);
    }
});
// ==========================================
// 4. INCOMING MESSAGES HANDLER (POST Route)
// ==========================================
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from; // Customer का Phone Number

      if (message.type === 'text') {
        const userQuery = message.text.body.trim().toLowerCase();
        let replyText = '';

        // Rate Check Logic (items.json se dhoondhna)
        let foundItem = null;
        for (let itemName in items) {
          if (userQuery.includes(itemName.toLowerCase())) {
            foundItem = itemName;
            break;
          }
        }

        if (foundItem) {
          replyText = `📌 *${foundItem}* ka rate hai: ₹${items[foundItem]}`;
        } else if (userQuery.includes('rate') || userQuery.includes('price') || userQuery.includes('kitne ka hai')) {
          replyText = 'Kripya item ka exact naam likhein, jaise: "Copy ka rate kya hai?" ya "Pen price"';
        } else {
          replyText = 'Namaste! Verma Book Depo mein aapka swagat hai. Aap kisi bhi item ka rate jaanne ke liye item ka naam likh kar bhej sakte hain.';
        }

        // Customer ko Reply bhein
        await sendTextMessage(from, replyText);
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// ==========================================
// 5. DAILY PHOTO UPLOAD (CRON JOB)
// ==========================================
// Time Zone: India (IST)
// Example Syntax: '0 10 * * *' matlab Roz subah 10:00 AM par chalega.
cron.schedule('0 10 * * *', async () => {
  console.log('Running Daily Photo Broadcast...');
  
  // Jis customer ko roz photo bhejni hai unka phone number yahan likhein (Country Code +91 ke sath)
  const customerList = ['919876543210']; 
  const photoUrl = 'https://picsum.photos/800/600'; // Yahan apni photo ka public URL daalein
  const captionText = 'Aaj ka special discount offer! Verma Book Depo.';

  for (let phone of customerList) {
    await sendImageMessage(phone, photoUrl, captionText);
  }
}, {
  timezone: "Asia/Kolkata"
});

// ==========================================
// 6. RENDER ANTI-SLEEP (SELF-PING SYSTEM)
// ==========================================
// Har 10 minute mein server khud ko ping karega taaki Render sleep na ho
setInterval(() => {
  axios.get(SERVER_URL)
    .then(() => console.log('Self-ping successful: Server stays active!'))
    .catch((err) => console.log('Self-ping error:', err.message));
}, 10 * 60 * 1000);

// ==========================================
// 7. SERVER START
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
