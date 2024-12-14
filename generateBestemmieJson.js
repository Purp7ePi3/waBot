const fs = require('fs');

// Funzione per caricare il file .txt e scrivere il JSON
function generateBestemmieJson() {
  // Leggi il file txt con le bestemmie
  fs.readFile('bestemmie.txt', 'utf8', (err, data) => {
    if (err) {
      console.error('Errore nel leggere il file txt:', err);
      return;
    }

    // Dividi le bestemmie in un array, separando per righe
    const bestemmieArray = data.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // Crea un oggetto JSON con le bestemmie
    const bestemmieJson = {
      "bestemmie": bestemmieArray
    };

    // Scrivi il contenuto JSON nel file bestemmie.json
    fs.writeFile('bestemmie.json', JSON.stringify(bestemmieJson, null, 2), 'utf8', (err) => {
      if (err) {
        console.error('Errore nel scrivere il file JSON:', err);
      } else {
        console.log('File JSON creato con successo!');
      }
    });
  });
}

// Esegui la funzione per generare il file JSON
generateBestemmieJson();
