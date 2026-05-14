#!/usr/bin/env node
// 生成 TabBar 占位图片（简单的纯色 PNG，无外部依赖）

const fs = require('fs')
const path = require('path')

const imagesDir = path.join(__dirname, 'miniprogram/assets/images')

// 确保目录存在
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true })
}

// 最小有效 PNG（1x1 像素，灰色）
// PNG signature + IHDR + IDAT + IEND
function createSimplePNG(width, height, r, g, b) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)   // width
  ihdrData.writeUInt32BE(height, 4)  // height
  ihdrData.writeUInt8(8, 8)          // bit depth
  ihdrData.writeUInt8(2, 9)          // color type (RGB)
  ihdrData.writeUInt8(0, 10)         // compression
  ihdrData.writeUInt8(0, 11)         // filter
  ihdrData.writeUInt8(0, 12)         // interlace
  
  const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]))
  const ihdr = Buffer.concat([
    Buffer.from([0, 0, 0, 13]), // length
    Buffer.from('IHDR'),
    ihdrData,
    uint32BE(ihdrCrc)
  ])
  
  // IDAT chunk (uncompressed, using zlib)
  // For simplicity, create a minimal deflate stream
  const rawData = []
  for (let y = 0; y < height; y++) {
    rawData.push(0) // filter byte
    for (let x = 0; x < width; x++) {
      rawData.push(r, g, b)
    }
  }
  
  const raw = Buffer.from(rawData)
  const zlib = require('zlib')
  const compressed = zlib.deflateSync(raw)
  
  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]))
  const idatLen = compressed.length
  const idat = Buffer.concat([
    uint32BE(idatLen),
    Buffer.from('IDAT'),
    compressed,
    uint32BE(idatCrc)
  ])
  
  // IEND chunk
  const iendCrc = crc32(Buffer.from('IEND'))
  const iend = Buffer.concat([
    Buffer.from([0, 0, 0, 0]),
    Buffer.from('IEND'),
    uint32BE(iendCrc)
  ])
  
  return Buffer.concat([signature, ihdr, idat, iend])
}

function uint32BE(n) {
  const buf = Buffer.alloc(4)
  buf.writeUInt32BE(n >>> 0, 0)
  return buf
}

// CRC32 table
const crcTable = []
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  }
  crcTable[n] = c
}

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

// 生成 81x81 像素的占位图（微信建议 TabBar 图标 81x81）
const size = 81

const images = {
  'tab-learn.png': { r: 76, g: 175, b: 80 },      // #4CAF50 (绿色)
  'tab-learn-active.png': { r: 76, g: 175, b: 80 },
  'tab-themes.png': { r: 156, g: 39, b: 176 },    // #9C27B0 (紫色)
  'tab-themes-active.png': { r: 156, g: 39, b: 176 },
  'tab-profile.png': { r: 33, g: 150, b: 243 },   // #2196F3 (蓝色)
  'tab-profile-active.png': { r: 33, g: 150, b: 243 },
}

for (const [filename, color] of Object.entries(images)) {
  const png = createSimplePNG(size, size, color.r, color.g, color.b)
  fs.writeFileSync(path.join(imagesDir, filename), png)
  console.log(`Created ${filename}`)
}

console.log('Done!')
