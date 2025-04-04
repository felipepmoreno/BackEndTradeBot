// src/services/binanceService.js

// Importações
import axios from 'axios';

const BASE_URL = process.env.TEST_MODE === 'true' 
  ? 'https://testnet.binance.vision' 
  : 'https://api.binance.com';

const WS_BASE_URL = process.env.TEST_MODE === 'true'
  ? 'wss://testnet.binance.vision/ws'
  : 'wss://stream.binance.com:9443/ws';

// Chaves de API (em produção deveriam vir de variáveis de ambiente ou configuração segura)
let apiKey = '';
let apiSecret = '';

/**
 * Inicializa o serviço com as chaves da API
 * @param {string} key - Chave da API Binance
 * @param {string} secret - Chave secreta da API Binance
 */
export const initBinanceService = (key, secret) => {
  apiKey = key;
  apiSecret = secret;
  console.log('Binance service initialized');
  return testConnection();
};

/**
 * Testa a conexão com a API da Binance
 * @returns {Promise} Resultado do teste de conexão
 */
export const testConnection = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/v3/ping`, {
      headers: { 'X-MBX-APIKEY': apiKey }
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Erro ao testar conexão com a Binance:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtém informações da conta
 * @returns {Promise} Informações da conta
 */
export const getAccountInfo = async () => {
  try {
    const timestamp = Date.now();
    const signature = createSignature(`timestamp=${timestamp}`);
    
    const response = await axios.get(`${BASE_URL}/api/v3/account`, {
      headers: { 'X-MBX-APIKEY': apiKey },
      params: { timestamp, signature }
    });
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Erro ao obter informações da conta:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtém o preço atual de um ou mais símbolos
 * @param {string|Array} symbols - Símbolo ou array de símbolos (ex: 'BTCUSDT')
 * @returns {Promise} Preços atuais
 */
export const getTickerPrice = async (symbols) => {
  try {
    let url = `${BASE_URL}/api/v3/ticker/price`;
    
    if (symbols) {
      if (Array.isArray(symbols)) {
        const symbolsParam = symbols.join('","');
        url = `${url}?symbols=["${symbolsParam}"]`;
      } else {
        url = `${url}?symbol=${symbols}`;
      }
    }
    
    const response = await axios.get(url);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Erro ao obter preços:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Cria uma ordem de compra ou venda
 * @param {Object} orderParams - Parâmetros da ordem
 * @returns {Promise} Resultado da criação da ordem
 */
export const createOrder = async (orderParams) => {
  try {
    const timestamp = Date.now();
    const params = {
      ...orderParams,
      timestamp,
      recvWindow: 5000
    };
    
    // Cria a string de consulta para assinatura
    const queryString = Object.keys(params)
      .map(key => `${key}=${params[key]}`)
      .join('&');
      
    const signature = createSignature(queryString);
    
    const response = await axios.post(`${BASE_URL}/api/v3/order`, null, {
      headers: { 'X-MBX-APIKEY': apiKey },
      params: { ...params, signature }
    });
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Erro ao criar ordem:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Cancela uma ordem
 * @param {string} symbol - Símbolo da moeda (ex: 'BTCUSDT')
 * @param {number} orderId - ID da ordem
 * @returns {Promise} Resultado do cancelamento
 */
export const cancelOrder = async (symbol, orderId) => {
  try {
    const timestamp = Date.now();
    const queryString = `symbol=${symbol}&orderId=${orderId}&timestamp=${timestamp}`;
    const signature = createSignature(queryString);
    
    const response = await axios.delete(`${BASE_URL}/api/v3/order`, {
      headers: { 'X-MBX-APIKEY': apiKey },
      params: {
        symbol,
        orderId,
        timestamp,
        signature
      }
    });
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Erro ao cancelar ordem:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtém o histórico de ordens
 * @param {string} symbol - Símbolo da moeda (ex: 'BTCUSDT')
 * @param {Object} options - Opções adicionais (limit, fromId, etc)
 * @returns {Promise} Histórico de ordens
 */
export const getOrderHistory = async (symbol, options = {}) => {
  try {
    const timestamp = Date.now();
    const params = {
      symbol,
      timestamp,
      ...options
    };
    
    const queryString = Object.keys(params)
      .map(key => `${key}=${params[key]}`)
      .join('&');
      
    const signature = createSignature(queryString);
    
    const response = await axios.get(`${BASE_URL}/api/v3/allOrders`, {
      headers: { 'X-MBX-APIKEY': apiKey },
      params: { ...params, signature }
    });
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Erro ao obter histórico de ordens:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtém dados de candle (OHLCV)
 * @param {string} symbol - Símbolo da moeda (ex: 'BTCUSDT')
 * @param {string} interval - Intervalo (1m, 5m, 15m, 1h, etc)
 * @param {Object} options - Opções adicionais (limit, startTime, endTime)
 * @returns {Promise} Dados de candle
 */
export const getKlines = async (symbol, interval, options = {}) => {
  try {
    const params = {
      symbol,
      interval,
      ...options
    };
    
    const response = await axios.get(`${BASE_URL}/api/v3/klines`, { params });
    
    // Formata os dados para um formato mais amigável
    const formattedData = response.data.map(candle => ({
      time: candle[0],
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
      closeTime: candle[6],
      quoteAssetVolume: parseFloat(candle[7]),
      trades: candle[8],
      takerBuyBaseAssetVolume: parseFloat(candle[9]),
      takerBuyQuoteAssetVolume: parseFloat(candle[10])
    }));
    
    return { success: true, data: formattedData };
  } catch (error) {
    console.error('Erro ao obter dados de candle:', error);
    return { success: false, error: error.message };
  }
};

// WebSocket connections

/**
 * Cria uma conexão WebSocket para atualizações de preço em tempo real
 * @param {string|Array} symbols - Símbolo ou array de símbolos (ex: 'BTCUSDT')
 * @param {Function} onMessage - Callback para mensagens recebidas
 * @returns {WebSocket} Conexão WebSocket
 */
export const createTickerWebSocket = (symbols, onMessage) => {
  let streamName;
  
  if (Array.isArray(symbols)) {
    // Para múltiplos símbolos, usamos streams combinados
    const streams = symbols.map(s => `${s.toLowerCase()}@ticker`).join('/');
    streamName = `stream?streams=${streams}`;
  } else {
    // Para um único símbolo
    streamName = `${symbols.toLowerCase()}@ticker`;
  }
  
  const ws = new WebSocket(`${WS_BASE_URL}/${streamName}`);
  
  ws.onopen = () => {
    console.log('Conexão WebSocket estabelecida para ticker');
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error('Erro ao processar mensagem WebSocket:', error);
    }
  };
  
  ws.onerror = (error) => {
    console.error('Erro na conexão WebSocket:', error);
  };
  
  ws.onclose = () => {
    console.log('Conexão WebSocket fechada para ticker');
  };
  
  return ws;
};

/**
 * Cria uma conexão WebSocket para atualizações de candle em tempo real
 * @param {string} symbol - Símbolo da moeda (ex: 'BTCUSDT')
 * @param {string} interval - Intervalo (1m, 5m, 15m, 1h, etc)
 * @param {Function} onMessage - Callback para mensagens recebidas
 * @returns {WebSocket} Conexão WebSocket
 */
export const createKlineWebSocket = (symbol, interval, onMessage) => {
  const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
  const ws = new WebSocket(`${WS_BASE_URL}/${streamName}`);
  
  ws.onopen = () => {
    console.log(`Conexão WebSocket estabelecida para candles ${symbol} ${interval}`);
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error('Erro ao processar mensagem WebSocket:', error);
    }
  };
  
  ws.onerror = (error) => {
    console.error('Erro na conexão WebSocket:', error);
  };
  
  ws.onclose = () => {
    console.log(`Conexão WebSocket fechada para candles ${symbol} ${interval}`);
  };
  
  return ws;
};

/**
 * Cria uma conexão WebSocket para livro de ordens em tempo real
 * @param {string} symbol - Símbolo da moeda (ex: 'BTCUSDT')
 * @param {Function} onMessage - Callback para mensagens recebidas
 * @param {number} levels - Número de níveis de profundidade (5, 10, 20)
 * @returns {WebSocket} Conexão WebSocket
 */
export const createDepthWebSocket = (symbol, onMessage, levels = 20) => {
  const streamName = `${symbol.toLowerCase()}@depth${levels}`;
  const ws = new WebSocket(`${WS_BASE_URL}/${streamName}`);
  
  ws.onopen = () => {
    console.log(`Conexão WebSocket estabelecida para profundidade ${symbol}`);
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error('Erro ao processar mensagem WebSocket:', error);
    }
  };
  
  ws.onerror = (error) => {
    console.error('Erro na conexão WebSocket:', error);
  };
  
  ws.onclose = () => {
    console.log(`Conexão WebSocket fechada para profundidade ${symbol}`);
  };
  
  return ws;
};

// Funções auxiliares

/**
 * Cria uma assinatura HMAC para autenticação
 * @param {string} queryString - String de consulta a ser assinada
 * @returns {string} Assinatura HMAC
 */
const createSignature = (queryString) => {
  // Em um ambiente real, você usaria uma biblioteca como crypto-js
  // Para simplificar, estamos simulando a assinatura
  console.log(`Assinando: ${queryString}`);
  return 'simulated_signature_for_demo_purposes_only';
};

export default {
  initBinanceService,
  testConnection,
  getAccountInfo,
  getTickerPrice,
  createOrder,
  cancelOrder,
  getOrderHistory,
  getKlines,
  createTickerWebSocket,
  createKlineWebSocket,
  createDepthWebSocket
};