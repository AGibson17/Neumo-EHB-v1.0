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
                            ClickedAt TEXT NOT NULL,
                            IpAddress TEXT,
                            UserAgent TEXT
                        )
                    ";
                    database.Execute(createClicksTable);
                    database.Execute("CREATE INDEX IF NOT EXISTS IX_PolicyCardClicks_PolicyId ON PolicyCardClicks(PolicyId)");
                    database.Execute("CREATE INDEX IF NOT EXISTS IX_PolicyCardClicks_ClickedAt ON PolicyCardClicks(ClickedAt)");
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
                            FirstClicked TEXT NOT NULL,
                            LastClicked TEXT NOT NULL
                        )
                    ";
                    database.Execute(createCountsTable);
                    database.Execute("CREATE INDEX IF NOT EXISTS IX_PolicyCardClickCounts_ClickCount ON PolicyCardClickCounts(ClickCount DESC)");
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
                // Check if table exists using SQLite's sqlite_master
                var count = database.ExecuteScalar<int>(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=@0", 
                    tableName);
                return count > 0;
            }
            catch
            {
                return false;
            }
        }
    }
}
