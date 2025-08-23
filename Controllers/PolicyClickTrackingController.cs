using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Cache;
using Umbraco.Cms.Core.Logging;
using Umbraco.Cms.Core.Routing;
using Umbraco.Cms.Core.Web;
using Umbraco.Cms.Infrastructure.Persistence;
using Umbraco.Cms.Web.Common.Controllers;
using Neumo.Handbook.Models;
using NPoco;
using System.Net;

namespace Neumo.Handbook.Controllers
{
    /// <summary>
    /// API Controller for tracking policy card clicks
    /// Lightweight endpoint that doesn't interfere with existing functionality
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class PolicyClickTrackingController : ControllerBase
    {
        private readonly IUmbracoDatabaseFactory _databaseFactory;
        private readonly ILogger<PolicyClickTrackingController> _logger;

        public PolicyClickTrackingController(
            IUmbracoDatabaseFactory databaseFactory,
            ILogger<PolicyClickTrackingController> logger)
        {
            _databaseFactory = databaseFactory;
            _logger = logger;
        }

        /// <summary>
        /// Records a click on a policy card
        /// POST /api/PolicyClickTracking/RecordClick
        /// </summary>
        [HttpPost("RecordClick")]
        public async Task<IActionResult> RecordClick([FromBody] PolicyClickRequest? request)
        {
            try
            {
                if (request is null)
                {
                    return BadRequest("Missing request body");
                }
                if (request.PolicyId <= 0)
                {
                    return BadRequest("Invalid policy ID");
                }

                // Promote to local non-null variables to satisfy static analysis
                var policyId = request.PolicyId;
                var policyTitleInput = request.PolicyTitle;

                using var database = _databaseFactory.CreateDatabase();

                // Safely read User-Agent header
                string? userAgent = null;
                if (Request != null && Request.Headers.TryGetValue("User-Agent", out var uaValues))
                {
                    userAgent = uaValues.ToString();
                }

                // Record the individual click
                var click = new PolicyCardClick
                {
                    PolicyId = policyId,
                    PolicyTitle = policyTitleInput ?? "Unknown",
                    ClickedAt = DateTime.UtcNow,
                    IpAddress = GetClientIpAddress(),
                    UserAgent = userAgent
                };

                await database.InsertAsync(click);

                // Update or create the aggregated count
                var existingCount = await database.FirstOrDefaultAsync<PolicyCardClickCount>(
                    "SELECT * FROM PolicyCardClickCounts WHERE PolicyId = @0", policyId);

                if (existingCount == null)
                {
                    // First click for this policy - use direct SQL to ensure PolicyId is included
                    await database.ExecuteAsync(
                        "INSERT INTO PolicyCardClickCounts (PolicyId, PolicyTitle, ClickCount, FirstClicked, LastClicked) VALUES (@0, @1, @2, @3, @4)",
                        policyId,
                        policyTitleInput ?? "Unknown",
                        1,
                        DateTime.UtcNow,
                        DateTime.UtcNow
                    );
                }
                else
                {
                    // Update existing count
                    existingCount.ClickCount++;
                    existingCount.LastClicked = DateTime.UtcNow;
                    existingCount.PolicyTitle = policyTitleInput ?? existingCount.PolicyTitle; // Update title if provided
                    await database.UpdateAsync(existingCount);
                }

                _logger.LogInformation("Recorded click for policy {PolicyId}: {PolicyTitle}", 
                    policyId, policyTitleInput);

                return Ok(new { success = true, message = "Click recorded successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error recording policy click for PolicyId: {PolicyId}", request?.PolicyId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get click counts for policies (for future "Sort by Popularity" feature)
        /// GET /api/PolicyClickTracking/GetClickCounts
        /// </summary>
        [HttpGet("GetClickCounts")]
        public async Task<IActionResult> GetClickCounts()
        {
            try
            {
                using var database = _databaseFactory.CreateDatabase();
                
                var clickCounts = await database.FetchAsync<PolicyCardClickCount>(
                    "SELECT * FROM PolicyCardClickCounts ORDER BY ClickCount DESC");

                return Ok(clickCounts);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving policy click counts");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        private string? GetClientIpAddress()
        {
            try
            {
                // Check for forwarded IP first (common in load balancers/proxies)
                if (Request.Headers.ContainsKey("X-Forwarded-For"))
                {
                    return Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',').FirstOrDefault()?.Trim();
                }

                // Check for real IP header
                if (Request.Headers.ContainsKey("X-Real-IP"))
                {
                    return Request.Headers["X-Real-IP"].FirstOrDefault();
                }

                // Fall back to connection remote IP
                return Request.HttpContext?.Connection?.RemoteIpAddress?.ToString();
            }
            catch
            {
                return null;
            }
        }
    }

    /// <summary>
    /// Request model for recording policy clicks
    /// </summary>
    public class PolicyClickRequest
    {
        public int PolicyId { get; set; }
        public string? PolicyTitle { get; set; }
    }
}
