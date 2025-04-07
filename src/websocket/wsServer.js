const WebSocket = require('ws');
const url = require('url');
const querystring = require('querystring');
const logger = require('../utils/logger');
const binanceService = require('../services/binanceService');

// Armazena todas as conexões ativas
const activeConnections = new Map();

/**
 * Gerencia as conexões WebSocket de acordo com o tipo
 * @param {WebSocket} ws - Conexão WebSocket do cliente
 * @param {string} path - Caminho da conexão
 * @param {object} query - Parâmetros da consulta
 */
const handleConnection = (ws, path, query) => {
  let binanceWs = null;
  let pingInterval = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = parseInt(process.env.MAX_RECONNECT_ATTEMPTS, 10) || 5;
  const reconnectDelay = parseInt(process.env.RECONNECT_DELAY, 10) || 5000;
  
  // Identificador único para a conexão
  const connectionId = `${path}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  
  // Função para reconectar ao WebSocket da Binance
  const reconnectBinanceWs = (streamName) => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      logger.error(`Maximum reconnection attempts reached for ${streamName}`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to reconnect to Binance WebSocket'
        }));
      }
      return;
    }
    
    reconnectAttempts++;
    logger.info(`Attempting to reconnect to Binance WebSocket (${reconnectAttempts}/${maxReconnectAttempts})`);
    
    setTimeout(() => {
      setupBinanceConnection(streamName);
    }, reconnectDelay);
  };
  
  // Configuração da conexão Binance com base no tipo de stream
  const setupBinanceConnection = (streamName) => {
    binanceWs = binanceService.createWebSocketConnection(
      streamName,
      (data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: path.substring(4), // Remove '/ws/' do início
            data: data
          }));
        }
      },
      (error) => {
        logger.error(`Binance WebSocket error: ${error.message}`);
        if (binanceWs) {
          try {
            binanceWs.close();
          } catch (e) {
            logger.error(`Error closing Binance WebSocket: ${e.message}`);
          }
        }
        reconnectBinanceWs(streamName);
      },
      () => {
        logger.info(`Binance WebSocket closed for ${streamName}`);
        reconnectBinanceWs(streamName);
      }
    );
    
    return binanceWs;
  };
  
  // Função para limpar conexões e intervalos
  const cleanup = () => {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    
    if (binanceWs && binanceWs.readyState === WebSocket.OPEN) {
      binanceWs.close();
      binanceWs = null;
    }
    
    activeConnections.delete(connectionId);
    logger.info(`WebSocket connection closed: ${path} (${activeConnections.size} active connections)`);
  };
  
  // Tratamento dos diferentes tipos de streams
  try {
    if (path.startsWith('/ws/ticker')) {
      const symbol = (query.symbol || 'btcusdt').toLowerCase();
      binanceWs = setupBinanceConnection(`${symbol}@ticker`);
      logger.info(`WebSocket ticker connection established for ${symbol}`);
      
      ws.send(JSON.stringify({
        type: 'connection',
        status: 'established',
        stream: `${symbol}@ticker`
      }));
    }
    else if (path.startsWith('/ws/kline')) {
      const symbol = (query.symbol || 'btcusdt').toLowerCase();
      const interval = query.interval || '1m';
      binanceWs = setupBinanceConnection(`${symbol}@kline_${interval}`);
      logger.info(`WebSocket kline connection established for ${symbol} (${interval})`);
      
      ws.send(JSON.stringify({
        type: 'connection',
        status: 'established',
        stream: `${symbol}@kline_${interval}`
      }));
    }
    else if (path.startsWith('/ws/depth')) {
      const symbol = (query.symbol || 'btcusdt').toLowerCase();
      const levels = query.levels || '20'; // 5, 10, 20 são os valores válidos
      binanceWs = setupBinanceConnection(`${symbol}@depth${levels}`);
      logger.info(`WebSocket depth connection established for ${symbol} (levels: ${levels})`);
      
      ws.send(JSON.stringify({
        type: 'connection',
        status: 'established',
        stream: `${symbol}@depth${levels}`
      }));
    }
    else if (path.startsWith('/ws/trades')) {
      const symbol = (query.symbol || 'btcusdt').toLowerCase();
      binanceWs = setupBinanceConnection(`${symbol}@trade`);
      logger.info(`WebSocket trade connection established for ${symbol}`);
      
      ws.send(JSON.stringify({
        type: 'connection',
        status: 'established',
        stream: `${symbol}@trade`
      }));
    }
    else if (path.startsWith('/ws/multi')) {
      // Permite assinar múltiplos streams com formato: symbol1@ticker+symbol2@kline_1m
      const streams = query.streams ? query.streams.split('+') : ['btcusdt@ticker'];
      binanceWs = setupBinanceConnection(streams.join('/'));
      logger.info(`WebSocket multi-stream connection established: ${streams.join(', ')}`);
      
      ws.send(JSON.stringify({
        type: 'connection',
        status: 'established',
        streams: streams
      }));
    }
    else {
      logger.warn(`Unsupported WebSocket path: ${path}`);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Unsupported WebSocket path'
      }));
      ws.close();
      return;
    }
    
    // Adiciona à lista de conexões ativas
    activeConnections.set(connectionId, { ws, binanceWs, path, query });
    
    // Configurar ping/pong para manter a conexão viva
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);
    
    // Tratar fechamento de conexão
    ws.on('close', () => {
      cleanup();
    });
    
    ws.on('error', (error) => {
      logger.error(`Client WebSocket error: ${error.message}`);
      cleanup();
    });
    
    ws.on('pong', () => {
      // Recebemos um pong, então a conexão ainda está ativa
      ws.isAlive = true;
    });
    
  } catch (error) {
    logger.error(`Error handling WebSocket connection: ${error.message}`);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Internal server error'
      }));
      ws.close();
    }
  }
};

/**
 * Inicializa o servidor WebSocket
 * @param {Server} server - Servidor HTTP para anexar o WebSocket
 * @returns {WebSocket.Server} - Servidor WebSocket
 */
const initWsServer = (server) => {
  // Inicializa o servidor WebSocket
  const wss = new WebSocket.Server({ 
    server: server,
    path: '/ws'
  });
  
  wss.on('connection', (ws, req) => {
    // Extrai caminho e parâmetros da URL
    const parsedUrl = url.parse(req.url);
    const path = parsedUrl.pathname;
    const query = querystring.parse(parsedUrl.query || '');
    
    logger.info(`New WebSocket connection: ${path}`);
    
    // Configura propriedade para verificação de conexão ativa
    ws.isAlive = true;
    
    // Trata a conexão de acordo com o path
    handleConnection(ws, path, query);
  });
  
  // Verificar conexões inativas periodicamente
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 60000);
  
  wss.on('close', () => {
    clearInterval(interval);
  });
  
  return wss;
};

module.exports = { 
  initWsServer,
  getActiveConnections: () => activeConnections.size
};
