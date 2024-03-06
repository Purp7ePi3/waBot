const puppeteer = require('puppeteer');

const wppconnect = require('@wppconnect-team/wppconnect');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { on } = require('events');

let BotId = '16476661733@c.us'
const ownerId = '393735456899@c.us'




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

  // Update the launch configuration to use the new Headless mode
  const browser = await puppeteer.launch({
    headless: 'new', // Use 'new' instead of 'true'
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
          console.log('Received command:', msg.body); // Add this line for debugging
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
      // Extract the group invitation code from the matched URL
      const inviteCode = inviteMatch[1];

      try {
        // Join the group using the invite code
        const result = await client.joinGroup(inviteCode);

        // Access the group ID if needed
        const groupId = result.id;

        // Send a confirmation message
        await client.sendText(msg.from, 'Joined the group! 🎉');
      } catch (joinError) {
        // Handle join group error
        await client.sendText(msg.from, 'Failed to join the group. Please try again later.');
      }
    }

      if (msg.body.toLowerCase().startsWith('!ping')) {
        // Send a new message to the same chat
        client.sendText(msg.from, 'pong'); 
      }else if(msg.isGroupMsg && msg.body && msg.body.toLowerCase().startsWith('!everyone')){
        // Ottieni la lista dei partecipanti
        const participants = await client.getGroupMembers(msg.from);
        // Ottieni l'ID del mittente (chi ha scritto il messaggio)
        let senderId = msg.author;
        let BotId = '16476661733@c.us'
        // Utilizza un'espressione regolare per troncare solo il numero in senderId
        senderId = senderId.replace(/[^0-9]/g, '');
        BotId = BotId.replace(/[^0-9]/g, '');
        // Creare una stringa di menzione escludendo il mittente
        let mentionString = '';
        for (const participant of participants) {
            const phoneNumber = participant.id.user.replace(/[^0-9]/g, '');
            if (phoneNumber !== senderId && phoneNumber !== BotId) {
                mentionString += `@${phoneNumber} `;
            }
        }
        // Invia il messaggio menzionando tutti gli utenti nel gruppo
        await client.sendText(msg.from, `${mentionString.trim()}`);

        }else if (msg.body.toLowerCase().startsWith('!franz97')) {
          // Send a new message to the same chat
          client.sendText(msg.from, 'sembri il mio cane');

        }else if (msg.body.toLowerCase().startsWith('!flipcoin')) {
            // Extract options from the message
            const options = msg.body.substring('!flipcoin'.length).split(',');
        
            // Remove leading and trailing whitespaces from each option
            const trimmedOptions = options.map(option => option.trim()).filter(option => option !== '');
        
            // Check if there are enough options (excluding the command)
            if (trimmedOptions.length < 2) {
              // Verifica che msg.author sia definito prima di tentare di accedere a replace
              const senderId = msg.author ? msg.author.replace(/[^0-9]/g, '') : '';
              const mentionString = senderId ? `@${senderId}` : '';
              if (msg.isGroupMsg){
                await client.sendText(msg.from, `Ci vogliono almeno due opzioni, non era difficile da capire.\nImmaginavo avresti sbagliato tu ${mentionString}.`);

              }else{
                await client.sendText(msg.from, `Ci vogliono almeno due opzioni, non era difficile da capire.\nImmaginavo avresti sbagliato tu.`);

              }
              // Invia il messaggio di avviso con menzione del mittente direttamente nel messaggio
    
              return;
            }
        
            // Generate a random number (0 or 1) to represent Heads or Tails
            const result = Math.floor(Math.random() * 2);
        
            // Ensure the result index is valid
            const resultIndex = result % trimmedOptions.length;
        
            // Map the result to the provided options
            const coinResult = trimmedOptions[resultIndex];
        
            // Send a message announcing the outcome
            await client.sendText(msg.from, `${result === 0 ? 'Testa' : 'Croce'}, quindi *${coinResult.toUpperCase()}*.`);

          }else if(msg.body.toLowerCase().startsWith('!coffee')){
            // Personalizza il link a tua scelta
            const coffeeLink = 'https://www.paypal.me/simonebellissimo?locale.x=it_IT';
            const coffeeMessage = `☕️Salve☕️\n\n` +
                                  `Scommetto che stai apprezzando il mio lavoro qui. Tenerlo online è un po' come cercare di tenere in vita una pianta grassa: ha bisogno di cure, ma senza acqua e sole muore!\n\n` +
                                  `Se ti va di darmi un aiutino, ecco il mio link PayPal: ${coffeeLink}\n\n` +
                                  `Nessuna pressione, sappiate che sono povero`;
        
            // Invia il messaggio del caffè virtuale
            await client.sendText(msg.from, coffeeMessage);
          }  else if (msg.body.toLowerCase().startsWith('!meteo')) {
            // Verifica se il comando può essere utilizzato
            if (isMeteoCommandAvailable()) {
              // Estrai la località dal messaggio
              const location = msg.body.substring('!meteo'.length).trim();
          
              // Sostituisci 'YOUR_API_KEY' con la tua chiave API effettiva di OpenWeatherMap
              const apiKey = '8ae5bea9e7544f766d48d54da3a2fe5a';
              const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&lang=it`;
          
              try {
                // Recupera le informazioni sul meteo dall'API
                const response = await axios.get(apiUrl);
                const weatherData = response.data;
          
                // Estrai le informazioni rilevanti dalla risposta dell'API
                const temperatureKelvin = weatherData.main.temp;
                const temperatureCelsius = temperatureKelvin - 273.15;
                const description = weatherData.weather[0].description;
          
                // Utilizza temperatureCelsius nei tuoi messaggi o operazioni successive
                const weatherMessage = `Condizioni meteorologiche attuali a ${location}:\nTemperatura: ${temperatureCelsius.toFixed(2)}°C\nDescrizione: ${description}`;
                await client.sendText(msg.from, weatherMessage);
          
                // Incrementa il conteggio delle chiamate
                incrementUsageCount();
              } catch (error) {
                console.error('Errore nel recupero delle informazioni meteorologiche:', error.message);
                await client.sendText(msg.from, 'Spiacente, non ho potuto recuperare le informazioni meteorologiche al momento.');
              }
            }else{
              await client.sendText(msg.from, 'Non ho soldi per aumentare il limite di richieste mensili, aspettate il primo del mese.');
            }
          }else if(msg.body.toLowerCase().startsWith('!share')){
              await client.sendContactVcard(msg.from, BotId, 'Simon_bot');
          }else if (msg.body.toLowerCase().startsWith('!help')) {
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
                              `*Se vuoi aggiungermi in un gruppo, fallo manualmente o inviami il link d'invito.🚀*`

            // Invia il messaggio di aiuto aggiornato
            await client.sendText(msg.from, helpMessage);

          //Input più opzioni e ne esce solo una
        }else if (msg.body.toLowerCase().startsWith('!spin')) {
              const wordsAfterSpin = msg.body.substring('!spin'.length).trim();
              const wordsArray = wordsAfterSpin.split(',');
            
              // Verifica se ci sono parole nell'array
              if (wordsArray.length > 0) {
                // Genera un indice casuale per selezionare una parola
                const randomIndex = Math.floor(Math.random() * wordsArray.length);
            
                // Ottieni la parola casuale
                const randomWord = wordsArray[randomIndex];
            
                // Ora puoi utilizzare la variabile 'randomWord' per qualsiasi cosa
                await client.sendText(msg.from, 'Scossa? Va beneeeee!', randomWord);

              } else {
                console.log('Nessuna parola disponibile dopo !spin');
              }
        //Crea un sondaggio
        }else if (msg.body.toLowerCase().startsWith('!poll')) {
          // Extract options from the message
          const pollOptions = msg.body.substring('!poll'.length).split(',');       
          // Remove leading and trailing whitespaces from each option
          const trimmedOptions = pollOptions.map(option => option.trim()).filter(option => option !== '');
        
          // Check if there are enough options (excluding the command)
          if (trimmedOptions.length < 2) {
            // Inform the user that at least two options are required
            await client.sendText(msg.from, 'Devi mettere almeno due opzioni per aprire un sondaggio.');
            return;
          }
          // Extract the poll name from the first option
          const pollName = trimmedOptions.shift();
          try {
            // Send the poll message
            const pollMessage = await client.sendPollMessage(msg.from, pollName, trimmedOptions);
          } catch (pollError) {
            // Handle poll creation error
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

  // Ordina casualmente l'array di file
  const shuffledFiles = files.sort(() => Math.random() - 0.5);

  // Seleziona un file in modo casuale dall'array ordinato
  const randomFile = shuffledFiles[Math.floor(Math.random() * shuffledFiles.length)];

  return path.join(folder, randomFile);
}

const usageCountFile = 'meteo_usage_count.txt';
function isMeteoCommandAvailable() {
  try {
    // Verifica se è il primo giorno del mese
    if (isTodayFirstDayOfMonth()) {
      // Resetta il conteggio
      fs.writeFileSync(usageCountFile, '0', 'utf8');
    }

    // Leggi il conteggio corrente dal file
    let count = fs.readFileSync(usageCountFile, 'utf8');
    count = parseInt(count);

    // Verifica se il limite è stato superato
    return count <= 999;
  } catch (error) {
    console.error('Errore nella lettura del conteggio delle chiamate:', error.message);
    return false;
  }
}

// Funzione per incrementare il conteggio delle chiamate
function incrementUsageCount() {
  try {
    // Leggi il conteggio corrente dal file
    let count = fs.readFileSync(usageCountFile, 'utf8');
    count = parseInt(count) + 1;

    // Scrivi il nuovo conteggio nel file
    fs.writeFileSync(usageCountFile, count.toString(), 'utf8');
  } catch (error) {
    console.error('Errore nell\'aggiornamento del conteggio delle chiamate:', error.message);
  }
}

function isTodayFirstDayOfMonth() {
  const today = new Date();
  return today.getDate() === 1;
}
