const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="96" fill="#3B42A0"/>
  <!-- Top White Box with text Mi Taller -->
  <rect x="64" y="70" width="384" height="64" rx="8" fill="#FFFFFF"/>
  <text x="256" y="115" font-family="DejaVu Sans, Arial, sans-serif" font-weight="bold" font-size="42" fill="#3B42A0" text-anchor="middle">Mi Taller</text>
  
  <!-- T White Stem -->
  <rect x="234" y="134" width="44" height="308" fill="#FFFFFF"/>
  
  <!-- M Yellow -->
  <path d="M 64,134 H 112 L 149,260 L 186,134 H 234 V 442 H 186 V 260 L 149,380 L 112,260 V 442 H 64 Z" fill="#F0AF00"/>
  
  <!-- I Yellow -->
  <rect x="384" y="134" width="64" height="308" fill="#F0AF00"/>
</svg>`;

const renderPng = (width) => {
  const resvg = new Resvg(svgContent, { fitTo: { mode: 'width', value: width } });
  return resvg.render().asPng();
};

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);
fs.writeFileSync(path.join(publicDir, 'icon.png'), renderPng(512));
fs.writeFileSync(path.join(publicDir, 'icon.jpg'), renderPng(512));
fs.writeFileSync(path.join(publicDir, 'pwa-512.png'), renderPng(512));
fs.writeFileSync(path.join(publicDir, 'pwa-192.png'), renderPng(192));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), renderPng(180));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), renderPng(64));

console.log('All icons generated successfully in public/');
