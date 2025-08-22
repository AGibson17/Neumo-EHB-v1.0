using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Umbraco.Cms.Infrastructure.Persistence;
using Umbraco.Cms.Core.Services;

namespace Neumo.Handbook.Models
{
    // Simple model to track policy card clicks
    [Table("PolicyCardClicks")]
    public class PolicyCardClick
    {
        [Key]
        public int Id { get; set; }
        
        public int PolicyId { get; set; }
        
        public string PolicyTitle { get; set; } = string.Empty;
        
        public DateTime ClickedAt { get; set; }
        
        public string? IpAddress { get; set; }
        
        public string? UserAgent { get; set; }
    }
    
    // Aggregated click counts for easier querying
    [Table("PolicyCardClickCounts")]
    public class PolicyCardClickCount
    {
        [Key]
        public int PolicyId { get; set; }
        
        public string PolicyTitle { get; set; } = string.Empty;
        
        public int ClickCount { get; set; }
        
        public DateTime LastClicked { get; set; }
        
        public DateTime FirstClicked { get; set; }
    }
}
