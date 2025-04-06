const WebSocket = require('ws');
const logger = require('./logger');

/**
 * Create a WebSocket connection with auto-reconnect functionality
 * @param {string} url - WebSocket URL
 * @param {Function} onMessage - Message handler function
 * @param {Object} options - Configuration options
 * @returns {WebSocket} - WebSocket instance
 */
function createWebSocketConnection(url, onMessage, options = {}) {
  const {
    onOpen = () => {},
    onError = () => {},
    onClose = () => {},
    autoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectDelay = 5000
  } = options;
  
  let ws;
  let reconnectAttempts = 0;
  let reconnectTimeout = null;
  let terminated = false;
  
  const connect = () => {
    try {
      ws = new WebSocket(url);
      
      ws.onopen = (event) => {
        logger.info(`WebSocket connected: ${url}`);
        reconnectAttempts = 0;
        onOpen(event);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          logger.error('Error processing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        logger.error(`WebSocket error: ${url}`, error);
        onError(error);
      };
      
      ws.onclose = (event) => {
        logger.info(`WebSocket closed: ${url}`, event.code, event.reason);
        onClose(event);
        
        if (autoReconnect && !terminated) {
          handleReconnect();
        }
      };
      
      return ws;
    } catch (error) {
      logger.error(`Failed to create WebSocket connection: ${url}`, error);
      if (autoReconnect && !terminated) {
        handleReconnect();
      }
      return null;
    }
  };
  
  const handleReconnect = () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      logger.error(`Max reconnect attempts reached for ${url}, giving up`);
      return;
    }
    
    reconnectAttempts++;
    const delay = reconnectDelay * Math.pow(2, reconnectAttempts - 1);
    
    logger.info(`Reconnecting to ${url} in ${delay}ms (attempt ${reconnectAttempts})`);
    
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    
    reconnectTimeout = setTimeout(() => {
      if (!terminated) {
        connect();
      }
    }, delay);
  };
  
  const connection = connect();
  
  return {
    ws: connection,
    close: () => {
      terminated = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (connection && connection.readyState === WebSocket.OPEN) {
        connection.close();
      }
    }
  };
}

module.exports = {
  createWebSocketConnection
};
