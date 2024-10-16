// Import von benötigten Modulen
const express = require('express');
const path = require('path');

// Express-Anwendung erstellen
const app = express();
const PORT = 3000;

// Statisches Verzeichnis, in dem die Webseite (HTML, CSS) liegt
app.use(express.static(path.join(__dirname, 'public')));

// Server starten und auf Port 3000 hören
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});

const multer = require('multer');
const sharp = require('sharp');

// Multer zum Verarbeiten von Datei-Uploads konfigurieren
const storage = multer.memoryStorage(); // Speicher im RAM
const upload = multer({ storage: storage });

// Route für den Datei-Upload
app.post(
  '/upload',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'background', maxCount: 1 },
    { name: 'overlay', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // Das hochgeladene Hauptbild
      const imageBuffer = req.files['image'][0].buffer;

      // Hintergrund- und Overlay-Bilder (optional)
      const backgroundBuffer = req.files['background']
        ? req.files['background'][0].buffer
        : null;
      const overlayBuffer = req.files['overlay']
        ? req.files['overlay'][0].buffer
        : null;

      // Seitenverhältnis und Qualität
      const aspectRatio = req.body.aspectRatio;
      const quality = req.body.quality;

      // Bildgrößen basierend auf dem Seitenverhältnis berechnen
      let width, height;
      if (aspectRatio === '1:1') {
        width = 1000;
        height = 1000;
      } else if (aspectRatio === '3:4') {
        width = 750;
        height = 1000;
      } else if (aspectRatio === '6:4') {
        width = 1500;
        height = 1000;
      }

      // Qualitätseinstellungen
      if (quality === 'thumbnail') {
        width = 300;
        height = 300; 
      } else if (quality === 'hd') {
        width = 1280;
        height = 720;
      } else if (quality === 'fullhd') {
        width = 1920;
        height = 1080;
      }

      // Bild mit Sharp zuschneiden und in der richtigen Qualität rendern
      let processedImage = sharp(imageBuffer).resize(width, height, {
        fit: 'cover',
      });

      // Wenn ein Hintergrundbild hochgeladen wurde, fügen wir es hinzu
      if (backgroundBuffer) {
        const background = sharp(backgroundBuffer)
          .resize(width, height, { fit: 'cover' })
          .png();

        const foreground = await processedImage.png().toBuffer();

        processedImage = background
          .composite([{ input: foreground }])
          .png();
      }

      // Wenn ein Overlay hochgeladen wurde, legen wir es über das Bild
      if (overlayBuffer) {
        processedImage = processedImage.composite([{ input: overlayBuffer }]);
      }

      // Bild als PNG exportieren und an den Client senden
      const finalImageBuffer = await processedImage.png().toBuffer();

      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="ergebnis.png"',
      });
      res.end(finalImageBuffer, 'binary');
    } catch (error) {
      console.error(error);
      res.status(500).send('Ein Fehler ist aufgetreten.');
    }
  }
);
