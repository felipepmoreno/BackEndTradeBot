// src/utils/logger.js

const fs = require('fs');
const path = require('path');

// Níveis de log
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Configurações padrão
const DEFAULT_CONFIG = {
  level: LOG_LEVELS.INFO,
  enableConsole: true,
  enableFile: true,
  logDir: path.join(process.cwd(), 'logs'),
  logFilePrefix: 'bot',
  logMaxSize: 5 * 1024 * 1024, // 5MB
  logMaxFiles: 10,
  dateFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
};

/**
 * Utilitário de log para o bot de trading
 */
class Logger {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logStreams = {};
    
    // Criar diretório de logs se não existir
    if (this.config.enableFile) {
      this.ensureLogDir();
    }
  }
  
  /**
   * Garante que o diretório de logs existe
   */
  ensureLogDir() {
    if (!fs.existsSync(this.config.logDir)) {
      fs.mkdirSync(this.config.logDir, { recursive: true });
    }
  }
  
  /**
   * Obtém um stream de arquivo para o log
   * @param {string} level - Nível de log
   * @returns {fs.WriteStream} Stream de arquivo
   */
  getLogStream(level) {
    if (!this.logStreams[level]) {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const fileName = `${this.config.logFilePrefix}-${level.toLowerCase()}-${dateStr}.log`;
      const filePath = path.join(this.config.logDir, fileName);
      
      this.logStreams[level] = fs.createWriteStream(filePath, { flags: 'a' });
      
      // Verificar e rotacionar os logs
      this.checkLogRotation(filePath, level);
    }
    
    return this.logStreams[level];
  }
  
  /**
   * Verifica se é necessário rotacionar os logs
   * @param {string} filePath - Caminho do arquivo de log
   * @param {string} level - Nível de log
   */
  checkLogRotation(filePath, level) {
    try {
      const stats = fs.statSync(filePath);
      
      if (stats.size > this.config.logMaxSize) {
        // Fechar stream atual
        this.logStreams[level].end();
        
        // Criar novo nome de arquivo
        const now = new Date();
        const timestamp = Math.floor(now.getTime() / 1000);
        const newFileName = `${filePath}.${timestamp}`;
        
        // Renomear arquivo atual
        fs.renameSync(filePath, newFileName);
        
        // Criar novo stream
        this.logStreams[level] = fs.createWriteStream(filePath, { flags: 'a' });
        
        // Remover arquivos de log antigos
        this.removeOldLogs(level);
      }
    } catch (error) {
      console.error(`Erro ao verificar rotação de logs: ${error.message}`);
    }
  }
  
  /**
   * Remove arquivos de log antigos
   * @param {string} level - Nível de log
   */
  removeOldLogs(level) {
    try {
      const prefix = `${this.config.logFilePrefix}-${level.toLowerCase()}`;
      const files = fs.readdirSync(this.config.logDir)
        .filter(file => file.startsWith(prefix) && file !== this.logStreams[level].path)
        .map(file => ({
          name: file,
          time: fs.statSync(path.join(this.config.logDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time); // Ordenar do mais recente para o mais antigo
      
      // Remover arquivos excedentes
      if (files.length > this.config.logMaxFiles) {
        for (let i = this.config.logMaxFiles; i < files.length; i++) {
          fs.unlinkSync(path.join(this.config.logDir, files[i].name));
        }
      }
    } catch (error) {
      console.error(`Erro ao remover logs antigos: ${error.message}`);
    }
  }
  
  /**
   * Formata a mensagem de log
   * @param {string} level - Nível de log
   * @param {string} message - Mensagem de log
   * @param {any} meta - Metadados adicionais
   * @returns {string} Mensagem formatada
   */
  formatLogMessage(level, message, meta) {
    const now = new Date();
    const timestamp = now.toISOString();
    
    let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (meta) {
      if (meta instanceof Error) {
        logMessage += `\n${meta.stack || meta.message}`;
      } else if (typeof meta === 'object') {
        try {
          logMessage += `\n${JSON.stringify(meta, null, 2)}`;
        } catch (e) {
          logMessage += `\n[Objeto não serializável]`;
        }
      } else {
        logMessage += `\n${meta}`;
      }
    }
    
    return logMessage;
  }
  
  /**
   * Grava uma mensagem de log
   * @param {string} level - Nível de log
   * @param {string} message - Mensagem de log
   * @param {any} meta - Metadados adicionais
   */
  log(level, message, meta) {
    const numericLevel = LOG_LEVELS[level];
    
    if (numericLevel === undefined || numericLevel > this.config.level) {
      return;
    }
    
    const formattedMessage = this.formatLogMessage(level, message, meta);
    
    // Log no console
    if (this.config.enableConsole) {
      const consoleMethod = level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'log';
      console[consoleMethod](formattedMessage);
    }
    
    // Log em arquivo
    if (this.config.enableFile) {
      try {
        const stream = this.getLogStream(level);
        stream.write(formattedMessage + '\n');
      } catch (error) {
        console.error(`Erro ao gravar log em arquivo: ${error.message}`);
      }
    }
  }
  
  /**
   * Log de nível ERROR
   * @param {string} message - Mensagem de log
   * @param {any} meta - Metadados adicionais
   */
  error(message, meta) {
    this.log('ERROR', message, meta);
  }
  
  /**
   * Log de nível WARN
   * @param {string} message - Mensagem de log
   * @param {any} meta - Metadados adicionais
   */
  warn(message, meta) {
    this.log('WARN', message, meta);
  }
  
  /**
   * Log de nível INFO
   * @param {string} message - Mensagem de log
   * @param {any} meta - Metadados adicionais
   */
  info(message, meta) {
    this.log('INFO', message, meta);
  }
  
  /**
   * Log de nível DEBUG
   * @param {string} message - Mensagem de log
   * @param {any} meta - Metadados adicionais
   */
  debug(message, meta) {
    this.log('DEBUG', message, meta);
  }
  
  /**
   * Fecha todos os streams de log
   */
  close() {
    Object.values(this.logStreams).forEach(stream => {
      stream.end();
    });
    
    this.logStreams = {};
  }
}

// Criar instância de logger
const logger = new Logger();

module.exports = logger;