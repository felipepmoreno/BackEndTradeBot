using Microsoft.AspNetCore.Mvc;

namespace TradingBotApi.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class HealthController : ControllerBase
    {
        private readonly ILogger<HealthController> _logger;

        public HealthController(ILogger<HealthController> logger)
        {
            _logger = logger;
        }

        [HttpGet]
        public IActionResult Get()
        {
            _logger.LogInformation("Health check endpoint called at {time}", DateTime.UtcNow);
            
            return Ok(new 
            { 
                Status = "Healthy",
                Timestamp = DateTime.UtcNow 
            });
        }
    }
}
