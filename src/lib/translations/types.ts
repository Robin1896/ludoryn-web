export type Translation = {
  home: string; lobby: string; scores: string; shop: string; chat: string; settings: string;
  tagline: string; resumeGame: string; comingSoon: string; moreComing: string;
  grubSubtitle: string; grubDesc: string; grubPlayers: string; grubDuration: string;
  kriskrasSubtitle: string; kriskrasDesc: string; kriskrasPlayers: string; kriskrasDuration: string;
  ttrSubtitle: string; ttrDesc: string; ttrPlayers: string; ttrDuration: string;
  beaverSubtitle: string; beaverDesc: string; beaverPlayers: string; beaverDuration: string;
  bommenSubtitle: string; bommenDesc: string; bommenPlayers: string; bommenDuration: string;
  bommenName: string; bommenRules: [string, string, string][];
  moreGames: string;
  roll: string; rolling: string; stop: string; confirm: string;
  kept: string; dice: string; total: string;
  rollDice: string; pickDie: string;
  clickAll: (face: string) => string;
  yourTurn: string; opponent: string;
  waitingFor: (name: string) => string;
  aiThinking: string;
  gameOver: string; playAgain: string;
  bust: string; aiBust: string;
  continueBtn: string; winner: string;
  diceLeft: string;
  resignTitle: string; resignSub: string;
  resignBtn: string; cancelBtn: string;
  gameRules: (game: string) => string;
  language: string; chooseAvatar: string; guest: string; noAvatarSelected: string;
  logInToSave: string; save: string; cancel: string; saving: string;
  restorePurchases: string; restoreExpansions: string; restore: string; restoring: string;
  searchPlaceholder: string; noResults: string;
  previous: string; nextBtn: string; closeConfirm: string; closeBtn: string;
  grubRules: [string, string, string][];
  ttrRules: [string, string, string][];
  kriskrasRules: [string, string, string][];
  beaverRules: [string, string, string][];
  catanRules: [string, string, string][];
  carcaRules: [string, string, string][];

  // Lobby
  logIn: string; logOut: string; anonymous: string; connectionFailed: string;
  username: string; password: string; signIn: string; signUp: string;
  myGames: string; openTables: string; activeGames: string;
  findOpponent: string; createTable: string; joinViaCode: string; join: string;
  noOpenTables: string; findingOpponent: string; aiReady: string;
  enterTableCode: string; tableCodeHint: string; slowMode: string;
  waitingForOpponent: (name: string) => string;
  tableNumber: (id: string) => string;
  aiStartsIn: (s: number) => string;
  expired: string; timeLeft: (h: number, m: number) => string; minutesLeft: (m: number) => string;

  // Scores & time
  justNow: string; played: string; penalty: string;
  recentSessions: string; noScoresYet: string; noSessionsYet: string; scoresSubtitle: string;
  timeAgoD: (n: number) => string; timeAgoH: (n: number) => string; timeAgoM: (n: number) => string;

  // Status
  statusWaiting: string; statusActive: string; statusFinished: string; statusAbandoned: string;

  // Profile
  won: string; penalties: string;

  // Shop
  shopSubtitle: string; bestDeal: string; active: string;
  unlocked: string; fullCollection: string; allExpansionsUnlocked: string;
  expansionUnlocked: string; noPreviousPurchases: string; restoreFailed: string;
  purchaseFailed: string; cancelled: string; buying: string;
  oneTimePurchase: string; iapWebWarning: string; iosAppRequired: string;
  notAvailableOnWeb: string; buyAll: string;
  expansionsRestored: (n: number) => string;
  buyFor: (price: string) => string;

  // Levels
  environments: string; chooseTheme: string;

  // Chat & UI
  globalChat: string; typeMessage: string; somethingWentWrong: string;
  full: string; leave: string; watch: string;

  // Game UI — shared
  faults: string; pts: string; pass: string; confirmNext: string;
  twoPlayers: string; waitingForPlayer: string;
  inviteCopied: string; invitePlayers: string; copyInviteLink: string; linkCopied: string;
  readyBtn: string; readyDone: string; gameStarting: string; myBoard: string;
  youParen: string; waitDots: string;
  waitingSlots: (cur: number, max: number) => string;
  playerN: (n: number) => string;
  namePlaceholder: string;
  waitingForOpponentTitle: string; shareCodeSingle: string; shareCodeMulti: string;
  needed: string; spectating: (name: string) => string; aiRolling: string;
  backToLobby: string; winsShort: string; grubName: string;

  // Game display names (fake names)
  kriskrasName: string;

  // Lobby — extra
  resume: string;

  // Shop — extra
  individualPrice: string;
  youHaveExpansions: (n: number, total: number) => string;
  probundleDesc: (n: number) => string;

  // Shop — badge labels
  badgePopular: string;
  badgeNew: string;
  badgeFast: string;

  // Shop — expansion content (qwixx-gemixxt)
  qwixxGemixxTagline: string;
  qwixxGemixxDesc: string;
  // Shop — expansion content (qwixx-big-points)
  qwixxBigPointsTagline: string;
  qwixxBigPointsDesc: string;
  // Shop — expansion content (grub-uitbreiding)
  grubExpName: string;
  grubExpTagline: string;
  grubExpDesc: string;
};
