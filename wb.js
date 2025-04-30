const wppconnect = require('@wppconnect-team/wppconnect');
const winston = require('winston');
const axios = require('axios');

const phoneNumber = require('./phoneNumber.json');
const fs = require('fs');
const { serialize } = require('v8');

// Define allowed groups for commands (whitelist)
const ALLOWED_DONNINE_GROUP = '@g.us';

// The rest of your code remains the same
const botid = phoneNumber.botid;
const botSerializedId = `${botid}@c.us`;
const ownerid = phoneNumber.ownerid;

// Storage for reminders
const reminders = [];

// Helper function to introduce delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function for periodic keep-alive message
async function keepAlive(client) {
  try {
    // Replace ownerid with your own phone number
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

async function getCryptoInfo(symbol) {
  try {
    const response = await axios.get('', {
      params: { symbol: symbol.toUpperCase() },
      headers: { 'X-CMC_PRO_API_KEY': '' }
    });
    
    const data = response.data.data[symbol.toUpperCase()];
    if (!data) throw new Error(`Dati non trovati per ${symbol}`);

    return {
      name: data.name,
      price: data.quote.USD.price
    };
  } catch (error) {
    console.error(`Errore nel recupero delle informazioni per ${symbol}:`, error.response?.data || error.message);
    return null;
  }
}

// Function to check if the bot is an admin
async function isBotAdmin(client, groupId) {
  try {
    const admins = await client.getGroupAdmins(groupId);
    
    // Check if the bot is an admin by serialized ID
    const isAdmin = admins.some(admin => admin._serialized === botSerializedId);
    
    return isAdmin;
  } catch (error) {
    console.error('Error checking bot admin status:', error);
    return false;
  }
}

// Function to check if a user is an admin
async function isUserAdmin(client, groupId, userId) {
  try {
    const admins = await client.getGroupAdmins(groupId);

    // Check if the user is an admin by serialized ID
    const userSerializedId = `${userId}@c.us`;
    const isAdmin = admins.some(admin => admin._serialized === userSerializedId);    
    return isAdmin;
  } catch (error) {
    console.error('Error checking user admin status:', error);
    return false;
  }
}

// Function to parse time string into milliseconds
function parseTimeToMs(timeStr) {
  const regex = /(\d+)([smhd])/g;
  let matches;
  let totalMs = 0;
  
  while ((matches = regex.exec(timeStr)) !== null) {
    const value = parseInt(matches[1]);
    const unit = matches[2];
    
    switch(unit) {
      case 's': // seconds
        totalMs += value * 1000;
        break;
      case 'm': // minutes
        totalMs += value * 60 * 1000;
        break;
      case 'h': // hours
        totalMs += value * 60 * 60 * 1000;
        break;
      case 'd': // days
        totalMs += value * 24 * 60 * 60 * 1000;
        break;
    }
  }
  
  return totalMs;
}

// Function to create a reminder
function setReminder(client, chatId, userId, timeMs, message) {
  const reminderTime = Date.now() + timeMs;
  
  const reminder = {
    chatId,
    userId,
    time: reminderTime,
    message,
    timerId: null
  };
  
  // Set timeout for the reminder
  reminder.timerId = setTimeout(async () => {
    try {
      // When the time is up, send the reminder
      let reminderMsg = `⏰ *Reminder* ⏰\n\n`;
      if (message) {
        reminderMsg += `Message: ${message}\n`;
      }
      
      await client.sendText(chatId, reminderMsg, { quotedMsg: message ? null : userId });
      
      // Remove the reminder from the array
      const index = reminders.findIndex(r => r.timerId === reminder.timerId);
      if (index !== -1) {
        reminders.splice(index, 1);
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  }, timeMs);
  
  // Add to reminders array
  reminders.push(reminder);
  
  // Return the formatted time when the reminder will trigger
  const reminderDate = new Date(reminderTime);
  return reminderDate.toLocaleString();
}

// Predefined list of phone numbers for the !donnine command
const donnineNumbers = [
  // You can add more numbers here as needed
];

// Get a subset of predefined donnine numbers
function getDonnineNumbers(count) {
  // If requested count is larger than available numbers, limit to available count
  const actualCount = Math.min(count, donnineNumbers.length);
  
  // Return the first 'actualCount' numbers
  return donnineNumbers.slice(0, actualCount);
}

// Start the bot with wppconnect
wppconnect
  .create({
    session: 'teste',
    browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: '/usr/bin/chromium-browser', // <- Replace with your real path
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
  
  // Allow owner to add/remove groups from whitelist
  client.onMessage(async (msg) => {
    try {
      const authorId = msg.from ? msg.from.trim().replace(/[^0-9]+$/, '') : null;
      const isFromOwner = authorId === ownerid.trim().replace(/[^0-9]+$/, '');
      if (msg.body.toLowerCase().startsWith('!ping')) {
        await client.sendText(msg.from, 'pong');
      } else if (msg.body.toLowerCase().startsWith('!help')) {
        const helpMessage = `🤖 *Lista comandi disponibili:*\n\n` +
          `1. \`${'!ping'}\`: Ottieni una risposta "pong" dal bot.🏓\n` +
          `2. \`${'!id'}\`: Fornisce l'ID del gruppo e i prezzi del bot.📋\n` +
          `3. \`${'!help'}\`: Visualizza questo messaggio di aiuto. ℹ️\n\n` +
          `*Comandi disponibili solo in gruppi abilitati:*\n` +
          `4. \`${'!everyone'}\`: Menziona tutti gli utenti in un gruppo.📢\n` +
          `5. \`${'!remindme [tempo] [messaggio]'}\`: Imposta un promemoria. Es: !remindme 5m Chiamare mamma ⏰ ⚠️*Minore di 21 giorni*⚠️\n\n` +
          `6. \`${'!crypto [simbolo]'}\`: Ottieni info su una criptovaluta. Es: !crypto btc 💰\n` +
          `7. \`${'!destruction'}\`: Elimina tutti i membri del gruppo (solo admin) 💥\n`;
          
        await client.sendText(msg.from, helpMessage);
        return;
      }
      
      // Skip processing for non-command messages
      if (!msg.body.startsWith('!')) {
        return;
      }
      
      // Continue with the rest of the commands (only for whitelisted groups)
      if (msg.body.startsWith('!destruction')) {
        let authorId = msg.author.trim().replace(/[^0-9]+$/, '');
        if (!msg.isGroupMsg) {
          await client.sendText(msg.from, 'Questo comando può essere eseguito solo in gruppi.');
          return;
        }

        const groupId = msg.from;

        // Check if the bot is an admin
        const botIsAdmin = await isBotAdmin(client, groupId);
        // Check if the message sender is an admin
        const userIsAdmin = await isUserAdmin(client, groupId, authorId);

        if (botIsAdmin && userIsAdmin) {
          
          // Remove all group members
          const participants = await client.getGroupMembers(groupId);
          if (participants.length === 0) {
            await client.sendText(groupId, 'Nessun membro da rimuovere.');
            return;
          }

          await client.sendText(groupId, 'Hasta la vista amigos.💥');
          
          for (const participant of participants) {
            try {
              // Don't remove the bot itself
              if (participant.id.user !== botid) {
                await client.removeParticipant(groupId, participant.id.user);
                await sleep(500); // Delay between removals (0.5 seconds)
              }
            } catch (err) {
              console.error(`Failed to remove ${participant.id.user}:`, err);
            }
          }
          
          await client.sendText(groupId, 'Tutti i membri sono stati rimossi.');
          await client.leaveGroup(groupId);
        } else {
          // One or both are not admins
          const statusMessage = (botIsAdmin ? 'Il bot è un amministratore.' : 'Il bot NON è un amministratore.') +
            ' ' + (userIsAdmin ? 'L\'autore del messaggio è un amministratore.' : 'L\'autore del messaggio NON è un amministratore.');
          
          await client.sendText(groupId, statusMessage);
        }
      } else if (msg.body.toLowerCase().startsWith('!remindme')) {
        // Parse the command: !remindme 5m Remember to check email
        const commandParts = msg.body.split(' ');
        
        if (commandParts.length < 2) {
          await client.sendText(msg.from, '⚠️ Formato errato. Usa: !remindme [tempo] [messaggio opzionale]\nEsempio: !remindme 5m Controllare email\n\nFormati di tempo supportati: 10s (secondi), 5m (minuti), 2h (ore), 1d (giorni)');
          return;
        }
        
        const timeStr = commandParts[1];
        const reminderMessage = commandParts.slice(2).join(' ');
        const timeMs = parseTimeToMs(timeStr);
        
        if (timeMs <= 0) {
          await client.sendText(msg.from, '⚠️ Formato tempo non valido. Usa formati come: 10s, 5m, 2h, 1d');
          return;
        }
        
        // If this is a reply to another message, use that as the reminder message
        let finalMessage = reminderMessage;
        if (msg.quotedMsg && !finalMessage) {
          finalMessage = msg.quotedMsg.body;
        }
        
        // Set the reminder
        const reminderTime = setReminder(client, msg.from, msg.id, timeMs, finalMessage);
        
        // Confirm to the user
        await client.sendText(msg.from, `✅ Promemoria impostato per: ${reminderTime}${finalMessage ? `\nMessaggio: ${finalMessage}` : ''}`);
      } else if (msg.body.toLowerCase().startsWith('!donnine')) {
        // Only work in groups
        if (!msg.isGroupMsg) {
          await client.sendText(msg.from, 'Questo comando può essere eseguito solo nei gruppi.');
          return;
        }

        // Check if the command is being used in the allowed group
        if (msg.from !== ALLOWED_DONNINE_GROUP) {
          await client.sendText(msg.from, 'Questo comando è disabilitato in questo gruppo.');
          return;
        }

        const commandParts = msg.body.trim().split(' ');
        let count = donnineNumbers.length; // Default count
        
        if (commandParts.length > 1) {
          const requestedCount = parseInt(commandParts[1]);
          if (!isNaN(requestedCount) && requestedCount > 0) {
            count = Math.min(requestedCount, 10); // Limit to max 10 numbers
          }
        }
        
        // Get the phone numbers
        const numbers = getDonnineNumbers(count);
        
        if (numbers.length === 0) {
          await client.sendText(msg.from, 'Nessun numero disponibile al momento.');
          return;
        }
        
        // Format the phone numbers into a nice message with tags
        let message = '💃 *Donnine* 💃\n\n';
        let mentionString = '';
        
        numbers.forEach((number, index) => {
          mentionString += `@${number} `;
          message += `@${number} `;
        });
        
        await client.sendText(msg.from, message);

      } else if (msg.isGroupMsg && msg.body.toLowerCase().startsWith('!everyone')) {
        const participants = await client.getGroupMembers(msg.from);
        let authorId = msg.author.trim().replace(/[^0-9]+$/, ''); // Remove non-numeric part at the end of ID
        let mentionString = ''; // Initialize mentionString
        for (let i = 0; i < participants.length; i++) {
            const participant = participants[i];
            if (participant.id.user !== authorId && participant.id.user !== botid) {
              mentionString += `@${participant.id.user} `;
            }
        }
        await client.sendText(msg.from, mentionString.trim());
      } else if (msg.body.toLowerCase().startsWith('!franz97')) {
        await client.sendText(msg.from, 'Sembri il mio cane');
      } else if (msg.body.toLowerCase().startsWith("!pivona")) {
        await client.sendText(msg.from, "Ciao Pivona sono Antonio, esci con me?");
      } else if (msg.body.toLowerCase().startsWith('!crypto ')) {
        const symbol = msg.body.split(' ')[1];
        if (!symbol) {
          await client.sendText(msg.from, 'Per favore specifica una criptovaluta, es: !crypto eth');
          return;
        }
        const cryptoInfo = await getCryptoInfo(symbol);
        if (cryptoInfo) {
          await client.sendText(msg.from, `Nome: ${cryptoInfo.name}\nPrezzo: $${cryptoInfo.price.toFixed(2)}`);
        } else {
          await client.sendText(msg.from, `Errore nel recupero delle informazioni per ${symbol}.`);
        }
      }
    } catch (error) {
      console.log(error);
    }
  });
}
