const wppconnect = require('@wppconnect-team/wppconnect');
const winston = require('winston');
const axios = require('axios');
const OpenAI = require('openai');
const sharp = require('sharp');

const fs = require('fs');
const https = require('https');
const { serialize } = require('v8');

const BOT_ID = "";
const BOT_SERIALIZED_ID = `${BOT_ID}@c.us`;
const OWNER_ID = "";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function keepAlive(client) {
  try {
    await client.sendText(OWNER_ID, "Keep-alive check");
    console.log("Keep-alive message sent to owner");
  } catch (error) {
    console.error("Error sending keep-alive message:", error);
  }
}

function startKeepAlive(client) {
  setInterval(() => keepAlive(client), 24 * 60 * 60 * 1000);
}

async function isBotAdmin(client, groupId) {
  try {
    const admins = await client.getGroupAdmins(groupId);
    const isAdmin = admins.some(admin => admin._serialized === BOT_SERIALIZED_ID);
    return isAdmin;
  } catch (error) {
    console.error('Error checking bot admin status:', error);
    return false;
  }
}

async function isUserAdmin(client, groupId, userId) {
  try {
    const admins = await client.getGroupAdmins(groupId);
    const userSerializedId = `${userId}@c.us`;
    const isAdmin = admins.some(admin => admin._serialized === userSerializedId);    
    return isAdmin;
  } catch (error) {
    console.error('Error checking user admin status:', error);
    return false;
  }
}

const donnineNumbers = [
  "", ""
];

function getDonnineNumbers(count) {
  const actualCount = Math.min(count, donnineNumbers.length);
  return donnineNumbers.slice(0, actualCount);
}

wppconnect
  .create({
    session: 'teste',
    browserArgs: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-gpu',
      '--no-zygote',
      '--single-process'
    ],
    puppeteerOptions: {
      headless: true,
      protocolTimeout: 120000
    },
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
      // console.log('messaggio ricevuto: ', msg.body);
      
      // Check if message has body text
      if (!msg.body || typeof msg.body !== 'string') {
        // KEEP THIS.
        return;
      }
      
      // Ping command
      if (msg.body.toLowerCase().startsWith('!ping')) {
        await client.sendText(msg.from, 'pong');
        return;
      }
      
      // Help command
      if (msg.body.toLowerCase().startsWith('!help')) {
        const helpMessage = `🤖 *Lista comandi disponibili:*\n\n` +
          `1. !ping: Ottieni una risposta "pong" dal bot.🏓\n` +
          `2. !help: Visualizza questo messaggio di aiuto. ℹ️\n` +
          `3. !everyone: Menziona tutti gli utenti in un gruppo.📢\n` +
          `4. !destruction: Elimina tutti i membri del gruppo (solo admin) 💥\n` +
          `5. !donnine [numero]: Menziona le donnine disponibili 💃\n` +
        
        await client.sendText(msg.from, helpMessage);
        return;
      }

      // Everyone command
      if (msg.isGroupMsg && msg.body.toLowerCase().startsWith('!everyone')) {
        try {
          const participants = await client.getGroupMembers(msg.from);
          
          let authorId = null;
          if (msg.author) {
            authorId = msg.author.trim().replace(/[^0-9]/g, '');
          }
          
          try {
            let text1 = "";
            let mentions1 = [];
            
            for (const participant of participants) {
              if (!participant.isMe && participant.id.user != authorId) {
                mentions1.push(participant.id._serialized);
                text1 += `@${participant.id.user} `;
              }
            }

            await client.sendMentioned(msg.from, text1.trim(), mentions1);
            console.log('Success');
            return;
            
          } catch (error1) {
            console.log('Failed:', error1.message);
          }
          
          let fallbackText = "";
          for (const participant of participants) {
            if (!participant.isMe && participant.id.user != authorId) {
              fallbackText += `${participant.pushname || participant.formattedName || participant.id.user} `;
            }
          }
          await client.sendText(msg.from, fallbackText);
          
        } catch (error) {
          console.error('Error in everyone command:', error);
          await client.sendText(msg.from, 'Errore nel comando everyone');
        }
        return;
      }

      // Destruction command
      if (msg.body.startsWith('!destruction')) {
        let authorId = msg.author ? msg.author.trim().replace(/[^0-9]+$/, '') : null;
        
        if (!msg.isGroupMsg) {
          await client.sendText(msg.from, 'Questo comando può essere eseguito solo in gruppi.');
          return;
        }

        const groupId = msg.from;
        const botIsAdmin = await isBotAdmin(client, groupId);
        const userIsAdmin = await isUserAdmin(client, groupId, authorId);

        if (botIsAdmin && userIsAdmin) {
          const participants = await client.getGroupMembers(groupId);
          if (participants.length === 0) {
            await client.sendText(groupId, 'Nessun membro da rimuovere.');
            return;
          }

          await client.sendText(groupId, 'Hasta la vista amigos.💥');
          
          for (const participant of participants) {
            try {
              if (participant.id.user !== BOT_ID) {
                await client.removeParticipant(groupId, participant.id.user);
                await sleep(500);
              }
            } catch (err) {
              console.error(`Failed to remove ${participant.id.user}:`, err);
            }
          }
          
          await client.sendText(groupId, 'Tutti i membri sono stati rimossi.');
          await client.leaveGroup(groupId);
        } else {
          const statusMessage = (botIsAdmin ? 'Il bot è un amministratore.' : 'Il bot NON è un amministratore.') +
            ' ' + (userIsAdmin ? 'L\'autore del messaggio è un amministratore.' : 'L\'autore del messaggio NON è un amministratore.');
          
          await client.sendText(groupId, statusMessage);
        }
        return;
      }
      
      // Donnine command
      if (msg.body.toLowerCase().startsWith('!donnine')) {
        if (!msg.isGroupMsg) {
          await client.sendText(msg.from, 'Questo comando può essere eseguito solo nei gruppi.');
          return;
        }

        const commandParts = msg.body.trim().split(' ');
        let count = donnineNumbers.length;
        
        if (commandParts.length > 1) {
          const requestedCount = parseInt(commandParts[1]);
          if (!isNaN(requestedCount) && requestedCount > 0) {
            count = Math.min(requestedCount, 10);
          }
        }
        
        const numbers = getDonnineNumbers(count);
        
        if (numbers.length === 0) {
          await client.sendText(msg.from, 'Nessun numero disponibile al momento.');
          return;
        }
        
        let message = '💃 Donnine 💃\n\n';
        let mentions = [];
        
        numbers.forEach((number) => {
          mentions.push(`${number}@c.us`);
          message += `@${number} `;
        });
        
        try {
          await client.sendMentioned(msg.from, message.trim(), mentions);
        } catch (error) {
          console.log('Donnine mention failed, sending as text:', error.message);
          await client.sendText(msg.from, message);
        }
        return;
      }
      
      // Franz97 command
      if (msg.body.toLowerCase().startsWith('!franz97')) {
        await client.sendText(msg.from, 'Sembri il mio cane');
        return;
      }
      
      // Pivona command
      if (msg.body.toLowerCase().startsWith("!pivona")) {
        await client.sendText(msg.from, "Ciao Pivona sono Antonio, esci con me?");
        return;
      } 

    //   else if (msg.body.toLowerCase().startsWith('!messico')) {
    //     // Only work in groups
    //     if (!msg.isGroupMsg) {
    //       await client.sendText(msg.from, 'Questo comando può essere eseguito solo nei gruppi.');
    //       return;
    //     }

    //     let numero
    //     const match = msg.body.match(/@(\w+)/);

    //     if (match) {
    //       numero = match[1].trim().replace(/[^0-9]+$/, '');
    //     }
    //     else {
    //       await client.sendText(msg.from, 'Tagga qualcuno per messicarlo.');
    //       return;
    //     }

    //    const profilePic = await client.getProfilePicFromServer(${numero}@c.us);
    //   const imageUrl = profilePic.img;

    //   const response = await axios.get(imageUrl, { responseType: "arraybuffer" });

    //   const profilePath = "profile.png";
    //   await sharp(response.data)
    //     .png()
    //     .resize(512, 512, { fit: "cover" }) 
    //     .toFile(profilePath);

    //   const openaiResponse = await openai.images.edit({
    //     model: "gpt-image-1",
    //     image: fs.createReadStream(profilePath),
    //     prompt: "Aggiungi a questa persona un sombrero, dei baffi e delle maracas, il tutto in stile Messicano",
    //     size: "auto"
    //   });

    //   const imageBase64 = openaiResponse.data[0].b64_json;
    //   const imageBuffer = Buffer.from(imageBase64, "base64");
    //   const modifiedPath = "modified.png";
    //   fs.writeFileSync(modifiedPath, imageBuffer);

    //   await client.sendImage(
    //     msg.from,
    //     "modified.png",
    //     "modified.png",
    //     `🪇🎺@${numero} sei stato Mexicato🪇🎺\n\n
    //     🎶VAMOS MEXICO🎶`,
    //     msg.id.toString()
    //   );

    //   fs.unlinkSync(profilePath);
    //   fs.unlinkSync(modifiedPath);
    // }     
    } catch (error) {
      console.error('Error in message handler:', error);
    }
  });
}