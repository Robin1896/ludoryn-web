#!/usr/bin/env node
// Regenerate Catan assets in 3D cartoon style
// Usage: OPENAI_API_KEY=sk-... node scripts/gen-catan-assets.js

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) { console.error('Set OPENAI_API_KEY'); process.exit(1); }

const CARD_STYLE = 'cute 3D cartoon icon, fills entire square image edge to edge, no card frame, no border, no background card, just the illustration on a plain solid colored background, glossy soft colors, Pixar-like, no text';
const TERRAIN_STYLE = 'flat top-down 2D cartoon terrain tile, cute simple shapes, bold clean colors, seamless pattern, no borders, no 3D, overhead view, illustrated board game texture';

const ASSETS = [
  // Resource cards
  {
    file: 'public/images/games/catan-card-wood.png',
    prompt: `Cute cartoon forest resource card, three round glossy pine trees, rich green and brown colors, ${CARD_STYLE}`,
  },
  {
    file: 'public/images/games/catan-card-clay.png',
    prompt: `Cute cartoon clay resource card, small glossy red clay bricks stacked, warm terracotta orange-red colors, ${CARD_STYLE}`,
  },
  {
    file: 'public/images/games/catan-card-sheep.png',
    prompt: `Cute cartoon sheep resource card, one fluffy round white sheep with black legs on green grass, ${CARD_STYLE}`,
  },
  {
    file: 'public/images/games/catan-card-wheat.png',
    prompt: `Cute cartoon wheat resource card, small bundle of golden wheat stalks tied together, warm golden yellow, ${CARD_STYLE}`,
  },
  {
    file: 'public/images/games/catan-card-ore.png',
    prompt: `Cute cartoon ore resource card, small pile of shiny grey rocks with sparkles, cool grey and silver colors, ${CARD_STYLE}`,
  },

  // Terrain tiles
  {
    file: 'public/images/games/terrain-forest.png',
    prompt: `Top-down flat cartoon forest terrain tile, cute round dark green tree tops packed together, rich deep green, ${TERRAIN_STYLE}`,
  },
  {
    file: 'public/images/games/terrain-sheep.png',
    prompt: `Top-down flat cartoon pasture terrain tile, bright green meadow with tiny white fluffy sheep dots scattered, ${TERRAIN_STYLE}`,
  },
  {
    file: 'public/images/games/terrain-wheat.png',
    prompt: `Top-down flat cartoon wheat field terrain tile, rows of golden wheat stalks, warm sunny yellow, ${TERRAIN_STYLE}`,
  },
  {
    file: 'public/images/games/terrain-clay.png',
    prompt: `Top-down flat cartoon clay hills terrain tile, warm terracotta red-orange earth with small round bumps, ${TERRAIN_STYLE}`,
  },
  {
    file: 'public/images/games/terrain-ore.png',
    prompt: `Top-down flat cartoon mountain terrain tile, cool grey rocky peaks with small sparkles, ${TERRAIN_STYLE}`,
  },
  {
    file: 'public/images/games/terrain-desert.png',
    prompt: `Top-down flat cartoon desert terrain tile, warm sandy beige with small dune ripples, ${TERRAIN_STYLE}`,
  },
  {
    file: 'public/images/games/terrain-sea.png',
    prompt: `Top-down flat cartoon sea terrain tile, calm blue water with cute small wave curls, ${TERRAIN_STYLE}`,
  },
  {
    file: 'public/images/games/tile-stone.png',
    prompt: `Top-down flat cartoon stone terrain tile, grey cobblestone pattern with rounded stones, ${TERRAIN_STYLE}`,
  },
];

async function generateImage(prompt, size) {
  const body = JSON.stringify({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size,
    quality: 'hd',
    style: 'vivid',
    response_format: 'url',
  });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/images/generations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const p = JSON.parse(data);
        if (p.error) reject(new Error(p.error.message));
        else resolve(p.data[0].url);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });
}

async function main() {
  console.log(`Generating ${ASSETS.length} Catan assets...`);
  for (let i = 0; i < ASSETS.length; i++) {
    const a = ASSETS[i];
    const dest = path.join(__dirname, '..', a.file);
    const isCard = a.file.includes('catan-card');
    const size = isCard ? '1024x1024' : '1024x1024';
    console.log(`[${i+1}/${ASSETS.length}] ${a.file.split('/').pop()}...`);
    try {
      const url = await generateImage(a.prompt, size);
      await downloadImage(url, dest);
      console.log(`  ✓`);
    } catch (err) {
      console.error(`  ✗ ${err.message}`);
    }
    if (i < ASSETS.length - 1) await new Promise(r => setTimeout(r, 13000));
  }
  console.log('Done!');
}

main();
