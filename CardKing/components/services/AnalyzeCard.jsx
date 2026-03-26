import Constants from 'expo-constants';

// get all the properties of the card using google vision API
export const AnalyzeCard = async(front, back) => {
    const extra = Constants.expoConfig?.extra || {};
    const VisionApiKey = extra.googleVisionApiKey;
    const url = `https://vision.googleapis.com/v1/images:annotate?key=${VisionApiKey}`;

    const frontResults = await analyzeImage(front, url);
    const backResults = await analyzeImage(back, url);

    return {
        front: frontResults,
        back: backResults,
    };
};

const analyzeImage = async(imageUrl, apiUrl) => {
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            requests: [{
                image: {
                    source: {
                        imageUri: imageUrl
                    }
                },
                features: [
                    {
                        type: "TEXT_DETECTION",
                        maxResults: 50,
                    },
                    {
                        type: "DOCUMENT_TEXT_DETECTION",
                        maxResults: 50,
                    },
                    {
                        type: "OBJECT_LOCALIZATION",
                        maxResults: 20
                    },
                    {
                        type: "LABEL_DETECTION",
                        maxResults: 50
                    },
                    {
                        type: "LOGO_DETECTION",
                        maxResults: 10
                    },
                    {
                        type: "IMAGE_PROPERTIES",
                    },
                    {
                        type: "CROP_HINTS",
                    },
                    {
                        type: "WEB_DETECTION",
                        maxResults: 50
                    }
                ],
                imageContext: {
                    languageHints: ['en'],
                    cropHintsParams: {
                        aspectRatios: [0.71, 0.75, 1.0]
                    }
                }
            }]
        })
    };

    try {
        const response = await fetch(apiUrl, requestOptions);
        const data = await response.json();

        if(!response.ok){
            throw new Error(data.error?.message || 'Vision API error');
        }

        // Enhanced post-processing
        const enhancedResults = enhanceCardRecognition(data.responses[0]);
        
        return enhancedResults;
    } catch(error){
        console.error("error analyzing image:", error);
        throw error;
    }
};

// Enhanced post-processing function with better logging and validation
const enhanceCardRecognition = (visionResults) => {
    const enhanced = { ...visionResults };
    
    // Get all text annotations (includes individual word detections)
    const textAnnotations = visionResults.textAnnotations || [];
    const fullText = textAnnotations[0]?.description || '';
    const allTextBlocks = textAnnotations.slice(1).map(block => ({
        text: block.description,
        confidence: block.confidence,
        boundingBox: block.boundingPoly
    }));
    
    // Log all text blocks for debugging
    console.log('📝 Found', allTextBlocks.length, 'individual text blocks');
    if (allTextBlocks.length > 0) {
        console.log('Sample text blocks:');
        allTextBlocks.slice(0, 5).forEach((block, i) => {
            console.log(`  Block ${i}: "${block.text}" (confidence: ${block.confidence})`);
        });
    }
    
    // Extract structured card data with better small text detection
    enhanced.cardData = {
        cardNumber: extractCardNumber(fullText, allTextBlocks),
        manufacturer: extractManufacturer(visionResults),
        year: extractYearWithValidation(fullText, allTextBlocks),
        playerName: extractPlayerName(fullText, allTextBlocks),
        set: extractSetInfo(fullText),
        isRookie: checkRookie(visionResults),
        isAutograph: checkAutograph(visionResults),
        isRelic: checkRelic(visionResults),
        isNumbered: checkNumbered(fullText),
        webMatches: visionResults.webDetection?.pagesWithMatchingImages || [],
        dominantColors: visionResults.imagePropertiesAnnotation?.dominantColors?.colors || []
    };
    
    console.log('✅ Extracted year:', enhanced.cardData.year || 'Not found');
    
    return enhanced;
};

// New validation function
const extractYearWithValidation = (fullText, textBlocks) => {
    const CURRENT_YEAR = new Date().getFullYear();
    const VALID_YEAR_MIN = 1900;
    const VALID_YEAR_MAX = CURRENT_YEAR + 1;
    
    // Helper to validate year
    const isValidYear = (yearStr) => {
        const year = parseInt(yearStr);
        return !isNaN(year) && year >= VALID_YEAR_MIN && year <= VALID_YEAR_MAX;
    };
    
    // Helper to extract year from pattern
    const extractValidYearFromPattern = (text, pattern) => {
        const match = text.match(pattern);
        if (!match) return null;
        
        // Try to find a 4-digit year in the match
        const fourDigitMatch = match[0].match(/\b(19|20)\d{2}\b/);
        if (fourDigitMatch && isValidYear(fourDigitMatch[0])) {
            return fourDigitMatch[0];
        }
        
        // Check for 2-digit year conversion
        const twoDigitMatch = match[0].match(/'?(\d{2})\b/);
        if (twoDigitMatch) {
            const twoDigit = twoDigitMatch[1];
            // Try both 1900s and 2000s
            const possibleYears = [
                `20${twoDigit}`,
                `19${twoDigit}`
            ];
            
            for (const year of possibleYears) {
                if (isValidYear(year)) {
                    console.log(`📅 Converted 2-digit year ${twoDigit} to ${year}`);
                    return year;
                }
            }
        }
        
        return null;
    };
    
    // HIGHEST PRIORITY: Look for & pattern with year (most reliable)
    const andPatterns = [
        /&\s*(?:'?)?(19|20)\d{2}/i,        // & 2014 or & '14
        /(19|20)\d{2}\s*&/i,                // 2014 &
        /[&]\s*(\d{4})/i,                    // &2014
        /(\d{4})\s*[&]/i,                    // 2014&
        /[&]\s*'?(\d{2})\b/i,                // & '14 or &14
        /'?(\d{2})\s*[&]/i,                  // '14 & or 14&
        /©\s*(?:'?)?(19|20)\d{2}/i,          // © 2014
        /(19|20)\d{2}\s*©/i,                  // 2014 ©
    ];
    
    // Check main text first
    for (const pattern of andPatterns) {
        const year = extractValidYearFromPattern(fullText, pattern);
        if (year) {
            console.log('📅 Found year with primary pattern:', year);
            return year;
        }
    }
    
    // Check individual text blocks for & patterns
    for (const block of textBlocks) {
        for (const pattern of andPatterns) {
            const year = extractValidYearFromPattern(block.text, pattern);
            if (year) {
                console.log('📅 Found year in text block:', year);
                return year;
            }
        }
    }
    
    // SECOND PRIORITY: Look for copyright/trademark symbols at bottom of text
    const bottomText = fullText.slice(-300); // Last 300 chars
    const copyrightPatterns = [
        /[©C]\s*(19|20)\d{2}/i,
        /(19|20)\d{2}\s*[©C]/i,
        /[®™]\s*(19|20)\d{2}/,
        /(19|20)\d{2}\s*[®™]/,
        /copyright\s*(19|20)\d{2}/i,
        /copy\.?\s*(19|20)\d{2}/i,
    ];
    
    for (const pattern of copyrightPatterns) {
        const match = bottomText.match(pattern);
        if (match) {
            const yearMatch = match[0].match(/\b(19|20)\d{2}\b/);
            if (yearMatch && isValidYear(yearMatch[0])) {
                console.log('📅 Found year with copyright at bottom:', yearMatch[0]);
                return yearMatch[0];
            }
        }
    }
    
    // THIRD PRIORITY: Look for year near manufacturer names
    const manufacturers = ['TOPPS', 'PANINI', 'UPPER DECK', 'FLEER', 'DONRUSS', 'BOWMAN', 'LEAF'];
    const upperText = fullText.toUpperCase();
    
    for (const mfg of manufacturers) {
        const mfgIndex = upperText.indexOf(mfg);
        if (mfgIndex !== -1) {
            // Look 100 chars before and after manufacturer
            const start = Math.max(0, mfgIndex - 100);
            const end = Math.min(upperText.length, mfgIndex + 100);
            const context = upperText.substring(start, end);
            
            const yearMatches = context.match(/\b(19|20)\d{2}\b/g);
            if (yearMatches) {
                const validYears = yearMatches.filter(isValidYear);
                if (validYears.length > 0) {
                    // Sort and take most recent
                    validYears.sort((a, b) => parseInt(b) - parseInt(a));
                    console.log('📅 Found year near manufacturer:', validYears[0]);
                    return validYears[0];
                }
            }
        }
    }
    
    // FOURTH PRIORITY: Look for year in set context
    const setPatterns = [
        /(19|20)\d{2}\s+(?:topps|panini|upper deck|fleer|donruss|bowman)/i,
        /(?:topps|panini|upper deck|fleer|donruss|bowman).{0,30}(19|20)\d{2}/i,
        /(?:series|set|edition).{0,30}(19|20)\d{2}/i,
    ];
    
    for (const pattern of setPatterns) {
        const match = fullText.match(pattern);
        if (match) {
            const yearMatch = match[0].match(/\b(19|20)\d{2}\b/);
            if (yearMatch && isValidYear(yearMatch[0])) {
                console.log('📅 Found year in set context:', yearMatch[0]);
                return yearMatch[0];
            }
        }
    }
    
    // FIFTH PRIORITY: Any 4-digit year with additional validation
    const allYears = [];
    let match;
    const yearRegex = /\b(19|20)\d{2}\b/g;
    
    while ((match = yearRegex.exec(fullText)) !== null) {
        if (isValidYear(match[0])) {
            allYears.push(match[0]);
        }
    }
    
    if (allYears.length > 0) {
        // Sort by most recent
        allYears.sort((a, b) => parseInt(b) - parseInt(a));
        
        // Filter out common false positives
        const falsePositives = ['1900', '2000', '1999', '2001'];
        const filteredYears = allYears.filter(year => !falsePositives.includes(year));
        
        if (filteredYears.length > 0) {
            console.log('📅 Found year from general detection:', filteredYears[0]);
            return filteredYears[0];
        }
    }
    
    return null;
};

// Original extractYear kept for backward compatibility but not used
const extractYear = (fullText, textBlocks) => {
    // This is kept for reference but we're using extractYearWithValidation instead
    return extractYearWithValidation(fullText, textBlocks);
};

const extractCardNumber = (fullText, textBlocks) => {
    // Look for card number patterns
    const patterns = [
        /#\s*(\d{1,4})/,  // #123
        /No\.?\s*(\d{1,4})/i,  // No. 123
        /(\d{1,3})\s*\/\s*(\d{1,3})/,  // 123/500
        /Card\s*#?\s*(\d{1,4})/i,  // Card #123
    ];
    
    for (const pattern of patterns) {
        const match = fullText.match(pattern);
        if (match) return match[0];
    }
    
    return null;
};

const extractManufacturer = (results) => {
    const text = results.textAnnotations?.[0]?.description || '';
    const logos = results.logoAnnotations || [];
    
    const manufacturers = ['Topps', 'Panini', 'Upper Deck', 'Fleer', 'Donruss', 'Bowman', 'Leaf'];
    
    // Check text first
    for (const mfg of manufacturers) {
        if (text.includes(mfg)) return mfg;
    }
    
    // Check logos
    for (const logo of logos) {
        if (manufacturers.some(m => logo.description.includes(m))) {
            return logo.description;
        }
    }
    
    return null;
};

const extractPlayerName = (fullText, textBlocks) => {
    const lines = fullText.split('\n').filter(line => line.trim().length > 3);
    
    // Usually player name is one of the first few lines
    // and doesn't contain numbers or common card text
    for (const line of lines.slice(0, 5)) {
        if (!line.match(/\d/) && 
            !line.includes('©') && 
            !line.includes('TM') &&
            line.length < 30) {
            return line.trim();
        }
    }
    
    return null;
};

const extractSetInfo = (fullText) => {
    const lines = fullText.split('\n');
    
    // Look for set information (often after the player name)
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Series') || 
            lines[i].includes('Edition') ||
            lines[i].includes('Set') ||
            lines[i].match(/^\d{4}/)) {
            return lines[i];
        }
    }
    
    return null;
};

const checkRookie = (results) => {
    const text = results.textAnnotations?.[0]?.description || '';
    const labels = results.labelAnnotations?.map(l => l.description.toLowerCase()) || [];
    
    return text.toLowerCase().includes('rookie') || 
           text.toLowerCase().includes('rc') ||
           labels.includes('rookie card') ||
           labels.includes('rookie');
};
// check if the card is autographed
const checkAutograph = (results) => {
    const text = results.textAnnotations?.[0]?.description || '';
    const labels = results.labelAnnotations?.map(l => l.description.toLowerCase()) || [];
    const objects = results.localizedObjectAnnotations?.map(o => o.name.toLowerCase()) || [];
    
    return text.toLowerCase().includes('autograph') ||
           text.toLowerCase().includes('auto') ||
           text.toLowerCase().includes('signed') ||
           labels.includes('autograph') ||
           objects.includes('signature');
};

const checkRelic = (results) => {
    const text = results.textAnnotations?.[0]?.description || '';
    const labels = results.labelAnnotations?.map(l => l.description.toLowerCase()) || [];
    
    return text.toLowerCase().includes('relic') ||
           text.toLowerCase().includes('jersey') ||
           text.toLowerCase().includes('patch') ||
           text.toLowerCase().includes('memorabilia') ||
           labels.includes('relic');
};

const checkNumbered = (fullText) => {
    return fullText.match(/\d+\s*\/\s*\d+/) !== null;
};