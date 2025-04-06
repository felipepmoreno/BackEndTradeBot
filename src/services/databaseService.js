const logger = require('../utils/logger');
const config = require('../config/appConfig');
const fs = require('fs');
const path = require('path');

// Diretório para armazenar dados em arquivos se não estiver usando banco de dados
const DATA_DIR = path.join(__dirname, '../../data');

class DatabaseService {
  constructor() {
    this.connected = false;
    // Cria o diretório de dados se não existir
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  /**
   * Conecta ao banco de dados ou inicializa armazenamento local
   */
  async connect() {
    if (config.database.enabled) {
      try {
        // Em uma implementação real, conectaria ao MongoDB, PostgreSQL, etc.
        logger.info('Conectando ao banco de dados...');
        // Simulando conexão bem-sucedida
        this.connected = true;
        logger.info('Conectado ao banco de dados com sucesso');
        return true;
      } catch (error) {
        logger.error('Erro ao conectar ao banco de dados:', error);
        return false;
      }
    } else {
      // Usando armazenamento local
      logger.info('Usando armazenamento local em arquivos JSON');
      this.connected = true;
      return true;
    }
  }

  /**
   * Verifica se está conectado ao banco de dados
   * @returns {boolean} Status da conexão
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Salva configurações de risco
   * @param {Object} settings - Configurações a salvar
   * @returns {Promise<boolean>} Sucesso da operação
   */
  async saveRiskSettings(settings) {
    try {
      if (config.database.enabled) {
        // Implementar lógica de salvamento no DB
        logger.info('Configurações de risco salvas no banco de dados');
      } else {
        // Salvar em arquivo
        await this._saveToFile('riskSettings.json', settings);
        logger.info('Configurações de risco salvas em arquivo');
      }
      return true;
    } catch (error) {
      logger.error('Erro ao salvar configurações de risco:', error);
      return false;
    }
  }

  /**
   * Obtém configurações de risco
   * @returns {Promise<Object|null>} Configurações de risco
   */
  async getRiskSettings() {
    try {
      if (config.database.enabled) {
        // Implementar lógica de busca no DB
        return null; // Temporário
      } else {
        // Ler de arquivo
        return await this._readFromFile('riskSettings.json');
      }
    } catch (error) {
      logger.error('Erro ao obter configurações de risco:', error);
      return null;
    }
  }

  /**
   * Salva portfólio
   * @param {Object} portfolio - Dados do portfólio
   * @returns {Promise<boolean>} Sucesso da operação
   */
  async savePortfolio(portfolio) {
    try {
      if (config.database.enabled) {
        // Implementar lógica de salvamento no DB
      } else {
        // Salvar em arquivo
        await this._saveToFile('portfolio.json', portfolio);
      }
      return true;
    } catch (error) {
      logger.error('Erro ao salvar portfólio:', error);
      return false;
    }
  }

  /**
   * Obtém portfólio
   * @returns {Promise<Object|null>} Dados do portfólio
   */
  async getPortfolio() {
    try {
      if (config.database.enabled) {
        // Implementar lógica de busca no DB
        return null; // Temporário
      } else {
        // Ler de arquivo
        return await this._readFromFile('portfolio.json');
      }
    } catch (error) {
      logger.error('Erro ao obter portfólio:', error);
      return null;
    }
  }

  /**
   * Salva histórico de trades
   * @param {Array} trades - Lista de trades
   * @returns {Promise<boolean>} Sucesso da operação
   */
  async saveTradeHistory(trades) {
    try {
      if (config.database.enabled) {
        // Implementar lógica de salvamento no DB
      } else {
        // Salvar em arquivo
        await this._saveToFile('tradeHistory.json', trades);
      }
      return true;
    } catch (error) {
      logger.error('Erro ao salvar histórico de trades:', error);
      return false;
    }
  }

  /**
   * Obtém histórico de trades
   * @returns {Promise<Array|null>} Lista de trades
   */
  async getTradeHistory() {
    try {
      if (config.database.enabled) {
        // Implementar lógica de busca no DB
        return null; // Temporário
      } else {
        // Ler de arquivo
        return await this._readFromFile('tradeHistory.json', []);
      }
    } catch (error) {
      logger.error('Erro ao obter histórico de trades:', error);
      return null;
    }
  }

  /**
   * Salva snapshots de performance
   * @param {Array} snapshots - Lista de snapshots
   * @returns {Promise<boolean>} Sucesso da operação
   */
  async savePerformanceSnapshots(snapshots) {
    try {
      if (config.database.enabled) {
        // Implementar lógica de salvamento no DB
      } else {
        // Salvar em arquivo
        await this._saveToFile('performanceSnapshots.json', snapshots);
      }
      return true;
    } catch (error) {
      logger.error('Erro ao salvar snapshots de performance:', error);
      return false;
    }
  }

  /**
   * Obtém snapshots de performance
   * @returns {Promise<Array|null>} Lista de snapshots
   */
  async getPerformanceSnapshots() {
    try {
      if (config.database.enabled) {
        // Implementar lógica de busca no DB
        return null; // Temporário
      } else {
        // Ler de arquivo
        return await this._readFromFile('performanceSnapshots.json', []);
      }
    } catch (error) {
      logger.error('Erro ao obter snapshots de performance:', error);
      return null;
    }
  }

  /**
   * Salva estratégias
   * @param {Array} strategies - Lista de estratégias
   * @returns {Promise<boolean>} Sucesso da operação
   */
  async saveStrategies(strategies) {
    try {
      if (config.database.enabled) {
        // Implementar lógica de salvamento no DB
      } else {
        // Salvar em arquivo
        await this._saveToFile('strategies.json', strategies);
      }
      return true;
    } catch (error) {
      logger.error('Erro ao salvar estratégias:', error);
      return false;
    }
  }

  /**
   * Obtém estratégias
   * @returns {Promise<Array|null>} Lista de estratégias
   */
  async getStrategies() {
    try {
      if (config.database.enabled) {
        // Implementar lógica de busca no DB
        return null; // Temporário
      } else {
        // Ler de arquivo
        return await this._readFromFile('strategies.json', []);
      }
    } catch (error) {
      logger.error('Erro ao obter estratégias:', error);
      return null;
    }
  }

  /**
   * Salva dados em arquivo
   * @param {string} filename - Nome do arquivo
   * @param {Object|Array} data - Dados a salvar
   * @returns {Promise<void>}
   * @private
   */
  async _saveToFile(filename, data) {
    return new Promise((resolve, reject) => {
      const filePath = path.join(DATA_DIR, filename);
      fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Lê dados de arquivo
   * @param {string} filename - Nome do arquivo
   * @param {*} defaultValue - Valor default se arquivo não existir
   * @returns {Promise<Object|Array>} Dados lidos
   * @private
   */
  async _readFromFile(filename, defaultValue = null) {
    return new Promise((resolve, reject) => {
      const filePath = path.join(DATA_DIR, filename);
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          if (err.code === 'ENOENT') {
            // Arquivo não existe, retorna valor default
            resolve(defaultValue);
          } else {
            reject(err);
          }
        } else {
          try {
            resolve(JSON.parse(data));
          } catch (parseErr) {
            reject(parseErr);
          }
        }
      });
    });
  }
}

// Singleton
const databaseService = new DatabaseService();

// Função para conectar ao banco de dados
const connectDB = async () => {
  return await databaseService.connect();
};

// Exportar serviço e função de conexão
module.exports = {
  databaseService,
  connectDB
};