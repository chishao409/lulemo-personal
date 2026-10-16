const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const base = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

function generateIcon(size, includeBackground = false) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // 绘制背景（仅当需要时）
  if (includeBackground) {
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#0f5132');
    gradient.addColorStop(0.5, '#198754');
    gradient.addColorStop(1, '#34d399');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, size * 0.2);
    ctx.fill();
  }

  // 绘制鹿 emoji（作为 foreground）
  ctx.font = `bold ${Math.floor(size * 0.7)}px Arial`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🦌', size / 2, size / 2);

  return canvas.toBuffer('image/png');
}

for (const [k, size] of Object.entries(sizes)) {
  const dir = path.join(base, `mipmap-${k}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // ic_launcher：完整图标（带背景）
  const fullIcon = generateIcon(size, true);
  fs.writeFileSync(path.join(dir, 'ic_launcher.png'), fullIcon);

  // ic_launcher_foreground：仅前景（无背景，用于 adaptive icon）
  const foreground = generateIcon(size, false);
  fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), foreground);

  // ic_launcher_round：圆形图标（带背景）
  const roundIcon = generateIcon(size, true);
  fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), roundIcon);
}

console.log('✅ 生成所有 Android 图标成功（包括 adaptive icon）');
