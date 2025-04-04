// src/services/databaseService.js

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * Serviço de Banco de Dados Simples
 * Implementa armazenamento em arquivos JSON para persistência de dados
 */
class DatabaseService {
  constructor() {
    this.connected = false;
    this.dbDir = path.join(process.cwd(), 'data');
    this.cache = {
      portfolio: null,
      strategies: null,
      tradeHistory: null,
      performanceSnapshots: null,
      riskSettings: null
    };
  }
  
  /**
   * Inicializa o serviço de banco de dados
   * @returns {boolean} Status da inicialização
   */
  async init() {
    try {
      // Criar diretório de dados se não existir
      await this.ensureDbDir();
      
      // Carregar dados para o cache
      await this.loadCache();
      
      this.connected = true;
      logger.info('Serviço de banco de dados iniciado com sucesso');
      return true;
    } catch (error) {
      logger.error('Erro ao inicializar serviço de banco de dados:', error);
      this.connected = false;
      return false;
    }
  }
  
  /**
   * Verifica se o banco de dados está conectado
   * @returns {boolean} Status da conexão
   */
  isConnected() {
    return this.connected;
  }
  
  /**
   * Garante que o diretório de dados existe
   */
  async ensureDbDir() {
    try {
      await fs.access(this.dbDir);
    } catch (error) {
      // Diretório não existe, criar
      await fs.mkdir(this.dbDir, { recursive: true });
      logger.info(`Diretório de dados criado: ${this.dbDir}`);
    }
  }
  
  /**
   * Carrega todos os dados para o cache
   */
  async loadCache() {
    try {
      this.cache.portfolio = await this.readJsonFile('portfolio.json');
      this.cache.strategies = await this.readJsonFile('strategies.json');
      this.cache.tradeHistory = await this.readJsonFile('trade_history.json');
      this.cache.performanceSnapshots = await this.readJsonFile('performance_snapshots.json');
      this.cache.riskSettings = await this.readJsonFile('risk_settings.json');
      
      logger.info('Cache do banco de dados carregado');
    } catch (error) {
      logger.error('Erro ao carregar cache do banco de dados:', error);
    }
  }
  
  /**
   * Lê um arquivo JSON
   * @param {string} fileName - Nome do arquivo
   * @returns {Object|Array|null} - Dados do arquivo ou null se não existir
   */
  async readJsonFile(fileName) {
    try {
      const filePath = path.join(this.dbDir, fileName);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Arquivo não existe, retornar null
        return null;
      }
      
      // Outro erro
      logger.error(`Erro ao ler arquivo ${fileName}:`, error);
      return null;
    }
  }
  
  /**
   * Escreve dados em um arquivo JSON
   * @param {string} fileName - Nome do arquivo
   * @param {Object|Array} data - Dados a serem escritos
   * @returns {boolean} - Sucesso da operação
   */
  async writeJsonFile(fileName, data) {
    try {
      const filePath = path.join(this.dbDir, fileName);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      logger.error(`Erro ao escrever arquivo ${fileName}:`, error);
      return false;
    }
  }
  
  /**
   * Salva dados do portfólio
   * @param {Object} portfolio - Dados do portfólio
   * @returns {boolean} - Sucesso da operação
   */
  async savePortfolio(portfolio) {
    try {
      this.cache.portfolio = portfolio;
      await this.writeJsonFile('portfolio.json', portfolio);
      return true;
    } catch (error) {
      logger.error('Erro ao salvar portfólio:', error);
      return false;
    }
  }
  
  /**
   * Obtém dados do portfólio
   * @returns {Object|null} - Dados do portfólio
   */
  async getPortfolio() {
    if (this.cache.portfolio) {
      return this.cache.portfolio;
    }
    
    const portfolio = await this.readJsonFile('portfolio.json');
    this.cache.portfolio = portfolio;
    return portfolio;
  }
  
  /**
   * Salva configurações de estratégias
   * @param {Object} config - Configuração da estratégia
   * @returns {boolean} - Sucesso da operação
   */
  async saveStrategyConfiguration(config) {
    try {
      // Carregar configurações existentes
      let strategies = this.cache.strategies || [];
      
      // Verificar se a estratégia já existe
      const index = strategies.findIndex(s => s.id === config.id);
      
      if (index >= 0) {
        // Atualizar estratégia existente
        strategies[index] = config;
      } else {
        // Adicionar nova estratégia
        strategies.push(config);
      }
      
      // Atualizar cache e salvar arquivo
      this.cache.strategies = strategies;
      await this.writeJsonFile('strategies.json', strategies);
      
      return true;
    } catch (error) {
      logger.error('Erro ao salvar configuração de estratégia:', error);
      return false;
    }
  }
  
  /**
   * Remove uma configuração de estratégia
   * @param {string} strategyId - ID da estratégia
   * @returns {boolean} - Sucesso da operação
   */
  async removeStrategyConfiguration(strategyId) {
    try {
      // Carregar configurações existentes
      let strategies = this.cache.strategies || [];
      
      // Filtrar a estratégia a ser removida
      strategies = strategies.filter(s => s.id !== strategyId);
      
      // Atualizar cache e salvar arquivo
      this.cache.strategies = strategies;
      await this.writeJsonFile('strategies.json', strategies);
      
      return true;
    } catch (error) {
      logger.error('Erro ao remover configuração de estratégia:', error);
      return false;
    }
  }
  
  /**
   * Obtém as configurações de estratégias
   * @returns {Array|null} - Configurações de estratégias
   */
  async getStrategyConfigurations() {
    if (this.cache.strategies) {
      return this.cache.strategies;
    }
    
    const strategies = await this.readJsonFile('strategies.json');
    this.cache.strategies = strategies || [];
    return this.cache.strategies;
  }
  
  /**
   * Salva histórico de trades
   * @param {Array} trades - Histórico de trades
   * @returns {boolean} - Sucesso da operação
   */
  async saveTradeHistory(trades) {
    try {
      this.cache.tradeHistory = trades;
      await this.writeJsonFile('trade_history.json', trades);
      return true;
    } catch (error) {
      logger.error('Erro ao salvar histórico de trades:', error);
      return false;
    }
  }
  
  /**
   * Obtém o histórico de trades
   * @returns {Array|null} - Histórico de trades
   */
  async getTradeHistory() {
    if (this.cache.tradeHistory) {
      return this.cache.tradeHistory;
    }
    
    const trades = await this.readJsonFile('trade_history.json');
    this.cache.tradeHistory = trades || [];
    return this.cache.tradeHistory;
  }
  
  /**
   * Salva snapshots de desempenho
   * @param {Array} snapshots - Snapshots de desempenho
   * @returns {boolean} - Sucesso da operação
   */
  async savePerformanceSnapshots(snapshots) {
    try {
      this.cache.performanceSnapshots = snapshots;
      await this.writeJsonFile('performance_snapshots.json', snapshots);
      return true;
    } catch (error) {
      logger.error('Erro ao salvar snapshots de desempenho:', error);
      return false;
    }
  }
  
  /**
   * Obtém os snapshots de desempenho
   * @returns {Array|null} - Snapshots de desempenho
   */
  async getPerformanceSnapshots() {
    if (this.cache.performanceSnapshots) {
      return this.cache.performanceSnapshots;
    }
    
    const snapshots = await this.readJsonFile('performance_snapshots.json');
    this.cache.performanceSnapshots = snapshots || [];
    return this.cache.performanceSnapshots;
  }
  
  /**
   * Salva configurações de risco
   * @param {Object} settings - Configurações de risco
   * @returns {boolean} - Sucesso da operação
   */
  async saveRiskSettings(settings) {
    try {
      this.cache.riskSettings = settings;
      await this.writeJsonFile('risk_settings.json', settings);
      return true;
    } catch (error) {
      logger.error('Erro ao salvar configurações de risco:', error);
      return false;
    }
  }
  
  /**
   * Obtém as configurações de risco
   * @returns {Object|null} - Configurações de risco
   */
  async getRiskSettings() {
    if (this.cache.riskSettings) {
      return this.cache.riskSettings;
    }
    
    const settings = await this.readJsonFile('risk_settings.json');
    this.cache.riskSettings = settings;
    return settings;
  }
  
  /**
   * Salva dados de backtesting
   * @param {string} strategyId - ID da estratégia
   * @param {Object} results - Resultados do backtesting
   * @returns {boolean} - Sucesso da operação
   */
  async saveBacktestResults(strategyId, results) {
    try {
      const fileName = `backtest_${strategyId}.json`;
      await this.writeJsonFile(fileName, results);
      return true;
    } catch (error) {
      logger.error('Erro ao salvar resultados de backtesting:', error);
      return false;
    }
  }
  
  /**
   * Obtém resultados de backtesting
   * @param {string} strategyId - ID da estratégia
   * @returns {Object|null} - Resultados do backtesting
   */
  async getBacktestResults(strategyId) {
    try {
      const fileName = `backtest_${strategyId}.json`;
      return await this.readJsonFile(fileName);
    } catch (error) {
      logger.error('Erro ao obter resultados de backtesting:', error);
      return null;
    }
  }
}

// Singleton
const databaseService = new DatabaseService();

module.exports = databaseService;