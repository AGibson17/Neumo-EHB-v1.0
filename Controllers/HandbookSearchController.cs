using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Text.RegularExpressions;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.Web;
using Umbraco.Cms.Web.Common.Controllers;
using Umbraco.Extensions;

namespace Neumo.Handbook.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HandbookSearchController : ControllerBase
    {
        private readonly IUmbracoContextFactory _umbracoContextFactory;
        private readonly ILogger<HandbookSearchController> _logger;

        public HandbookSearchController(
            IUmbracoContextFactory umbracoContextFactory,
            ILogger<HandbookSearchController> logger)
        {
            _umbracoContextFactory = umbracoContextFactory;
            _logger = logger;
        }

        [HttpGet("Search")]
        public IActionResult Search([FromQuery] string q, [FromQuery] int take = 20)
        {
            if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
            {
                return Ok(Array.Empty<object>());
            }

            var results = new List<object>();
            try
            {
                using var cref = _umbracoContextFactory.EnsureUmbracoContext();
                var umbraco = cref?.UmbracoContext;
                var contentCache = umbraco?.Content;

                if (contentCache == null)
                {
                    return Ok(results);
                }

                // Get content at root and then search descendants (Umbraco 16 compatible approach)
                var roots = contentCache.GetAtRoot();
                if (roots == null || !roots.Any())
                {
                    return Ok(results);
                }

                // Get all policy cards and category cards by filtering descendants
                var allContent = roots.SelectMany(r => r.DescendantsOrSelf())
                    .Where(x => x.ContentType.Alias == "policyCard" || x.ContentType.Alias == "HandbookCategoryCard")
                    .ToList();

                if (!allContent.Any())
                {
                    return Ok(results);
                }

                string query = q.Trim();
                int max = Math.Clamp(take, 1, 50);

                // Search Policy Cards
                var policyCards = allContent
                    .Where(x => x.ContentType.Alias == "policyCard")
                    .Where(p => {
                        var policyTitle = p.Value<string>("policyTitle") ?? p.Name;
                        var summary = p.Value<string>("summary");
                        var fullPolicyText = p.Value<string>("fullPolicyText");
                        
                        var strippedText = StripHtml(fullPolicyText);
                        var strippedSummary = StripHtml(summary);
                        
                        return (policyTitle?.InvariantContains(query) ?? false) ||
                               (!string.IsNullOrEmpty(strippedSummary) && strippedSummary.InvariantContains(query)) ||
                               (!string.IsNullOrEmpty(strippedText) && strippedText.InvariantContains(query));
                    })
                    .Take(max)
                    .Select(p => new
                    {
                        id = p.Id,
                        title = p.Value<string>("policyTitle") ?? p.Name,
                        description = string.IsNullOrWhiteSpace(p.Value<string>("summary")) ? 
                            TakeWords(StripHtml(p.Value<string>("fullPolicyText")), 40) : 
                            StripHtml(p.Value<string>("summary")),
                        // Policies are rendered within their category page; use the parent URL with a hash to deep-link
                        url = p.Parent<IPublishedContent>()?.Url() ?? p.Url(),
                        categoryUrl = p.Parent<IPublishedContent>()?.Url(),
                        category = "Policy",
                        type = "policy"
                    });

                // Search Handbook Categories
                var categories = allContent
                    .Where(x => x.ContentType.Alias == "HandbookCategoryCard")
                    .Where(c => {
                        var categoryTitle = c.Value<string>("categoryTitle") ?? c.Name;
                        var categoryDescription = c.Value<string>("categoryDescription");
                        
                        return (categoryTitle?.InvariantContains(query) ?? false) ||
                               (categoryDescription?.InvariantContains(query) ?? false);
                    })
                    .Take(max)
                    .Select(c => new
                    {
                        title = c.Value<string>("categoryTitle") ?? c.Name,
                        description = c.Value<string>("categoryDescription"),
                        url = c.Url(),
                        category = "Category",
                        type = "category"
                    });

                results.AddRange(policyCards);
                results.AddRange(categories);

                return Ok(results.Take(max));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing search for query: {Query}", q);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        private static string StripHtml(string? input)
        {
            if (string.IsNullOrWhiteSpace(input)) return string.Empty;
            return Regex.Replace(input, "<[^>]*>", string.Empty).Trim();
        }

        private static string TakeWords(string? input, int maxWords)
        {
            if (string.IsNullOrWhiteSpace(input)) return string.Empty;
            var words = input.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (words.Length <= maxWords) return input;
            return string.Join(' ', words.Take(maxWords)) + "…";
        }
    }
}
