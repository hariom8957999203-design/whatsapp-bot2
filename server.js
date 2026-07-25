const express = require('express');
const axios = require('axios');
const fs = require('fs');

const app = express();
app.use(express.json());

// ⚠️ यहाँ अपनी डिटेल्स डालें
const TOKEN = 'EAAMT5R4QlZAYBSIZA4bdyeXF2uJwcZBS7oTNc7mLOdSKw4YeO1yYzGOzOdDoat3tZCQrUNymoxC6A06rURjgq0frkoDmQfO16LP8jlgZAZCZArYqxkbI4ssmB8x7LZBEK5cajYHHsr12mjS0aqM5ORshahNkQ13zNI9mt5u5eMFbvgHzvdcZAVuritQ1IBgyk0chR0NpoPi3mxROzfEnJ1eutZBU3nl1vdodl7gQrSKZCEfZBcfrbuCU0IVTvGj9U9utLgx2OLEIW7qWiC1j8OaSqgb0GOOg9AZDZD';
const PHONE_NUMBER_ID = '1277173642137189';
const VERIFY_TOKEN = 'my_secret_token_123'; // इसे ऐसे ही रहने दें

// सामान की लिस्ट लोड करें
let items = JSON.parse(fs.readFileSync('items.json', 'utf8'));

// Webhook Verification (Meta के लिए)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// मैसेज आने पर ऑटो-रिप्लाई करने का लॉजिक
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const from = body.entry[0].changes[0].value.messages[0].from;
      const msgText = body.entry[0].changes[0].value.messages[0].text.body.toLowerCase().trim();

      let replyMessage = "";

      // सामान चेक करना
      let foundItem = null;
      for (let itemKey in items) {
        if (msgText.includes(itemKey)) {
          foundItem = { name: itemKey, ...items[itemKey] };
          break;
        }
      }

      if (foundItem) {
        replyMessage = `✅ *${foundItem.name.toUpperCase()}*\n💰 रेट: ₹${foundItem.price} प्रति ${foundItem.unit}\n\n📝 *Please reply with the required Order Quantity.* (कृपया ऑर्डर की मात्रा बताएं)`;
      } else {
        replyMessage = `नमस्कार! वर्मा बुक डिपो में आपका स्वागत है। 🙏\n\nकृपया जिस सामान का रेट चाहिए उसका नाम सही से लिखें (जैसे: Class 10 Math, A4 paper rim, Register).`;
      }

      // WhatsApp पर मैसेज वापस भेजना
      try {
        await axios.post(
          `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: 'whatsapp',
            to: from,
            text: { body: replyMessage }
          },
          {
            headers: { Authorization: `Bearer ${TOKEN}` }
          }
        );
      } catch (error) {
        console.error("Error sending message:", error.response ? error.response.data : error.message);
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

app.listen(3000, () => console.log('Bot Webhook Active on Port 3000'));
