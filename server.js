// server.js - Ponto de entrada principal do backend

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./src/services/databaseService');
const routes = require('./src/api/routes');
const { initWsServer } = require('./src/utils/webSocketServer');
const { initTradingEngine } = require('./src/core/tradingEngine');
const logger = require('./src/utils/logger');

// Carrega variáveis de ambiente
dotenv.config();

// Inicializa o app Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas API
app.use('/api', routes);

// Rota simples para verificar se o servidor está rodando
app.get('/', (req, res) => {
  res.send('Bot de Trading API está rodando! 🚀');
});

// Cria o servidor HTTP
const server = http.createServer(app);

// Inicializa o servidor WebSocket
const wss = initWsServer(server);

// Inicializa o banco de dados (se configurado)
if (process.env.USE_DATABASE === 'true') {
  connectDB()
    .then(() => logger.info('Conexão com o banco de dados estabelecida'))
    .catch(err => {
      logger.error('Erro ao conectar com o banco de dados:', err);
      process.exit(1);
    });
}

// Inicia o servidor
server.listen(PORT, () => {
  logger.info(`Servidor rodando na porta ${PORT}`);
  
  // Inicia o motor de trading após o servidor estar pronto
  initTradingEngine(wss)
    .then(() => {
      logger.info('Motor de trading inicializado com sucesso');
    })
    .catch(err => {
      logger.error('Erro ao inicializar o motor de trading:', err);
    });
});

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
  logger.error('Erro não capturado:', err);
  // Em um ambiente de produção, você poderia querer notificar administradores
  // e reiniciar o processo graciosamente
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Rejeição não tratada em:', promise, 'razão:', reason);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido.');
  server.close(() => {
    logger.info('Servidor HTTP fechado.');
    process.exit(0);
  });
});