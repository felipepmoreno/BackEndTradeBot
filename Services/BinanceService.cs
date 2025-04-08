using Binance.Net.Clients;
using Binance.Net.Objects;
using TradingBotApi.Models;
using TradingBotApi.Models.Binance;

namespace TradingBotApi.Services
{
    public class BinanceService : IBinanceService
    {
        private readonly ILogger<BinanceService> _logger;
        private readonly IConfiguration _configuration;
        private BinanceConfig? _storedConfig;

        public BinanceService(ILogger<BinanceService> logger, IConfiguration configuration)
        {
            _logger = logger;
            _configuration = configuration;
            
            // Try to load configuration from appsettings.json if available
            var apiKey = _configuration["Binance:ApiKey"];
            var apiSecret = _configuration["Binance:ApiSecret"];
            
            if (!string.IsNullOrEmpty(apiKey) && !string.IsNullOrEmpty(apiSecret))
            {
                _storedConfig = new BinanceConfig
                {
                    ApiKey = apiKey,
                    ApiSecret = apiSecret
                };
            }
        }

        private BinanceClient CreateClient(BinanceConfig? config = null)
        {
            var configToUse = config ?? _storedConfig ?? throw new InvalidOperationException("No Binance configuration provided");
            var options = BinanceClientOptionHelper.CreateClientOptions(configToUse.ApiKey, configToUse.ApiSecret, true);
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
        
        public async Task<object> GetStatus(BinanceConfig? config = null)
        {
            try
            {
                var client = CreateClient(config);
                
                // Verificar a conexão através de ping
                var pingResult = await client.SpotApi.ExchangeData.PingAsync();
                
                // Verificar status do servidor
                var serverTimeResult = await client.SpotApi.ExchangeData.GetServerTimeAsync();
                
                // Verificar se a exchange está em manutenção
                var systemStatusResult = await client.GeneralApi.System.GetSystemStatusAsync();
                
                return new
                {
                    IsConnected = pingResult.Success,
                    ServerTime = serverTimeResult.Success ? serverTimeResult.Data : null,
                    SystemStatus = systemStatusResult.Success ? systemStatusResult.Data : null,
                    Timestamp = DateTime.UtcNow
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get status from Binance TestNet");
                return new
                {
                    IsConnected = false,
                    Error = ex.Message,
                    Timestamp = DateTime.UtcNow
                };
            }
        }
        
        public async Task<IEnumerable<string>> GetAvailableSymbols(BinanceConfig config)
        {
            try
            {
                var client = CreateClient(config);
                var exchangeInfoResult = await client.SpotApi.ExchangeData.GetExchangeInfoAsync();
                
                if (!exchangeInfoResult.Success)
                {
                    _logger.LogError("Failed to fetch exchange info: {Error}", exchangeInfoResult.Error?.Message);
                    throw new Exception($"Failed to fetch exchange info: {exchangeInfoResult.Error?.Message}");
                }
                
                return exchangeInfoResult.Data.Symbols
                    .Where(s => s.Status == Binance.Net.Enums.SymbolStatus.Trading)
                    .Select(s => s.Name)
                    .ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching available symbols");
                throw;
            }
        }
        
        public async Task<DateTime> GetServerTime(BinanceConfig config)
        {
            try
            {
                var client = CreateClient(config);
                var serverTimeResult = await client.SpotApi.ExchangeData.GetServerTimeAsync();
                
                if (!serverTimeResult.Success)
                {
                    _logger.LogError("Failed to fetch server time: {Error}", serverTimeResult.Error?.Message);
                    throw new Exception($"Failed to fetch server time: {serverTimeResult.Error?.Message}");
                }
                
                return serverTimeResult.Data;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching server time");
                throw;
            }
        }
    }
}
