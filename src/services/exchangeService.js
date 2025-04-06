const axios = require('axios');
const crypto = require('crypto');
const settingsService = require('./settingsService');
const logger = require('../utils/logger');

/**
 * Test connection to exchange API
 * @param {Object} credentials - API credentials (optional, will use stored if not provided)
 * @returns {Object} Test result
 */
exports.testConnection = async (credentials = null) => {
  try {
    // Get credentials from settings if not provided
    const settings = await settingsService.getSettings();
    const apiKey = credentials?.apiKey || settings.apiKey;
    const apiSecret = credentials?.apiSecret || settings.apiSecret;
    
    if (!apiKey || !apiSecret) {
      return {
        success: false,
        error: 'API key and secret not configured'
      };
    }
    
    // Test connection to Binance API
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    
    // Sign request
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(queryString)
      .digest('hex');
    
    // Make API request
    const response = await axios.get('https://api.binance.com/api/v3/account', {
      headers: {
        'X-MBX-APIKEY': apiKey
      },
      params: {
        timestamp,
        signature
      }
    });
    
    logger.info('API connection test successful');
    
    return {
      success: true,
      message: 'Connection established successfully',
      balances: response.data.balances.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
    };
  } catch (error) {
    logger.error('API connection test failed:', error);
    
    let errorMessage = 'Failed to connect to exchange API';
    if (error.response) {
      errorMessage = `API Error: ${error.response.data.msg || error.response.statusText}`;
    } else if (error.request) {
      errorMessage = 'No response from exchange API';
    } else {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Get account information from exchange
 * @returns {Object} Account information
 */
exports.getAccountInfo = async () => {
  try {
    const settings = await settingsService.getSettings();
    const { apiKey, apiSecret } = settings;
    
    if (!apiKey || !apiSecret) {
      return {
        success: false,
        error: 'API key and secret not configured'
      };
    }
    
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(queryString)
      .digest('hex');
    
    const response = await axios.get('https://api.binance.com/api/v3/account', {
      headers: {
        'X-MBX-APIKEY': apiKey
      },
      params: {
        timestamp,
        signature
      }
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    logger.error('Error getting account information:', error);
    
    let errorMessage = 'Failed to get account information';
    if (error.response) {
      errorMessage = `API Error: ${error.response.data.msg || error.response.statusText}`;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};
