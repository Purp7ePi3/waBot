const fs = require('fs');

// Percorso del file JSON
const jsonFilePath = 'versetti.json'; // Cambia con il percorso del tuo file JSON

// Leggi il file JSON
fs.readFile(jsonFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Errore nella lettura del file JSON:', err);
    return;
  }

  try {
    const versetti = JSON.parse(data);

    // Aggiorna il riferimento per ogni versetto (eccetto il primo)
    for (let i = 1; i < versetti.length; i++) {
      versetti[i-1].riferimento = versetti[i].riferimento;
    }

    // Scrivi il file JSON aggiornato
    fs.writeFile(jsonFilePath, JSON.stringify(versetti, null, 2), 'utf8', (err) => {
      if (err) {
        console.error('Errore nella scrittura del file JSON:', err);
        return;
      }
      console.log('File JSON aggiornato con successo!');
    });
  } catch (parseError) {
    console.error('Errore nel parsing del file JSON:', parseError);
  }
});
