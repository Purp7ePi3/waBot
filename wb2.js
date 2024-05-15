const puppeteer = require('puppeteer');
const wppconnect = require('@wppconnect-team/wppconnect');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { on } = require('events');

let BotId = 'botNumber@c.us';

const ownerId = 'ownerNnumber@c.us';

const nullLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  http: () => {},
  log: () => {},
};

async function start(client) {
  console.log('Starting bot...');
  const browser = await puppeteer.launch({
    headless: 'new',
  });
}

wppconnect
  .create({
    session: 'teste',
    logger: nullLogger,
    logLevel: 'silent',
    onLoadingScreen: (percent, message) => {
      console.log('LOADING_SCREEN', percent, message);
    },
  })
  .then((client) => start(client))
  .catch((error) => {
    console.error(error);
  });

let userReactions = {}; // Store user-specific reactions

function add(user, emoji) {
  userReactions[user] = emoji;
  console.log(`Reaction set for ${user}: ${emoji}`);
}

function remove(user) {
  delete userReactions[user];
  console.log(`Reaction removed for ${user}`);
}

function start(client) {
  console.log('Starting bot...');
  client.onMessage(async (msg) => {
    const inviteMatch = msg.body.match(/(https:\/\/chat.whatsapp.com\/[a-zA-Z0-9]{20,24})/);
    try {
      if (msg.body.startsWith('!add ')) {
        const matchResult = msg.body.match(/^!add (.+)$/);
        console.log('Received command:', msg.body);
        if (matchResult) {
          const [, emoji] = matchResult;
          const user = msg.author;
          add(user, emoji);
        }
      } else if (msg.body.startsWith('!remove')) {
        const user = msg.author;
        remove(user);
      } else {
        const userReaction = userReactions[msg.author];
        if (userReaction) {
          await client.sendReactionToMessage(msg.id, userReaction);
        }
      }

      if (inviteMatch) {
        const inviteCode = inviteMatch[1];

        try {
          const result = await client.joinGroup(inviteCode);
          const groupId = result.id;
          await client.sendText(msg.from, 'Joined the group! 🎉');
        } catch (joinError) {
          await client.sendText(msg.from, 'Failed to join the group. Please try again later.');
        }
      }

      if (msg.body.toLowerCase().startsWith('!ping')) {
        client.sendText(msg.from, 'pong');
      } else if (msg.isGroupMsg && msg.body && msg.body.toLowerCase().startsWith('!everyone')) {
        const participants = await client.getGroupMembers(msg.from);
        let senderId = msg.author;
        senderId = senderId.replace(/[^0-9]/g, '');
        BotId = BotId.replace(/[^0-9]/g, '');
        let mentionString = '';
        for (const participant of participants) {
          const phoneNumber = participant.id.user.replace(/[^0-9]/g, '');
          if (phoneNumber !== senderId && phoneNumber !== BotId) {
            mentionString += `@${phoneNumber} `;
          }
        }
        await client.sendText(msg.from, `${mentionString.trim()}`);
      } else if (msg.body.toLowerCase().startsWith('!franz97')) {
        client.sendText(msg.from, 'sembri il mio cane');
      } else if (msg.body.toLowerCase().startsWith('!flipcoin')) {
        const options = msg.body.substring('!flipcoin'.length).split(',');
        const trimmedOptions = options.map(option => option.trim()).filter(option => option !== '');
        if (trimmedOptions.length < 2) {
          const senderId = msg.author ? msg.author.replace(/[^0-9]/g, '') : '';
          const mentionString = senderId ? `@${senderId}` : '';
          if (msg.isGroupMsg) {
            await client.sendText(msg.from, `Ci vogliono almeno due opzioni, non era difficile da capire.\nImmaginavo avresti sbagliato tu ${mentionString}.`);
          } else {
            await client.sendText(msg.from, `Ci vogliono almeno due opzioni, non era difficile da capire.\nImmaginavo avresti sbagliato tu.`);
          }
          return;
        }
        const result = Math.floor(Math.random() * 2);
        const resultIndex = result % trimmedOptions.length;
        const coinResult = trimmedOptions[resultIndex];
        await client.sendText(msg.from, `${result === 0 ? 'Testa' : 'Croce'}, quindi *${coinResult.toUpperCase()}*.`);
      } else if (msg.body.toLowerCase().startsWith('!coffee')) {
        const coffeeLink = 'PaypalLink';
        const coffeeMessage = `☕️Salve☕️\n\n` +
          `Scommetto che stai apprezzando il mio lavoro qui. Tenerlo online è un po' come cercare di tenere in vita una pianta grassa: ha bisogno di cure, ma senza acqua e sole muore!\n\n` +
          `Se ti va di darmi un aiutino, ecco il mio link PayPal: ${coffeeLink}\n\n` +
          `Nessuna pressione, sappiate che sono povero`;
        await client.sendText(msg.from, coffeeMessage);
      } else if (msg.body.toLowerCase().startsWith('!meteo')) {
        if (isMeteoCommandAvailable()) {
          const location = msg.body.substring('!meteo'.length).trim();
          const apiKey = '8ae5bea9e7544f766d48d54da3a2fe5a';
          const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&lang=it`;
          try {
            const response = await axios.get(apiUrl);
            const weatherData = response.data;
            const temperatureKelvin = weatherData.main.temp;
            const temperatureCelsius = temperatureKelvin - 273.15;
            const description = weatherData.weather[0].description;
            const weatherMessage = `Condizioni meteorologiche attuali a ${location}:\nTemperatura: ${temperatureCelsius.toFixed(2)}°C\nDescrizione: ${description}`;
            await client.sendText(msg.from, weatherMessage);
            incrementUsageCount();
          } catch (error) {
            console.error('Errore nel recupero delle informazioni meteorologiche:', error.message);
            await client.sendText(msg.from, 'Spiacente, non ho potuto recuperare le informazioni meteorologiche al momento.');
          }
        } else {
          await client.sendText(msg.from, 'Non ho soldi per aumentare il limite di richieste mensili, aspettate il primo del mese.');
        }
      } else if (msg.body.toLowerCase().startsWith('!share')) {
        await client.sendContactVcard(msg.from, BotId, 'Simon_bot');
      } else if (msg.body.toLowerCase().startsWith('!help')) {
        const helpMessage = `🤖 *Lista comandi disponibili:*\n\n` +
          `1. \`${'!ping'}\`: Ottieni una risposta "pong" dal bot.🏓\n` +
          `2. \`${'!everyone'}\`: Menziona tutti gli utenti in un gruppo (solo gruppi).📢\n` +
          `3. \`${'!flipcoin opzione1, opzione2'}\`: Lancia una moneta con opzioni personalizzate.🪙\n` +
          `4. \`${'!meteo località'}\`: Ottieni informazioni meteorologiche per una specifica località. 🌦️\n` +
          `5. \`${'!spin opzione1, ..., opzioneN'}\`: Sceglie una cosa a caso dalla lista. 🎡\n` +
          `6. \`${'!poll, domanda, opzione1, opzione2, ...'}\`: Crea un sondaggio con opzioni personalizzate.📊\n` +
          `7. \`${'!share'}\`: Condividi il mio profilo anche senza numero. 📤\n` +
          `8. \`${'!coffee'}\`: Supporta il bot con una donazione. ☕️\n` +
          `9. \`${'!help'}\`: Visualizza questo messaggio di aiuto. ℹ️\n\n` +
          `*Se vuoi aggiungermi in un gruppo, fallo manualmente o inviami il link d'invito.🚀*`;
        await client.sendText(msg.from, helpMessage);
      } else if (msg.body.toLowerCase().startsWith('!spin')) {
        const wordsAfterSpin = msg.body.substring('!spin'.length).trim();
        const wordsArray = wordsAfterSpin.split(',');
        if (wordsArray.length > 0) {
          const randomIndex = Math.floor(Math.random() * wordsArray.length);
          const randomWord = wordsArray[randomIndex];
          await client.sendText(msg.from, 'Scossa? Va beneeeee!', randomWord);
        } else {
          console.log('Nessuna parola disponibile dopo !spin');
        }
      } else if (msg.body.toLowerCase().startsWith('!poll')) {
        const pollOptions = msg.body.substring('!poll'.length).split(',');
        const trimmedOptions = pollOptions.map(option => option.trim()).filter(option => option !== '');
        if (trimmedOptions.length < 2) {
          await client.sendText(msg.from, 'Devi mettere almeno due opzioni per aprire un sondaggio.');
          return;
        }
        const pollName = trimmedOptions.shift();
        try {
          const pollMessage = await client.sendPollMessage(msg.from, pollName, trimmedOptions);
        } catch (pollError) {
          console.error('Error creating poll:', pollError.message);
          await client.sendText(msg.from, 'Hai sbagliato qualcosa, prova ancora.');
        }
      }
    } catch (e) {
      console.log(e);
    }
  });
}

async function getRandomImageFromFolder(folder) {
  const files = fs.readdirSync(folder);
  const shuffledFiles = files.sort(() => Math.random() - 0.5);
  const randomFile = shuffledFiles[Math.floor(Math.random() * shuffledFiles.length)];
  return path.join(folder, randomFile);
}

const usageCountFile = 'meteo_usage_count.txt';
function isMeteoCommandAvailable() {
  try {
    if (isTodayFirstDayOfMonth()) {
      fs.writeFileSync(usageCountFile, '0', 'utf8');
    }
    let count = fs.readFileSync(usageCountFile, 'utf8');
    count = parseInt(count);
    return count <= 999;
  } catch (error) {
    console.error('Errore nella lettura del conteggio delle chiamate:', error.message);
    return false;
  }
}

function incrementUsageCount() {
  try {
    let count = fs.readFileSync(usageCountFile, 'utf8');
    count = parseInt(count) + 1;
    fs.writeFileSync(usageCountFile, count.toString(), 'utf8');
  } catch (error) {
    console.error('Errore nell\'aggiornamento del conteggio delle chiamate:', error.message);
  }
}

function isTodayFirstDayOfMonth() {
  const today = new Date();
  return today.getDate() === 1;
}
