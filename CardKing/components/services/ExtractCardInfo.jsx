// services/ExtractCardInfo.js

export const extractCardInfo = (visionResults) => {
  const cardInfo = {
    name: null,
    set: null,
    cardNumber: null,
    year: null,
    manufacturer: null,
    sport: null,
    grade: null,
    parallel: null,
    rookie: false,      
    autograph: false,  
    relic: false,
    numbered: false,
    fullText: '',
    confidence: 0,
    possibleMatches: [],
    webMatches: [],
    logos: [],
    dominantColors: []
  };

  try {
    const frontText =
      visionResults.front?.textAnnotations?.[0]?.description || '';
    const backText =
      visionResults.back?.textAnnotations?.[0]?.description || '';

    const combinedText = `${frontText}\n${backText}`.replace(/\r/g, '');
    cardInfo.fullText = combinedText;

    console.log(
      '📝 Raw text preview:',
      combinedText.substring(0, 200) + '...'
    );

    const normalizedText = combinedText.toUpperCase();
    const lines = normalizedText.split('\n').map(l => l.trim());

    // =============================
    // 2. MANUFACTURER
    // =============================
    const manufacturers = [
      'TOPPS',
      'PANINI',
      'UPPER DECK',
      'FLEER',
      'DONRUSS',
      'BOWMAN',
      'LEAF'
    ];

    for (const mfg of manufacturers) {
      if (normalizedText.includes(mfg)) {
        cardInfo.manufacturer =
          mfg.charAt(0) + mfg.slice(1).toLowerCase();
        console.log('✅ Manufacturer:', cardInfo.manufacturer);
        break;
      }
    }

    // =============================
    // 3. CARD NUMBER (STRICT LINE MATCH)
    // =============================
    for (const line of lines) {
      if (/^\d{1,4}$/.test(line)) {
        const num = parseInt(line);

        if (num >= 50 && num <= 1000) {
          cardInfo.cardNumber = line;
          console.log('✅ Card Number:', cardInfo.cardNumber);
          break;
        }
      }
    }

    // Serial numbering detection (e.g. 23/99)
    if (/\b\d+\s*\/\s*\d+\b/.test(normalizedText)) {
      cardInfo.numbered = true;
    }

 // =============================
// 4. YEAR EXTRACTION - SIMPLIFIED & RELIABLE
// =============================

// First, define valid year range for trading cards
const CURRENT_YEAR = new Date().getFullYear();
const VALID_YEAR_MIN = 1900;
const VALID_YEAR_MAX = CURRENT_YEAR + 1;

// Helper function to validate a potential year
const isValidYear = (yearStr) => {
  const year = parseInt(yearStr);
  return !isNaN(year) && year >= VALID_YEAR_MIN && year <= VALID_YEAR_MAX;
};

// Clear any previously set year
cardInfo.year = null;

// Log all potential 4-digit years for debugging
console.log('🔍 Searching for years in text...');

// FIRST PRIORITY: Look for explicit 4-digit years (most reliable)
const fourDigitYears = [];
let match;
const fourDigitRegex = /\b(19|20)\d{2}\b/g;

while ((match = fourDigitRegex.exec(normalizedText)) !== null) {
  const year = match[0];
  if (isValidYear(year) && !fourDigitYears.includes(year)) {
    fourDigitYears.push(year);
    console.log(`📅 Found 4-digit year: ${year} at position ${match.index}`);
  }
}

if (fourDigitYears.length > 0) {
  // If we found a 4-digit year, use it
  // For modern cards (after 2000), prefer 20xx years
  const modernYears = fourDigitYears.filter(y => y.startsWith('20'));
  const classicYears = fourDigitYears.filter(y => y.startsWith('19'));
  
  if (modernYears.length > 0) {
    // Sort modern years and take the most recent
    modernYears.sort((a, b) => parseInt(b) - parseInt(a));
    cardInfo.year = modernYears[0];
    console.log('✅ Using modern 4-digit year:', cardInfo.year);
  } else if (classicYears.length > 0) {
    // Sort classic years and take the most recent
    classicYears.sort((a, b) => parseInt(b) - parseInt(a));
    cardInfo.year = classicYears[0];
    console.log('✅ Using classic 4-digit year:', cardInfo.year);
  }
}

// SECOND PRIORITY: Look for patterns with & symbol (if no 4-digit year found)
if (!cardInfo.year) {
  console.log('🔍 No 4-digit year found, checking & patterns...');
  
  // Look for patterns like "&14" or "& '14"
  const andPatterns = [
    /&\s*'?(\d{2})\b/i,  // &14 or & '14
    /'?(\d{2})\s*&/i,    // 14& or '14&
    /©\s*'?(\d{2})\b/i,  // ©14 or © '14
    /'?(\d{2})\s*©/i,    // 14© or '14©
  ];
  
  for (const pattern of andPatterns) {
    const andMatch = normalizedText.match(pattern);
    if (andMatch) {
      const twoDigit = andMatch[1];
      console.log(`📅 Found & pattern with 2-digit year: ${twoDigit}`);
      
      // Try 20xx first (most likely for modern cards)
      const possibleYear20 = `20${twoDigit}`;
      if (isValidYear(possibleYear20)) {
        cardInfo.year = possibleYear20;
        console.log('✅ Converted to 20xx year:', cardInfo.year);
        break;
      }
      
      // Then try 19xx as fallback
      const possibleYear19 = `19${twoDigit}`;
      if (isValidYear(possibleYear19)) {
        cardInfo.year = possibleYear19;
        console.log('✅ Converted to 19xx year:', cardInfo.year);
        break;
      }
    }
  }
}

// THIRD PRIORITY: Look for years near manufacturer names
if (!cardInfo.year && cardInfo.manufacturer) {
  console.log('🔍 Checking near manufacturer...');
  const mfgIndex = normalizedText.indexOf(cardInfo.manufacturer.toUpperCase());
  
  if (mfgIndex !== -1) {
    // Look 100 chars before and after manufacturer
    const start = Math.max(0, mfgIndex - 100);
    const end = Math.min(normalizedText.length, mfgIndex + 100);
    const context = normalizedText.substring(start, end);
    
    const nearYears = [];
    const nearRegex = /\b(19|20)\d{2}\b/g;
    
    while ((match = nearRegex.exec(context)) !== null) {
      if (isValidYear(match[0])) {
        nearYears.push(match[0]);
      }
    }
    
    if (nearYears.length > 0) {
      nearYears.sort((a, b) => parseInt(b) - parseInt(a));
      cardInfo.year = nearYears[0];
      console.log('✅ Year found near manufacturer:', cardInfo.year);
    }
  }
}

// FOURTH PRIORITY: Look at the bottom of the text (copyright info)
if (!cardInfo.year) {
  console.log('🔍 Checking bottom of text for copyright...');
  const bottomLines = lines.slice(-5).join(' ');
  
  const copyrightPatterns = [
    /©\s*(\d{4})/i,
    /copyright\s*(\d{4})/i,
    /(\d{4})\s*©/i,
  ];
  
  for (const pattern of copyrightPatterns) {
    const copyMatch = bottomLines.match(pattern);
    if (copyMatch) {
      const year = copyMatch[1];
      if (isValidYear(year)) {
        cardInfo.year = year;
        console.log('✅ Year found in copyright:', cardInfo.year);
        break;
      }
    }
  }
}

// FINAL CHECK: If we have a year, log it; otherwise note it's missing
if (cardInfo.year) {
  console.log('✅ Final year extracted:', cardInfo.year);
} else {
  console.log('❌ No year could be extracted');
}

    // =============================
    // 5. PLAYER NAME
    // =============================
    const nameBlacklist = [
      'ARIZONA', 'YANKEES', 'DODGERS', 'CUBS', 'DIAMONDBACKS',
      'BASEBALL', 'FOOTBALL', 'BASKETBALL', 'CARDINALS', 'REDS',
      'PHILLIES', 'METS', 'GIANTS', 'PADRES', 'ROCKIES',
      'CARD', 'CARDS', 'TRADING', 'COLLECTORS', 'EDITION',
      'SERIES', 'SET', 'YEAR', 'COPYRIGHT', 'TRADEMARK',
      'FRONT', 'BACK', 'TOP', 'BOTTOM', 'SIDE', 'HOLOGRAM',
      'OFFICIAL', 'LICENSED', 'PRODUCT', 'MLB', 'NBA', 'NFL', 'NHL'
    ];

    for (const rawLine of combinedText.split('\n')) {
      const line = rawLine.trim();
      const upperLine = line.toUpperCase();

      // Skip lines that are too short or too long
      if (line.length < 5 || line.length > 35) continue;
      
      // Skip lines containing manufacturer names
      if (manufacturers.some(m => upperLine.includes(m))) continue;
      
      // Skip lines containing blacklisted terms
      if (nameBlacklist.some(term => upperLine.includes(term))) continue;
      
      // Skip lines with numbers
      if (/\d/.test(line)) continue;

      const words = line.split(/\s+/);

      // Player names are typically 2-3 words
      if (words.length >= 2 && words.length <= 4) {
        // Check if it's likely a name (all caps or proper case)
        const isAllCaps = words.every(w => /^[A-Z]+$/.test(w));
        const isProperCase = words.every(w => /^[A-Z][a-z]+$/.test(w));
        const isFirstNameLast = words.length === 2 && 
                                /^[A-Z][a-z]+$/.test(words[0]) && 
                                /^[A-Z][a-z]+$/.test(words[1]);

        if (isAllCaps || isProperCase || isFirstNameLast) {
          cardInfo.name = line.trim();
          console.log('✅ Player Name:', cardInfo.name);
          break;
        }
      }
    }

    // =============================
    // 6. WEB MATCHES FROM VISION RESULTS
    // =============================
    if (visionResults.front?.webDetection?.pagesWithMatchingImages) {
      cardInfo.webMatches = visionResults.front.webDetection.pagesWithMatchingImages;
    }
    if (visionResults.back?.webDetection?.pagesWithMatchingImages) {
      cardInfo.webMatches = [
        ...(cardInfo.webMatches || []),
        ...visionResults.back.webDetection.pagesWithMatchingImages
      ];
    }

    // =============================
    // 7. SUMMARY LOG
    // =============================
    console.log('📊 Final Extraction:', {
      name: cardInfo.name || '❌',
      year: cardInfo.year || '❌',
      manufacturer: cardInfo.manufacturer || '❌',
      cardNumber: cardInfo.cardNumber || '❌',
      numbered: cardInfo.numbered ? 'Yes' : 'No',
      relic: cardInfo.relic ? 'Yes' : 'No'
    });

    // =============================
    // 8. CONFIDENCE
    // =============================
    cardInfo.confidence = calculateConfidence(cardInfo);

    return cardInfo;
  } catch (error) {
    console.error('❌ Extraction Error:', error);
    return cardInfo;
  }
};

const calculateConfidence = (cardInfo) => {
  let score = 0;
  let maxScore = 0;

  // Name detection (most important)
  maxScore += 3;
  if (cardInfo.name) score += 3;

  // Manufacturer detection
  maxScore += 2;
  if (cardInfo.manufacturer) score += 2;

  // Year detection
  maxScore += 2;
  if (cardInfo.year) score += 2;

  // Card number detection
  maxScore += 2;
  if (cardInfo.cardNumber) score += 2;

  // Web matches bonus (helps confirm the card)
  if (cardInfo.webMatches && cardInfo.webMatches.length > 0) {
    score += 1;
    maxScore += 1;
  }

  return maxScore > 0
    ? Math.round((score / maxScore) * 100)
    : 0;
};