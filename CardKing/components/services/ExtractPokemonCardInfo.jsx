// services/ExtractCardInfo.js

export const extractPokemonCardInfo = (visionResults) => {
    const cardInfo = {
        name: null,
        set: null,
        cardNumber: null,
        year: null,
        fullText: '',
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
        // 2. CARD NAME EXTRACTION
        // =============================
        const nameBlacklist = [
            'POKEMON', 'ENERGY', 'TRAINER', 'STADIUM', 'SUPPORTER',
            'ITEM', 'TOOL', 'BASIC', 'STAGE 1', 'STAGE 2', 'LEVEL-UP',
            'LEGEND', 'SP', 'EX', 'GX', 'VMAX', 'VSTAR', 'V-UNION',
            'BREAK', 'PRISM', 'TAG TEAM', 'RADIANT', 'HYPER',
            'HOLO', 'REVERSE', 'FOIL', 'COPYRIGHT', 'NINTENDO',
            'CREATURES', 'GAME FREAK', 'WOTC', 'WIZARDS OF THE COAST',
            'ILLUSTRATOR', 'REGULATION', 'DEX', 'HP', 'WEAKNESS',
            'RESISTANCE', 'RETREAT', 'ABILITY', 'POKEMON POWER',
            'BODY', 'POKE-BODY', 'POKE-POWER', 'BERRY'
        ];

        // Look for Pokémon card name (typically the largest text on front)
        for (const rawLine of frontText.split('\n')) {
            const line = rawLine.trim();
            const upperLine = line.toUpperCase();

            // Skip lines that are too short or too long
            if (line.length < 3 || line.length > 30) continue;

            // Skip lines containing blacklisted terms
            if (nameBlacklist.some(term => upperLine.includes(term))) continue;

            // Skip lines with HP (Hit Points) indicator
            if (upperLine.includes('HP') && /\d/.test(line)) continue;

            // Skip lines with card numbers (like 25/100)
            if (line.match(/\d+\s*\/\s*\d+/)) continue;

            // Pokémon names are typically 1-3 words
            const words = line.split(/\s+/);
            if (words.length >= 1 && words.length <= 3) {
                // Check if it's likely a name (mostly letters)
                const letterCount = line.replace(/[^a-zA-Z]/g, '').length;
                const symbolCount = line.replace(/[a-zA-Z0-9\s]/g, '').length;
                
                if (letterCount > 3 && symbolCount < 3) {
                    cardInfo.name = line.trim();
                    console.log('✅ Pokémon Name:', cardInfo.name);
                    break;
                }
            }
        }

        // =============================
        // 3. CARD NUMBER EXTRACTION
        // =============================
        console.log('🔍 Searching for card number...');
        
        // Pattern for Pokémon card numbers (e.g., 25/182, 001/012, 151/151, SWSH001, SM35)
        const cardNumberPatterns = [
            // Standard set numbers like 25/182, 001/012
            /\b(\d{1,3}\s*\/\s*\d{1,3})\b/,
            /\b(\d{1,4}\/\d{1,4})\b/,
            // Special set prefixes like SWSH001, SM35, XY001
            /\b(SWSH\d{1,3})\b/i,
            /\b(SM\d{1,3})\b/i,
            /\b(XY\d{1,3})\b/i,
            /\b(BW\d{1,3})\b/i,
            /\b(DP\d{1,3})\b/i,
            /\b(SSH\d{1,3})\b/i,
            /\b(RCL\d{1,3})\b/i,
            /\b(DAA\d{1,3})\b/i,
            /\b(VIV\d{1,3})\b/i,
            /\b(EVO\d{1,3})\b/i,
            // Just the card number part if it's the only number on the line
        ];

        for (const pattern of cardNumberPatterns) {
            const match = normalizedText.match(pattern);
            if (match) {
                cardInfo.cardNumber = match[1] || match[0];
                console.log('✅ Card Number:', cardInfo.cardNumber);
                break;
            }
        }

        // If no pattern matched, look for isolated number patterns
        if (!cardInfo.cardNumber) {
            const possibleNumberLines = lines.filter(line => {
                return line.match(/^\d{1,3}$/) || // Just a number like 25
                       line.match(/^\d{1,3}\/\d{1,3}$/); // Like 25/182
            });
            
            if (possibleNumberLines.length > 0) {
                cardInfo.cardNumber = possibleNumberLines[0];
                console.log('✅ Card Number (simple):', cardInfo.cardNumber);
            }
        }

        // =============================
        // 4. SET IDENTIFICATION
        // =============================
        console.log('🔍 Identifying set...');
        
        const pokemonSets = {
            'BASE SET': ['BASE', 'BASE SET', 'BASE SET 1'],
            'JUNGLE': ['JUNGLE'],
            'FOSSIL': ['FOSSIL'],
            'TEAM ROCKET': ['TEAM ROCKET', 'ROCKET'],
            'GYM HEROES': ['GYM HEROES'],
            'GYM CHALLENGE': ['GYM CHALLENGE'],
            'NEO GENESIS': ['NEO GENESIS'],
            'NEO DISCOVERY': ['NEO DISCOVERY'],
            'NEO REVELATION': ['NEO REVELATION'],
            'NEO DESTINY': ['NEO DESTINY'],
            'SWORD & SHIELD': ['SWORD & SHIELD', 'SSH', 'SWSH'],
            'REBEL CLASH': ['REBEL CLASH', 'RCL'],
            'DARKNESS ABLAZE': ['DARKNESS ABLAZE', 'DAA'],
            'VIVID VOLTAGE': ['VIVID VOLTAGE', 'VIV'],
            'BATTLE STYLES': ['BATTLE STYLES', 'BST'],
            'CHILLING REIGN': ['CHILLING REIGN', 'CRE'],
            'EVOLVING SKIES': ['EVOLVING SKIES', 'EVS'],
            'FUSION STRIKE': ['FUSION STRIKE', 'FST'],
            'BRILLIANT STARS': ['BRILLIANT STARS', 'BRS'],
            'ASTRAL RADIANCE': ['ASTRAL RADIANCE', 'ASR'],
            'LOST ORIGIN': ['LOST ORIGIN', 'LOR'],
            'SILVER TEMPEST': ['SILVER TEMPEST', 'SIT'],
            'CROWN ZENITH': ['CROWN ZENITH', 'CRZ'],
            'PALDEA EVOLVED': ['PALDEA EVOLVED', 'PAL'],
            'OBSIDIAN FLAMES': ['OBSIDIAN FLAMES', 'OBF'],
            '151': ['151', 'MEWTWO', 'MEW']
        };

        for (const [setName, keywords] of Object.entries(pokemonSets)) {
            if (keywords.some(keyword => normalizedText.includes(keyword))) {
                cardInfo.set = setName;
                console.log('✅ Set:', cardInfo.set);
                break;
            }
        }

        // =============================
        // 5. YEAR EXTRACTION
        // =============================
        const CURRENT_YEAR = new Date().getFullYear();
        const VALID_YEAR_MIN = 1995; // Pokémon cards started in 1996, but copyright 1995
        const VALID_YEAR_MAX = CURRENT_YEAR + 1;

        const isValidYear = (yearStr) => {
            const year = parseInt(yearStr);
            return !isNaN(year) && year >= VALID_YEAR_MIN && year <= VALID_YEAR_MAX;
        };

        console.log('🔍 Searching for years in text...');

        // Look for copyright years (most reliable for Pokémon)
        const copyrightPatterns = [
            /©\s*(\d{4})\s*pokémon/i,
            /©\s*(\d{4})\s*[-–]\s*(\d{4})\s*pokémon/i, // Range like 1995-2023
            /©\s*(\d{4})/i,
            /pokémon\s*©\s*(\d{4})/i,
            /(\d{4})\s*pokémon/i,
            /(\d{4})\s*creatures/i,
            /(\d{4})\s*nintendo/i
        ];

        for (const pattern of copyrightPatterns) {
            const match = normalizedText.match(pattern);
            if (match) {
                // If it's a range, take the later year
                if (match[2]) {
                    const year = match[2];
                    if (isValidYear(year)) {
                        cardInfo.year = year;
                        console.log('✅ Year from range:', cardInfo.year);
                        break;
                    }
                } else {
                    const year = match[1];
                    if (isValidYear(year)) {
                        cardInfo.year = year;
                        console.log('✅ Year from copyright:', cardInfo.year);
                        break;
                    }
                }
            }
        }

        // If no copyright year, look for 4-digit years
        if (!cardInfo.year) {
            const fourDigitYears = [];
            let match;
            const fourDigitRegex = /\b(19|20)\d{2}\b/g;

            while ((match = fourDigitRegex.exec(normalizedText)) !== null) {
                const year = match[0];
                if (isValidYear(year) && !fourDigitYears.includes(year)) {
                    fourDigitYears.push(year);
                }
            }

            if (fourDigitYears.length > 0) {
                fourDigitYears.sort((a, b) => parseInt(b) - parseInt(a));
                cardInfo.year = fourDigitYears[0];
                console.log('✅ Year from 4-digit:', cardInfo.year);
            }
        }

        // =============================
        // 6. HOLO/REVERSE HOLO DETECTION
        // =============================
        if (visionResults.front?.webDetection?.bestGuessLabels) {
            const guesses = visionResults.front.webDetection.bestGuessLabels;
            const holoIndicators = ['holo', 'holofoil', 'reverse', 'reverse holo'];
            
            for (const guess of guesses) {
                const guessLower = guess.label.toLowerCase();
                if (holoIndicators.some(indicator => guessLower.includes(indicator))) {
                    cardInfo.holo = true;
                    cardInfo.holoType = guess.label;
                    console.log('✨ Holo detected:', cardInfo.holoType);
                    break;
                }
            }
        }

        // =============================
        // 7. WEB MATCHES FROM VISION RESULTS
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
        // 8. SUMMARY LOG
        // =============================
        console.log('📊 Final Extraction:', {
            name: cardInfo.name || '❌',
            set: cardInfo.set || '❌',
            cardNumber: cardInfo.cardNumber || '❌',
            year: cardInfo.year || '❌',
            holo: cardInfo.holo ? 'Yes' : 'No'
        });

        // =============================
        // 9. CONFIDENCE
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

    // Set detection
    maxScore += 2;
    if (cardInfo.set) score += 2;

    // Card number detection
    maxScore += 2;
    if (cardInfo.cardNumber) score += 2;

    // Year detection
    maxScore += 1;
    if (cardInfo.year) score += 1;

    // Web matches bonus (helps confirm the card)
    if (cardInfo.webMatches && cardInfo.webMatches.length > 0) {
        score += 2;
        maxScore += 2;
    }

    // Holo detection bonus
    if (cardInfo.holo) {
        score += 1;
        maxScore += 1;
    }

    return maxScore > 0
        ? Math.round((score / maxScore) * 100)
        : 0;
};