// services/cardPriceScraper.js - Regex-based version
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
  // Look for $ followed by numbers, possibly with commas or decimals
  const match = text.match(/\$?([0-9,]+(?:\.\d{2})?)/);
  if (match) {
    // Remove commas and convert to number
    const priceStr = match[1].replace(/,/g, '');
    const price = parseFloat(priceStr);
    return isNaN(price) ? null : price;
  }
  return null;
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const calculateStats = (prices) => {
  if (!prices || prices.length === 0) return null;
  
  prices.sort((a, b) => a - b);
  
  return {
    average: Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)),
    median: Number(prices[Math.floor(prices.length / 2)].toFixed(2)),
    min: Number(prices[0].toFixed(2)),
    max: Number(prices[prices.length - 1].toFixed(2)),
    sampleSize: prices.length
  };
};

// Simple regex-based HTML parser for price extraction
const extractPricesFromHTML = (html, patterns) => {
  const prices = [];
  
  for (const pattern of patterns) {
    const regex = new RegExp(pattern, 'gi');
    let match;
    while ((match = regex.exec(html)) !== null) {
      const price = extractPrice(match[0]);
      if (price && price > 0.5 && price < 100000) {
        prices.push(price);
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
    
    // Look for price patterns in the HTML
    const pricePatterns = [
      '\\$[0-9,]+\\.?[0-9]*',
      '>[0-9,]+\\.?[0-9]*<',
      'price">\\$?[0-9,]+\\.?[0-9]*'
    ];
    
    const foundPrices = extractPricesFromHTML(html, pricePatterns);
    
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
    
    // eBay specific price patterns
    const pricePatterns = [
      '\\$[0-9,]+\\.\\d{2}',
      's-item__price[^>]*>[^<]*\\$[0-9,]+\\.\\d{2}',
      'data-testid="item-price">[^<]*\\$[0-9,]+\\.\\d{2}'
    ];
    
    const foundPrices = extractPricesFromHTML(html, pricePatterns);
    
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
    
    const foundPrices = extractPricesFromHTML(html, pricePatterns);
    const validPrices = foundPrices.filter(p => p > 0.5 && p < 10000);
    
    if (validPrices.length > 0) {
      prices.push(...validPrices);
      if (!sources.includes('tcgplayer')) sources.push('tcgplayer');
    }
  } catch (error) {
    console.log('TCGPlayer error:', error.message);
  }
};

const scrapePriceCharting = async (query, prices, sources) => {
  try {
    const url = `https://www.pricecharting.com/search?q=${encodeURIComponent(query)}`;
    
    const response = await axios.get(url, { headers, timeout: 10000 });
    const html = response.data;
    
    const pricePatterns = [
      '\\$[0-9,]+\\.\\d{2}',
      'price">\\$?[0-9,]+\\.\\d{2}',
      'used_price">\\$?[0-9,]+\\.\\d{2}'
    ];
    
    const foundPrices = extractPricesFromHTML(html, pricePatterns);
    const validPrices = foundPrices.filter(p => p > 0.5 && p < 100000);
    
    if (validPrices.length > 0) {
      prices.push(...validPrices);
      if (!sources.includes('pricecharting')) sources.push('pricecharting');
    }
  } catch (error) {
    console.log('PriceCharting error:', error.message);
  }
};

const scrapeCardPricer = async (query, prices, sources) => {
  try {
    const url = `https://www.cardpricer.com/search?q=${encodeURIComponent(query)}`;
    
    const response = await axios.get(url, { headers, timeout: 10000 });
    const html = response.data;
    
    const pricePatterns = [
      '\\$[0-9,]+\\.\\d{2}',
      'price-value">\\$?[0-9,]+\\.\\d{2}',
      'sold-price">\\$?[0-9,]+\\.\\d{2}'
    ];
    
    const foundPrices = extractPricesFromHTML(html, pricePatterns);
    const validPrices = foundPrices.filter(p => p > 1 && p < 100000);
    
    if (validPrices.length > 0) {
      prices.push(...validPrices);
      if (!sources.includes('cardpricer')) sources.push('cardpricer');
    }
  } catch (error) {
    console.log('CardPricer error:', error.message);
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
  await delay(3000);
  await scrapeCardPricer(query, prices, sources);
  
  const stats = calculateStats(prices);
  
  return {
    query,
    prices,
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
  await delay(3000);
  await scrapePriceCharting(query, prices, sources);
  
  const stats = calculateStats(prices);
  
  return {
    query,
    prices,
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
  await scrapeCardPricer(cardQuery, prices, sources);
  
  const stats = calculateStats(prices);
  
  return {
    query: cardQuery,
    prices,
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