const axios = require('axios');
const crypto = require('crypto');
const querystring = require('querystring');
const logger = require('../utils/logger');
const config = require('../config/appConfig');

class BinanceService {
  constructor() {
    this.apiKey = config.binance.apiKey;
    this.apiSecret = config.binance.apiSecret;
    this.baseUrl = config.binance.testMode 
      ? 'https://testnet.binance.vision/api' 
      : 'https://api.binance.com/api';
    this.wsBaseUrl = config.binance.testMode 
      ? 'wss://testnet.binance.vision/ws'
      : 'wss://stream.binance.com:9443/ws';
    
    // API rate limiters
    this.requestCount = 0;
    this.lastRequestTime = Date.now();
    this.requestQueue = [];
    this.processing = false;
    
    // Initialize rate limiter
    setInterval(() => {
      this.requestCount = 0;
      this.lastRequestTime = Date.now();
    }, config.binance.rateLimitWindow);
  }
  
  /**
   * Testa a conexão com a API da Binance
   * @returns {Promise<Object>} Resultado do teste
   */
  async testConnection() {
    try {
      const response = await this._makeRequest('/v3/ping', 'GET');
      return { success: true, data: response };
    } catch (error) {
      logger.error('Erro ao testar conexão com Binance:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Obtém informações da conta
   * @returns {Promise<Object>} Informações da conta
   */
  async getAccountInfo() {
    try {
      const response = await this._makeRequest('/v3/account', 'GET', {}, true);
      return { success: true, data: response };
    } catch (error) {
      logger.error('Erro ao obter informações da conta:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Obtém preço atual de um par
   * @param {string} symbol - Par de trading
   * @returns {Promise<Object>} Preço atual
   */
  async getTickerPrice(symbol) {
    try {
      const params = symbol ? { symbol } : {};
      const response = await this._makeRequest('/v3/ticker/price', 'GET', params);
      return { success: true, data: response };
    } catch (error) {
      logger.error(`Erro ao obter preço para ${symbol}:`, error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Obtém profundidade de mercado
   * @param {string} symbol - Par de trading
   * @param {number} limit - Limite de níveis (default: 100, max: 5000)
   * @returns {Promise<Object>} Profundidade de mercado
   */
  async getOrderBook(symbol, limit = 100) {
    try {
      const params = { symbol, limit };
      const response = await this._makeRequest('/v3/depth', 'GET', params);
      return { success: true, data: response };
    } catch (error) {
      logger.error(`Erro ao obter order book para ${symbol}:`, error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Obtém dados de candles
   * @param {string} symbol - Par de trading
   * @param {string} interval - Intervalo (1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M)
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Object>} Dados de candles
   */
  async getKlines(symbol, interval, options = {}) {
    try {
      const params = {
        symbol,
        interval,
        limit: options.limit || 500,
        startTime: options.startTime,
        endTime: options.endTime
      };
      
      const response = await this._makeRequest('/v3/klines', 'GET', params);
      
      // Formatar resposta para objetos mais amigáveis
      const formattedCandles = response.map(candle => ({
        openTime: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
        closeTime: candle[6],
        quoteVolume: parseFloat(candle[7]),
        trades: candle[8],
        buyBaseVolume: parseFloat(candle[9]),
        buyQuoteVolume: parseFloat(candle[10]),
        ignored: candle[11]
      }));
      
      return { success: true, data: formattedCandles };
    } catch (error) {
      logger.error(`Erro ao obter candles para ${symbol}:`, error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Cria uma ordem
   * @param {Object} orderParams - Parâmetros da ordem
   * @returns {Promise<Object>} Resultado da criação da ordem
   */
  async createOrder(orderParams) {
    try {
      const response = await this._makeRequest('/v3/order', 'POST', orderParams, true);
      return { success: true, data: response };
    } catch (error) {
      logger.error('Erro ao criar ordem:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Cria uma ordem OCO (One Cancels the Other)
   * @param {Object} orderParams - Parâmetros da ordem
   * @returns {Promise<Object>} Resultado da criação da ordem OCO
   */
  async createOcoOrder(orderParams) {
    try {
      const response = await this._makeRequest('/v3/order/oco', 'POST', orderParams, true);
      return { success: true, data: response };
    } catch (error) {
      logger.error('Erro ao criar ordem OCO:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Cancela uma ordem
   * @param {string} symbol - Par de trading
   * @param {string} orderId - ID da ordem
   * @returns {Promise<Object>} Resultado do cancelamento
   */
  async cancelOrder(symbol, orderId) {
    try {
      const params = { symbol, orderId };
      const response = await this._makeRequest('/v3/order', 'DELETE', params, true);
      return { success: true, data: response };
    } catch (error) {
      logger.error(`Erro ao cancelar ordem ${orderId}:`, error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Cancela todas as ordens de um símbolo
   * @param {string} symbol - Par de trading
   * @returns {Promise<Object>} Resultado do cancelamento
   */
  async cancelAllOrders(symbol) {
    try {
      const params = { symbol };
      const response = await this._makeRequest('/v3/openOrders', 'DELETE', params, true);
      return { success: true, data: response };
    } catch (error) {
      logger.error(`Erro ao cancelar todas as ordens para ${symbol}:`, error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Obtém status de uma ordem
   * @param {string} symbol - Par de trading
   * @param {string} orderId - ID da ordem
   * @returns {Promise<Object>} Status da ordem
   */
  async getOrder(symbol, orderId) {
    try {
      const params = { symbol, orderId };
      const response = await this._makeRequest('/v3/order', 'GET', params, true);
      return { success: true, data: response };
    } catch (error) {
      logger.error(`Erro ao obter status da ordem ${orderId}:`, error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Obtém todas as ordens abertas
   * @param {string} symbol - Par de trading (opcional)
   * @returns {Promise<Object>} Lista de ordens abertas
   */
  async getOpenOrders(symbol = null) {
    try {
      const params = symbol ? { symbol } : {};
      const response = await this._makeRequest('/v3/openOrders', 'GET', params, true);
      return { success: true, data: response };
    } catch (error) {
      logger.error('Erro ao obter ordens abertas:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Cria um WebSocket para atualizações de profundidade
   * @param {string} symbol - Par de trading
   * @param {Function} callback - Função de callback
   * @returns {WebSocket} Instância do WebSocket
   */
  createDepthWebSocket(symbol, callback) {
    try {
      const lowerSymbol = symbol.toLowerCase();
      const ws = new WebSocket(`${this.wsBaseUrl}/${lowerSymbol}@depth`);
      
      ws.onopen = () => {
        logger.info(`WebSocket de profundidade para ${symbol} aberto`);
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        callback(data);
      };
      
      ws.onerror = (error) => {
        logger.error(`Erro no WebSocket de profundidade para ${symbol}:`, error);
      };
      
      ws.onclose = () => {
        logger.info(`WebSocket de profundidade para ${symbol} fechado`);
      };
      
      return ws;
    } catch (error) {
      logger.error(`Erro ao criar WebSocket de profundidade para ${symbol}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Cria um WebSocket para atualizações de candles
   * @param {string} symbol - Par de trading
   * @param {string} interval - Intervalo 
   * @param {Function} callback - Função de callback
   * @returns {WebSocket} Instância do WebSocket
   */
  createKlineWebSocket(symbol, interval, callback) {
    try {
      const lowerSymbol = symbol.toLowerCase();
      const ws = new WebSocket(`${this.wsBaseUrl}/${lowerSymbol}@kline_${interval}`);
      
      ws.onopen = () => {
        logger.info(`WebSocket de candles para ${symbol} aberto`);
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        callback(data);
      };
      
      ws.onerror = (error) => {
        logger.error(`Erro no WebSocket de candles para ${symbol}:`, error);
      };
      
      ws.onclose = () => {
        logger.info(`WebSocket de candles para ${symbol} fechado`);
      };
      
      return ws;
    } catch (error) {
      logger.error(`Erro ao criar WebSocket de candles para ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Realiza uma requisição para a API da Binance
   * @param {string} endpoint - Endpoint da API
   * @param {string} method - Método HTTP
   * @param {Object} params - Parâmetros da requisição
   * @param {boolean} signed - Se a requisição precisa ser assinada
   * @returns {Promise<Object>} Resposta da API
   * @private
   */
  async _makeRequest(endpoint, method, params = {}, signed = false) {
    return new Promise((resolve, reject) => {
      // Adicionar requisição à fila
      this.requestQueue.push({
        endpoint,
        method,
        params,
        signed,
        resolve,
        reject
      });
      
      // Processar fila se não estiver processando
      if (!this.processing) {
        this._processQueue();
      }
    });
  }
  
  /**
   * Processa a fila de requisições respeitando os limites de rate
   * @private
   */
  async _processQueue() {
    if (this.requestQueue.length === 0 || this.processing) {
      return;
    }
    
    this.processing = true;
    
    try {
      // Verificar limites de rate
      if (this.requestCount >= config.binance.rateLimit) {
        const waitTime = config.binance.rateLimitWindow - (Date.now() - this.lastRequestTime);
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        this.requestCount = 0;
      }
      
      const request = this.requestQueue.shift();
      this.requestCount++;
      
      let fullUrl = this.baseUrl + request.endpoint;
      let headers = { 'X-MBX-APIKEY': this.apiKey };
      let data = null;
      
      if (request.signed) {
        // Adicionar timestamp para requisições assinadas
        request.params.timestamp = Date.now();
        
        // Criar assinatura
        const queryString = querystring.stringify(request.params);
        request.params.signature = crypto
          .createHmac('sha256', this.apiSecret)
          .update(queryString)
          .digest('hex');
      }
      
      if (request.method === 'GET') {
        if (Object.keys(request.params).length > 0) {
          fullUrl += '?' + querystring.stringify(request.params);
        }
      } else {
        data = request.params;
      }
      
      const response = await axios({
        method: request.method,
        url: fullUrl,
        headers,
        data: request.method !== 'GET' ? request.params : null
      });
      
      request.resolve(response.data);
    } catch (error) {
      const request = this.requestQueue[0];
      if (request) {
        request.reject(error);
      } else {
        logger.error('Erro ao processar fila de requisições:', error);
      }
    } finally {
      this.processing = false;
      
      // Continuar processando a fila se houver mais requisições
      if (this.requestQueue.length > 0) {
        setTimeout(() => this._processQueue(), 50); // Pequeno delay para não sobrecarregar
      }
    }
  }
}

// Singleton
const binanceService = new BinanceService();

module.exports = binanceService;