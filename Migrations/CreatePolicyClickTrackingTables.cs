using Umbraco.Cms.Infrastructure.Migrations;

namespace Neumo.Handbook.Migrations
{
    /// <summary>
    /// Migration to create policy click tracking tables
    /// </summary>
    public class CreatePolicyClickTrackingTables : AsyncMigrationBase
    {
        public CreatePolicyClickTrackingTables(IMigrationContext context) : base(context)
        {
        }

        protected override Task MigrateAsync()
        {
            // Create PolicyCardClicks table for detailed click logs
            if (!TableExists("PolicyCardClicks"))
            {
                Create.Table("PolicyCardClicks")
                    .WithColumn("Id").AsInt32().PrimaryKey().Identity()
                    .WithColumn("PolicyId").AsInt32().NotNullable()
                    .WithColumn("PolicyTitle").AsString(255).NotNullable()
                    .WithColumn("ClickedAt").AsDateTime().NotNullable()
                    .WithColumn("IpAddress").AsString(45).Nullable()
                    .WithColumn("UserAgent").AsString(500).Nullable()
                    .Do();

                // Add index for faster queries
                Create.Index("IX_PolicyCardClicks_PolicyId").OnTable("PolicyCardClicks")
                    .OnColumn("PolicyId");
                    
                Create.Index("IX_PolicyCardClicks_ClickedAt").OnTable("PolicyCardClicks")
                    .OnColumn("ClickedAt");
            }

            // Create PolicyCardClickCounts table for aggregated counts
            if (!TableExists("PolicyCardClickCounts"))
            {
                Create.Table("PolicyCardClickCounts")
                    .WithColumn("PolicyId").AsInt32().PrimaryKey()
                    .WithColumn("PolicyTitle").AsString(255).NotNullable()
                    .WithColumn("ClickCount").AsInt32().NotNullable().WithDefaultValue(0)
                    .WithColumn("FirstClicked").AsDateTime().NotNullable()
                    .WithColumn("LastClicked").AsDateTime().NotNullable()
                    .Do();

                // Add index for sorting by popularity
                Create.Index("IX_PolicyCardClickCounts_ClickCount").OnTable("PolicyCardClickCounts")
                    .OnColumn("ClickCount").Descending();
            }
            
            return Task.CompletedTask;
        }
    }
}
