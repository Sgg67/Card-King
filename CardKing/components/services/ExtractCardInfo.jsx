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
    const frontText = visionResults.front?.textAnnotations?.[0]?.description || '';
    const backText = visionResults.back?.textAnnotations?.[0]?.description || '';

    const combinedText = `${frontText}\n${backText}`.replace(/\r/g, '');
    cardInfo.fullText = combinedText;

    console.log('📝 Raw text preview:', combinedText.substring(0, 500) + '...');

    const normalizedText = combinedText.toUpperCase();
    const lines = normalizedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // =============================
    // 1. OCR TEXT CORRECTION
    // =============================
    const correctOCRText = (text) => {
      let corrected = text;
      const corrections = [
        { pattern: /TL'D/gi, replacement: "TE'D" },
        { pattern: /TLD/gi, replacement: "TE'D" },
        { pattern: /T L'D/gi, replacement: "TE'D" },
        { pattern: /MANTI/gi, replacement: "MANTE" },
        { pattern: /\bO\b(?=\s+[A-Z])/g, replacement: "O" },
        { pattern: /([A-Z])'([A-Z])/g, replacement: "$1'$2" },
        { pattern: /LEBR[0O]N/gi, replacement: "LEBRON" },
        { pattern: /SHAQ[UI]LLE/gi, replacement: "SHAQUILLE" },
        { pattern: /J0RDAN/gi, replacement: "JORDAN" },
        { pattern: /JAMES/gi, replacement: "JAMES" },
        { pattern: /BRYANT/gi, replacement: "BRYANT" },
        { pattern: /CURRY/gi, replacement: "CURRY" },
        { pattern: /DURANT/gi, replacement: "DURANT" },
        { pattern: /ANTET0K0UNMP0/gi, replacement: "ANTETOKOUNMPO" },
        { pattern: /D0NCIC/gi, replacement: "DONCIC" },
      ];
      for (const correction of corrections) {
        corrected = corrected.replace(correction.pattern, correction.replacement);
      }
      return corrected;
    };

    // =============================
    // 2. MANUFACTURER DETECTION
    // =============================
    const manufacturers = [
      'TOPPS', 'PANINI', 'UPPER DECK', 'FLEER', 'DONRUSS',
      'BOWMAN', 'LEAF', 'SCORE', 'PACIFIC', 'SKYBOX', 'STADIUM CLUB',
      'SP AUTHENTIC', 'SPX', 'SELECT', 'PRIZM', 'OPTIC', 'MOSAIC',
      'CHRONICLES', 'CONTENDERS', 'IMMACULATE', 'NATIONAL TREASURES',
      'FINEST', 'HERITAGE', 'ARCHIVES', 'ALLEN & GINTER', 'GYPSY QUEEN'
    ];

    for (const mfg of manufacturers) {
      if (normalizedText.includes(mfg)) {
        cardInfo.manufacturer = mfg
          .split(' ')
          .map(w => w.charAt(0) + w.slice(1).toLowerCase())
          .join(' ');
        console.log('✅ Manufacturer:', cardInfo.manufacturer);
        break;
      }
    }

    // =============================
    // 3. SPORT DETECTION
    // =============================
    const sportKeywords = {
      'Baseball': [/\bBASEBALL\b/, /\bMLB\b/, /\bWORLD SERIES\b/, /\bBATTING AVG\b/, /\bERAS?\b/],
      'Football': [/\bFOOTBALL\b/, /\bNFL\b/, /\bSUPER BOWL\b/, /\bTOUCHDOWN\b/, /\bQUARTERBACK\b/, /\bYARDS\b/],
      'Basketball': [/\bBASKETBALL\b/, /\bNBA\b/, /\bPOINTS PER GAME\b/, /\bREBOUNDS\b/, /\bASSISTS\b/],
      'Hockey': [/\bHOCKEY\b/, /\bNHL\b/, /\bSTANLEY CUP\b/, /\bGOALS\b/, /\bASSOCIATION\b/],
    };

    for (const [sport, patterns] of Object.entries(sportKeywords)) {
      if (patterns.some(p => p.test(normalizedText))) {
        cardInfo.sport = sport;
        console.log('🏆 Sport detected:', cardInfo.sport);
        break;
      }
    }

    // =============================
    // 4. CARD NUMBER DETECTION (IMPROVED)
    // =============================
    console.log('🔍 Searching for card number...');

    const NON_CARD_CONTEXTS = [
      'JERSEY', 'YARDS', 'POINTS', 'REBOUNDS', 'GOALS', 'ASSISTS',
      'ERA', 'AVG', 'HEIGHT', 'WEIGHT', 'BORN', 'AGE', 'RBI', 'HR',
      'COPYRIGHT', '©', 'PAGES', 'VOLUME', 'GAMES', 'WINS', 'LOSSES',
      'SAVES', 'STEALS', 'BLOCKS', 'TURNOVERS', 'FIELD GOAL', 'FREE THROW'
    ];

    const isStatLine = (line) =>
      NON_CARD_CONTEXTS.some(ctx => line.toUpperCase().includes(ctx));

    const scoreCardNumberCandidate = (candidate, line, source = 'front') => {
      let score = 0;
      const upper = line.toUpperCase();

      // Immediately disqualify stat lines
      if (isStatLine(line)) return -1;

      const isSerial = /\//.test(candidate);

      if (isSerial) {
        const [num, denom] = candidate.split('/').map(s => parseInt(s.trim()));
        if (isNaN(num) || isNaN(denom)) return -1;
        if (denom > 9999) return -1;        // not a real serial
        score += 60;
        if (denom <= 100) score += 20;      // low print run = more likely real
        if (denom <= 25)  score += 10;
        return score;                        // serial numbers handled separately
      }

      const num = parseInt(candidate);
      if (isNaN(num)) return -1;

      // Explicit markers — highest confidence
      if (/\b(?:#|NO\.?)\s*\d{1,4}\b/i.test(line))  score += 80;
      if (/\bCARD\s+#?\s*\d{1,4}\b/i.test(line))     score += 75;

      // Reasonable card number range
      if (num >= 1   && num <= 300) score += 30;
      else if (num <= 700)          score += 15;
      else if (num <= 999)          score +=  5;
      else                          score -= 30;  // 1000+ rarely a card number

      // Isolation: a line with only one number is a strong signal
      const numbersOnLine = (line.match(/\d+/g) || []);
      if (numbersOnLine.length === 1) score += 25;
      if (numbersOnLine.length >= 4)  score -= 20; // looks like a stat line

      // Position on card — front lines near manufacturer are promising
      if (cardInfo.manufacturer) {
        const mfgIdx = upper.indexOf(cardInfo.manufacturer.toUpperCase());
        const numIdx = upper.search(/\d/);
        if (mfgIdx !== -1 && numIdx !== -1 && Math.abs(mfgIdx - numIdx) < 60) {
          score += 20;
        }
      }

      // Back of card gets a small boost — card number is commonly printed there
      if (source === 'back') score += 10;

      // Year-shaped numbers are almost never card numbers
      if (num >= 1869 && num <= new Date().getFullYear() + 1) score -= 25;

      return score;
    };

    let bestCardNumber = null;
    let bestCardNumberScore = 0;

    const EXPLICIT_PATTERNS = [
      /\b(?:#|NO\.?)\s*(\d{1,4})\b/i,
      /\bCARD\s+#?\s*(\d{1,4})\b/i,
      /\b(\d{1,4})\s*\/\s*(\d{1,4})\b/,   // serial
    ];

    const FALLBACK_PATTERN = /\b(\d{1,4})\b/;

    const evaluateLine = (line, source) => {
      // Try explicit patterns first
      for (const pattern of EXPLICIT_PATTERNS) {
        const match = line.match(pattern);
        if (!match) continue;
        const candidate = match[0]; // full match including slash for serials
        const score = scoreCardNumberCandidate(candidate, line, source);
        if (score > bestCardNumberScore) {
          bestCardNumberScore = score;
          // For serial numbers keep the full X/Y string; else just the digits
          bestCardNumber = /\//.test(candidate)
            ? candidate.replace(/\s/g, '')
            : match[1];
        }
      }

      // Fallback: any isolated number on a clean line
      const fallback = line.match(FALLBACK_PATTERN);
      if (fallback) {
        const score = scoreCardNumberCandidate(fallback[1], line, source);
        if (score > bestCardNumberScore) {
          bestCardNumberScore = score;
          bestCardNumber = fallback[1];
        }
      }
    };

    // Search front lines (first 20 lines carry most structured data)
    const frontLines = (visionResults.front?.textAnnotations?.[0]?.description || '')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .slice(0, 20);

    for (const line of frontLines) evaluateLine(line, 'front');

    // Search ALL back lines — card number is often printed there
    const backLines = (visionResults.back?.textAnnotations?.[0]?.description || '')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    for (const line of backLines) evaluateLine(line, 'back');

    // Lower threshold: 40 catches real cards that lack explicit markers
    if (bestCardNumber && bestCardNumberScore >= 40) {
      // Separate serial numbers from card numbers
      if (bestCardNumber.includes('/')) {
        const [serialPart, denomPart] = bestCardNumber.split('/');
        cardInfo.numbered = true;
        console.log('🔢 Serial numbered card:', bestCardNumber);
        // Don't overwrite a card number already found via explicit pattern
        if (!cardInfo.cardNumber) {
          cardInfo.cardNumber = serialPart;
        }
      } else {
        cardInfo.cardNumber = bestCardNumber;
        console.log('✅ Card Number:', cardInfo.cardNumber, `(score: ${bestCardNumberScore})`);
      }
    } else {
      console.log('⚠️ No card number found (best score:', bestCardNumberScore, bestCardNumber, ')');
    }

    // Serial numbering — independent sweep so it never clobbers the card number
    const serialSweep = normalizedText.match(/\b(\d{1,4})\s*\/\s*(\d{1,4})\b/);
    if (serialSweep) {
      const denom = parseInt(serialSweep[2]);
      if (denom <= 9999) {
        cardInfo.numbered = true;
        console.log('🔢 Serial numbered card detected:', `${serialSweep[1]}/${denom}`);
      }
    }

    // =============================
    // 5. YEAR EXTRACTION
    // =============================
    const CURRENT_YEAR = new Date().getFullYear();
    const VALID_YEAR_MIN = 1869;
    const VALID_YEAR_MAX = CURRENT_YEAR + 1;

    const isValidYear = (yearStr) => {
      const year = parseInt(yearStr);
      return !isNaN(year) && year >= VALID_YEAR_MIN && year <= VALID_YEAR_MAX;
    };

    cardInfo.year = null;
    console.log('🔍 Searching for years in text...');

    const copyrightMatch = normalizedText.match(/©\s*((?:19|20)\d{2})/i);
    if (copyrightMatch && isValidYear(copyrightMatch[1])) {
      cardInfo.year = copyrightMatch[1];
      console.log('✅ Year from copyright:', cardInfo.year);
    }

    if (!cardInfo.year) {
      const seasonMatch = normalizedText.match(/\b((?:19|20)\d{2})-\d{2}\b/);
      if (seasonMatch && isValidYear(seasonMatch[1])) {
        cardInfo.year = seasonMatch[1];
        console.log('✅ Year from season format:', cardInfo.year);
      }
    }

    if (!cardInfo.year) {
      const fourDigitYears = [];
      const fourDigitRegex = /\b((?:19|20)\d{2})\b/g;
      let yearMatch;
      while ((yearMatch = fourDigitRegex.exec(normalizedText)) !== null) {
        const year = yearMatch[1];
        if (isValidYear(year) && !fourDigitYears.includes(year)) {
          fourDigitYears.push(year);
        }
      }

      if (fourDigitYears.length > 0) {
        let bestYear = null;
        let bestYearScore = 0;

        for (const year of fourDigitYears) {
          let score = 100;
          const yr = parseInt(year);

          if (yr >= 1980 && yr <= CURRENT_YEAR) score += 20;

          if (cardInfo.manufacturer) {
            const mfgIndex = normalizedText.indexOf(cardInfo.manufacturer.toUpperCase());
            const yearIndex = normalizedText.indexOf(year);
            if (mfgIndex !== -1 && yearIndex !== -1 && Math.abs(mfgIndex - yearIndex) < 200) {
              score += 30;
            }
          }

          if (score > bestYearScore) {
            bestYearScore = score;
            bestYear = year;
          }
        }
        if (bestYear) {
          cardInfo.year = bestYear;
          console.log('✅ Year from 4-digit:', cardInfo.year);
        }
      }
    }

    // =============================
    // 6. ENHANCED PLAYER NAME EXTRACTION
    // =============================
    const correctedText = correctOCRText(combinedText);

    const teamBlacklist = [
      'CARDINALS', 'FALCONS', 'RAVENS', 'BILLS', 'PANTHERS', 'BEARS', 'BENGALS',
      'BROWNS', 'COWBOYS', 'BRONCOS', 'LIONS', 'PACKERS', 'TEXANS', 'COLTS',
      'JAGUARS', 'CHIEFS', 'RAIDERS', 'CHARGERS', 'RAMS', 'DOLPHINS', 'VIKINGS',
      'PATRIOTS', 'SAINTS', 'GIANTS', 'JETS', 'EAGLES', 'STEELERS', '49ERS',
      'SEAHAWKS', 'BUCCANEERS', 'TITANS', 'COMMANDERS',
      'DIAMONDBACKS', 'BRAVES', 'ORIOLES', 'RED SOX', 'CUBS', 'WHITE SOX',
      'REDS', 'GUARDIANS', 'ROCKIES', 'TIGERS', 'ASTROS', 'ROYALS', 'ANGELS',
      'DODGERS', 'MARLINS', 'BREWERS', 'TWINS', 'METS', 'YANKEES', 'ATHLETICS',
      'PHILLIES', 'PIRATES', 'PADRES', 'MARINERS', 'RAYS', 'RANGERS',
      'BLUE JAYS', 'NATIONALS',
      'HAWKS', 'CELTICS', 'NETS', 'HORNETS', 'BULLS', 'CAVALIERS', 'MAVERICKS',
      'NUGGETS', 'PISTONS', 'WARRIORS', 'ROCKETS', 'PACERS', 'CLIPPERS',
      'LAKERS', 'GRIZZLIES', 'HEAT', 'BUCKS', 'TIMBERWOLVES', 'PELICANS',
      'KNICKS', 'THUNDER', 'MAGIC', 'SIXERS', 'SUNS', 'TRAIL BLAZERS',
      'KINGS', 'SPURS', 'RAPTORS', 'JAZZ', 'WIZARDS',
      'BRUINS', 'SABRES', 'FLAMES', 'BLACKHAWKS', 'AVALANCHE', 'BLUE JACKETS',
      'STARS', 'RED WINGS', 'OILERS', 'PANTHERS', 'KINGS', 'PREDATORS',
      'CANADIENS', 'SENATORS', 'FLYERS', 'PENGUINS', 'SHARKS', 'BLUES',
      'LIGHTNING', 'MAPLE LEAFS', 'CANUCKS', 'GOLDEN KNIGHTS', 'CAPITALS',
      'JETS', 'COYOTES', 'DUCKS', 'HURRICANES', 'ISLANDERS', 'RANGERS',
      'DEVILS', 'WILD',
    ];

    const nameBlacklist = [
      'BASEBALL', 'FOOTBALL', 'BASKETBALL', 'HOCKEY', 'SPORTS',
      'CARD', 'CARDS', 'TRADING', 'COLLECTORS', 'EDITION',
      'SERIES', 'SET', 'YEAR', 'COPYRIGHT', 'TRADEMARK',
      'OFFICIAL', 'LICENSED', 'PRODUCT', 'MLB', 'NBA', 'NFL', 'NHL',
      'PRIZM', 'SELECT', 'OPTIC', 'MOSAIC', 'DONRUSS', 'TOPPS', 'PANINI',
      'BOWMAN', 'UPPER DECK', 'FLEER', 'SCORE', 'CHROME', 'REFRACTOR',
      'RATED', 'CERTIFIED', 'COLLECTION', 'AUTOGRAPH', 'ROOKIE',
    ];

    const nameCandidates = [];
    const textLines = correctedText.split('\n');

    for (let idx = 0; idx < Math.min(textLines.length, 15); idx++) {
      let line = textLines[idx].trim();
      if (line.length < 3 || line.length > 40) continue;

      const upperLine = line.toUpperCase();

      if (manufacturers.some(m => upperLine.includes(m))) continue;
      if (teamBlacklist.some(team => upperLine === team || upperLine === `THE ${team}`)) continue;
      if (nameBlacklist.some(term => upperLine === term)) continue;
      if (nameBlacklist.some(term => new RegExp(`\\b${term}\\b`).test(upperLine))) continue;

      const words = line.split(/\s+/);

      if (words.length === 2) {
        const word1Valid = /^[A-Z][a-z]{2,}$/.test(words[0]) || /^[A-Z]{2,}$/.test(words[0]);
        const word2Valid = /^[A-Z][a-z]{2,}$/.test(words[1]) || /^[A-Z]{2,}$/.test(words[1]);

        if (word1Valid && word2Valid) {
          let score = 100;
          if (idx < 3) score += 50;
          else if (idx < 7) score += 30;
          else if (idx < 12) score += 15;

          if (/^[A-Z][a-z]/.test(words[0]) && /^[A-Z][a-z]/.test(words[1])) {
            score += 25;
          }

          nameCandidates.push({ name: line, score, index: idx });
        }
      }
      else if (words.length === 3) {
        const suffixWords = ['JR', 'JR.', 'SR', 'SR.', 'II', 'III', 'IV'];
        if (suffixWords.includes(words[2].toUpperCase())) {
          const word1Valid = /^[A-Z][a-z]{2,}$/.test(words[0]) || /^[A-Z]{2,}$/.test(words[0]);
          const word2Valid = /^[A-Z][a-z]{2,}$/.test(words[1]) || /^[A-Z]{2,}$/.test(words[1]);

          if (word1Valid && word2Valid) {
            let score = 80;
            if (idx < 3) score += 50;
            else if (idx < 7) score += 30;

            nameCandidates.push({ name: line, score, index: idx });
          }
        }
      }
    }

    if (nameCandidates.length > 0) {
      nameCandidates.sort((a, b) => b.score - a.score);
      cardInfo.name = nameCandidates[0].name;
      console.log('✅ Player Name:', cardInfo.name, `(score: ${nameCandidates[0].score})`);
    }

    // =============================
    // 7. PARALLEL / VARIANT DETECTION
    // =============================
    const parallelKeywords = [
      'REFRACTOR', 'CHROME', 'PRIZM', 'OPTIC', 'MOSAIC',
      'SHIMMER', 'WAVE', 'HYPER', 'PULSAR', 'DISCO', 'CRACKED ICE',
      'ATOMIC', 'XFRACTOR', 'SUPERFRACTOR', 'GOLD VINYL', 'PRINTING PLATE',
    ];

    const colorKeywords = ['BLUE', 'RED', 'GREEN', 'PURPLE', 'GOLD', 'SILVER',
      'BLACK', 'WHITE', 'ORANGE', 'PINK', 'TEAL', 'AQUA', 'YELLOW'];

    let parallelDetected = false;

    for (const keyword of parallelKeywords) {
      if (normalizedText.includes(keyword)) {
        if (!teamBlacklist.some(team => team.includes(keyword)) &&
            !manufacturers.some(mfg => mfg.toUpperCase() === keyword)) {
          cardInfo.parallel = keyword
            .split(' ')
            .map(w => w.charAt(0) + w.slice(1).toLowerCase())
            .join(' ');
          parallelDetected = true;
          console.log('✨ Parallel detected:', cardInfo.parallel);
          break;
        }
      }
    }

    if (!parallelDetected) {
      for (const color of colorKeywords) {
        if (normalizedText.includes(color)) {
          const colorIndex = normalizedText.indexOf(color);
          const start = Math.max(0, colorIndex - 60);
          const end = Math.min(normalizedText.length, colorIndex + 60);
          const contextWindow = normalizedText.substring(start, end);

          const cardContextTerms = ['PRIZM', 'REFRACTOR', 'PARALLEL', 'VARIANT', 'WAVE',
            'SHIMMER', 'PULSAR', '/'];
          if (cardContextTerms.some(term => contextWindow.includes(term))) {
            cardInfo.parallel = color.charAt(0) + color.slice(1).toLowerCase();
            console.log('✨ Color parallel detected:', cardInfo.parallel);
            break;
          }
        }
      }
    }

    // =============================
    // 8. RELIC DETECTION
    // =============================
    if (/\b(RELIC|MEMORABILIA|JERSEY|PATCH|SWATCH)\b/.test(normalizedText) &&
        !cardInfo.name?.toUpperCase().includes('JERSEY')) {
      cardInfo.relic = true;
      console.log('👕 Relic detected');
    }

    // =============================
    // 9. WEB MATCHES FROM VISION RESULTS
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
    // 10. CONFIDENCE CALCULATION
    // =============================
    cardInfo.confidence = calculateConfidence(cardInfo);

    console.log('📊 Final Extraction:', {
      name: cardInfo.name || '❌',
      sport: cardInfo.sport || '❌',
      year: cardInfo.year || '❌',
      manufacturer: cardInfo.manufacturer || '❌',
      cardNumber: cardInfo.cardNumber || '❌',
      parallel: cardInfo.parallel || 'None',
      features: {
        relic: cardInfo.relic,
        numbered: cardInfo.numbered
      },
      confidence: `${cardInfo.confidence}%`
    });

    return cardInfo;
  } catch (error) {
    console.error('❌ Extraction Error:', error);
    return cardInfo;
  }
};

const calculateConfidence = (cardInfo) => {
  let score = 0;
  let maxScore = 0;

  maxScore += 4;
  if (cardInfo.name) score += 4;

  maxScore += 2;
  if (cardInfo.manufacturer) score += 2;

  maxScore += 2;
  if (cardInfo.year) score += 2;

  maxScore += 2;
  if (cardInfo.cardNumber) score += 2;

  maxScore += 1;
  if (cardInfo.sport) score += 1;

  if (cardInfo.webMatches?.length > 0) {
    score += 1;
    maxScore += 1;
  }

  const hasValidFeatures = cardInfo.relic || cardInfo.parallel;
  if (hasValidFeatures) {
    const isColorParallel = cardInfo.parallel &&
      ['Blue', 'Red', 'Green', 'Purple', 'Gold', 'Silver', 'Black', 'White',
       'Orange', 'Pink', 'Teal', 'Aqua', 'Yellow'].includes(cardInfo.parallel);
    if (!isColorParallel || cardInfo.webMatches?.length > 0) {
      score += 1;
      maxScore += 1;
    }
  }

  return maxScore > 0 ? Math.min(Math.round((score / maxScore) * 100), 100) : 0;
};