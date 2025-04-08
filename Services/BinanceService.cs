using Binance.Net.Clients;
using Binance.Net.Objects;
using TradingBotApi.Models;
using TradingBotApi.Models.Binance;

namespace TradingBotApi.Services
{
    public class BinanceService : IBinanceService
    {
        private readonly ILogger<BinanceService> _logger;

        public BinanceService(ILogger<BinanceService> logger)
        {
            _logger = logger;
        }

        private BinanceClient CreateClient(BinanceConfig config)
        {
            var options = BinanceClientOptionHelper.CreateClientOptions(config.ApiKey, config.ApiSecret, true);
            return new BinanceClient(options);
        }

        public async Task<bool> TestConnection(BinanceConfig config)
        {
            try
            {
                var client = CreateClient(config);
                var pingResult = await client.SpotApi.ExchangeData.PingAsync();
                return pingResult.Success;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to test connection with Binance TestNet");
                return false;
            }
        }

        public async Task<decimal> GetPrice(string symbol, BinanceConfig config)
        {
            try
            {
                var client = CreateClient(config);
                var priceResult = await client.SpotApi.ExchangeData.GetPriceAsync(symbol);

                if (!priceResult.Success)
                {
                    _logger.LogError("Failed to fetch price: {Error}", priceResult.Error?.Message);
                    throw new Exception($"Failed to fetch price: {priceResult.Error?.Message}");
                }

                return priceResult.Data.Price;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching price for {Symbol}", symbol);
                throw;
            }
        }
    }
}
