// services/GetCardPrice.jsx - Ultra-aggressive filtering for accurate prices
import axios from 'axios';

// ==================== UTILITY FUNCTIONS ====================

const headers = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Cache-Control': 'no-cache'
};

const extractPrice = (text) => {
  if (!text) return null;
  const match = text.match(/\$?([0-9,]+(?:\.\d{2})?)/);
  if (match) {
    const priceStr = match[1].replace(/,/g, '');
    const price = parseFloat(priceStr);
    return isNaN(price) ? null : price;
  }
  return null;
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Ultra-aggressive stats calculation for accurate prices
const calculateStats = (prices, cardType = 'sports') => {
  if (!prices || prices.length === 0) return null;

  // Sort prices
  prices.sort((a, b) => a - b);

  let filteredPrices = prices;

  if (cardType === 'pokemon') {
    // Balanced filtering - keeps more valid sales
    // Remove top 20% and bottom 20% (keep middle 60%)
    const startIdx = Math.floor(prices.length * 0.20);
    const endIdx = Math.floor(prices.length * 0.80);
    filteredPrices = prices.slice(startIdx, endIdx);

    // If we have very few samples, be more lenient
    if (filteredPrices.length < 5) {
      filteredPrices = prices.slice(Math.floor(prices.length * 0.10), Math.floor(prices.length * 0.90));
    }

    // Remove extreme outliers only (prices > 3x median)
    const median = prices[Math.floor(prices.length / 2)];
    filteredPrices = filteredPrices.filter(price => price <= median * 3);

    // Only filter out ridiculous prices ($1000+ for common cards)
    filteredPrices = filteredPrices.filter(price => price <= 1000);
  } else {
    // Sports cards - more aggressive filtering
    // Remove top 20% and bottom 20%
    const startIdx = Math.floor(prices.length * 0.20);
    const endIdx = Math.floor(prices.length * 0.80);
    filteredPrices = prices.slice(startIdx, endIdx);

    // Use modified IQR method with tighter bounds
    const q1 = filteredPrices[Math.floor(filteredPrices.length * 0.25)];
    const q3 = filteredPrices[Math.floor(filteredPrices.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - (iqr * 1.2); // Tighter lower bound
    const upperBound = q3 + (iqr * 1.2); // Tighter upper bound

    filteredPrices = filteredPrices.filter(price =>
      price >= lowerBound && price <= upperBound
    );

    // Remove any price over $500 for common sports cards
    filteredPrices = filteredPrices.filter(price => price <= 500);
  }

  // If filtering removed too many, use original but with more conservative approach
  const usePrices = filteredPrices.length >= 3 ? filteredPrices : prices;

  // Calculate stats
  const median = Number(usePrices[Math.floor(usePrices.length / 2)].toFixed(2));
  const average = Number((usePrices.reduce((a, b) => a + b, 0) / usePrices.length).toFixed(2));

  // Get most common price range (mode) - group by $1 for common cards
  const priceRanges = {};
  usePrices.forEach(price => {
    const range = Math.floor(price); // Group by whole dollars
    priceRanges[range] = (priceRanges[range] || 0) + 1;
  });

  let mostCommonRange = null;
  let maxCount = 0;
  Object.entries(priceRanges).forEach(([range, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommonRange = parseInt(range);
    }
  });

  // Calculate weighted value that leans toward lower end for both types
  let displayValue;
  if (cardType === 'pokemon') {
    // For Pokémon, use the lowest of:
    // - 25th percentile value
    // - mode
    // - 70% of average
    const percentile25 = usePrices[Math.floor(usePrices.length * 0.25)] || median;
    displayValue = Math.min(
      percentile25,
      mostCommonRange ? mostCommonRange + 0.5 : percentile25,
      average * 0.7
    );
  } else {
    // For sports, use the lower of median or 80% of average
    displayValue = Math.min(median, average * 0.8);
  }

  return {
    average,
    median,
    mode: mostCommonRange ? Number((mostCommonRange + 0.5).toFixed(2)) : median,
    displayValue: Number(displayValue.toFixed(2)),
    min: Number(usePrices[0].toFixed(2)),
    max: Number(usePrices[usePrices.length - 1].toFixed(2)),
    sampleSize: usePrices.length,
    totalSamples: prices.length,
    outliersRemoved: prices.length - usePrices.length,
    confidence: Math.round((usePrices.length / prices.length) * 100)
  };
};

const extractPricesFromHTML = (html, patterns, excludeKeywords = []) => {
  const prices = [];

  for (const pattern of patterns) {
    const regex = new RegExp(pattern, 'gi');
    let match;
    while ((match = regex.exec(html)) !== null) {
      const start = Math.max(0, match.index - 100); // Larger context for better filtering
      const end = Math.min(html.length, match.index + match[0].length + 100);
      const context = html.substring(start, end).toLowerCase();

      // Expanded exclude keywords
      const shouldExclude = excludeKeywords.some(keyword =>
        context.includes(keyword.toLowerCase())
      );

      if (!shouldExclude) {
        const price = extractPrice(match[0]);
        if (price && price > 0.5 && price < 100000) {
          prices.push(price);
        }
      }
    }
  }

  return prices;
};

// ==================== SCRAPER FUNCTIONS ====================

const scrape130Point = async (query, prices, sources) => {
  try {
    const searchQuery = query.replace(/\s+/g, '-').toLowerCase();
    const url = `https://130point.com/sales/${searchQuery}`;

    const response = await axios.get(url, { headers, timeout: 10000 });
    const html = response.data;

    const pricePatterns = [
      '\\$[0-9,]+\\.?[0-9]*',
      '>[0-9,]+\\.?[0-9]*<',
      'price">\\$?[0-9,]+\\.?[0-9]*'
    ];

    const foundPrices = extractPricesFromHTML(html, pricePatterns, [
      'grade', 'auction', 'best offer', 'lot', 'bulk', 'set', 'case', 'box',
      'parallel', 'variation', 'error', 'rookie', 'auto', 'relic'
    ]);

    if (foundPrices.length > 0) {
      prices.push(...foundPrices);
      if (!sources.includes('130point')) sources.push('130point');
    }
  } catch (error) {
    console.log('130Point error:', error.message);
  }
};

const scrapeEbaySold = async (query, prices, sources) => {
  try {
    const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1`;

    const response = await axios.get(url, { headers, timeout: 10000 });
    const html = response.data;

    const pricePatterns = [
      '\\$[0-9,]+\\.\\d{2}',
      's-item__price[^>]*>[^<]*\\$[0-9,]+\\.\\d{2}',
      'data-testid="item-price">[^<]*\\$[0-9,]+\\.\\d{2}'
    ];

    const foundPrices = extractPricesFromHTML(html, pricePatterns, [
      'lot', 'bulk', 'case', 'box', 'set', 'job lot', 'collection', 'complete set',
      'booster', 'pack', 'sealed', 'tin', 'etb', 'elite trainer box', 'graded',
      'psa', 'bgs', 'beckett', 'sgc', 'auto', 'autograph', 'relic', 'patch',
      '#' // Skip listings with hashtags (usually parallel/rare variations)
    ]);

    // Filter for reasonable prices and remove duplicates
    const validPrices = foundPrices.filter(p => p > 1 && p < 100000);

    if (validPrices.length > 0) {
      prices.push(...validPrices);
      if (!sources.includes('ebay')) sources.push('ebay');
    }
  } catch (error) {
    console.log('eBay error:', error.message);
  }
};

const scrapeTCGPlayer = async (query, prices, sources) => {
  try {
    const url = `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(query)}`;

    const response = await axios.get(url, { headers, timeout: 10000 });
    const html = response.data;

    const pricePatterns = [
      '\\$[0-9,]+\\.\\d{2}',
      'market-price">\\$?[0-9,]+\\.\\d{2}',
      'inventory__price-with-shipping">[^<]*\\$[0-9,]+\\.\\d{2}'
    ];

    const foundPrices = extractPricesFromHTML(html, pricePatterns, [
      '1st edition', 'unlimited', 'lot', 'bulk', 'played', 'damaged', 'set', 'box',
      'reverse holo', 'holo', 'stamped', 'promo', 'league', 'staff', 'prerelease',
      'championship', 'theme deck', 'ex', 'gx', 'vmax', 'vstar'
    ]);

    const validPrices = foundPrices.filter(p => p > 0.5 && p < 10000);

    if (validPrices.length > 0) {
      prices.push(...validPrices);
      if (!sources.includes('tcgplayer')) sources.push('tcgplayer');
    }
  } catch (error) {
    console.log('TCGPlayer error:', error.message);
  }
};

// ==================== MAIN FUNCTIONS ====================

export const getSportsCardPrice = async (cardQuery) => {
  const query = cardQuery.trim();

  const prices = [];
  const sources = [];

  await scrape130Point(query, prices, sources);
  await delay(2000);
  await scrapeEbaySold(query, prices, sources);
  await delay(2000);

  const stats = calculateStats(prices, 'sports');

  console.log(`📊 Sports card price stats for "${query}":`);
  console.log(`   - Total samples: ${stats?.totalSamples || 0}`);
  console.log(`   - Filtered samples: ${stats?.sampleSize || 0}`);
  console.log(`   - Outliers removed: ${stats?.outliersRemoved || 0}`);
  console.log(`   - Display value: $${stats?.displayValue || 'N/A'}`);
  console.log(`   - Confidence: ${stats?.confidence || 0}%`);

  return {
    query,
    prices: stats ? prices : [],
    sources: [...new Set(sources)],
    ...stats,
    timestamp: new Date().toISOString()
  };
};

export const getPokemonCardPrice = async (cardQuery) => {
  const query = cardQuery.trim();

  const prices = [];
  const sources = [];

  await scrapeTCGPlayer(query, prices, sources);
  await delay(2000);
  await scrapeEbaySold(query, prices, sources);
  await delay(2000);

  const stats = calculateStats(prices, 'pokemon');

  console.log(`📊 Pokémon card price stats for "${query}":`);
  console.log(`   - Total samples: ${stats?.totalSamples || 0}`);
  console.log(`   - Filtered samples: ${stats?.sampleSize || 0}`);
  console.log(`   - Outliers removed: ${stats?.outliersRemoved || 0}`);
  console.log(`   - Display value: $${stats?.displayValue || 'N/A'}`);
  console.log(`   - Confidence: ${stats?.confidence || 0}%`);

  return {
    query,
    prices: stats ? prices : [],
    sources: [...new Set(sources)],
    ...stats,
    timestamp: new Date().toISOString()
  };
};

export const searchCardPrice = async (cardQuery, type = 'sports') => {
  if (type.toLowerCase() === 'pokemon') {
    return getPokemonCardPrice(cardQuery);
  } else {
    return getSportsCardPrice(cardQuery);
  }
};

export const getCardPrice = async (cardQuery) => {
  const prices = [];
  const sources = [];

  await scrapeEbaySold(cardQuery, prices, sources);
  await delay(2000);
  await scrape130Point(cardQuery, prices, sources);
  await delay(2000);

  const stats = calculateStats(prices, 'sports');

  return {
    query: cardQuery,
    prices: stats ? prices : [],
    sources: [...new Set(sources)],
    ...stats,
    timestamp: new Date().toISOString()
  };
};

export default {
  getSportsCardPrice,
  getPokemonCardPrice,
  searchCardPrice,
  getCardPrice
};