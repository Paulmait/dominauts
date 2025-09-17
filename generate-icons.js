const fs = require('fs');
const path = require('path');

// Create icons directory structure
const iconsDir = path.join(__dirname, 'src', 'assets', 'icons');
const screenshotsDir = path.join(__dirname, 'src', 'assets', 'screenshots');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// SVG icon template for Dominauts
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00d4ff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#00a8cc;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)" rx="64"/>
  <g transform="translate(256,256)">
    <!-- Domino tile -->
    <rect x="-120" y="-60" width="240" height="120" fill="url(#tile)" rx="12" stroke="#fff" stroke-width="4"/>
    <line x1="0" y1="-60" x2="0" y2="60" stroke="#fff" stroke-width="3"/>
    <!-- Left dots -->
    <circle cx="-60" cy="-20" r="10" fill="#fff"/>
    <circle cx="-60" cy="20" r="10" fill="#fff"/>
    <!-- Right dots -->
    <circle cx="60" cy="-30" r="10" fill="#fff"/>
    <circle cx="60" cy="0" r="10" fill="#fff"/>
    <circle cx="60" cy="30" r="10" fill="#fff"/>
  </g>
  <!-- Title -->
  <text x="256" y="420" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="#00d4ff">DOMINAUTS</text>
</svg>`;

// Save SVG icon
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon);

// Create placeholder files for different sizes
const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  const placeholderSvg = svgIcon.replace('viewBox="0 0 512 512"', `viewBox="0 0 512 512" width="${size}" height="${size}"`);
  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.svg`), placeholderSvg);

  // Create a simple placeholder PNG (would need canvas or image library for actual conversion)
  // For now, we'll just create empty files as placeholders
  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.png`), '');
});

console.log('Icon placeholders created successfully!');
console.log('Note: For production, you should convert the SVG to actual PNG files using a tool like:');
console.log('- npx svg-to-png');
console.log('- ImageMagick');
console.log('- Online converters');
console.log('- Or a Node.js library like sharp or canvas');