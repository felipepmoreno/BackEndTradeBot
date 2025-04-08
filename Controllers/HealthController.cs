using Microsoft.AspNetCore.Mvc;

namespace TradingBotApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        [HttpGet]
        public IActionResult Get()
        {
            return Ok(new { Status = "Healthy", Timestamp = DateTime.UtcNow });
        }
    }
}
