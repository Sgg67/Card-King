import axios from 'axios';
import parser from 'fast-html-parser';

const headers = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
};

const extractPrice = (text)=>{
    if(!text) return null;
    const match = text.match(/\$?(\d+(?:\.\d{2})?)/);
    return match ? parseFloat(match[1]) : null;
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const calculateStats = (prices) => {
    if(!prices || prices.length === 0) return null;

    prices.sort((a,b) => a - b);

    return {
        average: Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2))
    };
};

const scrape130Point = async(query, prices, sources)=>{

}
