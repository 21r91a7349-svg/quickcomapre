export const MATCHER_CONFIG = {
  // Aliases and typos mapping to canonical forms
  synonyms: {
    'coca-cola': 'coca cola',
    'coke': 'coca cola',
    'milk \'n\' coffee': 'milk & coffee',
    'akki': 'rice',
    'bb royal': 'bigbasket royal',
    'bb popular': 'bigbasket popular',
    'amulya': 'amul',
    'maggie': 'maggi',
    'maggi spicy': 'maggi',
    'coca cola imported': 'coca cola',
    'coca-cola imported': 'coca cola',
    'nestlé': 'nestle',
    'amul taaza': 'amul',
    'mother dairy india': 'mother dairy'
  },

  // Words that provide no semantic distinction for our matching engine
  stopWords: [
    'premium',
    'fresh',
    'classic',
    'original',
    'real',
    'pure',
    'natural',
    'export quality',
    'superior',
    'everyday',
    'rozana',
    'feast'
  ],

  // Packaging variants grouped by family. Rejections only happen if families differ.
  packagingFamilies: {
    'bottle': ['bottle', 'pet bottle', 'plastic bottle', 'glass bottle'],
    'can': ['can', 'tin can'],
    'carton': ['carton', 'tetra pack', 'tetrapack', 'box'],
    'pouch': ['pouch', 'sachet', 'packet'],
    'cuppa': ['cuppa', 'cup']
  },

  // Flavour groupings. Must match or both be missing.
  flavourGroups: [
    'rose',
    'badam',
    'kesar',
    'vanilla',
    'cherry',
    'chocolate',
    'strawberry',
    'elaichi',
    'garlic',
    'tomato',
    'masala'
  ],

  // Variant classes. Must match or both be missing.
  variantGroups: [
    'full cream',
    'toned',
    'skimmed',
    'diet',
    'zero sugar',
    'zero calorie',
    'light',
    'medium grain',
    'long grain',
    'extra long grain',
    'short grain'
  ],

  // Semantic weighting
  weights: {
    token: 0.35,
    trigram: 0.35,
    embedding: 0.30
  },

  // Decision thresholds
  thresholds: {
    autoMerge: 0.88,
    review: 0.75
  }
};
