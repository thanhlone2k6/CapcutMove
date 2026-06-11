const { createCanvas } = require('canvas');
const fs = require('fs');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background (rounded rect)
  const radius = size * 0.2;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();
  
  // Play button
  ctx.fillStyle = '#fe2c55';
  ctx.beginPath();
  ctx.moveTo(size * 0.35, size * 0.25);
  ctx.lineTo(size * 0.75, size * 0.5);
  ctx.lineTo(size * 0.35, size * 0.75);
  ctx.closePath();
  ctx.fill();
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`icons/icon${size}.png`, buffer);
}

if (!fs.existsSync('icons')) {
  fs.mkdirSync('icons');
}

drawIcon(16);
drawIcon(48);
drawIcon(128);
console.log('PNG icons generated successfully');