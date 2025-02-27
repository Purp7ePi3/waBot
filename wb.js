const wppconnect = require('@wppconnect-team/wppconnect');
const winston = require('winston');
const axios = require('axios');

const phoneNumber = require('./phoneNumber.json');
const fs = require('fs');

// Creare dinamicamente botSerializedId
const botid = phoneNumber.botid;
const botSerializedId = `${botid}@c.us`;
const ownerid = phoneNumber.ownerid;

// Helper function to introduce delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function for periodic keep-alive message
async function keepAlive(client) {
  try {
    await client.sendText(ownerid, "Keep-alive check");
    console.log("Keep-alive message sent to owner");
  } catch (error) {
    console.error("Error sending keep-alive message:", error);
  }
}

// Set interval for keep-alive messages (every 24 hours)
function startKeepAlive(client) {
  setInterval(() => keepAlive(client), 24 * 60 * 60 * 1000);
}

async function getPiCoinPrice() {
  try {
    const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest', {
      params: {
        symbol: 'PI',
      },
      headers: {
        'X-CMC_PRO_API_KEY': '75093899-130a-415e-89f9-03d2f1d542db'
      }
    });
    return response.data.data.PI.quote.USD.price;
  } catch (error) {
    console.error('Errore nel recupero del prezzo di Pi Coin:', error);
    return null;
  }
}

// Avvio del bot con wppconnect
wppconnect
  .create({
    session: 'teste',
    onLoadingScreen: (percent, message) => {
      console.log(`LOADING_SCREEN: ${percent}% - ${message}`);
    }
  })
  .then((client) => {
    console.log('Bot avviato con successo.');
    startKeepAlive(client);
    start(client);
  })
  .catch((error) => {
    console.error('Errore nell\'avvio del bot:', error);
  });

async function start(client) {
  console.log('Starting bot...');
  client.onMessage(async (msg) => {
    try {
      if (msg.body.toLowerCase().startsWith('!pi')) {
        const price = await getPiCoinPrice();
        if (price) {
          await client.sendText(msg.from, `Il prezzo attuale di Pi Coin è: $${price.toFixed(2)}`);
        } else {
          await client.sendText(msg.from, 'Errore nel recupero del prezzo di Pi Coin.');
        }
      }
    } catch (error) {
      console.log(error);
    }
  });
}
