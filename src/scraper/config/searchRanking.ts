export const SEARCH_CONFIG = {
    // Limits
    maxCandidates: 100,
    defaultPageSize: 20,

    // Categorized Synonym Dictionaries
    synonyms: {
        brand: {
            'coke': ['coca cola', 'coca-cola'],
            'pepsi': ['pepsico'],
            'amul': ['amul', 'gcMMF']
        },
        category: {
            'soft drink': ['coca cola', 'pepsi', 'sprite', 'thums up', 'cola'],
            'cola': ['coca cola', 'pepsi', 'thums up'],
            'atta': ['wheat flour', 'chakki atta'],
            'oil': ['cooking oil', 'sunflower oil', 'mustard oil']
        },
        generic: {
            '&': ['and'],
            "'n'": ['and']
        }
    },

    // Weights
    weights: {
        exactMatchBoost: 100,
        prefixMatchBoost: 80,
        ftsBaseBoost: 75,
        trigramBaseBoost: 50,
        brandIntentBoost: 20,
        categoryIntentBoost: 20,
        stapleBoost: 10,
        nichePenalty: -20,
        listingCountBoost: 1,
        searchFrequencyBoost: 0,
        ctrBoost: 0,
        conversionBoost: 0
    },

    // Classification Dictionaries
    staples: [
        'toned milk', 'full cream milk', 'cow milk', 'raw rice', 
        'sona masoori', 'wheat flour', 'chakki atta', 'sunflower oil', 'mustard oil'
    ],

    nicheKeywords: [
        'flavoured', 'chocolate', 'rose', 'diet', 'sugar free', 'zero', 'max'
    ],
    
    knownCategories: [
        'milk', 'rice', 'atta', 'oil', 'onion', 'soft drink', 'coffee', 
        'tea', 'chocolate', 'butter', 'ghee', 'paneer', 'curd'
    ],
    
    knownBrands: [
        'amul', 'mother dairy', 'nandini', 'heritage', 'nestle',
        'maggi', 'coca cola', 'coke', 'india gate', 'daawat',
        'fortune', 'aashirvaad', 'bb royal', 'bb popular'
    ]
};
