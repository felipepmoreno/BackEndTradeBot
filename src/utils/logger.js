const fs = require('fs');
const path = require('path');
const config = require('../config/appConfig');

// Garantir que o diretório de logs existe
const logDir = path.dirname(config.logging.level);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Níveis de log e seus valores numéricos
const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

// Determinar o nível de log a partir da configuração
const currentLevel = LOG_LEVELS[config.logging.level] || LOG_LEVELS.info;

// Cores para a saída do console
const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
    info: '\x1b[36m',
    debug: '\x1b[32m'
};

// Classe logger
class Logger {
    constructor() {
        this.logToFile = true;
        this.logToConsole = true;
    }

    /**
     * Formata uma mensagem de log
     * @param {string} level - Nível do log
     * @param {string} message - Mensagem principal
     * @param {Object} [data] - Dados adicionais para logging
     * @returns {string} Mensagem formatada
     */
    _formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        if (data) {
            if (data instanceof Error) {
                logMessage += `\n${data.stack || data.message}`;
            } else if (typeof data === 'object') {
                try {
                    logMessage += `\n${JSON.stringify(data, null, 2)}`;
                } catch (e) {
                    logMessage += `\n[Object não serializável]`;
                }
            } else {
                logMessage += `\n${data}`;
            }
        }
        
        return logMessage;
    }

    /**
     * Escreve uma mensagem de log no arquivo
     * @param {string} formattedMessage - Mensagem formatada
     */
    _writeToFile(formattedMessage) {
        if (!this.logToFile) return;
        
        try {
            fs.appendFileSync(
                config.logging.file,
                formattedMessage + '\n'
            );
        } catch (error) {
            console.error('Erro ao escrever no arquivo de log:', error);
        }
    }

    /**
     * Registra um log de nível 'error'
     * @param {string} message - Mensagem do log
     * @param {Object} [data] - Dados adicionais
     */
    error(message, data) {
        if (currentLevel < LOG_LEVELS.error) return;
        
        const formattedMessage = this._formatMessage('error', message, data);
        this._writeToFile(formattedMessage);
        
        if (this.logToConsole) {
            console.error(`${COLORS.error}${formattedMessage}${COLORS.reset}`);
        }
    }

    /**
     * Registra um log de nível 'warn'
     * @param {string} message - Mensagem do log
     * @param {Object} [data] - Dados adicionais
     */
    warn(message, data) {
        if (currentLevel < LOG_LEVELS.warn) return;
        
        const formattedMessage = this._formatMessage('warn', message, data);
        this._writeToFile(formattedMessage);
        
        if (this.logToConsole) {
            console.warn(`${COLORS.warn}${formattedMessage}${COLORS.reset}`);
        }
    }

    /**
     * Registra um log de nível 'info'
     * @param {string} message - Mensagem do log
     * @param {Object} [data] - Dados adicionais
     */
    info(message, data) {
        if (currentLevel < LOG_LEVELS.info) return;
        
        const formattedMessage = this._formatMessage('info', message, data);
        this._writeToFile(formattedMessage);
        
        if (this.logToConsole) {
            console.info(`${COLORS.info}${formattedMessage}${COLORS.reset}`);
        }
    }

    /**
     * Registra um log de nível 'debug'
     * @param {string} message - Mensagem do log
     * @param {Object} [data] - Dados adicionais
     */
    debug(message, data) {
        if (currentLevel < LOG_LEVELS.debug) return;
        
        const formattedMessage = this._formatMessage('debug', message, data);
        this._writeToFile(formattedMessage);
        
        if (this.logToConsole) {
            console.debug(`${COLORS.debug}${formattedMessage}${COLORS.reset}`);
        }
    }
}

// Cria uma instância singleton do logger
const logger = new Logger();

module.exports = logger;