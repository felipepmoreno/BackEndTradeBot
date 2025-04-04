// src/core/riskManager.js

const logger = require('../utils/logger');
const databaseService = require('../services/databaseService');
const portfolioManager = require('./portfolioManager');

/**
 * Gerenciador de Riscos
 * Responsável por avaliar e controlar o risco associado às operações de trading
 */
class RiskManager {
  constructor() {
    // Configurações default de risco
    this.settings = {
      maxDailyLoss: 3.0, // Perda máxima diária em percentual
      maxPositionSize: 5.0, // Tamanho máximo de posição como % do capital
      maxOpenPositions: 10, // Número máximo de posições abertas
      maxLeveragePerTrade: 1, // Alavancagem máxima por operação (1 = sem alavancagem)
      stopLossRequired: true, // Exigir stop loss para todas as posições
      maxRiskPerTrade: 1.0, // Risco máximo por operação como % do capital
      volatilityMultiplier: 1.0, // Multiplicador para ajuste de volatilidade
      maxConcentrationPerAsset: 15.0, // Concentração máxima por ativo como % do capital
      minRiskRewardRatio: 1.5, // Relação risco/retorno mínima
      highVolatilityThreshold: 5.0, // Limite para considerar alta volatilidade (%)
      highVolatilityPositionReduction: 0.5, // Redução de posição em alta volatilidade (50%)
      correlationLimit: 0.7, // Limite de correlação para diversificação
      dailyProfitTarget: 5.0, // Alvo de lucro diário em percentual
      tradeCountLimit: { // Limite de operações por período
        hourly: 5,
        daily: 20
      }
    };
    
    // Estado das operações
    this.state = {
      dailyPnL: 0,
      dailyTrades: 0,
      hourlyTrades: 0,
      lastResetTime: new Date(),
      openPositions: 0,
      assetExposure: {}, // Exposição por ativo
      tradingEnabled: true, // Flag global para habilitar/desabilitar trading
      volatilityWarning: false, // Flag para alta volatilidade
      apiErrorCount: 0 // Contador de erros da API
    };
    
    // Registro de operações diárias
    this.dailyTrades = [];
    
    logger.info('Gerenciador de Riscos inicializado');
  }
  
  /**
   * Inicializa o gerenciador de riscos
   */
  async init() {
    try {
      // Carregar configurações do banco de dados ou arquivo
      await this.loadSettings();
      
      // Configurar timer para reset diário
      this.setupDailyReset();
      
      logger.info('Gerenciador de Riscos iniciado com sucesso');
      return true;
    } catch (error) {
      logger.error('Erro ao inicializar Gerenciador de Riscos:', error);
      return false;
    }
  }
  
  /**
   * Carrega configurações de risco
   */
  async loadSettings() {
    try {
      if (databaseService.isConnected()) {
        const settings = await databaseService.getRiskSettings();
        if (settings) {
          this.settings = { ...this.settings, ...settings };
        }
      } else {
        // Em uma implementação real, carregaria de um arquivo de configuração
        logger.info('Banco de dados não disponível, usando configurações padrão de risco');
      }
    } catch (error) {
      logger.error('Erro ao carregar configurações de risco:', error);
    }
  }
  
  /**
   * Configura timer para reset diário
   */
  setupDailyReset() {
    // Resetar contadores diários à meia-noite
    const resetDaily = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      nextMidnight.setHours(0, 0, 0, 0);
      
      const timeUntilMidnight = nextMidnight.getTime() - now.getTime();
      
      setTimeout(() => {
        this.resetDailyCounters();
        // Configurar próximo reset
        resetDaily();
      }, timeUntilMidnight);
    };
    
    // Iniciar timer
    resetDaily();
    
    // Resetar contadores horários a cada hora
    setInterval(() => {
      this.state.hourlyTrades = 0;
    }, 60 * 60 * 1000); // 1 hora
  }
  
  /**
   * Reseta contadores diários
   */
  resetDailyCounters() {
    logger.info('Resetando contadores diários de risco');
    
    this.state.dailyPnL = 0;
    this.state.dailyTrades = 0;
    this.dailyTrades = [];
    this.state.lastResetTime = new Date();
  }
  
  /**
   * Verifica limites de risco para uma estratégia
   * @param {Object} strategy - Estratégia a ser verificada
   * @param {Object} marketConditions - Condições atuais do mercado
   * @returns {Object} Resultado da verificação
   */
  checkRiskLimits(strategy, marketConditions) {
    // Verificar se o trading está habilitado globalmente
    if (!this.state.tradingEnabled) {
      return { allowed: false, reason: 'Trading está desabilitado globalmente' };
    }
    
    // Verificar limites de perdas diárias
    if (this.state.dailyPnL <= -this.settings.maxDailyLoss) {
      return { allowed: false, reason: `Limite de perda diária atingido (${this.settings.maxDailyLoss}%)` };
    }
    
    // Verificar número de operações diárias
    if (this.state.dailyTrades >= this.settings.tradeCountLimit.daily) {
      return { allowed: false, reason: `Limite de operações diárias atingido (${this.settings.tradeCountLimit.daily})` };
    }
    
    // Verificar número de operações por hora
    if (this.state.hourlyTrades >= this.settings.tradeCountLimit.hourly) {
      return { allowed: false, reason: `Limite de operações por hora atingido (${this.settings.tradeCountLimit.hourly})` };
    }
    
    // Verificar número máximo de posições abertas
    if (this.state.openPositions >= this.settings.maxOpenPositions) {
      return { allowed: false, reason: `Número máximo de posições abertas atingido (${this.settings.maxOpenPositions})` };
    }
    
    // Verificar volatilidade do mercado
    if (marketConditions && marketConditions.volatility) {
      const hourlyVolatility = marketConditions.volatility.hourly * 100; // Converter para percentual
      
      if (hourlyVolatility > this.settings.highVolatilityThreshold) {
        this.state.volatilityWarning = true;
        
        // Em caso de volatilidade extrema, bloquear operações
        if (hourlyVolatility > this.settings.highVolatilityThreshold * 2) {
          return { allowed: false, reason: `Volatilidade extrema detectada (${hourlyVolatility.toFixed(2)}%)` };
        }
        
        // Em caso de volatilidade alta, permitir mas com aviso
        logger.warn(`Alta volatilidade detectada para ${strategy.pair}: ${hourlyVolatility.toFixed(2)}%. Reduzindo tamanho das posições.`);
      } else {
        this.state.volatilityWarning = false;
      }
    }
    
    // Verificar concentração por ativo
    const assetExposure = this.state.assetExposure[strategy.pair] || 0;
    if (assetExposure > this.settings.maxConcentrationPerAsset) {
      return { allowed: false, reason: `Concentração máxima por ativo atingida para ${strategy.pair} (${this.settings.maxConcentrationPerAsset}%)` };
    }
    
    // Se chegou até aqui, está tudo ok
    return { allowed: true };
  }
  
  /**
   * Avalia o risco de um sinal específico
   * @param {Object} strategy - Estratégia que gerou o sinal
   * @param {Object} signal - Sinal de trading
   * @returns {Object} Avaliação de risco
   */
  assessSignalRisk(strategy, signal) {
    try {
      // Verificar stop loss se for uma operação de compra
      if (signal.type === 'BUY' && this.settings.stopLossRequired && !signal.stopLoss) {
        return { allowed: false, reason: 'Stop loss obrigatório não definido' };
      }
      
      // Verificar relação risco/retorno se tivermos stop loss e take profit
      if (signal.type === 'BUY' && signal.stopLoss && signal.takeProfit) {
        const entryPrice = signal.params.price;
        const riskAmount = entryPrice - signal.stopLoss;
        const rewardAmount = signal.takeProfit - entryPrice;
        
        const riskRewardRatio = rewardAmount / riskAmount;
        
        if (riskRewardRatio < this.settings.minRiskRewardRatio) {
          return { 
            allowed: false, 
            reason: `Relação risco/retorno insuficiente: ${riskRewardRatio.toFixed(2)} (mínimo: ${this.settings.minRiskRewardRatio})` 
          };
        }
      }
      
      // Verificar limites de operações
      if (this.state.hourlyTrades >= this.settings.tradeCountLimit.hourly) {
        return { allowed: false, reason: `Limite de operações por hora atingido (${this.settings.tradeCountLimit.hourly})` };
      }
      
      // Verificar se já atingimos o alvo de lucro diário
      if (this.state.dailyPnL >= this.settings.dailyProfitTarget) {
        // Ainda permitimos, mas com aviso
        logger.info(`Alvo de lucro diário atingido (${this.settings.dailyProfitTarget}%). Considere encerrar operações por hoje.`);
      }
      
      // Verificar correlação com outras posições (em uma implementação completa)
      
      return { allowed: true };
    } catch (error) {
      logger.error(`Erro ao avaliar risco do sinal: ${error.message}`);
      return { allowed: false, reason: 'Erro interno ao avaliar risco' };
    }
  }
  
  /**
   * Calcula o tamanho da posição com base no gerenciamento de risco
   * @param {Object} strategy - Estratégia
   * @param {Object} signal - Sinal de trading
   * @returns {number} Tamanho da posição
   */
  calculatePositionSize(strategy, signal) {
    try {
      // Obter capital disponível
      const portfolio = portfolioManager.getPortfolio();
      const availableCapital = portfolio.availableBalance;
      
      // Tamanho base da posição baseado no percentual máximo
      let positionSize = availableCapital * (this.settings.maxPositionSize / 100);
      
      // Ajustar com base no risco por operação se tivermos stop loss
      if (signal.type === 'BUY' && signal.stopLoss) {
        const entryPrice = signal.params.price;
        const stopPrice = signal.stopLoss;
        const riskPercentage = Math.abs((stopPrice - entryPrice) / entryPrice);
        
        // Calcular baseado no risco máximo por operação
        const riskBasedSize = (availableCapital * (this.settings.maxRiskPerTrade / 100)) / riskPercentage;
        
        // Usar o menor valor entre tamanho baseado no capital e tamanho baseado no risco
        positionSize = Math.min(positionSize, riskBasedSize);
      }
      
      // Aplicar ajuste de volatilidade se necessário
      if (this.state.volatilityWarning) {
        positionSize *= this.settings.highVolatilityPositionReduction;
      }
      
      // Ajustar o tamanho da posição para a quantidade de unidades
      const price = signal.params.price;
      const quantity = positionSize / price;
      
      // Aplicar restrições específicas por estratégia se necessário
      if (strategy.maxPositionSize && quantity > strategy.maxPositionSize) {
        return strategy.maxPositionSize;
      }
      
      // Aplicar alavancagem se configurada (em uma implementação real)
      
      return quantity;
    } catch (error) {
      logger.error(`Erro ao calcular tamanho da posição: ${error.message}`);
      // Retornar um valor pequeno por segurança
      return 0.01;
    }
  }
  
  /**
   * Registra uma nova operação para controle de risco
   * @param {Object} trade - Detalhes da operação
   */
  registerTrade(trade) {
    try {
      // Incrementar contadores
      this.state.dailyTrades += 1;
      this.state.hourlyTrades += 1;
      
      // Atualizar P&L diário
      if (trade.profit) {
        this.state.dailyPnL += trade.profit;
      }
      
      // Atualizar contagem de posições abertas
      if (trade.type === 'BUY') {
        this.state.openPositions += 1;
        
        // Atualizar exposição por ativo
        const currentExposure = this.state.assetExposure[trade.symbol] || 0;
        this.state.assetExposure[trade.symbol] = currentExposure + trade.quantity * trade.price;
      } else if (trade.type === 'SELL') {
        this.state.openPositions = Math.max(0, this.state.openPositions - 1);
        
        // Atualizar exposição por ativo
        const currentExposure = this.state.assetExposure[trade.symbol] || 0;
        this.state.assetExposure[trade.symbol] = Math.max(0, currentExposure - trade.quantity * trade.price);
      }
      
      // Adicionar à lista de operações diárias
      this.dailyTrades.push({
        ...trade,
        timestamp: new Date()
      });
      
      logger.info(`Trade registrado para controle de risco: ${trade.type} ${trade.symbol} @ ${trade.price}`);
    } catch (error) {
      logger.error(`Erro ao registrar trade para controle de risco: ${error.message}`);
    }
  }
  
  /**
   * Registra um erro da API
   * @param {string} errorType - Tipo de erro
   */
  registerApiError(errorType) {
    this.state.apiErrorCount += 1;
    
    // Se muitos erros em sequência, desativar trading
    if (this.state.apiErrorCount > 10) {
      this.disableTrading('Muitos erros de API em sequência');
    }
  }
  
  /**
   * Reseta contador de erros da API
   */
  resetApiErrorCount() {
    this.state.apiErrorCount = 0;
  }
  
  /**
   * Desativa o trading (emergência)
   * @param {string} reason - Motivo da desativação
   */
  disableTrading(reason) {
    if (this.state.tradingEnabled) {
      this.state.tradingEnabled = false;
      logger.error(`Trading desativado: ${reason}`);
      
      // Em uma implementação real, poderia enviar notificação
    }
  }
  
  /**
   * Ativa o trading novamente
   */
  enableTrading() {
    if (!this.state.tradingEnabled) {
      this.state.tradingEnabled = true;
      logger.info('Trading reativado');
    }
  }
  
  /**
   * Obtém estatísticas de risco atuais
   * @returns {Object} Estatísticas de risco
   */
  getRiskStats() {
    return {
      dailyPnL: this.state.dailyPnL,
      dailyTrades: this.state.dailyTrades,
      hourlyTrades: this.state.hourlyTrades,
      openPositions: this.state.openPositions,
      tradingEnabled: this.state.tradingEnabled,
      volatilityWarning: this.state.volatilityWarning,
      assetExposure: this.state.assetExposure
    };
  }
  
  /**
   * Atualiza configurações de risco
   * @param {Object} newSettings - Novas configurações
   */
  async updateSettings(newSettings) {
    try {
      // Validar novas configurações
      if (newSettings.maxDailyLoss !== undefined && newSettings.maxDailyLoss <= 0) {
        throw new Error('maxDailyLoss deve ser maior que zero');
      }
      
      if (newSettings.maxPositionSize !== undefined && (newSettings.maxPositionSize <= 0 || newSettings.maxPositionSize > 100)) {
        throw new Error('maxPositionSize deve estar entre 0 e 100');
      }
      
      // Atualizar configurações
      this.settings = { ...this.settings, ...newSettings };
      
      // Salvar configurações no banco de dados
      if (databaseService.isConnected()) {
        await databaseService.saveRiskSettings(this.settings);
      }
      
      logger.info('Configurações de risco atualizadas');
      return true;
    } catch (error) {
      logger.error(`Erro ao atualizar configurações de risco: ${error.message}`);
      return false;
    }
  }
}

// Singleton
const riskManager = new RiskManager();

module.exports = riskManager;