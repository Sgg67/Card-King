// services/CardLookupService.js
export const lookupCardFromWebMatches = async (cardInfo, webMatches) => {
    const results = {
        exactMatch: null,
        possibleMatches: [],
        bestGuess: null,
        searchQuery: null,
        confidence: 0
    };

    try {
        // Always process webMatches if they exist
        if (webMatches && webMatches.length > 0) {
            console.log(`Found ${webMatches.length} total web matches`);
            
            const marketplaceMatches = webMatches.filter(match => {
                const url = match.url || '';
                const title = match.pageTitle || '';
                return url.includes('ebay.com') ||
                    url.includes('comc.com') ||
                    url.includes('cardboardconnection') ||
                    url.includes('tcdb.com') ||
                    title.toLowerCase().includes('trading card');
            });

            console.log(`Found ${marketplaceMatches.length} marketplace matches`);

            // Process marketplace matches
            for (const match of marketplaceMatches.slice(0, 5)) {
                const title = match.pageTitle || '';
                const parsedCard = parseCardTitle(title);

                if (parsedCard.confidence > 0.7) {
                    results.possibleMatches.push({
                        ...parsedCard,
                        source: match.url,
                        title: title
                    });
                }
            }

            // Try to get best guess from webMatches
            for (const match of webMatches) {
                if (match.bestGuessLabels && match.bestGuessLabels.length > 0) {
                    const bestGuess = match.bestGuessLabels[0].label;
                    if (bestGuess) {
                        results.bestGuess = bestGuess;
                        results.searchQuery = bestGuess;
                        break;
                    }
                }
            }
        }

        // If no search query from web matches, build one from cardInfo
        if (!results.searchQuery) {
            results.searchQuery = buildAccurateSearchQuery(cardInfo);
            console.log('Built search query from card info:', results.searchQuery);
        }

        // Find the best match from possible matches
        if (results.possibleMatches.length > 0) {
            results.exactMatch = findBestMatch(results.possibleMatches, cardInfo);
        }
        
        // ALWAYS return results, even if empty
        return results;

    } catch (error) {
        console.error('Error in card lookup:', error);
        // Return default results object on error
        return {
            exactMatch: null,
            possibleMatches: [],
            bestGuess: null,
            searchQuery: buildAccurateSearchQuery(cardInfo), // Fallback to built query
            confidence: 0
        };
    }
};

const parseCardTitle = (title) => {
    const cardData = {
        name: null,
        year: null,
        manufacturer: null,
        cardNumber: null,
        parallel: null,
        confidence: 0
    };

    if (!title) return cardData;

    const yearMatch = title.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
        cardData.year = yearMatch[0];
    }

    const manufacturers = ['Topps', 'Panini', 'Upper Deck', 'Fleer', 'Donruss', 'Bowman', 'Leaf'];
    for (const mfg of manufacturers) {
        if (title.includes(mfg)) {
            cardData.manufacturer = mfg;
            break;
        }
    }

    const numberMatch = title.match(/#(\d{1,4})|(\d{1,4})\/\d{1,4}/);
    if (numberMatch) {
        cardData.cardNumber = numberMatch[1] || numberMatch[0];
    }

    const parallels = ['Refractor', 'Chrome', 'Prizm', 'Optic', 'Mosaic', 'Holo'];
    for (const parallel of parallels) {
        if (title.toLowerCase().includes(parallel.toLowerCase())) {
            cardData.parallel = parallel;
            break;
        }
    }

    let confidenceScore = 0;
    if (cardData.year) confidenceScore += 0.3;
    if (cardData.manufacturer) confidenceScore += 0.3;
    if (cardData.cardNumber) confidenceScore += 0.2;
    if (cardData.parallel) confidenceScore += 0.2;

    cardData.confidence = confidenceScore;

    return cardData;
};

const buildAccurateSearchQuery = (cardInfo) => {
    const parts = [];

    if (cardInfo.year) parts.push(cardInfo.year);
    if (cardInfo.manufacturer) parts.push(cardInfo.manufacturer);
    if (cardInfo.name) parts.push(cardInfo.name);
    if (cardInfo.cardNumber) parts.push(`#${cardInfo.cardNumber}`);
    if (cardInfo.parallel) parts.push(cardInfo.parallel);
    if (cardInfo.rookie) parts.push('Rookie');
    if (cardInfo.autograph) parts.push('Autograph');
    if (cardInfo.relic) parts.push('Relic');

    // If no parts were added, use a default
    if (parts.length === 0) {
        return 'trading card';
    }

    return parts.join(' ');
};

const findBestMatch = (matches, originalCardInfo) => {
    if(matches.length === 0) return null;

    const scoredMatches = matches.map(match => {
        let score = 0;

        if(match.year && match.year === originalCardInfo.year) score += 30;
        if (match.manufacturer && match.manufacturer === originalCardInfo.manufacturer) score += 25;
        if (match.cardNumber && match.cardNumber === originalCardInfo.cardNumber) score += 20;
        if (match.parallel && match.parallel === originalCardInfo.parallel) score += 15;
        
        return { ...match, score };
    });

    scoredMatches.sort((a,b) => b.score - a.score);
    return scoredMatches[0];
};