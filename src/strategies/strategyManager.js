// src/strategies/strategyManager.js

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const databaseService = require('../services/databaseService');

// Cache de estratégias
let strategies = [];
let strategyClasses = {};

/**
 * Inicializa e carrega todas as estratégias disponíveis
 */
const loadStrategies = async () => {
  logger.info('Carregando estratégias disponíveis');
  
  try {
    // Carregar estratégias do diretório
    const strategiesDir = path.join(__dirname);
    const files = await fs.readdir(strategiesDir);
    
    // Filtrar apenas arquivos JS que não sejam este arquivo ou a classe base
    const strategyFiles = files.filter(file => 
      file.endsWith('.js') && 
      file !== 'strategyManager.js' && 
      file !== 'baseStrategy.js'
    );
    
    // Carregar cada estratégia
    for (const file of strategyFiles) {
      const strategyName = path.basename(file, '.js');
      try {
        const StrategyClass = require(path.join(strategiesDir, file));
        strategyClasses[strategyName] = StrategyClass;
        logger.info(`Estratégia carregada: ${strategyName}`);
      } catch (error) {
        logger.error(`Erro ao carregar estratégia ${strategyName}:`, error);
      }
    }
    
    // Carregar configurações de estratégias do banco de dados ou arquivo de configuração
    await loadStrategyConfigurations();
    
    return strategies;
  } catch (error) {
    logger.error('Erro ao carregar estratégias:', error);
    return [];
  }
};

/**
 * Carrega configurações de estratégias do banco de dados ou arquivo
 */
const loadStrategyConfigurations = async () => {
  try {
    // Se um serviço de banco de dados está disponível, use-o
    if (databaseService.isConnected()) {
      const configs = await databaseService.getStrategyConfigurations();
      strategies = await instantiateStrategies(configs);
    } else {
      // Caso contrário, carregue de um arquivo JSON
      const configPath = path.join(__dirname, '../config/strategies.json');
      const configData = await fs.readFile(configPath, 'utf8');
      const configs = JSON.parse(configData);
      strategies = await instantiateStrategies(configs);
    }
    
    logger.info(`${strategies.length} configurações de estratégia carregadas`);
  } catch (error) {
    logger.error('Erro ao carregar configurações de estratégias:', error);
    strategies = [];
  }
  
  return strategies;
};

/**
 * Instancia objetos de estratégia a partir das configurações
 * @param {Array} configs - Configurações de estratégias
 * @returns {Array} - Instâncias de estratégias
 */
const instantiateStrategies = async (configs) => {
  const instances = [];
  
  for (const config of configs) {
    try {
      const { type, ...strategyConfig } = config;
      
      // Verificar se a classe da estratégia existe
      if (!strategyClasses[type]) {
        logger.warn(`Tipo de estratégia não encontrado: ${type}`);
        continue;
      }
      
      // Instanciar a estratégia
      const strategy = new strategyClasses[type](strategyConfig);
      await strategy.init();
      
      instances.push(strategy);
    } catch (error) {
      logger.error(`Erro ao instanciar estratégia ${config.type} (${config.id}):`, error);
    }
  }
  
  return instances;
};

/**
 * Salva configuração de estratégia
 * @param {Object} config - Configuração da estratégia
 */
const saveStrategyConfiguration = async (config) => {
  try {
    // Validar configuração
    if (!config.id || !config.type || !config.name || !config.pair) {
      throw new Error('Configuração de estratégia inválida');
    }
    
    // Salvar no banco de dados ou arquivo
    if (databaseService.isConnected()) {
      await databaseService.saveStrategyConfiguration(config);
    } else {
      // Carregar configurações existentes
      const configPath = path.join(__dirname, '../config/strategies.json');
      let configs = [];
      
      try {
        const configData = await fs.readFile(configPath, 'utf8');
        configs = JSON.parse(configData);
      } catch (error) {
        // Arquivo não existe, criar um novo array
        configs = [];
      }
      
      // Atualizar ou adicionar configuração
      const index = configs.findIndex(c => c.id === config.id);
      if (index >= 0) {
        configs[index] = config;
      } else {
        configs.push(config);
      }
      
      // Salvar no arquivo
      await fs.writeFile(configPath, JSON.stringify(configs, null, 2), 'utf8');
    }
    
    // Recarregar estratégias
    await loadStrategyConfigurations();
    
    logger.info(`Configuração de estratégia salva: ${config.name} (${config.id})`);
    return true;
  } catch (error) {
    logger.error('Erro ao salvar configuração de estratégia:', error);
    return false;
  }
};

/**
 * Remove configuração de estratégia
 * @param {string} strategyId - ID da estratégia
 */
const removeStrategyConfiguration = async (strategyId) => {
  try {
    // Remover do banco de dados ou arquivo
    if (databaseService.isConnected()) {
      await databaseService.removeStrategyConfiguration(strategyId);
    } else {
      // Carregar configurações existentes
      const configPath = path.join(__dirname, '../config/strategies.json');
      let configs = [];
      
      try {
        const configData = await fs.readFile(configPath, 'utf8');
        configs = JSON.parse(configData);
      } catch (error) {
        logger.error('Erro ao ler arquivo de configurações:', error);
        return false;
      }
      
      // Filtrar a configuração a ser removida
      configs = configs.filter(c => c.id !== strategyId);
      
      // Salvar no arquivo
      await fs.writeFile(configPath, JSON.stringify(configs, null, 2), 'utf8');
    }
    
    // Recarregar estratégias
    await loadStrategyConfigurations();
    
    logger.info(`Configuração de estratégia removida: ${strategyId}`);
    return true;
  } catch (error) {
    logger.error('Erro ao remover configuração de estratégia:', error);
    return false;
  }
};

/**
 * Ativar ou desativar uma estratégia
 * @param {string} strategyId - ID da estratégia
 * @param {boolean} active - Estado de ativação
 */
const setStrategyActive = async (strategyId, active) => {
  try {
    // Encontrar a configuração
    const strategy = strategies.find(s => s.id === strategyId);
    
    if (!strategy) {
      logger.warn(`Estratégia não encontrada: ${strategyId}`);
      return false;
    }
    
    // Atualizar estado de ativação
    strategy.config.active = active;
    
    // Salvar alteração
    await saveStrategyConfiguration(strategy.config);
    
    logger.info(`Estratégia ${strategyId} ${active ? 'ativada' : 'desativada'}`);
    return true;
  } catch (error) {
    logger.error('Erro ao modificar estado de ativação da estratégia:', error);
    return false;
  }
};

/**
 * Retorna todas as estratégias disponíveis
 * @returns {Array} Lista de estratégias
 */
const getStrategies = async () => {
  if (strategies.length === 0) {
    await loadStrategies();
  }
  return strategies;
};

/**
 * Retorna apenas estratégias ativas
 * @returns {Array} Lista de estratégias ativas
 */
const getActiveStrategies = async () => {
  const allStrategies = await getStrategies();
  return allStrategies.filter(strategy => strategy.config.active);
};

/**
 * Retorna uma estratégia específica pelo ID
 * @param {string} strategyId - ID da estratégia
 * @returns {Object} Estratégia
 */
const getStrategyById = async (strategyId) => {
  const allStrategies = await getStrategies();
  return allStrategies.find(strategy => strategy.id === strategyId);
};

/**
 * Retorna todos os tipos de estratégias disponíveis
 * @returns {Array} Lista de tipos de estratégias
 */
const getStrategyTypes = () => {
  return Object.keys(strategyClasses).map(type => ({
    type,
    name: strategyClasses[type].displayName || type,
    description: strategyClasses[type].description || '',
    parameters: strategyClasses[type].parameters || []
  }));
};

/**
 * Cria uma nova instância de estratégia para backtesting
 * @param {Object} config - Configuração da estratégia
 * @returns {Object} Instância da estratégia
 */
const createBacktestStrategy = async (config) => {
  try {
    const { type, ...strategyConfig } = config;
    
    // Verificar se a classe da estratégia existe
    if (!strategyClasses[type]) {
      throw new Error(`Tipo de estratégia não encontrado: ${type}`);
    }
    
    // Instanciar a estratégia com modo de backtesting
    const strategy = new strategyClasses[type]({
      ...strategyConfig,
      backtesting: true
    });
    
    await strategy.init();
    return strategy;
  } catch (error) {
    logger.error('Erro ao criar estratégia para backtesting:', error);
    throw error;
  }
};

module.exports = {
  loadStrategies,
  getStrategies,
  getActiveStrategies,
  getStrategyById,
  getStrategyTypes,
  saveStrategyConfiguration,
  removeStrategyConfiguration,
  setStrategyActive,
  createBacktestStrategy
};