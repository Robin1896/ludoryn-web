// ─────────────────────────────────────────────────────────────────────────────
// Shop — uitbreidingen per spel
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// RevenueCat product IDs (moeten overeenkomen met App Store Connect)
// ─────────────────────────────────────────────────────────────────────────────

export const PRO_BUNDLE_PRODUCT_ID = 'nl.ludoryn.bundle.pro';

export type ExpansionId =
  // Wingspan
  | 'wingspan-european'
  | 'wingspan-oceania'
  | 'wingspan-asia'
  // Kolonis
  | 'catan-seafarers'
  | 'catan-cities-knights'
  | 'catan-traders-barbarians'
  // Kriskras
  | 'qwixx-gemixxt'
  | 'qwixx-big-points'
  // Traxion
  | 'ttr-europe'
  | 'ttr-usa-1910'
  | 'ttr-nordic'
  | 'ttr-switzerland'
  | 'ttr-germany'
  | 'ttr-france'
  | 'ttr-asia'
  | 'ttr-africa'
  | 'ttr-amsterdam'
  | 'ttr-london'
  | 'ttr-new-york'
  | 'ttr-japan-italy'
  // Basteon
  | 'carcassonne-inns-cathedrals'
  | 'carcassonne-traders-builders'
  | 'carcassonne-princess-dragon'
  // Beverbende
  | 'beverbende-specials'
  // Grub
  | 'grub-uitbreiding'
  // Rummikub
  | 'rummikub-twist';

// Mapping van expansion ID → RevenueCat product ID
export const EXPANSION_PRODUCT_ID: Record<ExpansionId, string> = {
  'wingspan-european':              'nl.ludoryn.expansion.wingspan-european',
  'wingspan-oceania':               'nl.ludoryn.expansion.wingspan-oceania',
  'wingspan-asia':                  'nl.ludoryn.expansion.wingspan-asia',
  'catan-seafarers':                'nl.ludoryn.expansion.catan-seafarers',
  'catan-cities-knights':           'nl.ludoryn.expansion.catan-cities-knights',
  'catan-traders-barbarians':       'nl.ludoryn.expansion.catan-traders-barbarians',
  'qwixx-gemixxt':                  'nl.ludoryn.expansion.qwixx-gemixxt',
  'qwixx-big-points':               'nl.ludoryn.expansion.qwixx-big-points',
  'ttr-europe':                     'nl.ludoryn.expansion.ttr-europe',
  'ttr-usa-1910':                   'nl.ludoryn.expansion.ttr-usa-1910',
  'ttr-nordic':                     'nl.ludoryn.expansion.ttr-nordic',
  'ttr-switzerland':                'nl.ludoryn.expansion.ttr-switzerland',
  'ttr-germany':                    'nl.ludoryn.expansion.ttr-germany',
  'ttr-france':                     'nl.ludoryn.expansion.ttr-france',
  'ttr-asia':                       'nl.ludoryn.expansion.ttr-asia',
  'ttr-africa':                     'nl.ludoryn.expansion.ttr-africa',
  'ttr-amsterdam':                  'nl.ludoryn.expansion.ttr-amsterdam',
  'ttr-london':                     'nl.ludoryn.expansion.ttr-london',
  'ttr-new-york':                   'nl.ludoryn.expansion.ttr-new-york',
  'ttr-japan-italy':                'nl.ludoryn.expansion.ttr-japan-italy',
  'carcassonne-inns-cathedrals':    'nl.ludoryn.expansion.carcassonne-inns-cathedrals',
  'carcassonne-traders-builders':   'nl.ludoryn.expansion.carcassonne-traders-builders',
  'carcassonne-princess-dragon':    'nl.ludoryn.expansion.carcassonne-princess-dragon',
  'beverbende-specials':            'nl.ludoryn.expansion.beverbende-specials',
  'grub-uitbreiding':               'nl.ludoryn.expansion.grub-uitbreiding',
  'rummikub-twist':                 'nl.ludoryn.expansion.rummikub-twist',
};

// Alle expansion IDs als array — handig voor Pro Bundle unlock
export const ALL_EXPANSION_IDS: ExpansionId[] = [
  'wingspan-european', 'wingspan-oceania', 'wingspan-asia',
  'catan-seafarers', 'catan-cities-knights', 'catan-traders-barbarians',
  'qwixx-gemixxt', 'qwixx-big-points',
  'ttr-europe', 'ttr-usa-1910', 'ttr-nordic', 'ttr-switzerland',
  'ttr-germany', 'ttr-france', 'ttr-asia', 'ttr-africa',
  'ttr-amsterdam', 'ttr-london', 'ttr-new-york', 'ttr-japan-italy',
  'carcassonne-inns-cathedrals', 'carcassonne-traders-builders', 'carcassonne-princess-dragon',
  'beverbende-specials',
  'grub-uitbreiding',
  'rummikub-twist',
];

export interface ExpansionDef {
  id: ExpansionId;
  game: string;
  name: string;
  nameEn?: string;
  tagline: string;
  taglineEn?: string;
  description: string;
  descriptionEn?: string;
  icon: string;
  img?: string;
  price: string;
  badge?: string;
  badgeEn?: string;
}

export const EXPANSIONS: ExpansionDef[] = [
  // ── Wingspan ────────────────────────────────────────────────────────────────
  {
    id: 'wingspan-european',
    game: 'Wingspan',
    name: 'Europese Vogels',
    tagline: '81 nieuwe vogels uit Europa',
    description: 'Ontdek unieke Europese vogelsoorten met de nectarfood-resource en nieuwe bonuskaarten.',
    icon: '🌍',
    img: '/images/shop/wingspan-european.png',
    price: '€3,99',
  },
  {
    id: 'wingspan-oceania',
    game: 'Wingspan',
    name: 'Oceanië',
    tagline: '95 vogels uit Australië & Nieuw-Zeeland',
    description: 'Australische en Nieuw-Zeelandse vogels met extra habitat-interacties en nectarmechanica.',
    icon: '🦘',
    img: '/images/shop/wingspan-oceania.png',
    price: '€3,99',
    badge: 'Populair',
  },
  {
    id: 'wingspan-asia',
    game: 'Wingspan',
    name: 'Aziatische Vogels',
    tagline: '75 vogels uit Azië',
    description: 'Rijke Aziatische vogeldiversiteit met extra bonuskaarten en nieuwe spelregels.',
    icon: '🐼',
    img: '/images/shop/wingspan-asia.png',
    price: '€3,99',
  },

  // ── Kolonis ───────────────────────────────────────────────────────────────────
  {
    id: 'catan-seafarers',
    game: 'Kolonis',
    name: 'Zeevaarders',
    tagline: 'Bouw schepen, verover zeeën',
    description: 'Breid het eiland uit met nieuwe zee-eilanden, goudvelden en schepen. Ontdek en koloniseer onbekende gebieden.',
    icon: '⛵',
    img: '/images/shop/catan-seafarers.png',
    price: '€4,99',
    badge: 'Nieuw',
  },
  {
    id: 'catan-cities-knights',
    game: 'Kolonis',
    name: 'Steden & Ridders',
    tagline: 'Versterk je steden, weersla barbaren',
    description: 'Kathedralen, ridders en barbaarse aanvallen. Upgrade je steden met verbeteringen en verdedig Kolonis.',
    icon: '⚔️',
    img: '/images/shop/catan-cities-knights.png',
    price: '€4,99',
    badge: 'Populair',
  },
  {
    id: 'catan-traders-barbarians',
    game: 'Kolonis',
    name: 'Handelaars & Barbaren',
    tagline: '5 scenario\'s met nieuwe mechanica',
    description: 'Vijf unieke scenario\'s: handel over rivieren, bescherm karavanen en bouw bruggen.',
    icon: '🏕️',
    img: '/images/shop/catan-traders-barbarians.png',
    price: '€4,99',
  },

  // ── Kriskras ───────────────────────────────────────────────────────────────────
  {
    id: 'qwixx-gemixxt',
    game: 'Kriskras',
    name: 'Gemixxt',
    tagline: 'Kleuren door elkaar',
    taglineEn: 'Mixed colours',
    description: 'De rijen zijn niet langer één kleur — elke rij bevat een mix van kleuren voor extra tactische diepgang.',
    descriptionEn: 'Rows are no longer one colour — each row is a mix of colours for extra tactical depth.',
    icon: '🎨',
    img: '/images/shop/qwixx-gemixxt.png',
    price: '€1,99',
    badge: 'Populair',
    badgeEn: 'Popular',
  },
  {
    id: 'qwixx-big-points',
    game: 'Kriskras',
    name: 'Big Points',
    tagline: 'Uitgebreid scoreblok',
    taglineEn: 'Extended score pad',
    description: 'Extra scoreblok met bonusvakjes en nieuwe straffen. Hogere risico\'s, hogere beloningen.',
    descriptionEn: 'Extra score pad with bonus boxes and new penalties. Higher risks, higher rewards.',
    icon: '📊',
    img: '/images/shop/qwixx-big-points.png',
    price: '€1,99',
  },

  // ── Traxion ──────────────────────────────────────────────────────────
  {
    id: 'ttr-europe',
    game: 'Traxion',
    name: 'Europa',
    tagline: 'Nieuwe kaart, tunnels & veerponten',
    description: 'Reis door Europa met treinstations, tunnels en veerponten. Een compleet nieuw bord vol uitdaging.',
    icon: '🗺️',
    img: '/images/shop/ttr-europe.png',
    price: '€4,99',
    badge: 'Populair',
  },
  {
    id: 'ttr-usa-1910',
    game: 'Traxion',
    name: 'USA 1910',
    tagline: '35 extra bestemmingstickets',
    description: 'Meer bestemmingen, grotere steden en een nieuw "Continent" ticket voor de ultieme USA-uitdaging.',
    icon: '🚂',
    img: '/images/shop/ttr-usa-1910.png',
    price: '€2,99',
  },
  {
    id: 'ttr-nordic',
    game: 'Traxion',
    name: 'Scandinavië',
    tagline: 'Sneeuw, fjorden & Scandinavische routes',
    description: 'Reis door Noorwegen, Zweden en Finland over bevroren meren en door dichte bossen. Alleen voor 2-3 spelers.',
    icon: '🏔️',
    img: '/images/shop/ttr-nordic.png',
    price: '€3,99',
    badge: 'Populair',
  },
  {
    id: 'ttr-switzerland',
    game: 'Traxion',
    name: 'Zwitserland',
    tagline: 'Alpentunnels & steden',
    description: 'Klim door de Alpen, rij door tunnels en verbind Zwitserse steden met de rest van Europa. Compact en snel.',
    icon: '🏔️',
    img: '/images/shop/ttr-switzerland.png',
    price: '€2,99',
  },
  {
    id: 'ttr-germany',
    game: 'Traxion',
    name: 'Duitsland',
    tagline: 'Passagiers ophalen & afzetten',
    description: 'Nieuw mechanic: laad passagiers in aan stations en breng ze naar hun bestemming voor bonuspunten.',
    icon: '🚉',
    img: '/images/shop/ttr-germany.png',
    price: '€3,99',
  },
  {
    id: 'ttr-france',
    game: 'Traxion',
    name: 'Frankrijk & Oud West',
    tagline: 'Twee kaarten in één',
    description: 'Bouw spoorlijnen door de Franse wijngaarden of verover het Wilde Westen van Amerika. Twee complete kaarten.',
    icon: '🗺️',
    img: '/images/shop/ttr-france.png',
    price: '€4,99',
    badge: 'Nieuw',
  },
  {
    id: 'ttr-asia',
    game: 'Traxion',
    name: 'Azië',
    tagline: 'Team-spel & legendarische routes',
    description: 'Speel samen als team of doorzoek legendarische Aziatische routes over de Zijderoute. Twee kaarten, nieuwe strategieën.',
    icon: '🗺️',
    img: '/images/shop/ttr-asia.png',
    price: '€4,99',
  },
  {
    id: 'ttr-africa',
    game: 'Traxion',
    name: 'Afrika',
    tagline: 'Terrein-tegels & safari-routes',
    description: 'Oversteek het Afrikaanse continent met terrein-tegels die extra punten geven op bepaalde routes.',
    icon: '🗺️',
    img: '/images/shop/ttr-africa.png',
    price: '€3,99',
  },
  {
    id: 'ttr-amsterdam',
    game: 'Traxion',
    name: 'Amsterdam',
    tagline: 'Grachten & mini-kaart (15 min)',
    description: 'Snelle rondrit door de Amsterdamse grachten. In 15 minuten gespeeld — perfect als tussendoor.',
    icon: '🚃',
    img: '/images/shop/ttr-amsterdam.png',
    price: '€1,99',
    badge: 'Snel',
  },
  {
    id: 'ttr-london',
    game: 'Traxion',
    name: 'Londen',
    tagline: 'Busdiensten door de Londense wijken',
    description: 'Verbind Londense wijken met busdiensten. Compact spel voor 2-4 spelers in nog geen 20 minuten.',
    icon: '🚃',
    img: '/images/shop/ttr-london.png',
    price: '€1,99',
  },
  {
    id: 'ttr-new-york',
    game: 'Traxion',
    name: 'New York',
    tagline: 'Taxi\'s door Manhattan',
    description: 'Race door Manhattan met gele taxi\'s langs toeristische attracties. Snel, stijlvol en competitief.',
    icon: '🚃',
    img: '/images/shop/ttr-new-york.png',
    price: '€1,99',
  },
  {
    id: 'ttr-japan-italy',
    game: 'Traxion',
    name: 'Japan & Italië',
    tagline: 'Bullet trains & schilderachtige routes',
    description: 'Scheur over Japanse shinkansen-lijnen of rij rustig door de Italiaanse laars. Twee contrasterende kaarten.',
    icon: '🗺️',
    img: '/images/shop/ttr-japan-italy.png',
    price: '€4,99',
    badge: 'Nieuw',
  },

  // ── Basteon ─────────────────────────────────────────────────────────────
  {
    id: 'carcassonne-inns-cathedrals',
    game: 'Basteon',
    name: 'Herbergen & Kathedralen',
    tagline: 'Meer punten, meer risico',
    description: 'Herbergen verdubbelen wegpunten maar je krijgt niets bij onvoltooide wegen. Kathedralen boosten steden enorm.',
    icon: '⛪',
    img: '/images/shop/carcassonne-inns-cathedrals.png',
    price: '€2,99',
    badge: 'Populair',
  },
  {
    id: 'carcassonne-traders-builders',
    game: 'Basteon',
    name: 'Handelaars & Bouwers',
    tagline: 'Extra beurt met de bouwer',
    description: 'Plaats een bouwer in je stad of weg voor een extra tegel. Handelsgoederen leveren bonuspunten op.',
    icon: '🔨',
    img: '/images/shop/carcassonne-traders-builders.png',
    price: '€2,99',
  },
  {
    id: 'carcassonne-princess-dragon',
    game: 'Basteon',
    name: 'Prinses & Draak',
    tagline: 'Chaos met de draak',
    description: 'De draak vernietigt pionnen op zijn pad. De fee beschermt jouw pionnen. Avontuur en chaos in één uitbreiding.',
    icon: '🐉',
    img: '/images/shop/carcassonne-princess-dragon.png',
    price: '€2,99',
  },

  // ── Beverbende ──────────────────────────────────────────────────────────────
  {
    id: 'beverbende-specials',
    game: 'Beverbende',
    name: 'Speciale Kaarten',
    tagline: 'Acties, kijken & wisselen',
    description: 'Voeg speciale actiekaarten toe: kijk in tegenstanders\' kaarten, wissel blind of blokkeer een beurt.',
    icon: '🃏',
    img: '/images/shop/beverbende-specials.png',
    price: '€1,99',
    badge: 'Nieuw',
  },

  // ── Grub ────────────────────────────────────────────────────────────────────
  {
    id: 'grub-uitbreiding',
    game: 'Grub',
    name: 'Grub Expansion',
    nameEn: 'Grub Expansion',
    tagline: 'Extra tegels & jokerwormen',
    taglineEn: 'Extra tiles & joker grubs',
    description: 'Hogere tegels met bonuswormen en jokertegels die elke dobbelsteenwaarde aannemen.',
    descriptionEn: 'Higher tiles with bonus grubs and joker tiles that accept any dice value.',
    icon: '🪱',
    img: '/images/shop/grub-uitbreiding.png',
    price: '€1,99',
    badge: 'Nieuw',
    badgeEn: 'New',
  },

  // ── Rummikub ────────────────────────────────────────────────────────────────
  {
    id: 'rummikub-twist',
    game: 'Rummikub',
    name: 'Twist',
    tagline: 'Speciale joker-tegels',
    description: 'Vier nieuwe speciale tegels: spiegel, joker, kleurwissel en freeze. Elke beurt vol verrassingen.',
    icon: '🌀',
    img: '/images/shop/rummikub-twist.png',
    price: '€1,99',
  },
];

export const GAMES_IN_SHOP = ['Kriskras', 'Grub'] as const;

export const GAME_ICON: Record<string, string> = {
  Wingspan: '🦅',
  Kolonis: '🏝️',
  Kriskras: '🎲',
  'Traxion': '🚃',
  Basteon: '🏰',
  Beverbende: '🦫',
  Grub: '🪱',
  Rummikub: '🔢',
};

export const GAME_ACCENT: Record<string, string> = {
  Wingspan: '#4A90D9',
  Kolonis: '#FF5252',
  Kriskras: '#FFCA28',
  'Traxion': '#4285F4',
  Basteon: '#66BB6A',
  Beverbende: '#AB47BC',
  Grub: '#00C875',
  Rummikub: '#FF7043',
};

// ─────────────────────────────────────────────────────────────────────────────
// localStorage helpers (lokale cache — server is de bron van waarheid)
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'ludoryn-unlocked-expansions';

export function loadUnlocked(): ExpansionId[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

export function saveUnlocked(list: ExpansionId[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
  catch { /* ignore */ }
}

/**
 * Voeg een expansion toe aan de lokale cache.
 * Roep na een succesvolle server-unlock aan voor direct UI feedback.
 * @alias unlockExpansion — backwards compatible
 */
export function addUnlockedLocally(id: ExpansionId): ExpansionId[] {
  const current = loadUnlocked();
  if (current.includes(id)) return current;
  const next = [...current, id];
  saveUnlocked(next);
  return next;
}

/** @deprecated Gebruik addUnlockedLocally — zelfde functie, duidelijkere naam */
export const unlockExpansion = addUnlockedLocally;

/**
 * Schrijf de server-lijst naar localStorage (volledige sync).
 */
export function syncUnlockedFromServer(ids: ExpansionId[]) {
  saveUnlocked(ids);
}

// Migrate old wingspan-specific localStorage key
export function migrateOldKeys() {
  if (typeof window === 'undefined') return;
  try {
    const old = JSON.parse(localStorage.getItem('wingspan-expansions') || '[]') as string[];
    if (old.length === 0) return;
    const mapped = old.map((k) => `wingspan-${k}` as ExpansionId);
    const existing = loadUnlocked();
    const merged = Array.from(new Set([...existing, ...mapped]));
    saveUnlocked(merged);
    localStorage.removeItem('wingspan-expansions');
  } catch { /* ignore */ }
}
