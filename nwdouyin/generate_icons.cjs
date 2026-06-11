const fs = require('fs');

function createSvgIcon(size) {
  const radius = size * 0.2;
  const cx1 = size * 0.35;
  const cy1 = size * 0.25;
  const cx2 = size * 0.75;
  const cy2 = size * 0.5;
  const cx3 = size * 0.35;
  const cy3 = size * 0.75;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#000000"/>
  <polygon points="${cx1},${cy1} ${cx2},${cy2} ${cx3},${cy3}" fill="#fe2c55"/>
</svg>`;
}

if (!fs.existsSync('icons')) {
  fs.mkdirSync('icons');
}

fs.writeFileSync('icons/icon16.svg', createSvgIcon(16));
fs.writeFileSync('icons/icon48.svg', createSvgIcon(48));
fs.writeFileSync('icons/icon128.svg', createSvgIcon(128));
console.log('SVG icons generated successfully');
