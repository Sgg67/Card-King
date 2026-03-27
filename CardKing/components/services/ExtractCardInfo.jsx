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
      
      // Common OCR mistakes with apostrophes and special characters
      const corrections = [
        { pattern: /TL'D/gi, replacement: "TE'D" },
        { pattern: /TLD/gi, replacement: "TE'D" },
        { pattern: /T L'D/gi, replacement: "TE'D" },
        { pattern: /MANTI/gi, replacement: "MANTE" },
        // Letter confusion (context-dependent)
        { pattern: /\b0\b/g, replacement: "O" },
        { pattern: /\b1\b/g, replacement: "I" },
        // Fix common OCR errors
        { pattern: /([A-Z])'([A-Z])/g, replacement: "$1'$2" }
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
      'BOWMAN', 'LEAF', 'SCORE', 'PACIFIC', 'SKYBOX', 'STADIUM CLUB'
    ];

    for (const mfg of manufacturers) {
      if (normalizedText.includes(mfg)) {
        cardInfo.manufacturer = mfg.charAt(0) + mfg.slice(1).toLowerCase();
        console.log('✅ Manufacturer:', cardInfo.manufacturer);
        break;
      }
    }

    // =============================
    // 3. CARD NUMBER DETECTION (IMPROVED)
    // =============================
    console.log('🔍 Searching for card number...');
    
    // More accurate card number patterns
    const cardNumberPatterns = [
      // Standard format: 123/456
      /\b(\d{1,4}\s*\/\s*\d{1,4})\b/,
      // Single number between 1-500 (typical card numbers)
      /\b([1-9][0-9]{0,2}|[1-4][0-9]{2}|500)\b(?!\s*(?:OF|YEAR|20\d{2}))/,
      // Set prefixes
      /\b(?:#|NO\.?)\s*(\d{1,4})\b/i,
    ];
    
    let bestCardNumber = null;
    let bestCardNumberScore = 0;
    
    for (const line of lines) {
      for (const pattern of cardNumberPatterns) {
        const match = line.match(pattern);
        if (match) {
          let candidate = match[1] || match[0];
          let score = 0;
          
          // Score based on format
          if (candidate.includes('/')) {
            score = 100; // Highest priority for set numbers
          } else {
            const num = parseInt(candidate);
            if (num >= 1 && num <= 500) score = 80;
            else if (num > 500 && num <= 999) score = 60;
            else score = 40;
          }
          
          // Lower score if it's likely a jersey number
          const isJerseyNumber = (
            (line.includes('JERSEY') || line.includes('#')) &&
            !line.includes('/') &&
            parseInt(candidate) >= 1 && parseInt(candidate) <= 99
          );
          
          if (isJerseyNumber) score -= 50;
          
          if (score > bestCardNumberScore) {
            bestCardNumberScore = score;
            bestCardNumber = candidate;
          }
        }
      }
    }
    
    if (bestCardNumber && bestCardNumberScore > 50) {
      cardInfo.cardNumber = bestCardNumber;
      console.log('✅ Card Number:', cardInfo.cardNumber, `(score: ${bestCardNumberScore})`);
    }
    
    // Check for serial numbering (e.g., 23/99)
    if (/\b\d+\s*\/\s*\d+\b/.test(normalizedText)) {
      cardInfo.numbered = true;
      console.log('🔢 Serial numbered card detected');
    }

    // =============================
    // 4. YEAR EXTRACTION
    // =============================
    const CURRENT_YEAR = new Date().getFullYear();
    const VALID_YEAR_MIN = 1900;
    const VALID_YEAR_MAX = CURRENT_YEAR + 1;

    const isValidYear = (yearStr) => {
      const year = parseInt(yearStr);
      return !isNaN(year) && year >= VALID_YEAR_MIN && year <= VALID_YEAR_MAX;
    };

    cardInfo.year = null;
    console.log('🔍 Searching for years in text...');

    // Find copyright years first (most reliable)
    const copyrightPattern = /©\s*(19|20)\d{2}/i;
    const copyrightMatch = normalizedText.match(copyrightPattern);
    if (copyrightMatch) {
      const yearMatch = copyrightMatch[0].match(/\d{4}/);
      if (yearMatch) {
        const year = yearMatch[0];
        if (isValidYear(year)) {
          cardInfo.year = year;
          console.log('✅ Year from copyright:', cardInfo.year);
        }
      }
    }
    
    // If no copyright, look for 4-digit years
    if (!cardInfo.year) {
      const fourDigitYears = [];
      let yearMatch;
      const fourDigitRegex = /\b(19|20)\d{2}\b/g;
      
      while ((yearMatch = fourDigitRegex.exec(normalizedText)) !== null) {
        const year = yearMatch[0];
        if (isValidYear(year) && !fourDigitYears.includes(year)) {
          fourDigitYears.push(year);
        }
      }
      
      if (fourDigitYears.length > 0) {
        // Prefer years that appear near manufacturer name
        let bestYear = null;
        let bestYearScore = 0;
        
        for (const year of fourDigitYears) {
          let score = 100;
          
          // Higher score for older years (more likely to be card years)
          if (parseInt(year) <= CURRENT_YEAR - 20) {
            score += 20;
          }
          
          // Check if year appears near manufacturer
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
    // 5. PLAYER NAME EXTRACTION (ENHANCED)
    // =============================
    
    // First, correct OCR errors in the full text
    const correctedText = correctOCRText(combinedText);
    
    // Comprehensive blacklists
    const teamBlacklist = [
      // NFL
      'CARDINALS', 'FALCONS', 'RAVENS', 'BILLS', 'PANTHERS', 'BEARS', 'BENGALS',
      'BROWNS', 'COWBOYS', 'BRONCOS', 'LIONS', 'PACKERS', 'TEXANS', 'COLTS',
      'JAGUARS', 'CHIEFS', 'RAIDERS', 'CHARGERS', 'RAMS', 'DOLPHINS', 'VIKINGS',
      'PATRIOTS', 'SAINTS', 'GIANTS', 'JETS', 'EAGLES', 'STEELERS', '49ERS',
      'SEAHAWKS', 'BUCCANEERS', 'TITANS', 'COMMANDERS',
      // MLB
      'DIAMONDBACKS', 'BRAVES', 'ORIOLES', 'RED SOX', 'CUBS', 'WHITE SOX',
      'REDS', 'GUARDIANS', 'ROCKIES', 'TIGERS', 'ASTROS', 'ROYALS', 'ANGELS',
      'DODGERS', 'MARLINS', 'BREWERS', 'TWINS', 'METS', 'YANKEES', 'ATHLETICS',
      'PHILLIES', 'PIRATES', 'PADRES', 'GIANTS', 'MARINERS', 'CARDINALS',
      'RAYS', 'RANGERS', 'BLUE JAYS', 'NATIONALS',
      // NBA
      'HAWKS', 'CELTICS', 'NETS', 'HORNETS', 'BULLS', 'CAVALIERS', 'MAVERICKS',
      'NUGGETS', 'PISTONS', 'WARRIORS', 'ROCKETS', 'PACERS', 'CLIPPERS',
      'LAKERS', 'GRIZZLIES', 'HEAT', 'BUCKS', 'TIMBERWOLVES', 'PELICANS',
      'KNICKS', 'THUNDER', 'MAGIC', 'SIXERS', 'SUNS', 'TRAIL BLAZERS',
      'KINGS', 'SPURS', 'RAPTORS', 'JAZZ', 'WIZARDS'
    ];
    
    const nameBlacklist = [
      'BASEBALL', 'FOOTBALL', 'BASKETBALL', 'HOCKEY', 'SPORTS',
      'CARD', 'CARDS', 'TRADING', 'COLLECTORS', 'EDITION',
      'SERIES', 'SET', 'YEAR', 'COPYRIGHT', 'TRADEMARK',
      'OFFICIAL', 'LICENSED', 'PRODUCT', 'MLB', 'NBA', 'NFL', 'NHL',
      'ROOKIE', 'AUTOGRAPH', 'RELICS', 'MEMORABILIA', 'PATCH', 'JERSEY',
      'PRIZM', 'SELECT', 'OPTIC', 'MOSAIC', 'DONRUSS', 'TOPPS', 'PANINI'
    ];
    
    // Collect all potential name candidates
    const nameCandidates = [];
    
    // Strategy: Look for lines that appear to be names
    const textLines = correctedText.split('\n');
    for (let idx = 0; idx < textLines.length; idx++) {
      let line = textLines[idx].trim();
      if (line.length < 3 || line.length > 40) continue;
      if (/\d/.test(line) && !line.includes("'")) continue; // Skip lines with numbers unless they have apostrophes
      
      const upperLine = line.toUpperCase();
      
      // Skip obvious non-names
      if (manufacturers.some(m => upperLine.includes(m))) continue;
      if (teamBlacklist.some(team => upperLine === team || upperLine.includes(team))) continue;
      if (nameBlacklist.some(term => upperLine.includes(term))) continue;
      
      // Check if it looks like a name
      const words = line.split(/\s+/);
      let isNameLike = false;
      
      // All caps name (common in vintage)
      if (line === line.toUpperCase() && words.length <= 3) {
        isNameLike = true;
      }
      // Title case name
      else if (words.every(w => /^[A-Z][a-z]+$/.test(w) || /^[A-Z]'[A-Z][a-z]+$/.test(w))) {
        isNameLike = true;
      }
      // Name with apostrophe (like O'Neal, Te'o)
      else if (words.some(w => /[A-Z]'[A-Z]/.test(w))) {
        isNameLike = true;
      }
      
      if (isNameLike) {
        let score = 0;
        
        // Score based on position in text (names often early)
        if (idx < 10) score += 30;
        
        // Score based on length
        if (words.length === 2) score += 20;
        else if (words.length === 1) score += 10;
        
        // Bonus for apostrophe (likely a real name)
        if (line.includes("'")) score += 25;
        
        nameCandidates.push({ name: line, score, index: idx });
      }
    }
    
    // Sort by score and pick the best
    if (nameCandidates.length > 0) {
      nameCandidates.sort((a, b) => b.score - a.score);
      cardInfo.name = nameCandidates[0].name;
      console.log('✅ Player Name:', cardInfo.name, `(score: ${nameCandidates[0].score})`);
    }
    
    // If still no name, try pattern matching for common name formats
    if (!cardInfo.name) {
      const namePatterns = [
        /([A-Z][a-z]+)\s+([A-Z][a-z]+(?:'[A-Z][a-z]+)?)/, // First Last or First O'Last
        /([A-Z][A-Z\s]{2,20}[A-Z])/, // ALL CAPS name
      ];
      
      for (const pattern of namePatterns) {
        const patternMatch = correctedText.match(pattern);
        if (patternMatch && patternMatch[1]) {
          cardInfo.name = patternMatch[1].trim();
          console.log('✅ Player Name (pattern match):', cardInfo.name);
          break;
        }
      }
    }
    
    // =============================
    // 6. PARALLEL/VARIANT DETECTION (WITH CONTEXT)
    // =============================
    // Only detect parallels if they appear in specific contexts
    const parallelKeywords = [
      'REFRACTOR', 'CHROME', 'PRIZM', 'OPTIC', 'MOSAIC'
    ];
    
    // Colors are only parallels if they appear with card type indicators
    const colorKeywords = ['BLUE', 'RED', 'GREEN', 'PURPLE', 'GOLD', 'SILVER', 'BLACK', 'WHITE'];
    
    let parallelDetected = false;
    
    // Check for explicit parallel keywords first
    for (const keyword of parallelKeywords) {
      if (normalizedText.includes(keyword)) {
        // Verify it's not part of a team name or manufacturer
        if (!teamBlacklist.some(team => team.includes(keyword)) &&
            !manufacturers.some(mfg => mfg.toUpperCase().includes(keyword))) {
          cardInfo.parallel = keyword.charAt(0) + keyword.slice(1).toLowerCase();
          parallelDetected = true;
          console.log('✨ Parallel detected:', cardInfo.parallel);
          break;
        }
      }
    }
    
    // Only detect colors as parallels if they appear with card context
    if (!parallelDetected) {
      for (const color of colorKeywords) {
        if (normalizedText.includes(color)) {
          // Check if color appears near card-related terms
          const colorIndex = normalizedText.indexOf(color);
          const start = Math.max(0, colorIndex - 50);
          const end = Math.min(normalizedText.length, colorIndex + 50);
          const contextWindow = normalizedText.substring(start, end);
          
          const cardContextTerms = ['PRIZM', 'REFRACTOR', 'PARALLEL', 'VARIANT', 'CARD', '#'];
          if (cardContextTerms.some(term => contextWindow.includes(term))) {
            cardInfo.parallel = color.charAt(0) + color.slice(1).toLowerCase();
            console.log('✨ Parallel (color) detected:', cardInfo.parallel, '(with context)');
            break;
          }
        }
      }
    }
    
    // =============================
    // 7. SPECIAL FEATURES DETECTION
    // =============================
    // Only detect if not part of a name
    if (normalizedText.includes('ROOKIE') && !cardInfo.name?.toUpperCase().includes('ROOKIE')) {
      cardInfo.rookie = true;
      console.log('⭐ Rookie card detected');
    }
    
    if ((normalizedText.includes('AUTOGRAPH') || normalizedText.includes('AUTO')) && 
        !cardInfo.name?.toUpperCase().includes('AUTO')) {
      cardInfo.autograph = true;
      console.log('✍️ Autograph detected');
    }
    
    if ((normalizedText.includes('RELICS') || normalizedText.includes('JERSEY') || normalizedText.includes('PATCH')) &&
        !cardInfo.name?.toUpperCase().includes('JERSEY')) {
      cardInfo.relic = true;
      console.log('👕 Relic detected');
    }
    
    // =============================
    // 8. SPORT DETECTION
    // =============================
    const sportKeywords = {
      'Baseball': ['BASEBALL', 'MLB', 'WORLD SERIES'],
      'Football': ['FOOTBALL', 'NFL', 'SUPER BOWL'],
      'Basketball': ['BASKETBALL', 'NBA', 'NCAA'],
      'Hockey': ['HOCKEY', 'NHL', 'STANLEY CUP']
    };
    
    for (const [sport, keywords] of Object.entries(sportKeywords)) {
      if (keywords.some(kw => normalizedText.includes(kw))) {
        cardInfo.sport = sport;
        console.log('🏆 Sport detected:', cardInfo.sport);
        break;
      }
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
    
    // =============================
    // 11. SUMMARY LOG
    // =============================
    console.log('📊 Final Extraction:', {
      name: cardInfo.name || '❌',
      sport: cardInfo.sport || '❌',
      year: cardInfo.year || '❌',
      manufacturer: cardInfo.manufacturer || '❌',
      cardNumber: cardInfo.cardNumber || '❌',
      parallel: cardInfo.parallel || 'None',
      features: {
        rookie: cardInfo.rookie,
        autograph: cardInfo.autograph,
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
  
  // Name detection (most important)
  maxScore += 4;
  if (cardInfo.name) score += 4;
  
  // Manufacturer detection
  maxScore += 2;
  if (cardInfo.manufacturer) score += 2;
  
  // Year detection
  maxScore += 2;
  if (cardInfo.year) score += 2;
  
  // Card number detection
  maxScore += 2;
  if (cardInfo.cardNumber) score += 2;
  
  // Sport detection
  maxScore += 1;
  if (cardInfo.sport) score += 1;
  
  // Web matches bonus
  if (cardInfo.webMatches && cardInfo.webMatches.length > 0) {
    score += 1;
    maxScore += 1;
  }
  
  // Only add feature bonuses if they're likely correct
  const hasValidFeatures = (cardInfo.rookie || cardInfo.autograph || cardInfo.relic || cardInfo.parallel);
  if (hasValidFeatures) {
    // Don't count parallel if it's just a color without context
    const isColorParallel = cardInfo.parallel && 
      ['Blue', 'Red', 'Green', 'Purple', 'Gold', 'Silver', 'Black', 'White'].includes(cardInfo.parallel);
    
    if (!isColorParallel || (cardInfo.parallel && cardInfo.webMatches && cardInfo.webMatches.length > 0)) {
      score += 1;
      maxScore += 1;
    }
  }
  
  const confidence = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return Math.min(confidence, 100);
};