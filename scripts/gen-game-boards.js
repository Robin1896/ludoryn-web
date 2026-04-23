#!/usr/bin/env node
// Generate in-game board backgrounds
// Usage: OPENAI_API_KEY=sk-... node scripts/gen-game-boards.js
// Or single: node scripts/gen-game-boards.js ttr-map-europe

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) { console.error('Set OPENAI_API_KEY'); process.exit(1); }

const OUTPUT_DIR = path.join(__dirname, '../public/images/boards');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const BOARDS = [
  // ── Ticket to Ride maps ────────────────────────────────────────────────────
  {
    id: 'ttr-map-europe',
    size: '1792x1024',
    prompt: 'Vintage illustrated railway map of Europe, parchment paper background, hand-drawn city markers at Paris London Berlin Madrid Rome Amsterdam Vienna Prague Warsaw, colored railway route lines connecting cities, aged cartographic style, warm sepia and cream tones with colored route highlights, decorative border, no text labels, painterly illustration',
  },
  {
    id: 'ttr-map-usa',
    size: '1792x1024',
    prompt: 'Vintage illustrated railway map of the United States of America, parchment paper background, hand-drawn city markers at New York Los Angeles Chicago Seattle Miami Dallas Denver, colored railway route lines connecting cities coast to coast, aged cartographic style, warm sepia and cream tones with colored route highlights, decorative border, no text labels, painterly illustration',
  },
  {
    id: 'ttr-map-nordic',
    size: '1792x1024',
    prompt: 'Vintage illustrated railway map of Scandinavia, snowy mountains fjords pine forests, parchment paper background, hand-drawn city markers at Oslo Stockholm Helsinki Copenhagen, colored railway route lines connecting cities, aged cartographic style, cool blue-white tones with colored route highlights, decorative border, no text labels, painterly illustration',
  },
  {
    id: 'ttr-map-switzerland',
    size: '1792x1024',
    prompt: 'Vintage illustrated railway map of Switzerland and surrounding Alpine region, dramatic mountain peaks tunnels, parchment paper background, hand-drawn city markers at Zurich Geneva Bern Basel Lausanne, colored railway route lines through Alpine passes, aged cartographic style, cool crisp tones, decorative border, no text labels, painterly illustration',
  },
  {
    id: 'ttr-map-germany',
    size: '1792x1024',
    prompt: 'Vintage illustrated railway map of Germany with charming towns and train stations, parchment paper background, hand-drawn city markers at Berlin Hamburg Munich Frankfurt Cologne Dresden, colored railway route lines, aged cartographic style, warm sepia tones with colored route highlights, decorative border, no text labels, painterly illustration',
  },
  {
    id: 'ttr-map-france',
    size: '1792x1024',
    prompt: 'Vintage illustrated railway map of France with vineyards and chateaux, parchment paper background, hand-drawn city markers at Paris Lyon Marseille Bordeaux Toulouse Nice Strasbourg, colored railway route lines, aged cartographic style, warm golden tones with colored route highlights, decorative border, no text labels, painterly illustration',
  },
  {
    id: 'ttr-map-asia',
    size: '1792x1024',
    prompt: 'Vintage illustrated railway map of Asia along the ancient Silk Road, mountains deserts temples, parchment paper background, hand-drawn city markers at Beijing Shanghai Tokyo Moscow Samarkand Kabul, colored railway route lines, aged cartographic style, warm golden silk road tones, decorative border, no text labels, painterly illustration',
  },
  {
    id: 'ttr-map-africa',
    size: '1792x1024',
    prompt: 'Vintage illustrated railway map of Africa, savanna plains, mountains, desert and jungle, parchment paper background, hand-drawn city markers at Cairo Nairobi Cape Town Dakar Lagos Johannesburg, colored railway route lines, aged cartographic style, warm ochre and earthy tones, decorative border, no text labels, painterly illustration',
  },
  {
    id: 'ttr-map-amsterdam',
    size: '1024x1024',
    prompt: 'Vintage illustrated map of Amsterdam canal ring, overhead view, hand-drawn canal houses bridges Jordaan Centrum streets, colored bus and tram route lines through neighborhoods, aged cartographic style, warm Dutch golden age tones, no text labels, painterly illustration',
  },
  {
    id: 'ttr-map-london',
    size: '1024x1024',
    prompt: 'Vintage illustrated map of London, overhead view, Big Ben Tower Bridge Hyde Park Buckingham Palace Shoreditch, hand-drawn city landmarks and neighborhoods, colored bus route lines, aged cartographic style, warm sepia tones, no text labels, painterly illustration',
  },
  {
    id: 'ttr-map-new-york',
    size: '1024x1024',
    prompt: 'Vintage illustrated map of Manhattan New York City, overhead view, Central Park skyscrapers grid streets Brooklyn bridge, hand-drawn neighborhoods and landmarks, colored taxi route lines, aged cartographic style, warm city tones, no text labels, painterly illustration',
  },
  {
    id: 'ttr-map-japan-italy',
    size: '1792x1024',
    prompt: 'Vintage illustrated split railway map, left half Japan with Mount Fuji cherry blossoms shinkansen lines city markers Tokyo Osaka Kyoto Sapporo, right half Italy with rolling hills vineyards city markers Rome Milan Venice Florence Naples, aged cartographic style, warm tones, no text labels, painterly illustration',
  },

  // ── Other games ────────────────────────────────────────────────────────────
  {
    id: 'carcassonne-board',
    size: '1024x1024',
    prompt: 'Overhead view of a medieval Carcassonne game board in progress, colorful square landscape tiles showing roads fields cities monasteries fitting together like a mosaic, warm parchment tones, soft lighting, board game illustration style, no text, no player pieces',
  },
  {
    id: 'beverbende-table',
    size: '1024x1024',
    prompt: 'Overhead view of a dark green felt card game table, shallow depth of field, elegant wooden table edge visible, soft dramatic lighting, no cards no objects, pure empty game table atmosphere, photorealistic',
  },
  {
    id: 'rummikub-table',
    size: '1024x1024',
    prompt: 'Overhead view of a board game table with colorful numbered tiles scattered at edges, dark navy blue felt surface, wooden rack visible at bottom, soft warm lighting, no text, clean game atmosphere, painterly illustration',
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

const filter = process.argv[2];

async function main() {
  const list = filter ? BOARDS.filter(b => b.id === filter) : BOARDS;
  console.log(`Generating ${list.length} board backgrounds (HD)...`);

  for (const board of list) {
    const dest = path.join(OUTPUT_DIR, `${board.id}.png`);
    if (!filter && fs.existsSync(dest)) {
      console.log(`  skip ${board.id} (exists)`);
      continue;
    }
    console.log(`Generating ${board.id} [${board.size}]...`);
    try {
      const url = await generateImage(board.prompt, board.size);
      await downloadImage(url, dest);
      console.log(`  ✓ ${dest}`);
    } catch (err) {
      console.error(`  ✗ ${board.id}: ${err.message}`);
    }
    if (list.indexOf(board) < list.length - 1) {
      await new Promise(r => setTimeout(r, 13000));
    }
  }
  console.log('Done!');
}

main();
