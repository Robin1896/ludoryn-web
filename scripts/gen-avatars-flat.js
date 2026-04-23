#!/usr/bin/env node
// Regenerate avatars in 3D cartoon game style (reference: Ludo app cute characters)
// Usage: OPENAI_API_KEY=sk-... node scripts/gen-avatars-flat.js

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) { console.error('Set OPENAI_API_KEY'); process.exit(1); }

const OUTPUT_DIR = path.join(__dirname, '../public/avatars');

const STYLE = '3D cartoon game avatar, cute rounded chibi character, glossy smooth surface, soft vibrant colors, clean dark background with subtle glow, friendly face expression, big eyes, Pixar-like style, game app character, square format, centered';

const AVATARS = [
  { id: 'owl',       prompt: `Cute cartoon owl face, round fluffy body, big bright eyes, warm brown and orange colors, ${STYLE}` },
  { id: 'fox',       prompt: `Cute cartoon fox face, round body, big ears, orange and white fur, ${STYLE}` },
  { id: 'bear',      prompt: `Cute cartoon bear face, chubby round body, soft brown fur, friendly smile, ${STYLE}` },
  { id: 'rabbit',    prompt: `Cute cartoon rabbit face, round fluffy body, long floppy ears, white and pink colors, ${STYLE}` },
  { id: 'penguin',   prompt: `Cute cartoon penguin, round chubby body, black and white with yellow beak, ${STYLE}` },
  { id: 'cat',       prompt: `Cute cartoon cat face, round body, pointy ears, soft grey and white fur, ${STYLE}` },
  { id: 'dog',       prompt: `Cute cartoon dog face, floppy ears, golden brown fur, happy tongue out, ${STYLE}` },
  { id: 'lion',      prompt: `Cute cartoon lion face, big fluffy mane, round body, warm golden colors, ${STYLE}` },
  { id: 'frog',      prompt: `Cute cartoon frog face, round chubby body, bright green with big round eyes, ${STYLE}` },
  { id: 'panda',     prompt: `Cute cartoon panda face, round chubby body, black and white with sleepy eyes, ${STYLE}` },
  { id: 'wolf',      prompt: `Cute cartoon wolf face, fluffy pointed ears, grey and white fur, friendly expression, ${STYLE}` },
  { id: 'duck',      prompt: `Cute cartoon duck, round yellow fluffy body, orange beak, cheerful expression, ${STYLE}` },
  { id: 'knight',    prompt: `Cute cartoon knight character, tiny shiny helmet and round shield, blue and silver armor, ${STYLE}` },
  { id: 'pirate',    prompt: `Cute cartoon pirate character, tiny tricorn hat and eyepatch, navy and gold colors, ${STYLE}` },
  { id: 'captain',   prompt: `Cute cartoon ship captain character, navy uniform with gold buttons and captain hat, ${STYLE}` },
  { id: 'inventor',  prompt: `Cute cartoon inventor character, round goggles on forehead, yellow and brown colors, gears, ${STYLE}` },
  { id: 'samurai',   prompt: `Cute cartoon samurai character, small kabuto helmet, red and black armor, ${STYLE}` },
  { id: 'explorer',  prompt: `Cute cartoon explorer character, round safari hat, khaki colors, compass around neck, ${STYLE}` },
  { id: 'chef',      prompt: `Cute cartoon chef character, tall white toque hat, white apron, holding tiny spoon, ${STYLE}` },
  { id: 'astronaut', prompt: `Cute cartoon astronaut character, round white helmet with visor, white space suit, stars, ${STYLE}` },
];

async function generateImage(prompt) {
  const body = JSON.stringify({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
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
  console.log(`Generating ${AVATARS.length} avatars in 3D cartoon style...`);
  for (let i = 0; i < AVATARS.length; i++) {
    const av = AVATARS[i];
    const dest = path.join(OUTPUT_DIR, `${av.id}.png`);
    console.log(`[${i+1}/${AVATARS.length}] ${av.id}...`);
    try {
      const url = await generateImage(av.prompt);
      await downloadImage(url, dest);
      console.log(`  ✓`);
    } catch (err) {
      console.error(`  ✗ ${err.message}`);
    }
    if (i < AVATARS.length - 1) await new Promise(r => setTimeout(r, 13000));
  }
  console.log('Done!');
}

main();
