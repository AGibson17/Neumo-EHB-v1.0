using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Text;
using Umbraco.Cms.Core.Web;
using Umbraco.Cms.Web.Common.Controllers;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Extensions;
using Umbraco.Cms.Core.Services;

namespace Neumo.Handbook.Controllers
{
    [Route("api/[controller]")]
    public class PolicyExportController : ControllerBase
    {
        private readonly IUmbracoContextFactory _umbracoContextFactory;
        private readonly ILogger<PolicyExportController> _logger;
        private readonly IContentService _contentService;

        public PolicyExportController(IUmbracoContextFactory umbracoContextFactory, ILogger<PolicyExportController> logger, IContentService contentService)
        {
            _umbracoContextFactory = umbracoContextFactory;
            _logger = logger;
            _contentService = contentService;
        }

        [HttpGet("ExportCsv")]
        public IActionResult ExportCsv()
        {
            try
            {
                using var cref = _umbracoContextFactory.EnsureUmbracoContext();
                var umbraco = cref?.UmbracoContext;
                var contentCache = umbraco?.Content;
                var rootContent = _contentService.GetRootContent();
                var allPolicyCards = new List<IPublishedContent>();
                
                foreach (var root in rootContent)
                {
                    var publishedRoot = contentCache?.GetById(root.Id);
                    if (publishedRoot != null)
                    {
                        allPolicyCards.AddRange(publishedRoot.DescendantsOrSelf()
                            .Where(x => x.ContentType.Alias == "policyCard"));
                    }
                }
                
                var allContent = allPolicyCards.ToList();

                var sb = new StringBuilder();

                // Header row exactly as requested
                sb.AppendLine("Id,Title,Category,Subcategory,Slug,SummaryText,FullHtml,EffectiveDate,Version,AppliesToStates,StateOverridesJson,Tags,RelatedIds,AttachmentsJson,AckRequired,ExternalId");

                foreach (var p in allContent)
                {
                    // Map fields - use common aliases where available and empty values otherwise
                    var id = p.Id.ToString();
                    var title = CsvEscape(p.Value<string>("policyTitle") ?? p.Name);
                    var category = CsvEscape(p.Parent<IPublishedContent>()?.Name ?? string.Empty);
                    var subcategory = string.Empty; // no explicit subcategory
                    var slug = CsvEscape(p.Url());
                    var summaryText = CsvEscape(StripHtml(p.Value<string>("summary")));
                    var fullHtml = CsvEscape(p.Value<string>("fullPolicyText"));
                    var effectiveDate = p.Value<DateTime?>("revisionDate")?.ToString("o") ?? string.Empty;
                    var version = string.Empty; // not available
                    var appliesToStates = string.Empty; // custom mapping not implemented
                    var stateOverridesJson = string.Empty; // could be serialized if needed
                    var tags = string.Empty; // not available
                    var relatedIds = string.Empty; // not available
                    var attachmentsJson = string.Empty; // not available
                    var ackRequired = string.Empty; // not available
                    var externalId = string.Empty; // not available

                    var row = string.Join(",", new[] { id, title, category, subcategory, slug, summaryText, fullHtml, effectiveDate, version, appliesToStates, stateOverridesJson, tags, relatedIds, attachmentsJson, ackRequired, externalId });
                    sb.AppendLine(row);
                }

                var bytes = Encoding.UTF8.GetBytes(sb.ToString());
                return File(bytes, "text/csv", "policies-export.csv");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exporting policies to CSV");
                return StatusCode(500, "Error exporting policies");
            }
        }

        private static string StripHtml(string? input)
        {
            if (string.IsNullOrWhiteSpace(input)) return string.Empty;
            return System.Text.RegularExpressions.Regex.Replace(input, "<[^>]*>", string.Empty).Trim();
        }

        private static string CsvEscape(string? input)
        {
            if (string.IsNullOrEmpty(input)) return string.Empty;
            var s = input.Replace("\"", "\"\"");
            if (s.Contains(',') || s.Contains('"') || s.Contains('\n') || s.Contains('\r'))
            {
                return "\"" + s + "\"";
            }
            return s;
        }
    }
}
