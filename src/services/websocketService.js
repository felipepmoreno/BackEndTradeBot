const WebSocket = require('ws');
const logger = require('../utils/logger');
const config = require('../config/appConfig');

class WebSocketService {
  constructor() {
    this.connections = {};
    this.useTestnet = config.binance.useTestnet;
    this.baseWsUrl = this.useTestnet
      ? 'wss://testnet.binance.vision/ws'
      : 'wss://stream.binance.com:9443/ws';
    
    this.maxReconnectAttempts = config.websocket.maxReconnectAttempts;
    this.reconnectDelay = config.websocket.reconnectDelay;
  }
  
  /**
   * Create a new WebSocket connection
   * @param {string} streamName - Stream name 
   * @param {Function} onMessage - Message handler
   * @returns {string} - Connection ID
   */
  createConnection(streamName, onMessage) {
    const connectionId = `${streamName}_${Date.now()}`;
    const fullUrl = `${this.baseWsUrl}/${streamName}`;
    
    logger.info(`Creating WebSocket connection to ${fullUrl}`);
    
    const ws = new WebSocket(fullUrl);
    
    ws.onopen = () => {
      logger.info(`WebSocket connected: ${streamName}`);
      this.connections[connectionId].reconnectAttempts = 0;
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        logger.error('Error processing WebSocket data:', error);
      }
    };
    
    ws.onerror = (error) => {
      logger.error(`WebSocket error for ${streamName}:`, error);
    };
    
    ws.onclose = (event) => {
      logger.info(`WebSocket closed: ${streamName}`, event.code, event.reason);
      
      // Handle reconnection
      if (this.connections[connectionId] && !this.connections[connectionId].terminated) {
        this.handleReconnection(connectionId, streamName, onMessage);
      }
    };
    
    this.connections[connectionId] = {
      ws,
      streamName,
      reconnectAttempts: 0,
      terminated: false
    };
    
    return connectionId;
  }
  
  /**
   * Close a WebSocket connection
   * @param {string} connectionId - Connection ID
   */
  closeConnection(connectionId) {
    const connection = this.connections[connectionId];
    if (connection) {
      connection.terminated = true;
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.close();
      }
      delete this.connections[connectionId];
      logger.info(`WebSocket connection closed: ${connection.streamName}`);
    }
  }
  
  /**
   * Close all connections
   */
  closeAllConnections() {
    Object.keys(this.connections).forEach(id => this.closeConnection(id));
    logger.info('All WebSocket connections closed');
  }
  
  /**
   * Handle reconnection
   * @param {string} connectionId - Connection ID
   * @param {string} streamName - Stream name
   * @param {Function} onMessage - Message handler
   */
  handleReconnection(connectionId, streamName, onMessage) {
    const connection = this.connections[connectionId];
    
    if (connection.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`Max reconnect attempts reached for ${streamName}, giving up`);
      delete this.connections[connectionId];
      return;
    }
    
    connection.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, connection.reconnectAttempts - 1);
    
    logger.info(`Reconnecting to ${streamName} in ${delay}ms (attempt ${connection.reconnectAttempts})`);
    
    setTimeout(() => {
      if (!connection.terminated) {
        const fullUrl = `${this.baseWsUrl}/${streamName}`;
        connection.ws = new WebSocket(fullUrl);
        
        connection.ws.onopen = () => {
          logger.info(`WebSocket reconnected: ${streamName}`);
          connection.reconnectAttempts = 0;
        };
        
        connection.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            onMessage(data);
          } catch (error) {
            logger.error('Error processing WebSocket data:', error);
          }
        };
        
        connection.ws.onerror = (error) => {
          logger.error(`WebSocket error for ${streamName}:`, error);
        };
        
        connection.ws.onclose = (event) => {
          logger.info(`WebSocket closed after reconnection: ${streamName}`, event.code, event.reason);
          
          if (!connection.terminated) {
            this.handleReconnection(connectionId, streamName, onMessage);
          }
        };
      }
    }, delay);
  }
  
  /**
   * Subscribe to user data stream
   * @param {string} listenKey - Listen key from Binance API
   * @param {Function} onUpdate - Update handler
   * @returns {string} - Connection ID
   */
  subscribeUserDataStream(listenKey, onUpdate) {
    return this.createConnection(listenKey, onUpdate);
  }
  
  /**
   * Subscribe to market data stream
   * @param {string} symbol - Trading pair symbol
   * @param {string} type - Stream type (kline, depth, trade, etc.)
   * @param {Function} onData - Data handler
   * @returns {string} - Connection ID
   */
  subscribeMarketStream(symbol, type, onData) {
    const streamName = `${symbol.toLowerCase()}@${type}`;
    return this.createConnection(streamName, onData);
  }
}

// Export singleton instance
module.exports = new WebSocketService();
