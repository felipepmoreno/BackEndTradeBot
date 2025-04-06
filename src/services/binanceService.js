const crypto = require('crypto');
const axios = require('axios');
const querystring = require('querystring');
const logger = require('../utils/logger');
const config = require('../config/appConfig');

class BinanceService {
  constructor() {
    // Use testnet or production API endpoints based on configuration
    this.useTestnet = process.env.USE_BINANCE_TESTNET === 'true';
    this.baseUrl = this.useTestnet 
      ? 'https://testnet.binance.vision/api' 
      : 'https://api.binance.com/api';
    this.baseWsUrl = this.useTestnet
      ? 'wss://testnet.binance.vision/ws'
      : 'wss://stream.binance.com:9443/ws';
    
    this.apiKey = config.binance.apiKey;
    this.apiSecret = config.binance.apiSecret;
    
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-MBX-APIKEY': this.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    logger.info(`Binance service initialized with ${this.useTestnet ? 'TESTNET' : 'PRODUCTION'} endpoints`);
  }
  
  /**
   * Test connectivity to the API
   */
  async testConnection() {
    try {
      const response = await this.axiosInstance.get('/v3/ping');
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      logger.error('Binance connection test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get exchange information
   */
  async getExchangeInfo() {
    try {
      const response = await this.axiosInstance.get('/v3/exchangeInfo');
      return { success: true, data: response.data };
    } catch (error) {
      logger.error('Failed to fetch exchange info:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get account information (requires signing)
   */
  async getAccountInfo() {
    try {
      const timestamp = Date.now();
      const queryParams = `timestamp=${timestamp}`;
      const signature = this.generateSignature(queryParams);
      
      const response = await this.axiosInstance.get(`/v3/account?${queryParams}&signature=${signature}`);
      return { success: true, data: response.data };
    } catch (error) {
      logger.error('Failed to fetch account info:', error.response?.data?.msg || error.message);
      return { success: false, error: error.response?.data?.msg || error.message };
    }
  }
  
  /**
   * Get ticker price for a symbol
   * @param {string} symbol - Trading pair symbol
   */
  async getTickerPrice(symbol) {
    try {
      const response = await this.axiosInstance.get('/v3/ticker/price', {
        params: { symbol }
      });
      return { success: true, data: response.data };
    } catch (error) {
      logger.error(`Failed to fetch ticker price for ${symbol}:`, error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get open orders
   */
  async getOpenOrders(symbol = null) {
    try {
      const timestamp = Date.now();
      let queryParams = `timestamp=${timestamp}`;
      
      if (symbol) {
        queryParams += `&symbol=${symbol}`;
      }
      
      const signature = this.generateSignature(queryParams);
      
      const response = await this.axiosInstance.get(`/v3/openOrders?${queryParams}&signature=${signature}`);
      return { success: true, data: response.data };
    } catch (error) {
      logger.error('Failed to fetch open orders:', error.response?.data?.msg || error.message);
      return { success: false, error: error.response?.data?.msg || error.message };
    }
  }
  
  /**
   * Get specific order status
   * @param {string} symbol - Trading pair symbol
   * @param {string} orderId - Order ID
   */
  async getOrder(symbol, orderId) {
    try {
      const timestamp = Date.now();
      const queryParams = `symbol=${symbol}&orderId=${orderId}&timestamp=${timestamp}`;
      const signature = this.generateSignature(queryParams);
      
      const response = await this.axiosInstance.get(`/v3/order?${queryParams}&signature=${signature}`);
      return { success: true, data: response.data };
    } catch (error) {
      logger.error(`Failed to fetch order ${orderId}:`, error.response?.data?.msg || error.message);
      return { success: false, error: error.response?.data?.msg || error.message };
    }
  }
  
  /**
   * Create a new order
   * @param {Object} orderParams - Order parameters
   */
  async createOrder(orderParams) {
    try {
      // Add timestamp to the order parameters
      const params = {
        ...orderParams,
        timestamp: Date.now()
      };
      
      // Create the query string
      const queryString = querystring.stringify(params);
      
      // Generate signature
      const signature = this.generateSignature(queryString);
      
      // Execute the request
      const response = await this.axiosInstance.post(
        `/v3/order?${queryString}&signature=${signature}`
      );
      
      logger.info(`Order created successfully: ${response.data.orderId}`);
      return { success: true, data: response.data };
    } catch (error) {
      logger.error('Failed to create order:', error.response?.data?.msg || error.message);
      return { success: false, error: error.response?.data?.msg || error.message };
    }
  }
  
  /**
   * Cancel an order
   * @param {string} symbol - Trading pair symbol
   * @param {string} orderId - Order ID
   */
  async cancelOrder(symbol, orderId) {
    try {
      const timestamp = Date.now();
      const queryParams = `symbol=${symbol}&orderId=${orderId}&timestamp=${timestamp}`;
      const signature = this.generateSignature(queryParams);
      
      const response = await this.axiosInstance.delete(`/v3/order?${queryParams}&signature=${signature}`);
      logger.info(`Order ${orderId} canceled successfully`);
      return { success: true, data: response.data };
    } catch (error) {
      logger.error(`Failed to cancel order ${orderId}:`, error.response?.data?.msg || error.message);
      return { success: false, error: error.response?.data?.msg || error.message };
    }
  }
  
  /**
   * Cancel all orders for a symbol
   * @param {string} symbol - Trading pair symbol
   */
  async cancelAllOrders(symbol) {
    try {
      const timestamp = Date.now();
      const queryParams = `symbol=${symbol}&timestamp=${timestamp}`;
      const signature = this.generateSignature(queryParams);
      
      const response = await this.axiosInstance.delete(`/v3/openOrders?${queryParams}&signature=${signature}`);
      logger.info(`All orders for ${symbol} canceled successfully`);
      return { success: true, data: response.data };
    } catch (error) {
      logger.error(`Failed to cancel all orders for ${symbol}:`, error.response?.data?.msg || error.message);
      return { success: false, error: error.response?.data?.msg || error.message };
    }
  }
  
  /**
   * Create an OCO order (One-Cancels-the-Other)
   * @param {Object} orderParams - OCO order parameters
   */
  async createOcoOrder(orderParams) {
    try {
      // Add timestamp to the order parameters
      const params = {
        ...orderParams,
        timestamp: Date.now()
      };
      
      // Create the query string
      const queryString = querystring.stringify(params);
      
      // Generate signature
      const signature = this.generateSignature(queryString);
      
      // Execute the request
      const response = await this.axiosInstance.post(
        `/v3/order/oco?${queryString}&signature=${signature}`
      );
      
      logger.info(`OCO order created successfully: ${response.data.orderListId}`);
      return { success: true, data: response.data };
    } catch (error) {
      logger.error('Failed to create OCO order:', error.response?.data?.msg || error.message);
      return { success: false, error: error.response?.data?.msg || error.message };
    }
  }
  
  /**
   * Get candlestick data (klines)
   * @param {string} symbol - Trading pair symbol
   * @param {string} interval - Kline interval
   * @param {Object} options - Additional options (limit, startTime, endTime)
   */
  async getKlines(symbol, interval, options = {}) {
    try {
      const params = {
        symbol,
        interval,
        ...options
      };
      
      const response = await this.axiosInstance.get('/v3/klines', { params });
      return { success: true, data: response.data };
    } catch (error) {
      logger.error(`Failed to fetch klines for ${symbol}:`, error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Create depth WebSocket connection
   * @param {string} symbol - Trading pair symbol
   * @param {Function} callback - Callback function for data
   */
  createDepthWebSocket(symbol, callback) {
    const ws = new WebSocket(`${this.baseWsUrl}/${symbol.toLowerCase()}@depth`);
    
    ws.onopen = () => {
      logger.info(`Depth WebSocket connected for ${symbol}`);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (error) {
        logger.error('Error processing WebSocket depth data:', error);
      }
    };
    
    ws.onerror = (error) => {
      logger.error(`WebSocket error for ${symbol}:`, error);
    };
    
    ws.onclose = () => {
      logger.info(`Depth WebSocket closed for ${symbol}`);
    };
    
    return ws;
  }
  
  /**
   * Generate HMAC SHA256 signature for API request
   * @param {string} queryString - Query string to sign
   * @returns {string} - Signature
   */
  generateSignature(queryString) {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }
}

// Export singleton instance
module.exports = new BinanceService();