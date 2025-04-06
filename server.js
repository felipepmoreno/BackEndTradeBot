// server.js - Ponto de entrada principal do backend

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const dotenv = require('dotenv');
const config = require('./src/config/appConfig');
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
// Configurar CORS para permitir conexões do frontend
app.use(cors({
  origin: config.app.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
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

// Adiciona desligamento gracioso
const gracefulShutdown = async () => {
  logger.info('Initiating graceful shutdown...');
  
  // Fecha conexões WebSocket
  wss.clients.forEach(client => {
    client.terminate();
  });
  
  // Fecha servidor HTTP
  server.close(async () => {
    logger.info('Servidor HTTP fechado.');
    
    // Fecha conexão com o banco de dados, se habilitado
    if (config.database.enabled) {
      await connectDB.disconnect();
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