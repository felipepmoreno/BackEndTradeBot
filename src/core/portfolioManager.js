// src/core/portfolioManager.js

const binanceService = require('../services/binanceService');
const databaseService = require('../services/databaseService');
const logger = require('../utils/logger');

/**
 * Gerenciador de Portfólio
 * Responsável por rastrear ativos, posições e performance do portfólio
 */
class PortfolioManager {
  constructor() {
    this.portfolio = {
      totalBalance: 0,
      availableBalance: 0,
      positions: {},
      assets: {},
      performance: {
        initialCapital: 0,
        currentValue: 0,
        totalProfit: 0,
        totalProfitPercentage: 0,
        dailyProfit: 0,
        dailyProfitPercentage: 0,
        weeklyProfit: 0,
        weeklyProfitPercentage: 0,
        monthlyProfit: 0,
        monthlyProfitPercentage: 0
      },
      lastUpdated: null
    };
    
    this.tradeHistory = [];
    this.performanceSnapshots = [];
    this.priceCache = {};
    
    logger.info('Gerenciador de Portfólio inicializado');
  }
  
  /**
   * Inicializa o gerenciador de portfólio
   */
  async init() {
    try {
      // Carregar dados do portfólio salvo (se disponível)
      await this.loadPortfolio();
      
      // Obter saldo atual da conta
      await this.fetchAccountBalance();
      
      // Salvar snapshot inicial se necessário
      if (this.performanceSnapshots.length === 0) {
        await this.savePerformanceSnapshot();
      }
      
      // Configurar update periódico
      this.setupPeriodicUpdates();
      
      logger.info('Gerenciador de Portfólio iniciado com sucesso');
      return true;
    } catch (error) {
      logger.error('Erro ao inicializar Gerenciador de Portfólio:', error);
      return false;
    }
  }
  
  /**
   * Carrega dados do portfólio
   */
  async loadPortfolio() {
    try {
      if (databaseService.isConnected()) {
        // Carregar do banco de dados
        const savedPortfolio = await databaseService.getPortfolio();
        if (savedPortfolio) {
          this.portfolio = {...this.portfolio, ...savedPortfolio};
        }
        
        const tradeHistory = await databaseService.getTradeHistory();
        if (tradeHistory) {
          this.tradeHistory = tradeHistory;
        }
        
        const snapshots = await databaseService.getPerformanceSnapshots();
        if (snapshots) {
          this.performanceSnapshots = snapshots;
        }
        
        logger.info('Dados do portfólio carregados do banco de dados');
      } else {
        logger.info('Banco de dados não disponível, iniciando com portfólio vazio');
      }
    } catch (error) {
      logger.error('Erro ao carregar dados do portfólio:', error);
    }
  }
  
  /**
   * Busca o saldo atual da conta
   */
  async fetchAccountBalance() {
    try {
      const response = await binanceService.getAccountInfo();
      
      if (!response.success) {
        logger.error('Erro ao obter informações da conta:', response.error);
        return;
      }
      
      const accountInfo = response.data;
      
      // Processar saldos
      const assets = {};
      let totalBalance = 0;
      let availableBalance = 0;
      
      // Processar todas as moedas da conta
      if (accountInfo.balances) {
        for (const balance of accountInfo.balances) {
          const asset = balance.asset;
          const free = parseFloat(balance.free);
          const locked = parseFloat(balance.locked);
          const total = free + locked;
          
          // Apenas incluir ativos com saldo positivo
          if (total > 0) {
            let usdValue = 0;
            
            // Obter valor em USD para o ativo (se não for USD/USDT/BUSD)
            if (asset !== 'USDT' && asset !== 'BUSD' && asset !== 'USD') {
              usdValue = await this.getAssetValueInUSD(asset, total);
            } else {
              usdValue = total; // Stablecoins
            }
            
            assets[asset] = {
              free,
              locked,
              total,
              usdValue
            };
            
            // Adicionar ao saldo total
            totalBalance += usdValue;
            
            // Adicionar ao saldo disponível
            if (asset === 'USDT' || asset === 'BUSD' || asset === 'USD') {
              availableBalance += free;
            }
          }
        }
      }
      
      // Atualizar portfólio
      this.portfolio.totalBalance = totalBalance;
      this.portfolio.availableBalance = availableBalance;
      this.portfolio.assets = assets;
      this.portfolio.lastUpdated = new Date();
      
      // Atualizar performance
      if (this.portfolio.performance.initialCapital === 0) {
        this.portfolio.performance.initialCapital = totalBalance;
      }
      
      this.portfolio.performance.currentValue = totalBalance;
      
      // Atualizar variações de desempenho
      this.updatePerformanceMetrics();
      
      // Salvar portfólio atualizado
      this.savePortfolio();
      
      logger.info(`Saldo da conta atualizado: $${totalBalance.toFixed(2)} USD`);
    } catch (error) {
      logger.error('Erro ao buscar saldo da conta:', error);
    }
  }
  
  /**
   * Configura atualizações periódicas do portfólio
   */
  setupPeriodicUpdates() {
    // Atualizar o portfólio a cada 5 minutos
    setInterval(() => this.fetchAccountBalance(), 5 * 60 * 1000);
    
    // Salvar snapshot de desempenho à meia-noite
    const scheduleSnapshotSave = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setDate(midnight.getDate() + 1);
      midnight.setHours(0, 0, 0, 0);
      
      const timeUntilMidnight = midnight.getTime() - now.getTime();
      
      setTimeout(() => {
        this.savePerformanceSnapshot();
        scheduleSnapshotSave(); // Agendar próximo snapshot
      }, timeUntilMidnight);
    };
    
    // Iniciar agendamento
    scheduleSnapshotSave();
  }
  
  /**
   * Obtém o valor de um ativo em USD
   * @param {string} asset - Símbolo do ativo
   * @param {number} amount - Quantidade do ativo
   * @returns {number} Valor em USD
   */
  async getAssetValueInUSD(asset, amount) {
    try {
      // Verificar se temos preço em cache (não mais antigo que 5 minutos)
      const now = Date.now();
      if (this.priceCache[asset] && now - this.priceCache[asset].timestamp < 5 * 60 * 1000) {
        return amount * this.priceCache[asset].price;
      }
      
      // Tentar obter preço diretamente em USDT
      let symbol = `${asset}USDT`;
      let response = await binanceService.getTickerPrice(symbol);
      
      if (!response.success) {
        // Tentar com BUSD
        symbol = `${asset}BUSD`;
        response = await binanceService.getTickerPrice(symbol);
        
        if (!response.success) {
          // Tentar com BTC e depois converter
          symbol = `${asset}BTC`;
          response = await binanceService.getTickerPrice(symbol);
          
          if (response.success) {
            // Obter preço de BTC/USDT
            const btcUsdtResponse = await binanceService.getTickerPrice('BTCUSDT');
            if (btcUsdtResponse.success) {
              const btcPriceInUsdt = parseFloat(btcUsdtResponse.data.price);
              const assetPriceInBtc = parseFloat(response.data.price);
              const assetPriceInUsdt = assetPriceInBtc * btcPriceInUsdt;
              
              // Atualizar cache
              this.priceCache[asset] = {
                price: assetPriceInUsdt,
                timestamp: now
              };
              
              return amount * assetPriceInUsdt;
            }
          }
          
          logger.warn(`Não foi possível obter o preço para ${asset}, assumindo zero`);
          return 0;
        }
      }
      
      const price = parseFloat(response.data.price);
      
      // Atualizar cache
      this.priceCache[asset] = {
        price,
        timestamp: now
      };
      
      return amount * price;
    } catch (error) {
      logger.error(`Erro ao obter valor em USD para ${asset}:`, error);
      return 0;
    }
  }
  
  /**
   * Salva dados do portfólio
   */
  async savePortfolio() {
    try {
      if (databaseService.isConnected()) {
        await databaseService.savePortfolio(this.portfolio);
      }
    } catch (error) {
      logger.error('Erro ao salvar dados do portfólio:', error);
    }
  }
  
  /**
   * Salva um snapshot do desempenho atual
   */
  async savePerformanceSnapshot() {
    try {
      const snapshot = {
        timestamp: new Date(),
        totalBalance: this.portfolio.totalBalance,
        availableBalance: this.portfolio.availableBalance,
        positions: { ...this.portfolio.positions },
        performance: { ...this.portfolio.performance }
      };
      
      this.performanceSnapshots.push(snapshot);
      
      // Manter apenas os últimos 365 snapshots (1 ano)
      if (this.performanceSnapshots.length > 365) {
        this.performanceSnapshots.shift();
      }
      
      // Salvar no banco de dados
      if (databaseService.isConnected()) {
        await databaseService.savePerformanceSnapshots(this.performanceSnapshots);
      }
      
      logger.info('Snapshot de desempenho do portfólio salvo');
    } catch (error) {
      logger.error('Erro ao salvar snapshot de desempenho:', error);
    }
  }
  
  /**
   * Atualiza métricas de desempenho do portfólio
   */
  updatePerformanceMetrics() {
    try {
      const currentValue = this.portfolio.totalBalance;
      const initialCapital = this.portfolio.performance.initialCapital || currentValue;
      
      // Calcular lucro total
      const totalProfit = currentValue - initialCapital;
      const totalProfitPercentage = (totalProfit / initialCapital) * 100;
      
      // Buscar snapshots para cálculos de períodos
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Encontrar snapshots mais próximos
      const daySnapshot = this.findClosestSnapshot(oneDayAgo);
      const weekSnapshot = this.findClosestSnapshot(oneWeekAgo);
      const monthSnapshot = this.findClosestSnapshot(oneMonthAgo);
      
      // Calcular lucros por período
      let dailyProfit = 0;
      let dailyProfitPercentage = 0;
      if (daySnapshot) {
        dailyProfit = currentValue - daySnapshot.totalBalance;
        dailyProfitPercentage = (dailyProfit / daySnapshot.totalBalance) * 100;
      }
      
      let weeklyProfit = 0;
      let weeklyProfitPercentage = 0;
      if (weekSnapshot) {
        weeklyProfit = currentValue - weekSnapshot.totalBalance;
        weeklyProfitPercentage = (weeklyProfit / weekSnapshot.totalBalance) * 100;
      }
      
      let monthlyProfit = 0;
      let monthlyProfitPercentage = 0;
      if (monthSnapshot) {
        monthlyProfit = currentValue - monthSnapshot.totalBalance;
        monthlyProfitPercentage = (monthlyProfit / monthSnapshot.totalBalance) * 100;
      }
      
      // Atualizar performance
      this.portfolio.performance = {
        initialCapital,
        currentValue,
        totalProfit,
        totalProfitPercentage,
        dailyProfit,
        dailyProfitPercentage,
        weeklyProfit,
        weeklyProfitPercentage,
        monthlyProfit,
        monthlyProfitPercentage
      };
    } catch (error) {
      logger.error('Erro ao atualizar métricas de desempenho:', error);
    }
  }
  
  /**
   * Encontra o snapshot mais próximo de uma data
   * @param {Date} date - Data de referência
   * @returns {Object|null} Snapshot mais próximo
   */
  findClosestSnapshot(date) {
    if (this.performanceSnapshots.length === 0) {
      return null;
    }
    
    // Ordenar snapshots por data
    const sortedSnapshots = [...this.performanceSnapshots].sort((a, b) => {
      return new Date(a.timestamp) - new Date(b.timestamp);
    });
    
    // Encontrar o snapshot mais próximo da data
    let closestSnapshot = sortedSnapshots[0];
    let minDiff = Math.abs(new Date(closestSnapshot.timestamp) - date);
    
    for (let i = 1; i < sortedSnapshots.length; i++) {
      const snapshot = sortedSnapshots[i];
      const diff = Math.abs(new Date(snapshot.timestamp) - date);
      
      if (diff < minDiff) {
        minDiff = diff;
        closestSnapshot = snapshot;
      }
    }
    
    return closestSnapshot;
  }
  
  /**
   * Registra um novo trade no histórico
   * @param {Object} trade - Dados do trade
   */
  async recordTrade(trade) {
    try {
      const tradeData = {
        ...trade,
        timestamp: trade.time || new Date()
      };
      
      // Adicionar ao histórico
      this.tradeHistory.push(tradeData);
      
      // Limitar tamanho do histórico
      if (this.tradeHistory.length > 1000) {
        this.tradeHistory.shift();
      }
      
      // Atualizar posições
      await this.updatePositions(tradeData);
      
      // Salvar histórico no banco de dados
      if (databaseService.isConnected()) {
        await databaseService.saveTradeHistory(this.tradeHistory);
      }
      
      logger.info(`Trade registrado: ${trade.type} ${trade.symbol} @ ${trade.price}`);
    } catch (error) {
      logger.error('Erro ao registrar trade:', error);
    }
  }
  
  /**
   * Atualiza as posições com base em um trade
   * @param {Object} trade - Dados do trade
   */
  async updatePositions(trade) {
    try {
      const { symbol, type, price, quantity } = trade;
      
      // Inicializar posição se não existir
      if (!this.portfolio.positions[symbol]) {
        this.portfolio.positions[symbol] = {
          quantity: 0,
          averageEntryPrice: 0,
          currentPrice: 0,
          currentValue: 0,
          unrealizedProfit: 0,
          unrealizedProfitPercentage: 0,
          realizedProfit: 0,
          trades: 0
        };
      }
      
      const position = this.portfolio.positions[symbol];
      
      // Atualizar posição com base no tipo de trade
      if (type === 'BUY') {
        // Calcular novo preço médio de entrada
        const currentValue = position.quantity * position.averageEntryPrice;
        const newValue = quantity * price;
        const newQuantity = position.quantity + quantity;
        
        if (newQuantity > 0) {
          const newAveragePrice = (currentValue + newValue) / newQuantity;
          position.averageEntryPrice = newAveragePrice;
        }
        
        position.quantity = newQuantity;
      } 
      else if (type === 'SELL') {
        // Calcular lucro realizado
        const profit = (price - position.averageEntryPrice) * quantity;
        position.realizedProfit += profit;
        
        // Atualizar quantidade
        position.quantity = Math.max(0, position.quantity - quantity);
        
        // Se a posição foi fechada completamente, resetar preço médio
        if (position.quantity === 0) {
          position.averageEntryPrice = 0;
        }
        
        // Adicionar ao P&L do portfólio
        this.portfolio.totalBalance += profit;
      }
      
      // Atualizar preço atual e valor
      position.currentPrice = price;
      position.currentValue = position.quantity * price;
      
      // Calcular lucro não realizado
      if (position.quantity > 0 && position.averageEntryPrice > 0) {
        position.unrealizedProfit = (price - position.averageEntryPrice) * position.quantity;
        position.unrealizedProfitPercentage = ((price / position.averageEntryPrice) - 1) * 100;
      } else {
        position.unrealizedProfit = 0;
        position.unrealizedProfitPercentage = 0;
      }
      
      // Incrementar contador de trades
      position.trades += 1;
      
      // Salvar portfólio atualizado
      await this.savePortfolio();
    } catch (error) {
      logger.error('Erro ao atualizar posições:', error);
    }
  }
  
  /**
   * Busca dados históricos de trades
   * @param {Object} filters - Filtros para busca
   * @returns {Array} Histórico filtrado
   */
  getTradeHistory(filters = {}) {
    try {
      let history = [...this.tradeHistory];
      
      // Aplicar filtros
      if (filters.symbol) {
        history = history.filter(trade => trade.symbol === filters.symbol);
      }
      
      if (filters.strategyId) {
        history = history.filter(trade => trade.strategyId === filters.strategyId);
      }
      
      if (filters.type) {
        history = history.filter(trade => trade.type === filters.type);
      }
      
      if (filters.startTime) {
        history = history.filter(trade => 
          new Date(trade.timestamp) >= new Date(filters.startTime)
        );
      }
      
      if (filters.endTime) {
        history = history.filter(trade => 
          new Date(trade.timestamp) <= new Date(filters.endTime)
        );
      }
      
      // Ordenar por data (mais recente primeiro)
      history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Limitar quantidade se necessário
      if (filters.limit && filters.limit > 0) {
        history = history.slice(0, filters.limit);
      }
      
      return history;
    } catch (error) {
      logger.error('Erro ao buscar histórico de trades:', error);
      return [];
    }
  }
  
  /**
   * Obtém os dados atuais do portfólio
   * @returns {Object} Portfólio atual
   */
  getPortfolio() {
    return {...this.portfolio};
  }
  
  /**
   * Obtém performance do portfólio
   * @returns {Object} Dados de performance
   */
  getPerformance() {
    return {...this.portfolio.performance};
  }
  
  /**
   * Obtém performance histórica do portfólio
   * @param {string} period - Período ('day', 'week', 'month', 'year', 'all')
   * @returns {Array} Snapshots de performance para o período
   */
  getHistoricalPerformance(period = 'month') {
    try {
      // Ordenar snapshots por data
      const sortedSnapshots = [...this.performanceSnapshots].sort((a, b) => {
        return new Date(a.timestamp) - new Date(b.timestamp);
      });
      
      if (sortedSnapshots.length === 0) {
        return [];
      }
      
      // Filtrar por período
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
        default:
          startDate = new Date(0); // Unix Epoch
          break;
      }
      
      const filteredSnapshots = sortedSnapshots.filter(snapshot => 
        new Date(snapshot.timestamp) >= startDate
      );
      
      // Formatar dados para gráfico
      return filteredSnapshots.map(snapshot => ({
        timestamp: snapshot.timestamp,
        totalBalance: snapshot.totalBalance,
        availableBalance: snapshot.availableBalance,
        performance: {
          totalProfit: snapshot.performance.totalProfit,
          totalProfitPercentage: snapshot.performance.totalProfitPercentage
        }
      }));
    } catch (error) {
      logger.error('Erro ao obter performance histórica:', error);
      return [];
    }
  }
}

// Singleton
const portfolioManager = new PortfolioManager();

module.exports = portfolioManager;