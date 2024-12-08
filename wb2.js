const wppconnect = require('@wppconnect-team/wppconnect');
const winston = require('winston');

const botid = '393423386241';  // Replace with your bot's phone number
const botSerializedId = `${botid}@c.us`; // Serialized ID of the bot
const ownerid = '393735456899@c.us'; //phone number

// Helper function to introduce delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Funzione per inviare la notifica giornaliera
async function notifyBotStatus(client) {
  try {
    const isConnected = await client.isConnected();
    const message = isConnected
      ? "Il bot è attualmente online e connesso a WhatsApp."
      : "Il bot è offline e non è connesso a WhatsApp.";

    // Invia il messaggio di stato al destinatario
    await client.sendText(ownerid, message);
    console.log(message);
  } catch (error) {
    console.error("Errore nel controllo dello stato del bot:", error);
  }
}

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

// Set interval for keep-alive messages (every 12 hours)
function startKeepAlive(client) {
  // Interval set to 24 hours
  setInterval(() => keepAlive(client), 24 * 60 * 60 * 1000);
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

    // Start keep-alive interaction every 12 hours
    startKeepAlive(client);

    // Start daily notification timer and message handling
    start(client);
  })
  .catch((error) => {
    console.error('Errore nell\'avvio del bot:', error);
  });


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

async function start(client) {
  console.log('Starting bot...');
  client.onMessage(async (msg) => {
    try {
      if (msg.body.startsWith('!destruction')) {
        let authorId = msg.author.trim().replace(/[^0-9]+$/, ''); // Rimuove la parte non numerica alla fine dell'ID
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
          
          // Rimuovere tutti i membri del gruppo
          const participants = await client.getGroupMembers(groupId);
          if (participants.length === 0) {
            await client.sendText(groupId, 'Nessun membro da rimuovere.');
            return;
          }

          await client.sendText(groupId, 'Hasta la vista amigos.💥');
          
          for (const participant of participants) {
            try {
              // Non rimuovere il bot stesso
              if (participant.id.user !== botid) {
                await client.removeParticipant(groupId, participant.id.user);
                await sleep(500); // Delay between removals (1 second)
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

      }
      else if (msg.body.toLowerCase().startsWith('!ping')) {
        await client.sendText(msg.from, 'pong');

      }else if (msg.isGroupMsg && msg.body.toLowerCase().startsWith('!everyone')) {
        const participants = await client.getGroupMembers(msg.from);
        let authorId = msg.author.trim().replace(/[^0-9]+$/, ''); // Rimuove la parte non numerica alla fine dell'ID
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

      } else if (msg.body.toLowerCase().startsWith( '!help')) {
        const helpMessage = `🤖 *Lista comandi disponibili:*\n\n` +
          `1. \`${'!ping'}\`: Ottieni una risposta "pong" dal bot.🏓\n` +
          `2. \`${'!everyone'}\`: Menziona tutti gli utenti in un gruppo (solo gruppi).📢\n` +
          `3. \`${'!help'}\`: Visualizza questo messaggio di aiuto. ℹ️`;
        await client.sendText(msg.from, helpMessage);
      }
    } catch (error) {
      console.log(error);
    }
  });
}
