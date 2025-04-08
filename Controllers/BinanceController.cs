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
    }
}
