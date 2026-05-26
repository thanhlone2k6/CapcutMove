const { Jimp } = require('jimp')
const fs = require('fs')
const path = require('path')
const png2icons = require('png2icons')

async function run() {
  const srcPath = path.join(__dirname, '../icon app.png')
  const resourcesDir = path.join(__dirname, '../resources')

  if (!fs.existsSync(srcPath)) {
    throw new Error(`Source image not found at ${srcPath}`)
  }

  console.log(`Reading source image from ${srcPath}...`)
  const image = await Jimp.read(srcPath)
  const w = image.width
  const h = image.height
  console.log(`Original dimensions: ${w}x${h}`)

  // Create a square image by centering it inside a transparent background
  const size = Math.max(w, h)
  console.log(`Creating square transparent canvas of ${size}x${size}...`)
  
  const squareImage = new Jimp({
    width: size,
    height: size,
    color: 0x00000000 // transparent
  })

  const xOffset = Math.floor((size - w) / 2)
  const yOffset = Math.floor((size - h) / 2)
  
  console.log(`Compositing original image onto square canvas (offset x:${xOffset}, y:${yOffset})...`)
  squareImage.composite(image, xOffset, yOffset)

  // 1. Generate 512x512 icon.png for Linux & general resources
  console.log('Resizing to 512x512 for icon.png...')
  const img512 = squareImage.clone()
  img512.resize({ w: 512, h: 512 })
  const pngBuffer512 = await img512.getBuffer('image/png')
  
  const pngDest = path.join(resourcesDir, 'icon.png')
  console.log(`Writing Linux/Generic icon to ${pngDest}...`)
  fs.writeFileSync(pngDest, pngBuffer512)

  // 2. Generate 1024x1024 high-res buffer to feed png2icons
  console.log('Resizing to 1024x1024 for high-res buffer...')
  const img1024 = squareImage.clone()
  img1024.resize({ w: 1024, h: 1024 })
  const pngBuffer1024 = await img1024.getBuffer('image/png')

  // 3. Convert to ICO
  console.log('Converting to ICO (Windows)...')
  const icoBuffer = png2icons.createICO(pngBuffer1024, png2icons.BICUBIC, 0, false)
  if (icoBuffer) {
    const icoDest = path.join(resourcesDir, 'icon.ico')
    console.log(`Writing ICO to ${icoDest}...`)
    fs.writeFileSync(icoDest, icoBuffer)
  } else {
    throw new Error('Failed to generate ICO buffer using png2icons.')
  }

  // 4. Convert to ICNS
  console.log('Converting to ICNS (macOS)...')
  const icnsBuffer = png2icons.createICNS(pngBuffer1024, png2icons.BICUBIC, 0)
  if (icnsBuffer) {
    const icnsDest = path.join(resourcesDir, 'icon.icns')
    console.log(`Writing ICNS to ${icnsDest}...`)
    fs.writeFileSync(icnsDest, icnsBuffer)
  } else {
    throw new Error('Failed to generate ICNS buffer using png2icons.')
  }

  console.log('Successfully generated all icons (ico, icns, png) inside resources/ directory!')
}

run().catch((err) => {
  console.error('Error generating icons:', err)
  process.exit(1)
})
