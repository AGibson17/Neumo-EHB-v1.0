using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.Services;

namespace Neumo.Handbook.Controllers
{
    /// <summary>
    /// Temporary controller to check if admin user exists - 
    /// This helps debug unattended install issues
    /// REMOVE THIS AFTER DEPLOYMENT WORKS
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class AdminSetupController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly ILogger<AdminSetupController> _logger;

        public AdminSetupController(
            IUserService userService, 
            ILogger<AdminSetupController> logger)
        {
            _userService = userService;
            _logger = logger;
        }

        [HttpGet("CheckAdmin")]
        public IActionResult CheckAdmin()
        {
            try
            {
                // Check if specific admin user exists
                var adminUser = _userService.GetByEmail("admin@neumo.com");
                
                if (adminUser != null)
                {
                    return Ok(new { 
                        success = true, 
                        message = "Admin user found",
                        adminEmail = adminUser.Email,
                        adminGroups = adminUser.Groups.Select(g => g.Alias).ToArray()
                    });
                }
                else
                {
                    return Ok(new { 
                        success = false, 
                        message = "Admin user not found"
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking admin users");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("Status")]
        public IActionResult Status()
        {
            return Ok(new { message = "AdminSetup controller is working", timestamp = DateTime.UtcNow });
        }
    }
}
