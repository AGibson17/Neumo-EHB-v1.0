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
                            Id INTEGER PRIMARY KEY AUTOINCREMENT,
                            PolicyId INTEGER NOT NULL,
                            PolicyTitle TEXT NOT NULL,
                            ClickedAt DATETIME NOT NULL,
                            IpAddress TEXT,
                            UserAgent TEXT
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
                            PolicyId INTEGER PRIMARY KEY,
                            PolicyTitle TEXT NOT NULL,
                            ClickCount INTEGER NOT NULL DEFAULT 0,
                            FirstClicked DATETIME NOT NULL,
                            LastClicked DATETIME NOT NULL
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
                // Simple check by trying to query the table
                database.ExecuteScalar<int>($"SELECT 1 FROM {tableName} LIMIT 1");
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}
