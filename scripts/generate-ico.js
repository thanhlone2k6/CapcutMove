const { Jimp } = require('jimp');
const fs = require('fs');
const pngToIco = require('png-to-ico').default;

async function run() {
  console.log('Loading build/icon.png...');
  const image = await Jimp.read('build/icon.png');
  
  console.log('Resizing to 256x256...');
  image.resize({ w: 256, h: 256 });
  
  console.log('Getting buffer...');
  const buffer = await image.getBuffer('image/png');
  
  console.log('Converting to ICO...');
  const icoBuffer = await pngToIco(buffer);
  
  console.log('Writing build/icon.ico...');
  fs.writeFileSync('build/icon.ico', icoBuffer);

  console.log('Writing square png to resources/icon.png...');
  fs.writeFileSync('resources/icon.png', buffer);

  console.log('Writing square png to build/icon.png...');
  fs.writeFileSync('build/icon.png', buffer);
  
  console.log('Successfully generated build/icon.ico and updated all PNG icons to square!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
