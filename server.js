const express = require('express');
const axios = require('axios');
const app = express();

// Very Important: Express JSON parser sabse upar hona chahiye!
app.use(express.json());

// Variables (Apne hisab se verify kar lein ya Render Environment variables use karein)
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'my_secret_token_123'; 
const TOKEN = process.env.WHATSAPP_TOKEN || 'EAAMT5R4QlZAYBSOX7UZCdQBs2FZBK3FZAVxz0MqIsxM3Xrbd7IGx5BcMkxJBtX9otmoZAQKGsBVNKSnqxka2kZAgxWJu51jwI5uCe2dHGCX6bZAJxGFlgl4hZApWEm2xKxRo3H9sT38biY5B6gCDIy5IKXwXZAWAJtpgX8qd4s1FBGJ0jdHhkxe6imvBHZCZAtGbnLYOqzehYBmzSstZCQM3D7wjnAeHtshazDvkp24ZCa5CrUZCZB8xUtodXA59ZCZBthW0FttX9wHeJmMXmtZC8U2uIj0Gb60DIZA9UPZBDyYKZA2hUyQZDZD';
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || '1277173642137189';

// 1. Root route check karne ke liye
app.get('/', (req, res) => {
    res.send('WhatsApp Bot Server is Running!');
});

// 2. Webhook Verification (Meta GET request bhejta hai)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    }
    res.sendStatus(400);
});

// 3. Webhook Receiver (WhatsApp messages GET/POST karne ke liye)
app.post('/webhook', async (req, res) => {
    console.log('Incoming Webhook Body:', JSON.stringify(req.body, null, 2));

    try {
        const body = req.body;

        if (body.object === 'whatsapp_business_account') {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const message = value?.messages?.[0];

            if (message) {
                const fromNumber = message.from; // Dynamic user phone number
                const userText = message.text?.body || '';

                console.log(`Received message "${userText}" from ${fromNumber}`);

                // Send Auto-Reply
                await sendTextMessage(fromNumber, `Hello! Aapka message mil gaya: "${userText}"`);
            }

            // Meta ko always 200 OK fast bhejna hota hai
            return res.sendStatus(200);
        } else {
            return res.sendStatus(404);
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
        return res.sendStatus(500);
    }
});

// Simple Text Message Bhejne ka function
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
        console.log(`Message successfully sent to ${to}`);
    } catch (error) {
        console.error('Error sending message:', error.response ? error.response.data : error.message);
    }
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
