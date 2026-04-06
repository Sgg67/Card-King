// services/ExtractPokemonCardInfo.js

export const extractPokemonCardInfo = (visionResults) => {
    const cardInfo = {
        name: null,
        set: null,
        setCode: null,
        cardNumber: null,
        year: null,
        hp: null,
        stage: null,
        cardSuffix: null,
        energyType: null,
        holo: false,
        holoType: null,
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

        console.log('📝 Raw Pokémon text preview:', combinedText.substring(0, 300) + '...');

        const normalizedText = combinedText.toUpperCase();
        const lines = normalizedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // =============================
        // 1. OCR TEXT CORRECTION
        // =============================
        const correctOCRText = (text) => {
            const corrections = [
                { pattern: /P[0O]K[EÉ]MON/gi, replacement: 'POKEMON' },
                { pattern: /PIKA[CG]HU/gi, replacement: 'PIKACHU' },
                { pattern: /CH[AI]RIZARD/gi, replacement: 'CHARIZARD' },
                { pattern: /BULBAS[AO]UR/gi, replacement: 'BULBASAUR' },
                { pattern: /SQUIRT[LI]E/gi, replacement: 'SQUIRTLE' },
                { pattern: /MEW[TY]W0/gi, replacement: 'MEWTWO' },
                { pattern: /GENGAR/gi, replacement: 'GENGAR' },
                { pattern: /\bHF\b/g, replacement: 'HP' },
                { pattern: /(\d+)\s*\/\s*(\d+)/g, replacement: '$1/$2' },
            ];
            let corrected = text;
            for (const c of corrections) corrected = corrected.replace(c.pattern, c.replacement);
            return corrected;
        };

        const correctedText = correctOCRText(combinedText);
        const correctedNormalized = correctedText.toUpperCase();

        // =============================
        // 2. STAGE / CARD TYPE DETECTION
        // =============================
        const stagePatterns = [
            { pattern: /\bVSTAR\b/i, stage: 'VSTAR' },
            { pattern: /\bVMAX\b/i, stage: 'VMAX' },
            { pattern: /\bV-UNION\b/i, stage: 'V-UNION' },
            { pattern: /\b(?<!\w)V\b(?!\w)/, stage: 'V' },
            { pattern: /\bGX\b/i, stage: 'GX' },
            { pattern: /\bEX\b/i, stage: 'EX' },
            { pattern: /\bex\b/, stage: 'ex' },
            { pattern: /\bBREAK\b/i, stage: 'BREAK' },
            { pattern: /\bLEGEND\b/i, stage: 'LEGEND' },
            { pattern: /\bPRISM STAR\b/i, stage: 'Prism Star' },
            { pattern: /\bRADIANT\b/i, stage: 'Radiant' },
            { pattern: /\bSTAGE 2\b/i, stage: 'Stage 2' },
            { pattern: /\bSTAGE 1\b/i, stage: 'Stage 1' },
            { pattern: /\bBASIC\b/i, stage: 'Basic' },
        ];

        for (const { pattern, stage } of stagePatterns) {
            if (pattern.test(correctedNormalized)) {
                cardInfo.stage = stage;
                cardInfo.cardSuffix = ['VSTAR', 'VMAX', 'V', 'GX', 'EX', 'ex', 'BREAK',
                    'Prism Star', 'Radiant'].includes(stage) ? stage : null;
                console.log('🎴 Stage/Suffix:', cardInfo.stage);
                break;
            }
        }

        // =============================
        // 3. HP DETECTION
        // =============================
        const hpMatch = correctedNormalized.match(/\b(\d{2,3})\s*HP\b/) ||
            correctedNormalized.match(/\bHP\s+(\d{2,3})\b/);
        if (hpMatch) {
            cardInfo.hp = parseInt(hpMatch[1]);
            console.log('❤️ HP:', cardInfo.hp);
        }

        // =============================
        // 4. POKÉMON NAME EXTRACTION
        // =============================
        const frontLines = correctedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        const nameBlacklist = [
            'POKEMON', 'POKÉMON', 'ENERGY', 'TRAINER', 'STADIUM', 'SUPPORTER',
            'ITEM', 'TOOL', 'ACE SPEC', 'BASIC', 'STAGE 1', 'STAGE 2', 'LEVEL-UP',
            'LEGEND', 'SP', 'EX', 'GX', 'VMAX', 'VSTAR', 'V-UNION',
            'BREAK', 'PRISM STAR', 'TAG TEAM', 'RADIANT', 'HYPER', 'DELTA SPECIES',
            'HOLO', 'REVERSE', 'FOIL', 'FULL ART', 'SECRET RARE', 'ULTRA RARE',
            'COMMON', 'UNCOMMON', 'RARE', 'ILLUSTRATION RARE',
            'COPYRIGHT', 'NINTENDO', 'CREATURES', 'GAME FREAK', 'WOTC',
            'WIZARDS OF THE COAST', 'THE POKEMON COMPANY', 'ILLUSTRATOR',
            'REGULATION', 'DEX', 'WEAKNESS', 'RESISTANCE', 'RETREAT',
            'ABILITY', 'POKEMON POWER', 'POKE-BODY', 'POKE-POWER', 'BERRY',
            'ATTACK', 'DAMAGE', 'COIN', 'FLIP', 'HEADS', 'TAILS',
            'FIRE', 'WATER', 'GRASS', 'LIGHTNING', 'PSYCHIC', 'FIGHTING',
            'DARKNESS', 'METAL', 'DRAGON', 'FAIRY', 'COLORLESS', 'NORMAL',
        ];

        const suffixesToStrip = /\s+(VSTAR|VMAX|V-UNION|\bV\b|GX|EX|ex|BREAK|LEGEND|PRISM STAR|RADIANT|δ)$/i;

        for (let idx = 0; idx < Math.min(frontLines.length, 15); idx++) {
            const line = frontLines[idx].trim();
            const upperLine = line.toUpperCase();

            if (line.length < 2 || line.length > 35) continue;
            if (/\b\d{2,3}\s*HP\b/i.test(line)) continue;
            if (/\d+\/\d+/.test(line)) continue;
            if (/^\d+$/.test(line)) continue;
            if (/^[^a-zA-Z]+$/.test(line)) continue;

            const baseLine = line.replace(suffixesToStrip, '').trim();
            const upperBase = baseLine.toUpperCase();

            if (nameBlacklist.some(term => upperBase === term || upperLine === term)) continue;
            if (nameBlacklist.some(term => new RegExp(`^${term}$`).test(upperBase))) continue;

            const letters = (line.match(/[a-zA-ZÀ-ÿ'-]/g) || []).length;
            const total = line.length;
            if (letters / total < 0.6) continue;

            const words = baseLine.split(/\s+/);
            if (words.length >= 1 && words.length <= 3) {
                cardInfo.name = baseLine;
                console.log('✅ Pokémon Name:', cardInfo.name, '(line', idx, ')');
                break;
            }
        }

        if (!cardInfo.name) {
            const commonPokemon = [
                'Pikachu', 'Charizard', 'Mewtwo', 'Eevee', 'Gengar', 'Snorlax',
                'Gyarados', 'Dragonite', 'Bulbasaur', 'Squirtle', 'Charmander',
                'Mew', 'Raichu', 'Alakazam', 'Machamp', 'Blastoise', 'Venusaur',
                'Articuno', 'Zapdos', 'Moltres', 'Lugia', 'Ho-Oh', 'Celebi',
                'Blaziken', 'Swampert', 'Gardevoir', 'Salamence', 'Metagross',
                'Rayquaza', 'Deoxys', 'Lucario', 'Garchomp', 'Giratina',
                'Arceus', 'Reshiram', 'Zekrom', 'Kyurem', 'Xerneas', 'Yveltal',
                'Greninja', 'Zygarde', 'Solgaleo', 'Lunala', 'Necrozma',
                'Zacian', 'Zamazenta', 'Eternatus', 'Calyrex', 'Urshifu',
                'Miraidon', 'Koraidon',
            ];
            for (const pokemon of commonPokemon) {
                const regex = new RegExp(`\\b${pokemon}\\b`, 'i');
                if (regex.test(correctedText)) {
                    cardInfo.name = pokemon;
                    console.log('✅ Pokémon Name (known list):', cardInfo.name);
                    break;
                }
            }
        }
        // =============================
        // 5. CARD NUMBER EXTRACTION (ENHANCED FOR PRICE LOOKUP)
        // =============================
        console.log('🔍 Searching for Pokémon card number...');

        // Format card number for market value APIs (remove trailing zeros from total)
        const formatForMarketValue = (cardNumber) => {
            if (!cardNumber) return null;

            // Handle promo cards (SWSH001, SM35, etc.)
            if (/^[A-Z]{2,4}\d+$/i.test(cardNumber)) {
                return cardNumber.toUpperCase();
            }

            // Handle X/Y format - Remove trailing zeros from the total
            const match = cardNumber.match(/^(\d{1,3})\/(\d+)$/);
            if (match) {
                let num = match[1];
                let total = match[2];

                // Remove trailing zeros from total (1230 -> 123, 1000 -> 1)
                total = total.replace(/0+$/, '');

                // Also remove leading zeros from both if needed
                num = parseInt(num, 10).toString();
                total = parseInt(total, 10).toString();

                return `${num}/${total}`;
            }

            return cardNumber;
        };

        const sanitizeCardNumber = (raw) => {
            if (!raw) return raw;

            const match = raw.match(/^(\d{1,3})\/(\d+)/);
            if (match) {
                let num = match[1];
                let total = match[2];

                // Remove trailing zeros from total
                total = total.replace(/0+$/, '');

                // Remove leading zeros
                num = parseInt(num, 10).toString();
                total = parseInt(total, 10).toString();

                return `${num}/${total}`;
            }

            return raw;
        };

        let rawCardNumber = null;
        let formattedCardNumber = null;

        // Search line by line for card numbers
        for (const line of lines) {
            // Isolated X/Y number
            const isolated = line.match(/^(\d{1,3}\/\d+)$/);
            if (isolated) {
                rawCardNumber = sanitizeCardNumber(isolated[1]);
                console.log('✅ Raw Card Number (isolated):', rawCardNumber);
                break;
            }

            // Embedded X/Y number
            const embedded = line.match(/(?<!\d)(\d{1,3}\/\d+)(?!\d)/);
            if (embedded) {
                rawCardNumber = sanitizeCardNumber(embedded[1]);
                console.log('✅ Raw Card Number (embedded):', rawCardNumber);
                break;
            }
        }

        // If not found, try regex patterns
        if (!rawCardNumber) {
            const cardNumberPatterns = [
                /(?<!\d)(\d{1,3}\/\d+)(?!\d)/,
                /\b(SWSH\d{1,3}[a-z]?)\b/i,
                /\b(SV[A-Z0-9]{1,4})\b/i,
                /\b(SM\d{1,3}[a-z]?)\b/i,
                /\b(XY\d{1,3}[a-z]?)\b/i,
                /\b(BW\d{1,3}[a-z]?)\b/i,
                /\b(DP\d{1,3}[a-z]?)\b/i,
                /\b(POP\d{1,3})\b/i,
            ];

            for (const pattern of cardNumberPatterns) {
                const match = correctedNormalized.match(pattern);
                if (match) {
                    rawCardNumber = sanitizeCardNumber(match[1] || match[0]);
                    console.log('✅ Raw Card Number (pattern):', rawCardNumber);
                    break;
                }
            }
        }

        // Format for market value lookup
        if (rawCardNumber) {
            formattedCardNumber = formatForMarketValue(rawCardNumber);
            cardInfo.cardNumber = formattedCardNumber;
            console.log('✅ Formatted Card Number (for price):', cardInfo.cardNumber);
        } else {
            console.log('⚠️ No card number found');
        }
        // =============================
        // 6. SET IDENTIFICATION
        // =============================
        console.log('🔍 Identifying Pokémon set...');

        const pokemonSets = [
            { name: 'Stellar Crown', keywords: ['STELLAR CROWN', 'SCR'] },
            { name: 'Shrouded Fable', keywords: ['SHROUDED FABLE', 'SFA'] },
            { name: 'Twilight Masquerade', keywords: ['TWILIGHT MASQUERADE', 'TWM'] },
            { name: 'Temporal Forces', keywords: ['TEMPORAL FORCES', 'TEF'] },
            { name: 'Paradox Rift', keywords: ['PARADOX RIFT', 'PAR'] },
            { name: 'Obsidian Flames', keywords: ['OBSIDIAN FLAMES', 'OBF'] },
            { name: 'Paldea Evolved', keywords: ['PALDEA EVOLVED', 'PAL'] },
            { name: 'Scarlet & Violet Base', keywords: ['SCARLET & VIOLET', 'SVI'] },
            { name: 'Crown Zenith', keywords: ['CROWN ZENITH', 'CRZ'] },
            { name: 'Silver Tempest', keywords: ['SILVER TEMPEST', 'SIT'] },
            { name: 'Lost Origin', keywords: ['LOST ORIGIN', 'LOR'] },
            { name: 'Astral Radiance', keywords: ['ASTRAL RADIANCE', 'ASR'] },
            { name: 'Brilliant Stars', keywords: ['BRILLIANT STARS', 'BRS'] },
            { name: 'Fusion Strike', keywords: ['FUSION STRIKE', 'FST'] },
            { name: 'Evolving Skies', keywords: ['EVOLVING SKIES', 'EVS'] },
            { name: 'Chilling Reign', keywords: ['CHILLING REIGN', 'CRE'] },
            { name: 'Battle Styles', keywords: ['BATTLE STYLES', 'BST'] },
            { name: 'Vivid Voltage', keywords: ['VIVID VOLTAGE', 'VIV'] },
            { name: 'Darkness Ablaze', keywords: ['DARKNESS ABLAZE', 'DAA'] },
            { name: 'Rebel Clash', keywords: ['REBEL CLASH', 'RCL'] },
            { name: 'Sword & Shield Base', keywords: ['SWORD & SHIELD', 'SSH', 'SWSH'] },
            { name: 'Cosmic Eclipse', keywords: ['COSMIC ECLIPSE', 'CEC'] },
            { name: 'Hidden Fates', keywords: ['HIDDEN FATES', 'HIF'] },
            { name: 'Unified Minds', keywords: ['UNIFIED MINDS', 'UNM'] },
            { name: 'Unbroken Bonds', keywords: ['UNBROKEN BONDS', 'UNB'] },
            { name: 'Team Up', keywords: ['TEAM UP', 'TEU'] },
            { name: 'Lost Thunder', keywords: ['LOST THUNDER', 'LOT'] },
            { name: 'Dragon Majesty', keywords: ['DRAGON MAJESTY', 'DRM'] },
            { name: 'Celestial Storm', keywords: ['CELESTIAL STORM', 'CES'] },
            { name: 'Forbidden Light', keywords: ['FORBIDDEN LIGHT', 'FLI'] },
            { name: 'Ultra Prism', keywords: ['ULTRA PRISM', 'UPR'] },
            { name: 'Crimson Invasion', keywords: ['CRIMSON INVASION', 'CIN'] },
            { name: 'Shining Legends', keywords: ['SHINING LEGENDS', 'SLG'] },
            { name: 'Burning Shadows', keywords: ['BURNING SHADOWS', 'BUS'] },
            { name: 'Guardians Rising', keywords: ['GUARDIANS RISING', 'GRI'] },
            { name: 'Sun & Moon Base', keywords: ['SUN & MOON', 'SM'] },
            { name: 'Evolutions', keywords: ['EVOLUTIONS', 'EVO'] },
            { name: 'Steam Siege', keywords: ['STEAM SIEGE', 'STS'] },
            { name: 'Fates Collide', keywords: ['FATES COLLIDE', 'FCO'] },
            { name: 'BREAKpoint', keywords: ['BREAKPOINT'] },
            { name: 'BREAKthrough', keywords: ['BREAKTHROUGH'] },
            { name: 'Ancient Origins', keywords: ['ANCIENT ORIGINS', 'AOR'] },
            { name: 'Roaring Skies', keywords: ['ROARING SKIES', 'ROS'] },
            { name: 'Primal Clash', keywords: ['PRIMAL CLASH', 'PRC'] },
            { name: 'Phantom Forces', keywords: ['PHANTOM FORCES', 'PHF'] },
            { name: 'Furious Fists', keywords: ['FURIOUS FISTS', 'FFI'] },
            { name: 'Flashfire', keywords: ['FLASHFIRE', 'FLF'] },
            { name: 'XY Base', keywords: ['XY BASE', 'XY'] },
            { name: 'Plasma Blast', keywords: ['PLASMA BLAST', 'PLB'] },
            { name: 'Plasma Freeze', keywords: ['PLASMA FREEZE', 'PLF'] },
            { name: 'Plasma Storm', keywords: ['PLASMA STORM', 'PLS'] },
            { name: 'Boundaries Crossed', keywords: ['BOUNDARIES CROSSED', 'BCR'] },
            { name: 'Dragons Exalted', keywords: ['DRAGONS EXALTED', 'DRX'] },
            { name: 'Dark Explorers', keywords: ['DARK EXPLORERS', 'DEX'] },
            { name: 'Next Destinies', keywords: ['NEXT DESTINIES', 'NXD'] },
            { name: 'Noble Victories', keywords: ['NOBLE VICTORIES', 'NVI'] },
            { name: 'Emerging Powers', keywords: ['EMERGING POWERS', 'EPO'] },
            { name: 'Black & White Base', keywords: ['BLACK & WHITE', 'BLW', 'BW'] },
            { name: 'Aquapolis', keywords: ['AQUAPOLIS'] },
            { name: 'Skyridge', keywords: ['SKYRIDGE'] },
            { name: 'Expedition', keywords: ['EXPEDITION'] },
            { name: 'Neo Destiny', keywords: ['NEO DESTINY'] },
            { name: 'Neo Revelation', keywords: ['NEO REVELATION'] },
            { name: 'Neo Discovery', keywords: ['NEO DISCOVERY'] },
            { name: 'Neo Genesis', keywords: ['NEO GENESIS'] },
            { name: 'Gym Challenge', keywords: ['GYM CHALLENGE'] },
            { name: 'Gym Heroes', keywords: ['GYM HEROES'] },
            { name: 'Team Rocket', keywords: ['TEAM ROCKET'] },
            { name: 'Fossil', keywords: ['FOSSIL'] },
            { name: 'Jungle', keywords: ['JUNGLE'] },
            { name: 'Base Set 2', keywords: ['BASE SET 2'] },
            { name: 'Base Set', keywords: ['BASE SET'] },
            { name: '151', keywords: ['POKEMON 151', 'MEW 151'] },
            { name: 'Celebrations', keywords: ['CELEBRATIONS', 'CEL'] },
            { name: 'Shining Fates', keywords: ['SHINING FATES', 'SHF'] },
            { name: 'Champion\'s Path', keywords: ["CHAMPION'S PATH", 'CPA'] },
        ];

        for (const { name, keywords } of pokemonSets) {
            if (keywords.some(kw => correctedNormalized.includes(kw))) {
                cardInfo.set = name;
                cardInfo.setCode = keywords.find(kw => kw.length <= 4 && /^[A-Z]+\d*$/.test(kw)) || null;
                console.log('✅ Set:', cardInfo.set, cardInfo.setCode ? `(${cardInfo.setCode})` : '');
                break;
            }
        }

        // =============================
        // 7. YEAR EXTRACTION (IMPROVED)
        // =============================
        const CURRENT_YEAR = new Date().getFullYear();
        const VALID_YEAR_MIN = 1995;
        const VALID_YEAR_MAX = CURRENT_YEAR + 1;

        const isValidYear = (yr) => {
            const y = parseInt(yr);
            return !isNaN(y) && y >= VALID_YEAR_MIN && y <= VALID_YEAR_MAX;
        };

        cardInfo.year = null;
        console.log('🔍 Searching for Pokémon year...');

        // Try to get year from set name first (most reliable)
        if (cardInfo.set) {
            const setYearMap = {
                'Base Set': 1999,
                'Jungle': 1999,
                'Fossil': 1999,
                'Team Rocket': 2000,
                'Gym Heroes': 2000,
                'Gym Challenge': 2000,
                'Neo Genesis': 2000,
                'Neo Discovery': 2001,
                'Neo Revelation': 2001,
                'Neo Destiny': 2002,
                'Expedition': 2002,
                'Aquapolis': 2003,
                'Skyridge': 2003,
                'EX Ruby & Sapphire': 2003,
                'Black & White Base': 2011,
                'XY Base': 2014,
                'Sun & Moon Base': 2017,
                'Sword & Shield Base': 2020,
                'Scarlet & Violet Base': 2023,
            };

            if (setYearMap[cardInfo.set]) {
                cardInfo.year = setYearMap[cardInfo.set].toString();
                console.log('✅ Year from set name:', cardInfo.year);
            }
        }

        // If not found from set, try copyright patterns
        if (!cardInfo.year) {
            // Copyright range pattern (e.g. "©1995-2023 Pokémon")
            const copyrightRangeMatch = correctedNormalized.match(/©\s*(\d{4})\s*[-–]\s*(\d{4})/);
            if (copyrightRangeMatch && isValidYear(copyrightRangeMatch[2])) {
                cardInfo.year = copyrightRangeMatch[2];
                console.log('✅ Year from copyright range:', cardInfo.year);
            }
        }

        if (!cardInfo.year) {
            // Single copyright year
            const copyrightMatch = correctedNormalized.match(/©\s*((?:19|20)\d{2})/);
            if (copyrightMatch && isValidYear(copyrightMatch[1])) {
                cardInfo.year = copyrightMatch[1];
                console.log('✅ Year from copyright:', cardInfo.year);
            }
        }

        if (!cardInfo.year) {
            // Nintendo/Creatures/Game Freak year
            const companyYearMatch = correctedNormalized.match(
                /(\d{4})\s*(?:NINTENDO|CREATURES|GAME FREAK|THE POKEMON COMPANY)/
            );
            if (companyYearMatch && isValidYear(companyYearMatch[1])) {
                cardInfo.year = companyYearMatch[1];
                console.log('✅ Year from company line:', cardInfo.year);
            }
        }

        if (!cardInfo.year) {
            // Look for set code patterns that indicate year (e.g., SWSH = 2020, SM = 2017)
            if (cardInfo.setCode) {
                if (cardInfo.setCode.startsWith('SWSH')) cardInfo.year = '2020';
                else if (cardInfo.setCode.startsWith('SM')) cardInfo.year = '2017';
                else if (cardInfo.setCode.startsWith('XY')) cardInfo.year = '2014';
                else if (cardInfo.setCode.startsWith('BW')) cardInfo.year = '2011';
                if (cardInfo.year) console.log('✅ Year from set code:', cardInfo.year);
            }
        }

        // Fallback: any 4-digit year (prefer most recent for Pokémon)
        if (!cardInfo.year) {
            const allYears = [];
            const yearRegex = /\b((?:19|20)\d{2})\b/g;
            let m;
            while ((m = yearRegex.exec(correctedNormalized)) !== null) {
                const y = m[1];
                if (isValidYear(y) && !allYears.includes(y)) allYears.push(y);
            }
            if (allYears.length > 0) {
                allYears.sort((a, b) => parseInt(b) - parseInt(a));
                cardInfo.year = allYears[0];
                console.log('✅ Year (fallback):', cardInfo.year);
            }
        }

        // =============================
        // 8. ENERGY TYPE DETECTION
        // =============================
        const energyTypes = [
            'FIRE', 'WATER', 'GRASS', 'LIGHTNING', 'PSYCHIC',
            'FIGHTING', 'DARKNESS', 'METAL', 'DRAGON', 'FAIRY', 'COLORLESS'
        ];
        for (const type of energyTypes) {
            if (new RegExp(`\\b${type}\\b`).test(correctedNormalized)) {
                cardInfo.energyType = type.charAt(0) + type.slice(1).toLowerCase();
                console.log('⚡ Energy type:', cardInfo.energyType);
                break;
            }
        }

        // =============================
        // 9. HOLO / VARIANT DETECTION
        // =============================
        if (visionResults.front?.webDetection?.bestGuessLabels) {
            const holoIndicators = ['holo', 'holofoil', 'reverse holo', 'full art',
                'secret rare', 'rainbow rare', 'gold', 'alternate art'];
            for (const guess of visionResults.front.webDetection.bestGuessLabels) {
                const label = guess.label.toLowerCase();
                if (holoIndicators.some(h => label.includes(h))) {
                    cardInfo.holo = true;
                    cardInfo.holoType = guess.label;
                    console.log('✨ Holo detected:', cardInfo.holoType);
                    break;
                }
            }
        }

        if (!cardInfo.holo) {
            const holoTextPatterns = [
                'HOLO', 'HOLOFOIL', 'REVERSE HOLO', 'FULL ART',
                'SECRET RARE', 'RAINBOW RARE', 'ALTERNATE ART', 'SPECIAL ILLUSTRATION',
            ];
            for (const pattern of holoTextPatterns) {
                if (correctedNormalized.includes(pattern)) {
                    cardInfo.holo = true;
                    cardInfo.holoType = pattern.charAt(0) + pattern.slice(1).toLowerCase();
                    console.log('✨ Holo (text):', cardInfo.holoType);
                    break;
                }
            }
        }

        // =============================
        // 10. WEB MATCHES
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
        // 11. CONFIDENCE CALCULATION
        // =============================
        const calculateConfidence = (info) => {
            let score = 0;
            let maxScore = 0;

            maxScore += 4;
            if (info.name) score += 4;

            maxScore += 3;
            if (info.set) score += 3;

            maxScore += 2;
            if (info.cardNumber) score += 2;

            maxScore += 1;
            if (info.year) score += 1;

            maxScore += 1;
            if (info.hp) score += 1;

            if (info.webMatches?.length > 0) {
                score += 2;
                maxScore += 2;
            }

            if (info.stage) {
                score += 1;
                maxScore += 1;
            }

            return maxScore > 0 ? Math.min(Math.round((score / maxScore) * 100), 100) : 0;
        };

        cardInfo.confidence = calculateConfidence(cardInfo);

        console.log('📊 Final Pokémon Extraction:', {
            name: cardInfo.name || '❌',
            set: cardInfo.set || '❌',
            cardNumber: cardInfo.cardNumber || '❌',
            year: cardInfo.year || '❌',
            hp: cardInfo.hp || '❌',
            stage: cardInfo.stage || '❌',
            energyType: cardInfo.energyType || '❌',
            holo: cardInfo.holo,
            confidence: `${cardInfo.confidence}%`
        });

        return cardInfo;
    } catch (error) {
        console.error('❌ Pokémon Extraction Error:', error);
        return cardInfo;
    }
};