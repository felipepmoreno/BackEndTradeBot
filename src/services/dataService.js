const axios = require('axios');
const logger = require('../utils/logger');
const settingsService = require('./settingsService');

/**
 * Fetch historical data from exchange or data provider
 * @param {string} symbol - Trading pair (e.g. 'BTCUSDT')
 * @param {string} startDate - Start date in ISO format
 * @param {string} endDate - End date in ISO format
 * @param {Array} timeframes - Array of timeframes to fetch (e.g. ['1h', '4h'])
 * @returns {Object} Historical data organized by timeframe
 */
exports.fetchHistoricalData = async (symbol, startDate, endDate, timeframes = ['1m', '5m', '15m', '1h', '4h', '1d']) => {
  try {
    const settings = await settingsService.getSettings();
    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(endDate).getTime();
    
    const results = {};
    
    // For each timeframe, fetch the data
    for (const timeframe of timeframes) {
      logger.info(`Fetching ${symbol} data for timeframe ${timeframe}`);
      
      // Convert timeframe to milliseconds for interval calculation
      const interval = parseTimeframeToMs(timeframe);
      
      // Calculate how many candles we need to fetch
      const candlesCount = Math.ceil((endTimestamp - startTimestamp) / interval);
      
      // Binance API has a limit of 1000 candles per request
      const maxCandles = 1000;
      
      // Initialize array to store all candles
      let allCandles = [];
      
      // If we need more than maxCandles, we need to make multiple requests
      if (candlesCount > maxCandles) {
        let currentStart = startTimestamp;
        
        while (currentStart < endTimestamp) {
          const currentEnd = Math.min(currentStart + (maxCandles * interval), endTimestamp);
          
          const candles = await fetchCandlesFromBinance(symbol, timeframe, currentStart, currentEnd);
          allCandles = [...allCandles, ...candles];
          
          // Update current start for next iteration
          currentStart = currentEnd;
        }
      } else {
        // We can fetch all candles in one request
        allCandles = await fetchCandlesFromBinance(symbol, timeframe, startTimestamp, endTimestamp);
      }
      
      // Format the candles
      const formattedCandles = allCandles.map(candle => ({
        time: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      }));
      
      results[timeframe] = formattedCandles;
    }
    
    return results;
  } catch (error) {
    logger.error('Error fetching historical data:', error);
    throw error;
  }
};

/**
 * Fetch candles from Binance API
 * @param {string} symbol - Trading pair
 * @param {string} interval - Candle interval (e.g. '1h')
 * @param {number} startTime - Start timestamp in milliseconds
 * @param {number} endTime - End timestamp in milliseconds
 * @returns {Array} Array of candles
 */
async function fetchCandlesFromBinance(symbol, interval, startTime, endTime) {
  try {
    const response = await axios.get('https://api.binance.com/api/v3/klines', {
      params: {
        symbol: symbol,
        interval: interval,
        startTime: startTime,
        endTime: endTime,
        limit: 1000
      }
    });
    
    return response.data;
  } catch (error) {
    logger.error('Error fetching candles from Binance:', error);
    throw error;
  }
}

/**
 * Convert timeframe string to milliseconds
 * @param {string} timeframe - Timeframe (e.g. '1h', '4h', '1d')
 * @returns {number} Milliseconds
 */
function parseTimeframeToMs(timeframe) {
  const unit = timeframe.slice(-1);
  const value = parseInt(timeframe.slice(0, -1));
  
  switch (unit) {
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'w': return value * 7 * 24 * 60 * 60 * 1000;
    default: return 60 * 1000; // Default to 1m
  }
}
