# Neumo Handbook - AI Coding Agent Instructions

## Project Overview
This is an **Umbraco 16 CMS** application (.NET 9) for an employee handbook with policy search functionality and click tracking analytics. Uses SQLite database and uSync for content synchronization.

## Architecture & Key Components

### Core Framework
- **Umbraco CMS**: Content managed via Umbraco backoffice, uses Document Types (PolicyCard, HandbookCategoryCard, etc.)
- **uSync**: Content synchronization in `uSync/v16/` - DO NOT manually edit these files, they're auto-generated
- **Content Models**: Umbraco auto-generates models in `Umbraco.Cms.Web.Common.PublishedModels` namespace

### Custom Features
- **Search API**: `HandbookSearchController` provides `/api/HandbookSearch/Search` endpoint for policy/category search
- **Click Tracking**: Analytics system to track policy engagement for future "sort by popularity" features
  - `PolicyClickTrackingController` - API endpoint
  - `PolicyClickTrackingComponent` - Startup handler for table creation
  - JavaScript tracking in `wwwroot/js/policy-click-tracking.js`

### Data Layer
- **Database**: SQLite (`umbraco/Data/Umbraco.sqlite.db`) with auto-created tracking tables
- **Models**: Custom POCOs in `Models/` (PolicyCardClick, PolicyCardClickCount)
- **Migrations**: Uses Umbraco's migration system (note: warnings about MigrationBase deprecation)

## Development Workflows

### Build & Run
```powershell
dotnet build    # May show warnings about deprecated APIs - this is expected
dotnet run      # Runs on https://localhost:5001 (check launchSettings.json)
```

### Content Management
- Access Umbraco backoffice at `/umbraco` 
- Content types defined in `uSync/v16/ContentTypes/` (read-only)
- Views in `Views/` follow Umbraco naming conventions (match content type aliases)

### Database Operations
- No EF migrations - uses direct SQL via `IUmbracoDatabaseFactory`
- Tables auto-created by `PolicyClickTrackingComponent` on startup
- Use NPoco for data access (see Controllers for examples)

## Code Patterns & Conventions

### Umbraco Integration
- **Composers**: Register services in `Composers/` using `IComposer` interface
- **Notification Handlers**: Use for startup logic (database initialization)
- **Controllers**: Inherit from `ControllerBase` for APIs, use `IUmbracoContextFactory` for content access

### Search Implementation
```csharp
// Pattern for dynamic content queries (Umbraco 16)
var roots = contentCache.GetAtRoot();
var policyCards = roots.SelectMany(r => r.DescendantsOrSelf())
    .Where(x => x.ContentType.Alias == "policyCard")
    .Where(p => {
        var title = p.Value<string>("policyTitle") ?? p.Name;
        return title.InvariantContains(query);
    })
```

### Database Access Pattern
```csharp
// Standard pattern for database operations
using var database = _databaseFactory.CreateDatabase();
var result = database.Query<Model>("SELECT * FROM Table WHERE...");
```

### JavaScript Architecture
- Vanilla ES6+ in `wwwroot/js/` 
- No bundling/build process - files served directly
- Class-based patterns with proper error handling and debouncing

## Known Issues & Technical Debt
- Build warning about deprecated `GetAtRoot()` API - will need `IDocumentNavigationQueryService` in v17
- Content models approach: Uses dynamic `Value<string>()` access instead of strongly-typed models for flexibility
- Policy click tracking is non-intrusive and designed not to affect existing functionality

## Umbraco 16 Upgrade Patterns
- **Content Access**: Use dynamic properties via `content.Value<string>("propertyAlias")` instead of strongly-typed models
- **Migrations**: Use `AsyncMigrationBase` instead of deprecated `MigrationBase`  
- **Parent Navigation**: Use `content.Parent<IPublishedContent>()` extension instead of `.Parent` property
- **Future**: `GetAtRoot()` will be replaced by `IDocumentNavigationQueryService` in v17

## Important Directories
- `Views/` - Umbraco templates (cshtml)
- `wwwroot/` - Static assets (CSS, JS, images)
- `umbraco/Data/` - SQLite database and logs
- `uSync/v16/` - Content synchronization (auto-generated, don't edit)
- `Components/` & `Composers/` - Umbraco startup/DI configuration

When making changes, always consider Umbraco's content-first architecture and ensure custom code doesn't interfere with CMS functionality.
