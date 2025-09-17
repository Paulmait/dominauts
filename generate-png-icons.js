const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Create icons directory structure
const iconsDir = path.join(__dirname, 'src', 'assets', 'icons');
const screenshotsDir = path.join(__dirname, 'src', 'assets', 'screenshots');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Function to draw the Dominauts icon
function drawIcon(ctx, size) {
  const scale = size / 512;
  ctx.scale(scale, scale);

  // Background gradient
  const bgGradient = ctx.createLinearGradient(0, 0, 512, 512);
  bgGradient.addColorStop(0, '#1a1a2e');
  bgGradient.addColorStop(1, '#16213e');

  // Draw rounded rectangle background
  ctx.fillStyle = bgGradient;
  ctx.beginPath();
  ctx.roundRect(0, 0, 512, 512, 64);
  ctx.fill();

  // Draw domino tile
  ctx.save();
  ctx.translate(256, 256);

  // Tile gradient
  const tileGradient = ctx.createLinearGradient(-120, -60, 120, 60);
  tileGradient.addColorStop(0, '#00d4ff');
  tileGradient.addColorStop(1, '#00a8cc');

  // Draw tile
  ctx.fillStyle = tileGradient;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-120, -60, 240, 120, 12);
  ctx.fill();
  ctx.stroke();

  // Center divider line
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -60);
  ctx.lineTo(0, 60);
  ctx.stroke();

  // Left dots (2 dots)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-60, -20, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-60, 20, 10, 0, Math.PI * 2);
  ctx.fill();

  // Right dots (5 dots pattern)
  ctx.beginPath();
  ctx.arc(40, -30, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(80, -30, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(60, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(40, 30, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(80, 30, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Title text
  ctx.fillStyle = '#00d4ff';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DOMINAUTS', 256, 420);
}

// Generate icons for all required sizes
const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

console.log('Generating PNG icons...');

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Enable better image smoothing for smaller sizes
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  drawIcon(ctx, size);

  // Save PNG file
  const buffer = canvas.toBuffer('image/png');
  const filename = path.join(iconsDir, `icon-${size}x${size}.png`);
  fs.writeFileSync(filename, buffer);
  console.log(`✓ Generated ${filename}`);
});

// Generate app screenshots
function createScreenshot(width, height, filename, title) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#1a1a2e');
  bgGradient.addColorStop(1, '#16213e');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#00d4ff';
  ctx.font = `bold ${height * 0.05}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, height * 0.1);

  // Mock game board
  ctx.save();
  ctx.translate(width / 2, height / 2);

  // Draw some domino tiles
  const tileWidth = width * 0.15;
  const tileHeight = tileWidth / 2;

  for (let i = 0; i < 5; i++) {
    const angle = (i * 72 * Math.PI) / 180;
    const x = Math.cos(angle) * width * 0.2;
    const y = Math.sin(angle) * width * 0.2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Tile gradient
    const tileGradient = ctx.createLinearGradient(-tileWidth/2, -tileHeight/2, tileWidth/2, tileHeight/2);
    tileGradient.addColorStop(0, '#00d4ff');
    tileGradient.addColorStop(1, '#00a8cc');

    ctx.fillStyle = tileGradient;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-tileWidth/2, -tileHeight/2, tileWidth, tileHeight, 8);
    ctx.fill();
    ctx.stroke();

    // Center line
    ctx.beginPath();
    ctx.moveTo(0, -tileHeight/2);
    ctx.lineTo(0, tileHeight/2);
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();

  // Mock UI elements
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(width * 0.05, height * 0.85, width * 0.9, height * 0.1);

  ctx.fillStyle = '#ffffff';
  ctx.font = `${height * 0.025}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('Player Hand', width / 2, height * 0.9);

  // Save screenshot
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(screenshotsDir, filename), buffer);
  console.log(`✓ Generated screenshot: ${filename}`);
}

// Generate screenshots
createScreenshot(375, 812, 'game-mobile.png', 'DOMINAUTS™');
createScreenshot(1920, 1080, 'game-desktop.png', 'DOMINAUTS™');

console.log('\n✅ All icons and screenshots generated successfully!');