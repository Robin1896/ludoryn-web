#!/usr/bin/env node
// Generate shop expansion card art using DALL-E 3
// Usage: OPENAI_API_KEY=sk-... node scripts/gen-shop-art.js
// Or: OPENAI_API_KEY=sk-... node scripts/gen-shop-art.js wingspan-european

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) { console.error('Set OPENAI_API_KEY'); process.exit(1); }

const OUTPUT_DIR = path.join(__dirname, '../public/images/shop');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const EXPANSIONS = [
  // Wingspan
  {
    id: 'wingspan-european',
    prompt: 'Close-up illustration of colorful European birds in flight over a green meadow, painted board game card art style, warm soft lighting, no text, no frame',
  },
  {
    id: 'wingspan-oceania',
    prompt: 'Close-up illustration of a colorful Australian cockatoo and kookaburra perched on eucalyptus branches, painted board game card art style, warm soft lighting, no text, no frame',
  },
  {
    id: 'wingspan-asia',
    prompt: 'Close-up illustration of a majestic Japanese red-crowned crane flying over cherry blossoms, painted board game card art style, soft pastel lighting, no text, no frame',
  },
  // Catan
  {
    id: 'catan-seafarers',
    prompt: 'Illustrated wide ocean view with wooden Viking sailing ships crossing turquoise waters between small green islands, board game art style, vibrant colors, no text, no frame',
  },
  {
    id: 'catan-cities-knights',
    prompt: 'Illustrated medieval stone city with knights on horseback and castle towers under dramatic sky, board game art style, rich colors, no text, no frame',
  },
  {
    id: 'catan-traders-barbarians',
    prompt: 'Illustrated medieval market scene with traders and horse-drawn caravans on a dusty road, board game art style, warm earthy tones, no text, no frame',
  },
  // Qwixx
  {
    id: 'qwixx-gemixxt',
    prompt: 'Illustrated colorful dice scattered on a table with mixed red yellow blue green colors glowing, board game card art style, vibrant flat illustration, no text, no frame',
  },
  {
    id: 'qwixx-big-points',
    prompt: 'Illustrated score sheet with large bold colorful numbers and bonus stars, retro board game graphic style, bright vivid colors, no text, no frame',
  },
  // Ticket to Ride
  {
    id: 'ttr-europe',
    prompt: 'Illustrated vintage European map with colorful train routes through mountains and rivers, retro travel poster art style, warm sepia tones, no text, no frame',
  },
  {
    id: 'ttr-usa-1910',
    prompt: 'Illustrated vintage American steam locomotive speeding across open plains under a big sky, retro travel poster art style, warm dusty tones, no text, no frame',
  },
  // Carcassonne
  {
    id: 'carcassonne-inns-cathedrals',
    prompt: 'Illustrated medieval gothic cathedral with stained glass windows and an inn on a cobblestone road, board game art style, warm candlelit tones, no text, no frame',
  },
  {
    id: 'carcassonne-traders-builders',
    prompt: 'Illustrated medieval craftsman building a stone wall next to a market stall with goods, board game art style, warm earthy tones, no text, no frame',
  },
  {
    id: 'carcassonne-princess-dragon',
    prompt: 'Illustrated fearsome red dragon flying over a medieval tower with a princess watching from the window, dramatic board game art style, deep rich colors, no text, no frame',
  },
  // Beverbende
  {
    id: 'beverbende-specials',
    prompt: 'Illustrated fan of playing cards with magical glowing special action symbols, board game card art style, dark background with colorful glowing effects, no text, no frame',
  },
  // TTR extra maps
  {
    id: 'ttr-nordic',
    prompt: 'Illustrated vintage map of Scandinavia with snow-covered fjords and pine forests, colorful train routes, retro travel poster art style, cool blue and white tones, no text, no frame',
  },
  {
    id: 'ttr-switzerland',
    prompt: 'Illustrated vintage map of Switzerland with Alpine mountain tunnels and snowy peaks, colorful train routes, retro travel poster art style, crisp cold tones, no text, no frame',
  },
  {
    id: 'ttr-germany',
    prompt: 'Illustrated vintage map of Germany with old train stations and passengers waiting on platforms, colorful train routes, retro travel poster art style, warm earthy tones, no text, no frame',
  },
  {
    id: 'ttr-france',
    prompt: 'Illustrated vintage split map showing French vineyards and American Wild West landscapes side by side, colorful train routes, retro travel poster art style, warm colors, no text, no frame',
  },
  {
    id: 'ttr-asia',
    prompt: 'Illustrated vintage Silk Road map of Asia with ancient temples and mountain passes, colorful train routes, retro travel poster art style, rich warm golden tones, no text, no frame',
  },
  {
    id: 'ttr-africa',
    prompt: 'Illustrated vintage map of Africa with savanna landscapes and safari animals in the distance, colorful train routes, retro travel poster art style, warm earthy ochre tones, no text, no frame',
  },
  {
    id: 'ttr-amsterdam',
    prompt: 'Illustrated vintage aerial view of Amsterdam canal houses and bridges, colorful tram and bus routes, retro travel poster art style, warm Dutch tones, no text, no frame',
  },
  {
    id: 'ttr-london',
    prompt: 'Illustrated vintage aerial view of London with Big Ben and double-decker buses on cobblestone streets, colorful bus routes across the city, retro travel poster art style, warm sepia tones, no text, no frame',
  },
  {
    id: 'ttr-new-york',
    prompt: 'Illustrated vintage aerial view of Manhattan skyline with yellow taxis racing through grid streets, colorful taxi routes between neighborhoods, retro travel poster art style, warm city tones, no text, no frame',
  },
  {
    id: 'ttr-japan-italy',
    prompt: 'Illustrated vintage split map showing a Japanese bullet train speeding past Mount Fuji and an Italian countryside with rolling hills and vineyards, colorful train routes, retro travel poster art style, no text, no frame',
  },
  // Regenwormen
  {
    id: 'grub-uitbreiding',
    prompt: 'Illustrated large pile of colorful numbered tiles with earthworms peeking out, playful board game art style, bright cheerful colors, no text, no frame',
  },
  // Rummikub
  {
    id: 'rummikub-twist',
    prompt: 'Illustrated colorful Rummikub tiles arranged in a swirling pattern with special joker tiles glowing, board game art style, vibrant flat illustration, no text, no frame',
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

const filter = process.argv[2]; // optional: only generate one

async function main() {
  const list = filter ? EXPANSIONS.filter(e => e.id === filter) : EXPANSIONS;
  console.log(`Generating ${list.length} images...`);

  for (const exp of list) {
    const dest = path.join(OUTPUT_DIR, `${exp.id}.png`);
    if (!filter && fs.existsSync(dest)) {
      console.log(`  skip ${exp.id} (exists)`);
      continue;
    }
    console.log(`Generating ${exp.id}...`);
    try {
      const url = await generateImage(exp.prompt);
      await downloadImage(url, dest);
      console.log(`  ✓ ${dest}`);
    } catch (err) {
      console.error(`  ✗ ${exp.id}: ${err.message}`);
    }
    // DALL-E 3: max 5 images/min
    if (list.indexOf(exp) < list.length - 1) {
      await new Promise(r => setTimeout(r, 13000));
    }
  }
  console.log('Done!');
}

main();
