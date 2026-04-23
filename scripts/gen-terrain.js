#!/usr/bin/env node
// Regenerate Catan terrain textures as flat top-down textures (no 3D hex look)
// Usage: OPENAI_API_KEY=sk-... node scripts/gen-terrain.js

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) { console.error('Set OPENAI_API_KEY'); process.exit(1); }

const OUTPUT_DIR = path.join(__dirname, '../public/images/games');

const TERRAINS = [
  {
    file: 'terrain-forest.png',
    prompt: 'Top-down flat aerial view of a dense pine forest, lush green treetops, seamless texture tile, painterly illustration style, no borders, no frame, no hex shape, no 3D perspective, pure overhead view, vibrant colors',
  },
  {
    file: 'terrain-sheep.png',
    prompt: 'Top-down flat aerial view of bright green pasture meadow with fluffy white sheep grazing, seamless texture tile, painterly illustration style, no borders, no frame, no hex shape, no 3D perspective, pure overhead view, vibrant colors',
  },
  {
    file: 'terrain-wheat.png',
    prompt: 'Top-down flat aerial view of golden wheat fields with rows of grain crops, seamless texture tile, painterly illustration style, no borders, no frame, no hex shape, no 3D perspective, pure overhead view, warm golden colors',
  },
  {
    file: 'terrain-clay.png',
    prompt: 'Top-down flat aerial view of red clay hills and rocky red soil terrain, seamless texture tile, painterly illustration style, no borders, no frame, no hex shape, no 3D perspective, pure overhead view, warm terracotta colors',
  },
  {
    file: 'terrain-ore.png',
    prompt: 'Top-down flat aerial view of grey rocky mountain terrain with stone and ore deposits, seamless texture tile, painterly illustration style, no borders, no frame, no hex shape, no 3D perspective, pure overhead view, cool grey colors',
  },
  {
    file: 'terrain-desert.png',
    prompt: 'Top-down flat aerial view of sandy desert terrain, warm golden sand dunes patterns, seamless texture tile, painterly illustration style, no borders, no frame, no hex shape, no 3D perspective, pure overhead view, warm sandy colors',
  },
  {
    file: 'terrain-sea.png',
    prompt: 'Top-down flat aerial view of calm ocean water with subtle wave patterns, seamless texture tile, painterly illustration style, no borders, no frame, no hex shape, no 3D perspective, pure overhead view, deep blue colors',
  },
];

async function generateImage(prompt) {
  const body = JSON.stringify({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
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
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.error) reject(new Error(parsed.error.message));
        else resolve(parsed.data[0].url);
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
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });
}

async function main() {
  for (const terrain of TERRAINS) {
    const dest = path.join(OUTPUT_DIR, terrain.file);
    console.log(`Generating ${terrain.file}...`);
    try {
      const url = await generateImage(terrain.prompt);
      await downloadImage(url, dest);
      console.log(`  ✓ Saved to ${dest}`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
    }
    // Rate limit: 5 images per minute for dall-e-3
    await new Promise(r => setTimeout(r, 13000));
  }
  console.log('Done!');
}

main();
