using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Notifications;
using Neumo.Handbook.Components;

namespace Neumo.Handbook.Composers
{
    /// <summary>
    /// Composer to register policy click tracking startup handler
    /// </summary>
    public class PolicyClickTrackingComposer : IComposer
    {
        public void Compose(IUmbracoBuilder builder)
        {
            // Register the startup notification handler
            builder.AddNotificationHandler<UmbracoApplicationStartingNotification, PolicyClickTrackingStartupHandler>();
        }
    }
}
