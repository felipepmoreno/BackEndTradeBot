using Microsoft.AspNetCore.Mvc;
using TradingBotApi.Models;
using TradingBotApi.Services;

namespace TradingBotApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BinanceController : ControllerBase
    {
        private readonly IBinanceService _binanceService;
        private readonly ILogger<BinanceController> _logger;

        public BinanceController(IBinanceService binanceService, ILogger<BinanceController> logger)
        {
            _binanceService = binanceService;
            _logger = logger;
        }

        [HttpPost("test-connection")]
        public async Task<IActionResult> TestConnection([FromBody] BinanceConfig config)
        {
            try
            {
                var isConnected = await _binanceService.TestConnection(config);
                return Ok(new { IsConnected = isConnected, Timestamp = DateTime.UtcNow });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing Binance connection");
                return StatusCode(500, new { Error = "Internal server error while testing connection" });
            }
        }

        /// <summary>
        /// Gets the current status of the Binance connection
        /// </summary>
        /// <returns>Connection status information</returns>
        [HttpGet("status")]
        public async Task<IActionResult> GetStatus([FromQuery] string? apiKey = null, [FromQuery] string? apiSecret = null)
        {
            try
            {
                BinanceConfig? config = null;
                if (!string.IsNullOrEmpty(apiKey) && !string.IsNullOrEmpty(apiSecret))
                {
                    config = new BinanceConfig { ApiKey = apiKey, ApiSecret = apiSecret };
                }
                
                var status = await _binanceService.GetStatus(config);
                return Ok(status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking Binance status");
                return StatusCode(500, new { Error = $"Error checking status: {ex.Message}" });
            }
        }

        [HttpGet("price/{symbol}")]
        public async Task<IActionResult> GetPrice(string symbol, [FromQuery] string apiKey, [FromQuery] string apiSecret)
        {
            try
            {
                var config = new BinanceConfig { ApiKey = apiKey, ApiSecret = apiSecret };
                var price = await _binanceService.GetPrice(symbol, config);
                return Ok(new { Symbol = symbol, Price = price, Timestamp = DateTime.UtcNow });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching price for {Symbol}", symbol);
                return StatusCode(500, new { Error = $"Error fetching price: {ex.Message}" });
            }
        }

        /// <summary>
        /// Gets a list of all available trading symbols from Binance
        /// </summary>
        /// <returns>List of available trading symbols</returns>
        [HttpGet("symbols")]
        public async Task<IActionResult> GetSymbols([FromQuery] string apiKey, [FromQuery] string apiSecret)
        {
            try
            {
                var config = new BinanceConfig { ApiKey = apiKey, ApiSecret = apiSecret };
                var symbols = await _binanceService.GetAvailableSymbols(config);
                return Ok(new { Symbols = symbols, Count = symbols.Count(), Timestamp = DateTime.UtcNow });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching available symbols");
                return StatusCode(500, new { Error = $"Error fetching symbols: {ex.Message}" });
            }
        }

        /// <summary>
        /// Gets the current server time from Binance
        /// </summary>
        /// <returns>Current server time in UTC</returns>
        [HttpGet("server-time")]
        public async Task<IActionResult> GetServerTime([FromQuery] string apiKey, [FromQuery] string apiSecret)
        {
            try
            {
                var config = new BinanceConfig { ApiKey = apiKey, ApiSecret = apiSecret };
                var serverTime = await _binanceService.GetServerTime(config);
                return Ok(new { ServerTime = serverTime, LocalTime = DateTime.UtcNow });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching server time");
                return StatusCode(500, new { Error = $"Error fetching server time: {ex.Message}" });
            }
        }
    }
}
