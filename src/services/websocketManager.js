const WebSocket = require('ws');
const logger = require('../utils/logger');

class WebSocketManager {
  constructor() {
    this.connections = new Map();
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
  }

  createConnection(url, options = {}) {
    const ws = new WebSocket(url);
    const connectionId = options.id || url;

    const connection = {
      ws,
      isAlive: true,
      lastPing: Date.now(),
      options
    };

    this.setupWebSocketHandlers(connection, connectionId);
    this.connections.set(connectionId, connection);
    
    return ws;
  }

  setupWebSocketHandlers(connection, connectionId) {
    const { ws, options } = connection;

    ws.on('open', () => {
      logger.info(`WebSocket connection established: ${connectionId}`);
      this.reconnectAttempts.set(connectionId, 0);
      if (options.onOpen) options.onOpen();
    });

    ws.on('message', (data) => {
      try {
        const parsedData = JSON.parse(data);
        if (options.onMessage) options.onMessage(parsedData);
      } catch (error) {
        logger.error(`Error processing WebSocket message: ${error.message}`);
      }
    });

    ws.on('error', (error) => {
      logger.error(`WebSocket error for ${connectionId}:`, error);
      if (options.onError) options.onError(error);
    });

    ws.on('close', () => {
      logger.info(`WebSocket connection closed: ${connectionId}`);
      this.handleReconnect(connectionId, options);
      if (options.onClose) options.onClose();
    });

    // Setup ping/pong
    const pingInterval = setInterval(() => {
      if (!connection.isAlive) {
        clearInterval(pingInterval);
        ws.terminate();
        return;
      }
      connection.isAlive = false;
      ws.ping();
    }, 30000);

    ws.on('pong', () => {
      connection.isAlive = true;
      connection.lastPing = Date.now();
    });
  }

  async handleReconnect(connectionId, options) {
    const attempts = this.reconnectAttempts.get(connectionId) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      logger.error(`Max reconnection attempts reached for ${connectionId}`);
      return;
    }

    this.reconnectAttempts.set(connectionId, attempts + 1);
    
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
    
    logger.info(`Attempting to reconnect ${connectionId} (attempt ${attempts + 1})`);
    this.createConnection(options.url, options);
  }

  closeConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.ws.close();
      this.connections.delete(connectionId);
    }
  }

  closeAll() {
    for (const [connectionId] of this.connections) {
      this.closeConnection(connectionId);
    }
  }
}

module.exports = new WebSocketManager();
