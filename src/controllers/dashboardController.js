const logger = require('../utils/logger');

exports.getDashboardData = async (req, res, next) => {
  try {
    // In a real app, this would fetch data from a database or trading service
    const dashboardData = {
      accountBalance: {
        total: 10000.52,
        available: 8250.30,
        inOrders: 1750.22,
        btcValue: 0.387
      },
      recentTrades: [
        { id: 1, pair: 'BTC/USDT', type: 'BUY', price: 28500.12, amount: 0.05, timestamp: Date.now() - 3600000 },
        { id: 2, pair: 'ETH/USDT', type: 'SELL', price: 1850.75, amount: 1.2, timestamp: Date.now() - 7200000 }
      ],
      activeStrategies: 3,
      dailyPnL: 125.45,
      weeklyPnL: 430.78,
      monthlyPnL: 1230.56,
      performanceChart: [
        { date: '2023-05-01', value: 10000 },
        { date: '2023-05-02', value: 10050 },
        { date: '2023-05-03', value: 10150 },
        { date: '2023-05-04', value: 10075 },
        { date: '2023-05-05', value: 10200 },
        { date: '2023-05-06', value: 10350 },
        { date: '2023-05-07', value: 10430 }
      ]
    };

    res.status(200).json(dashboardData);
  } catch (error) {
    logger.error('Error fetching dashboard data:', error);
    next(error);
  }
};
