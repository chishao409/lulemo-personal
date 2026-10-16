const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const src = path.join(__dirname, '..', 'icon.svg');
const base = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

(async () => {
  for (const [k, size] of Object.entries(sizes)) {
    const dir = path.join(base, `mipmap-${k}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const buf = await sharp(src).resize(size, size).png().toBuffer();
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), buf);
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), buf);
  }
  console.log('Generated Android mipmap icons from icon.svg');
})();
