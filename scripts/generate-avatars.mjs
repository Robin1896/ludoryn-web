/**
 * Generates 20 game-character avatars using DALL-E 3 and saves them to /public/avatars/
 * Run: OPENAI_API_KEY=sk-... node scripts/generate-avatars.mjs
 */

import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../public/avatars");

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error("❌  Stel OPENAI_API_KEY in.");
  process.exit(1);
}

const STYLE =
  "flat vector illustration, vibrant neon-on-dark color palette, bold outlines, " +
  "centered portrait, perfectly circular crop, dark near-black background, " +
  "game avatar art style, clean and simple, no text";

const CHARACTERS = [
  { id: "warrior",     desc: "fierce female warrior with crimson armor and blazing red ponytail" },
  { id: "wizard",      desc: "wise old wizard with a long white beard, deep blue robes and golden staff" },
  { id: "rogue",       desc: "cunning rogue with a green hooded cloak, smirking expression and daggers" },
  { id: "knight",      desc: "brave knight with polished golden helmet and royal blue shield" },
  { id: "sorceress",   desc: "mysterious sorceress with swirling purple hair and glowing violet eyes" },
  { id: "ranger",      desc: "sharp-eyed ranger with a dark green hood, bow slung over shoulder" },
  { id: "barbarian",   desc: "mighty barbarian with tribal tattoos, wild orange hair and battle axe" },
  { id: "inventor",    desc: "quirky inventor with brass goggles, copper gear and a wide grin" },
  { id: "elf",         desc: "graceful elven archer with long silver hair and pointed ears, emerald eyes" },
  { id: "pirate",      desc: "swashbuckling pirate with a scarlet bandana, gold earring and eye patch" },
  { id: "paladin",     desc: "noble paladin in gleaming white armour with a radiant holy aura" },
  { id: "assassin",    desc: "shadow assassin in a sleek black mask and hood, glowing yellow eyes" },
  { id: "firemage",    desc: "fire mage with fiery orange hair and swirling amber flames around hands" },
  { id: "icewitcher",  desc: "ice witcher with frost-white hair, crystal blue skin and icy shard magic" },
  { id: "trickster",   desc: "playful trickster with a colourful jester hat and mischievous grin" },
  { id: "samurai",     desc: "stoic samurai with a red topknot, dark kimono and katana at ready" },
  { id: "bard",        desc: "cheerful bard with a lute, curly auburn hair and a feathered cap" },
  { id: "necromancer", desc: "brooding necromancer with pale skin, dark circles and purple soul-flames" },
  { id: "captain",     desc: "bold sea captain with a navy blue coat, brass telescope and grey beard" },
  { id: "druid",       desc: "serene druid with a crown of autumn leaves, earth-toned robes and wise green eyes" },
];

async function dalleRequest(prompt) {
  const body = JSON.stringify({
    model: "dall-e-3",
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "standard",
    response_format: "url",
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.openai.com",
      path: "/v1/images/generations",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (let i = 0; i < CHARACTERS.length; i++) {
    const { id, desc } = CHARACTERS[i];
    const outPath = path.join(OUTPUT_DIR, `${id}.png`);

    if (fs.existsSync(outPath)) {
      console.log(`⏭  ${id} bestaat al, skip.`);
      continue;
    }

    const prompt = `Game character avatar portrait: ${desc}. ${STYLE}`;
    console.log(`🎨 [${i + 1}/20] Genereren: ${id}…`);

    try {
      const result = await dalleRequest(prompt);
      if (result.error) {
        console.error(`❌  ${id}: ${result.error.message}`);
        continue;
      }
      const imageUrl = result.data?.[0]?.url;
      if (!imageUrl) {
        console.error(`❌  ${id}: geen URL in response`, result);
        continue;
      }
      await downloadImage(imageUrl, outPath);
      console.log(`✅  ${id} opgeslagen.`);
    } catch (err) {
      console.error(`❌  ${id}: fout —`, err.message);
    }

    // Kleine pauze om rate limits te respecteren
    if (i < CHARACTERS.length - 1) await new Promise((r) => setTimeout(r, 800));
  }

  console.log("\n✨ Klaar! Avatars staan in public/avatars/");
}

main();
