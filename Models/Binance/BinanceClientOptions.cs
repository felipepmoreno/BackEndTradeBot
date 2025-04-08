using Binance.Net.Clients;
using Binance.Net.Objects;
using CryptoExchange.Net.Authentication;

namespace TradingBotApi.Models.Binance
{
    /// <summary>
    /// Helper class to configure Binance client options
    /// </summary>
    public static class BinanceClientOptionHelper
    {
        /// <summary>
        /// Creates a properly configured BinanceClient options instance
        /// </summary>
        /// <param name="apiKey">The API key</param>
        /// <param name="apiSecret">The API secret</param>
        /// <param name="useTestnet">Whether to use the testnet</param>
        /// <returns>Configured BinanceClientOptions</returns>
        public static BinanceClientOptions CreateClientOptions(string apiKey, string apiSecret, bool useTestnet = true)
        {
            var options = new BinanceClientOptions
            {
                ApiCredentials = new ApiCredentials(apiKey, apiSecret),
                SpotApiOptions = new BinanceApiClientOptions
                {
                    BaseAddress = useTestnet 
                        ? "https://testnet.binance.vision/api" 
                        : "https://api.binance.com/api"
                }
            };

            return options;
        }
    }
}
