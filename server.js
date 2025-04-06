const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const logger = require('./src/utils/logger');
const config = require('./src/config');
const binanceService = require('./src/services/binanceService');
const apiRoutes = require('./src/routes/apiRoutes');

const app = express();
const PORT = config.app.port || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Setup routes - Fix: Directly mounting routes instead of using a setup function
app.use('/api', apiRoutes);

// Start server
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info('Servidor WebSocket inicializado');
});

// Handle WebSocket connections
wss.on('connection', (ws) => {
  logger.info('Client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      logger.info('Received:', data);
      
      // Handle client commands here
    } catch (error) {
      logger.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    logger.info('Client disconnected');
  });
});

// Graceful shutdown handler
function gracefulShutdown() {
  logger.info('Initiating graceful shutdown...');
  
  // First close WebSocket server
  wss.close(() => {
    logger.info('WebSocket server closed');
    
    // Then close HTTP server
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  });
  
  // If it takes too long, force exit
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

// Listen for termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Catch unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', reason);
});

module.exports = { app, server, wss };