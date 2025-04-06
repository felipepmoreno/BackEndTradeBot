// server.js - Ponto de entrada principal do backend

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const backtestRoutes = require('./src/routes/backtestRoutes');
const strategyRoutes = require('./src/routes/strategyRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');

// Logger setup
const logger = require('./src/utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: require('./src/config/appConfig').app.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('combined')); // HTTP request logging

// Routes
app.use('/api/backtest', backtestRoutes);
app.use('/api/strategies', strategyRoutes);
app.use('/api/settings', settingsRoutes);

// Rota simples para verificar se o servidor está rodando
app.get('/', (req, res) => {
  res.send('Bot de Trading API está rodando! 🚀');
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled Rejection: ${error.message}`, error);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
  logger.error('Erro não capturado:', err);
});

// Adiciona desligamento gracioso
const gracefulShutdown = async () => {
  logger.info('Initiating graceful shutdown...');
  
  // Fecha conexões WebSocket
  const wss = require('./src/utils/webSocketServer').initWsServer(app);
  wss.clients.forEach(client => {
    client.terminate();
  });
  
  // Fecha servidor HTTP
  app.close(async () => {
    logger.info('Servidor HTTP fechado.');
    
    // Fecha conexão com o banco de dados, se habilitado
    const config = require('./src/config/appConfig');
    if (config.database.enabled) {
      await require('./src/services/databaseService').connectDB.disconnect();
    }
    
    process.exit(0);
  });
  
  // Força saída após timeout
  setTimeout(() => {
    logger.error('Não foi possível fechar conexões a tempo, encerrando forçadamente');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;