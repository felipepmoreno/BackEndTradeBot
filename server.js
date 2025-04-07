require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const path = require('path');
const fs = require('fs');

const routes = require('./src/routes');
const { initWsServer } = require('./src/websocket/wsServer');
const logger = require('./src/utils/logger');

// Criar diretório de logs se não existir
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Inicializar o app Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count']
}));
app.use(helmet()); // Adiciona headers de segurança
app.use(express.json()); // Parser para JSON
app.use(express.urlencoded({ extended: true })); // Parser para form data

// Logging de requisições HTTP
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.http(message.trim())
  }
}));

// Rotas da API
app.use('/api', routes);

// Criar servidor HTTP
const server = http.createServer(app);

// Inicializar servidor WebSocket
const wsServer = initWsServer(server);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'TradingBot API is running',
    documentation: '/api-docs'
  });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Iniciar o servidor
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`API available at http://localhost:${PORT}/api`);
  logger.info(`WebSocket server available at ws://localhost:${PORT}/ws`);
  
  // Log das informações de conexão da Testnet
  const binanceService = require('./src/services/binanceService');
  logger.info(`Using Binance ${binanceService.USE_TESTNET ? 'TESTNET' : 'PRODUCTION'}`);
  logger.info(`Binance REST API: ${binanceService.BASE_URL}`);
  logger.info(`Binance WebSocket API: ${binanceService.WS_BASE_URL}`);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  logger.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise);
  logger.error('Reason:', reason);
});

// Exportar para testes
module.exports = { app, server };