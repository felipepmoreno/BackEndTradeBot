const winston = require('winston');
const path = require('path');

// Configuração dos níveis de log
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Configuração das cores para cada nível de log
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Adiciona cores aos níveis
winston.addColors(colors);

// Formatos de log
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define os transportes (onde os logs serão armazenados)
const transports = [
  // Console para todos os logs
  new winston.transports.Console(),
  
  // Arquivo para erros
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
  }),
  
  // Arquivo para todos os logs
  new winston.transports.File({ 
    filename: path.join(__dirname, '../../logs/combined.log') 
  }),
];

// Cria o logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
});

module.exports = logger;