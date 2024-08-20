const wppconnect = require('@wppconnect-team/wppconnect');
const winston = require('winston');

const botid = '+XX XXXX';  // Replace with your bot's phone number
const botSerializedId = `${botid}@c.us`; // Serialized ID of the bot
const ownerid = '+XX XXXXX@c.us'; //phone number

// Create a custom logger that only logs errors
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console(),
  ],
});

wppconnect
  .create({
    session: 'teste',
    onLoadingScreen: (percent, message) => {
      // Comment out or remove this line to suppress loading screen logs
      // console.log('LOADING_SCREEN', percent, message);
    },
    logger: logger,  // Use the custom logger
  })
  .then((client) => start(client))
  .catch((error) => {
    console.error(error);
  });

// Helper function to introduce delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
      let authorId = msg.author.trim().replace(/[^0-9]+$/, ''); // Rimuove la parte non numerica alla fine dell'ID

      if (msg.body.startsWith('!destruction')) {
        
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

          /*const phrases = [
            'Arrivederci amici!',
            'Ci vediamo presto!',
            'Alla prossima!',
            'State bene, amici!',
            'A presto, compagni!',
            'Buona giornata a tutti!',
            'Ciao ciao!'
          ];

          // Seleziona una frase casuale
          const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];*/
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
      else if (msg.body === '!ping') {
        await client.sendText(msg.from, 'pong');

      }else if (msg.isGroupMsg && msg.body.toLowerCase().startsWith('!everyone')) {
        const participants = await client.getGroupMembers(msg.from);

        let mentionString = ''; // Initialize mentionString
        for (let i = 0; i < participants.length; i++) {
            const participant = participants[i];
            if (participant.id.user !== authorId && participant.id.user !== botid) {
              mentionString += `@${participant.id.user} `;
            }
        }
        await client.sendText(msg.from, mentionString.trim());
    
    

      } else if (msg.body === '!franz97') {
        await client.sendText(msg.from, 'Sembri il mio cane');
      } else if (msg.body === '!help') {
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
