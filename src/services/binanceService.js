const axios = require('axios');
const crypto = require('crypto');
const { WebSocket } = require('ws');
const logger = require('../utils/logger');

// Carrega as credenciais das variáveis de ambiente
const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_API_SECRET;
const USE_TESTNET = process.env.USE_BINANCE_TESTNET === 'true';

// Define as URLs base com base na configuração
const BASE_URL = USE_TESTNET 
  ? 'https://testnet.binance.vision/api' 
  : 'https://api.binance.com';

const WS_BASE_URL = USE_TESTNET
  ? 'wss://testnet.binance.vision/ws'
  : 'wss://stream.binance.com:9443/ws';

// Cache para limites de taxa
const rateLimits = {
  lastRequestTime: 0,
  requestsInWindow: 0,
  windowSize: parseInt(process.env.RATE_LIMIT_WINDOW) || 1000,
  maxRequests: parseInt(process.env.RATE_LIMIT) || 10
};

/**
 * Gera uma assinatura HMAC-SHA256 para autenticação
 * @param {string} queryString - String de consulta para assinar
 * @returns {string} - Assinatura hexadecimal
 */
const createSignature = (queryString) => {
  return crypto
    .createHmac('sha256', API_SECRET)
    .update(queryString)
    .digest('hex');
};

/**
 * Aplica limitação de taxa para evitar exceder limites da API
 * @returns {Promise} - Promessa que resolve quando é seguro fazer uma nova solicitação
 */
const applyRateLimit = async () => {
  const now = Date.now();
  const elapsedTime = now - rateLimits.lastRequestTime;

  // Redefine o contador se estiver em uma nova janela de tempo
  if (elapsedTime > rateLimits.windowSize) {
    rateLimits.requestsInWindow = 0;
    rateLimits.lastRequestTime = now;
    return Promise.resolve();
  }

  // Verifica se atingimos o limite de solicitações
  if (rateLimits.requestsInWindow >= rateLimits.maxRequests) {
    // Espera até o final da janela de tempo atual
    const timeToWait = rateLimits.windowSize - elapsedTime;
    logger.debug(`Rate limit reached, waiting ${timeToWait}ms`);
    return new Promise(resolve => setTimeout(resolve, timeToWait));
  }

  rateLimits.requestsInWindow++;
  return Promise.resolve();
};

/**
 * Faz uma solicitação para a API da Binance
 * @param {string} endpoint - Endpoint da API
 * @param {string} method - Método HTTP
 * @param {object} params - Parâmetros da solicitação
 * @param {boolean} requiresAuth - Se a solicitação requer autenticação
 * @returns {Promise} - Resposta da API
 */
const makeRequest = async (endpoint, method = 'GET', params = {}, requiresAuth = false) => {
  try {
    await applyRateLimit();
    
    let queryString = '';
    let url = `${BASE_URL}${endpoint}`;

    // Adiciona timestamp e prepara a string de consulta para assinatura
    if (requiresAuth) {
      params.timestamp = Date.now();
      queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
      
      const signature = createSignature(queryString);
      queryString = `${queryString}&signature=${signature}`;
    } else if (Object.keys(params).length > 0) {
      queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
    }

    // Adiciona a string de consulta à URL
    if (queryString) {
      url = `${url}?${queryString}`;
    }

    // Configura o cabeçalho com a API Key se necessário
    const headers = {};
    if (requiresAuth) {
      headers['X-MBX-APIKEY'] = API_KEY;
    }

    logger.debug(`Making ${method} request to ${url}`);

    const response = await axios({
      method,
      url,
      headers,
      data: method !== 'GET' ? params : undefined
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    logger.error(`Binance API Error (${endpoint}): ${error.message}`);
    
    if (error.response) {
      return {
        success: false,
        error: error.response.data.msg || error.response.statusText || error.message,
        code: error.response.status,
        data: error.response.data
      };
    }
    
    return {
      success: false,
      error: error.message,
      code: 500
    };
  }
};

/**
 * Cria uma conexão WebSocket com um stream da Binance
 * @param {string} stream - Nome do stream
 * @param {function} onMessage - Callback para mensagens
 * @param {function} onError - Callback para erros
 * @param {function} onClose - Callback para fechamento da conexão
 * @returns {WebSocket} - Objeto WebSocket
 */
const createWebSocketConnection = (stream, onMessage, onError, onClose) => {
  const url = `${WS_BASE_URL}/${stream}`;
  const ws = new WebSocket(url);
  
  ws.on('open', () => {
    logger.info(`WebSocket connection opened: ${stream}`);
  });
  
  ws.on('message', (data) => {
    try {
      const parsedData = JSON.parse(data);
      onMessage(parsedData);
    } catch (error) {
      logger.error(`Error parsing WebSocket message: ${error.message}`);
      if (onError) onError(error);
    }
  });
  
  ws.on('error', (error) => {
    logger.error(`WebSocket error for ${stream}: ${error.message}`);
    if (onError) onError(error);
  });
  
  ws.on('close', (code, reason) => {
    logger.info(`WebSocket closed for ${stream}: ${code} - ${reason || 'No reason provided'}`);
    if (onClose) onClose(code, reason);
  });
  
  return ws;
};

// API para dados de mercado
const marketData = {
  /**
   * Obtém o preço atual de um símbolo
   * @param {string} symbol - Símbolo de trading (ex: BTCUSDT)
   * @returns {Promise} - Preço atual
   */
  getTickerPrice: async (symbol) => {
    const endpoint = '/v3/ticker/price';
    const params = symbol ? { symbol } : {};
    return await makeRequest(endpoint, 'GET', params);
  },
  
  /**
   * Obtém dados OHLCV (candles)
   * @param {string} symbol - Símbolo de trading (ex: BTCUSDT)
   * @param {string} interval - Intervalo (ex: 1m, 1h, 1d)
   * @param {number} limit - Número máximo de candles
   * @returns {Promise} - Dados de candles
   */
  getKlines: async (symbol, interval, limit = 500) => {
    const endpoint = '/v3/klines';
    const params = { symbol, interval, limit };
    return await makeRequest(endpoint, 'GET', params);
  },
  
  /**
   * Obtém o livro de ordens
   * @param {string} symbol - Símbolo de trading (ex: BTCUSDT)
   * @param {number} limit - Profundidade do livro (max 5000)
   * @returns {Promise} - Dados do livro de ordens
   */
  getOrderBook: async (symbol, limit = 100) => {
    const endpoint = '/v3/depth';
    const params = { symbol, limit };
    return await makeRequest(endpoint, 'GET', params);
  },
  
  /**
   * Obtém negociações recentes
   * @param {string} symbol - Símbolo de trading (ex: BTCUSDT)
   * @param {number} limit - Número de negociações
   * @returns {Promise} - Negociações recentes
   */
  getRecentTrades: async (symbol, limit = 500) => {
    const endpoint = '/v3/trades';
    const params = { symbol, limit };
    return await makeRequest(endpoint, 'GET', params);
  }
};

// API para trading
const trading = {
  /**
   * Cria uma nova ordem
   * @param {object} orderParams - Parâmetros da ordem
   * @returns {Promise} - Resultado da criação da ordem
   */
  createOrder: async (orderParams) => {
    const endpoint = '/v3/order';
    return await makeRequest(endpoint, 'POST', orderParams, true);
  },
  
  /**
   * Cancela uma ordem existente
   * @param {string} symbol - Símbolo de trading
   * @param {number} orderId - ID da ordem
   * @returns {Promise} - Resultado do cancelamento
   */
  cancelOrder: async (symbol, orderId) => {
    const endpoint = '/v3/order';
    const params = { symbol, orderId };
    return await makeRequest(endpoint, 'DELETE', params, true);
  },
  
  /**
   * Obtém o status de uma ordem
   * @param {string} symbol - Símbolo de trading
   * @param {number} orderId - ID da ordem
   * @returns {Promise} - Status da ordem
   */
  getOrderStatus: async (symbol, orderId) => {
    const endpoint = '/v3/order';
    const params = { symbol, orderId };
    return await makeRequest(endpoint, 'GET', params, true);
  },
  
  /**
   * Obtém todas as ordens abertas
   * @param {string} symbol - Símbolo de trading (opcional)
   * @returns {Promise} - Lista de ordens abertas
   */
  getOpenOrders: async (symbol = null) => {
    const endpoint = '/v3/openOrders';
    const params = symbol ? { symbol } : {};
    return await makeRequest(endpoint, 'GET', params, true);
  },
  
  /**
   * Obtém histórico de ordens
   * @param {string} symbol - Símbolo de trading
   * @param {number} limit - Número de ordens
   * @returns {Promise} - Histórico de ordens
   */
  getOrderHistory: async (symbol, limit = 500) => {
    const endpoint = '/v3/allOrders';
    const params = { symbol, limit };
    return await makeRequest(endpoint, 'GET', params, true);
  }
};

// API para conta
const account = {
  /**
   * Obtém informações da conta
   * @returns {Promise} - Informações da conta
   */
  getAccountInfo: async () => {
    const endpoint = '/v3/account';
    return await makeRequest(endpoint, 'GET', {}, true);
  },
  
  /**
   * Obtém histórico de trades
   * @param {string} symbol - Símbolo de trading
   * @param {number} limit - Número de trades
   * @returns {Promise} - Histórico de trades
   */
  getMyTrades: async (symbol, limit = 500) => {
    const endpoint = '/v3/myTrades';
    const params = { symbol, limit };
    return await makeRequest(endpoint, 'GET', params, true);
  },
  
  /**
   * Obtém informações de saldo de um ativo
   * @param {string} asset - Símbolo do ativo
   * @returns {Promise} - Informações do saldo
   */
  getAssetBalance: async (asset) => {
    const accountInfo = await account.getAccountInfo();
    
    if (!accountInfo.success) {
      return accountInfo;
    }
    
    const balance = accountInfo.data.balances.find(b => b.asset === asset);
    
    return {
      success: true,
      data: balance || { asset, free: '0', locked: '0' }
    };
  },
  
  /**
   * Testa conectividade com a API e valida as credenciais
   * @returns {Promise} - Resultado do teste
   */
  testConnectivity: async () => {
    try {
      // Primeiro teste da API pública
      const pingResponse = await makeRequest('/v3/ping', 'GET');
      
      if (!pingResponse.success) {
        return pingResponse;
      }
      
      // Teste da API privada
      const accountResponse = await account.getAccountInfo();
      
      return accountResponse.success 
        ? { success: true, message: 'API connection successful', data: { apiKey: API_KEY.slice(0, 8) + '...' } }
        : accountResponse;
    } catch (error) {
      logger.error(`API Connectivity test failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

module.exports = {
  marketData,
  trading,
  account,
  createWebSocketConnection,
  BASE_URL,
  WS_BASE_URL,
  USE_TESTNET
};