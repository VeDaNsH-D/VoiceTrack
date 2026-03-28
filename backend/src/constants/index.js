const FILLER_WORDS = ["haan", "matlab", "toh", "bhai", "woh", "yeh", "kya", "ki", "ka"];

/**
 * EXPANDED: Number words (Hinglish only, Hindi Devanagari handled in hindi-normalization.service)
 */
const NUMBER_WORDS = {
  ek: "1",
  do: "2",
  teen: "3",
  chaar: "4",
  paanch: "5",
  chhe: "6",
  saat: "7",
  aath: "8",
  nau: "9",
  das: "10",
  gyarah: "11",
  barah: "12",
  tera: "13",
  chaudah: "14",
  pandrah: "15",
  solah: "16",
  satrah: "17",
  atharah: "18",
  unnis: "19",
  bees: "20",
  tees: "30",
  chalis: "40",
  pachas: "50",
  saath: "60",
  sattar: "70",
  assi: "80",
  nabbe: "90",
  sau: "100",
};

/**
 * EXPANDED: Item mappings for common Indian business items
 */
const ITEM_MAPPINGS = {
  // Beverages
  doodh: "milk",
  chai: "chai",
  tea: "chai",
  coffee: "coffee",
  kaapi: "coffee",
  lassi: "lassi",
  sharbat: "sharbat",
  pani: "water",

  // Snacks
  samosa: "samosa",
  pakora: "pakora",
  chips: "chips",
  biscuit: "biscuit",
  cookies: "cookies",
  namkeen: "namkeen",
  munchies: "munchies",
  chikhalwali: "snacks",
  pav: "pav",
  bhaji: "bhaji",

  // Food
  roti: "roti",
  bhakri: "bhakri",
  naan: "naan",
  paratha: "paratha",
  dosa: "dosa",
  idli: "idli",
  upma: "upma",
  poha: "poha",
  parathas: "paratha",
  rotli: "roti",

  // Vegetables
  pyaaz: "onion",
  aloo: "potato",
  bandh: "cabbage",
  gajar: "carrot",
  tamatar: "tomato",
  tamatar: "tomato",
  bootli: "bottle",

  // Sweets
  halwa: "halwa",
  kheer: "kheer",
  laddu: "laddu",
  mithai: "sweet",
  gulab: "gulab",
  jalebi: "jalebi",
  barfi: "barfi",

  // Other
  butter: "butter",
  ghee: "ghee",
  oil: "oil",
  salt: "salt",
  sugar: "sugar",
  spice: "spice",
  honey: "honey",
  jam: "jam",
  pickle: "pickle",
};

const EXPENSE_HINTS = ["liya", "kharida", "kharach", "kharch", "expense", "udhaar", "paid"];

const CONFIDENCE_THRESHOLD = 0.7;

const BUSINESS_TYPES = [
  "vegetable",
  "snacks",
  "tea",
  "general",
  "sweet",
  "bakery",
];

module.exports = {
  FILLER_WORDS,
  NUMBER_WORDS,
  ITEM_MAPPINGS,
  EXPENSE_HINTS,
  CONFIDENCE_THRESHOLD,
  BUSINESS_TYPES,
};
