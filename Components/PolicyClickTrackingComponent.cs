using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Persistence;
using NPoco;

namespace Neumo.Handbook.Components
{
    /// <summary>
    /// Notification handler to ensure policy click tracking tables exist
    /// </summary>
    public class PolicyClickTrackingStartupHandler : INotificationHandler<UmbracoApplicationStartingNotification>
    {
        private readonly IUmbracoDatabaseFactory _databaseFactory;
        private readonly ILogger<PolicyClickTrackingStartupHandler> _logger;

        public PolicyClickTrackingStartupHandler(
            IUmbracoDatabaseFactory databaseFactory,
            ILogger<PolicyClickTrackingStartupHandler> logger)
        {
            _databaseFactory = databaseFactory;
            _logger = logger;
        }

        public void Handle(UmbracoApplicationStartingNotification notification)
        {
            try
            {
                using var database = _databaseFactory.CreateDatabase();

                // Create PolicyCardClicks table if it doesn't exist
                if (!TableExists(database, "PolicyCardClicks"))
                {
                    var createClicksTable = @"
                        CREATE TABLE PolicyCardClicks (
                            Id INT IDENTITY(1,1) PRIMARY KEY,
                            PolicyId INT NOT NULL,
                            PolicyTitle NVARCHAR(255) NOT NULL,
                            ClickedAt DATETIME2 NOT NULL,
                            IpAddress NVARCHAR(45),
                            UserAgent NVARCHAR(500)
                        );
                        CREATE INDEX IX_PolicyCardClicks_PolicyId ON PolicyCardClicks(PolicyId);
                        CREATE INDEX IX_PolicyCardClicks_ClickedAt ON PolicyCardClicks(ClickedAt);
                    ";
                    database.Execute(createClicksTable);
                    _logger.LogInformation("Created PolicyCardClicks table");
                }

                // Create PolicyCardClickCounts table if it doesn't exist
                if (!TableExists(database, "PolicyCardClickCounts"))
                {
                    var createCountsTable = @"
                        CREATE TABLE PolicyCardClickCounts (
                            PolicyId INT PRIMARY KEY,
                            PolicyTitle NVARCHAR(255) NOT NULL,
                            ClickCount INT NOT NULL DEFAULT 0,
                            FirstClicked DATETIME2 NOT NULL,
                            LastClicked DATETIME2 NOT NULL
                        );
                        CREATE INDEX IX_PolicyCardClickCounts_ClickCount ON PolicyCardClickCounts(ClickCount DESC);
                    ";
                    database.Execute(createCountsTable);
                    _logger.LogInformation("Created PolicyCardClickCounts table");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create policy click tracking tables");
            }
        }

        private bool TableExists(IUmbracoDatabase database, string tableName)
        {
            try
            {
                // Check if table exists using SQL Server system tables
                var count = database.ExecuteScalar<int>(
                    "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = @tableName", 
                    new { tableName });
                return count > 0;
            }
            catch
            {
                return false;
            }
        }
    }
}
