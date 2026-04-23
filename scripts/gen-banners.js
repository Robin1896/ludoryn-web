#!/usr/bin/env node
// Regenerate PNG game banners in 3D cartoon style (same as avatars)
// Usage: OPENAI_API_KEY=sk-... node scripts/gen-banners.js

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) { console.error('Set OPENAI_API_KEY'); process.exit(1); }

const STYLE = '3D cartoon illustration, cute rounded glossy shapes, soft vibrant colors, clean dark background with subtle glow, Pixar-like style, wide game banner format, no text';

const BANNERS = [
  {
    file: 'public/images/games/catan-banner.png',
    prompt: `Cute 3D cartoon Catan island scene, hexagonal terrain tiles with tiny trees wheat mountains clay, small cute wooden settlements and roads, warm earthy colors, ${STYLE}`,
  },
  {
    file: 'public/images/games/grub-banner.png',
    prompt: `Cute 3D cartoon dice rolling scene, colorful rounded dice with dotted faces in red yellow blue green ivory, small cute earthworms peeking out of numbered tiles, ${STYLE}`,
  },
  {
    file: 'public/images/games/qwixx-banner.png',
    prompt: `Cute 3D cartoon score sheet game scene, colorful rounded dice red yellow blue green white, glowing score grid with X marks, confetti, ${STYLE}`,
  },
  {
    file: 'public/images/games/ticket-to-ride-banner.png',
    prompt: `Cute 3D cartoon train game scene, tiny colorful toy trains red blue green yellow on a simple map with route lines, small cute train cars, ${STYLE}`,
  },
  {
    file: 'public/images/games/beverbende-banner.png',
    prompt: `Cute 3D cartoon card game scene with adorable beaver characters holding playing cards, teal and green colors, cards fanned out on a green felt table, ${STYLE}`,
  },
  {
    file: 'public/images/games/carcassonne-banner.png',
    prompt: `Cute 3D cartoon Carcassonne scene, colorful square landscape tiles fitting together with tiny cute medieval town buildings roads fields, warm parchment tones, ${STYLE}`,
  },
  {
    file: 'public/images/games/rummikub-banner.png',
    prompt: `Cute 3D cartoon Rummikub scene, colorful numbered tiles in red yellow blue black arranged in sequences on wooden racks, ${STYLE}`,
  },
  {
    file: 'public/images/games/wingspan-banner.png',
    prompt: `Cute 3D cartoon Wingspan bird game scene, adorable round colorful birds perched on habitat cards, eggs in nests, food tokens, soft nature colors, ${STYLE}`,
  },
];

async function generateImage(prompt) {
  const body = JSON.stringify({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1792x1024',
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
  console.log(`Generating ${BANNERS.length} banners in 3D cartoon style...`);
  for (let i = 0; i < BANNERS.length; i++) {
    const b = BANNERS[i];
    const dest = path.join(__dirname, '..', b.file);
    console.log(`[${i+1}/${BANNERS.length}] ${b.file.split('/').pop()}...`);
    try {
      const url = await generateImage(b.prompt);
      await downloadImage(url, dest);
      console.log(`  ✓`);
    } catch (err) {
      console.error(`  ✗ ${err.message}`);
    }
    if (i < BANNERS.length - 1) await new Promise(r => setTimeout(r, 13000));
  }
  console.log('Done!');
}

main();
