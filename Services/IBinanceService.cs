using TradingBotApi.Models;

namespace TradingBotApi.Services
{
    public interface IBinanceService
    {
        /// <summary>
        /// Tests the connection to the Binance API
        /// </summary>
        /// <param name="config">The Binance configuration with API credentials</param>
        /// <returns>True if the connection was successful, false otherwise</returns>
        Task<bool> TestConnection(BinanceConfig config);

        /// <summary>
        /// Gets the current price of a trading symbol
        /// </summary>
        /// <param name="symbol">The trading symbol (e.g., BTCUSDT)</param>
        /// <param name="config">Binance API configuration</param>
        /// <returns>The current price</returns>
        Task<decimal> GetPrice(string symbol, BinanceConfig config);
        
        /// <summary>
        /// Gets the connection status with Binance API
        /// </summary>
        /// <param name="config">Binance API configuration (optional if using stored credentials)</param>
        /// <returns>Status object with connection information</returns>
        Task<object> GetStatus(BinanceConfig? config = null);
        
        /// <summary>
        /// Gets available trading symbols from the Binance API
        /// </summary>
        /// <param name="config">Binance API configuration</param>
        /// <returns>List of available trading symbols</returns>
        Task<IEnumerable<string>> GetAvailableSymbols(BinanceConfig config);
        
        /// <summary>
        /// Gets server time from Binance API
        /// </summary>
        /// <param name="config">Binance API configuration</param>
        /// <returns>Server time in UTC</returns>
        Task<DateTime> GetServerTime(BinanceConfig config);
    }
}
