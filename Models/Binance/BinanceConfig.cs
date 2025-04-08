namespace TradingBotApi.Models
{
    /// <summary>
    /// Configuration for connecting to Binance API
    /// </summary>
    public class BinanceConfig
    {
        /// <summary>
        /// API Key for Binance
        /// </summary>
        public string ApiKey { get; set; } = string.Empty;

        /// <summary>
        /// API Secret for Binance
        /// </summary>
        public string ApiSecret { get; set; } = string.Empty;
    }
}
