# Neumo Employee Handbook (Umbraco 16, .NET 9)

Umbraco 16 CMS application for an internal **Employee Handbook** (“Neumo EHB”) with:

- Content-managed policies and handbook sections
- Full-text policy search
- Policy/category navigation
- Click-tracking analytics for policy engagement
- SQLite-based storage with uSync content synchronization

Built and confirmed working on the latest Umbraco 16 LTS and .NET 9.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Key Features](#key-features)
  - [Content Management](#content-management)
  - [Search](#search)
  - [Click Tracking & Analytics](#click-tracking--analytics)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Initial Setup](#initial-setup)
  - [Running the Site](#running-the-site)
  - [Accessing Umbraco Backoffice](#accessing-umbraco-backoffice)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Umbraco Integration Details](#umbraco-integration-details)
  - [Content Types & Models](#content-types--models)
  - [Search API](#search-api)
  - [Database Access Pattern](#database-access-pattern)
  - [Startup Components & Composers](#startup-components--composers)
- [Upgrading & Future-Proofing](#upgrading--future-proofing)
- [Known Issues & Technical Debt](#known-issues--technical-debt)
- [Contributing](#contributing)
- [License](#license)

---

## Architecture Overview

This project is an **Umbraco 16** CMS running on **.NET 9**, designed as a content‑first Employee Handbook:

- **Umbraco CMS** for all content (policies, categories, pages)
- **SQLite** database for Umbraco data and custom analytics tables
- **uSync** for content type and content synchronization
- **Custom APIs** for:
  - Policy and category search
  - Policy click-tracking analytics

Core Umbraco concepts are used: Document Types, Content Nodes, Views, Composers, and Components.

---

## Key Features

### Content Management

- Policies and handbook pages are modeled as Umbraco **Document Types** (e.g. `PolicyCard`, `HandbookCategoryCard`).
- Editors manage content entirely through the Umbraco backoffice.
- Views in `Views/` follow Umbraco naming and routing conventions, keeping templates tightly aligned with content types.
- uSync (`uSync/v16/`) is used to synchronize content types and related settings between environments.

> Note: uSync artifacts are **auto-generated**. Do **not** edit `uSync/v16/` files by hand.

---

### Search

A dedicated search API powers policy and category discovery.

- **Controller**: `HandbookSearchController`
- **Endpoint**:  
  `GET /api/HandbookSearch/Search?query={term}`

Typical Umbraco 16 content querying pattern:

```csharp
var roots = contentCache.GetAtRoot();
var policyCards = roots.SelectMany(r => r.DescendantsOrSelf())
    .Where(x => x.ContentType.Alias == "policyCard")
    .Where(p =>
    {
        var title = p.Value<string>("policyTitle") ?? p.Name;
        return title.InvariantContains(query);
    });
```

Search is powered via Umbraco’s in-memory published cache and dynamic `Value<T>()` access for flexibility.

---

### Click Tracking & Analytics

The project includes a lightweight analytics system to track **policy engagement**. This supports future features such as "sort by popularity".

Components:

- **API Controller**: `PolicyClickTrackingController`
  - Receives tracking events when a user views or clicks on a policy.
- **Startup Component**: `PolicyClickTrackingComponent`
  - Ensures analytics tables are created on application startup (SQLite).
- **JavaScript Tracking**: `wwwroot/js/policy-click-tracking.js`
  - Vanilla ES6+ script that sends tracking requests from the browser.

Data Models (in `Models/`):

- `PolicyCardClick` – individual click record
- `PolicyCardClickCount` – aggregated counts per policy

Tables are created on first run using Umbraco’s migration-style database operations (via `IUmbracoDatabaseFactory` + NPoco).

---

## Technology Stack

- **CMS**: [Umbraco 16](https://umbraco.com/)
- **Runtime**: .NET 9
- **Database**: SQLite (`umbraco/Data/Umbraco.sqlite.db`)
- **Sync**: uSync v16 (content types, data, settings)
- **Server-side Language**: C#
- **Frontend**:
  - Views: Razor / HTML
  - Styling: SCSS
  - Behavior: Vanilla JavaScript (ES6+)

---

## Getting Started

### Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/)
- Git
- Node tooling is **not** required (no bundling/build pipeline for frontend)

> If running locally on Windows, you may also want SQLite tooling (e.g. DB Browser for SQLite) to inspect the database in `umbraco/Data/`.

---

### Initial Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/AGibson17/Neumo-EHB-v1.0.git
   cd Neumo-EHB-v1.0
   ```

2. **Restore & build**

   ```bash
   dotnet restore
   dotnet build
   ```

   You may see warnings about deprecated APIs (e.g. `MigrationBase`, `GetAtRoot()`); these are expected in Umbraco 16 and noted as technical debt.

3. **Database & uSync**

   - SQLite database is stored in `umbraco/Data/Umbraco.sqlite.db`.
   - uSync artifacts in `uSync/v16/` bootstrap content types and related configuration.

   Normally no extra setup is required; Umbraco will start using the existing SQLite database or create one as needed.

---

### Running the Site

Start the application:

```bash
dotnet run
```

By default it runs on:

- HTTPS: `https://localhost:5001`
- HTTP: `http://localhost:5000` (depending on `launchSettings.json`)

Check `Properties/launchSettings.json` if ports differ.

---

### Accessing Umbraco Backoffice

1. Navigate to:

   ```text
   https://localhost:5001/umbraco
   ```

2. Log in with an administrator account (or complete the Umbraco install wizard on first run).
3. Manage handbook content:
   - Edit policy cards
   - Adjust categories
   - Structure navigation

---

## Development Workflow

Typical local development loop:

1. **Run the app**

   ```bash
   dotnet run
   ```

2. **Edit code / views**

   - Backend: C# controllers, components, composers
   - Frontend: SCSS & JS in `wwwroot/`, Razor views in `Views/`

3. **CMS changes**

   - Make structural/content changes in `/umbraco`.
   - uSync will capture changes as artifacts under `uSync/v16/` (committed to source for other environments).

4. **Build & validate**

   - Rebuild as needed; warnings about deprecated Umbraco APIs are currently accepted.
   - Verify:
     - Handbook pages render as expected
     - Search results behave correctly
     - Click tracking requests are sent and persisted

---

## Project Structure

High‑level layout (names may vary slightly depending on final repo):

```text
Neumo-EHB-v1.0/
├─ Components/
│  └─ PolicyClickTrackingComponent.cs   # Startup logic to ensure tracking tables exist
├─ Composers/
│  └─ *.cs                             # DI / startup configuration via IComposer
├─ Controllers/
│  ├─ HandbookSearchController.cs      # /api/HandbookSearch/Search
│  └─ PolicyClickTrackingController.cs # Click tracking API
├─ Models/
│  ├─ PolicyCardClick.cs
│  └─ PolicyCardClickCount.cs
├─ Views/
│  └─ *.cshtml                         # Umbraco templates, aligned to content types
├─ wwwroot/
│  ├─ css/
│  ├─ js/
│  │  └─ policy-click-tracking.js      # Frontend tracking script
│  └─ images/
├─ uSync/
│  └─ v16/                             # Auto-generated content sync artifacts (read-only)
├─ umbraco/
│  └─ Data/
│     └─ Umbraco.sqlite.db             # SQLite database
└─ ...
```

> Treat files under `uSync/v16/` as **read-only** source-of-truth for content structure. All changes should originate from the Umbraco backoffice.

---

## Umbraco Integration Details

### Content Types & Models

- Content types (e.g. `PolicyCard`, `HandbookCategoryCard`) are defined in the Umbraco backoffice and serialized to `uSync/v16/ContentTypes/`.
- Umbraco generates models in the `Umbraco.Cms.Web.Common.PublishedModels` namespace, but this project primarily uses **dynamic** access:

  ```csharp
  var title = content.Value<string>("policyTitle");
  ```

This keeps the project flexible and less tightly coupled to generated models.

---

### Search API

- **Controller**: `HandbookSearchController`
- **Route**: `/api/HandbookSearch/Search`
- **Usage**: Search across policies and possibly categories based on text queries.

Search uses Umbraco 16 content cache access patterns (`GetAtRoot()`, `DescendantsOrSelf()`) and will eventually migrate to new navigation APIs as required by future Umbraco versions.

---

### Database Access Pattern

The project does **not** use Entity Framework migrations. Instead, it uses Umbraco’s `IUmbracoDatabaseFactory` and NPoco directly:

```csharp
using var database = _databaseFactory.CreateDatabase();
var result = database.Query<PolicyCardClick>(
    "SELECT * FROM PolicyClick WHERE PolicyId = @0",
    policyId
);
```

- Tracking tables are created automatically by `PolicyClickTrackingComponent` at startup.
- This keeps the analytics module lightweight and isolated from core Umbraco schema.

---

### Startup Components & Composers

- **Composers** (under `Composers/`) implement `IComposer` to:
  - Register services
  - Wire up Components
- **Components** (under `Components/`) run at application startup, for example:
  - Ensuring that click‑tracking tables exist
  - Running any one-time initialization logic

Notification handlers can be added similarly for reacting to Umbraco events.

---

## Upgrading & Future-Proofing

This project is built on Umbraco 16, but there are some considerations for future upgrades (e.g. Umbraco 17+):

- **Content Access**
  - Current: `content.Value<string>("propertyAlias")`
  - Recommended: continue dynamic property access for flexibility.

- **Root Content Retrieval**
  - Current: `GetAtRoot()` is used.
  - Future: will need to transition to `IDocumentNavigationQueryService` as `GetAtRoot()` is deprecated.

- **Migrations**
  - Current: `MigrationBase` is still used in places (or equivalent patterns).
  - Future: should migrate to `AsyncMigrationBase` to align with new Umbraco APIs.

- **Parent Navigation**
  - Preferred: `content.Parent<IPublishedContent>()` extension over older `.Parent` patterns.

These are tracked as technical debt and should be addressed when upgrading to newer Umbraco major versions.

---

## Known Issues & Technical Debt

- **Deprecated APIs**:
  - Warnings around `GetAtRoot()` and migration APIs (e.g. `MigrationBase`) during build.
  - These are expected and will be addressed with a move to `IDocumentNavigationQueryService` and `AsyncMigrationBase`.

- **Dynamic Models**:
  - The project intentionally uses dynamic property access rather than strongly-typed published models.
  - This trades some compile-time safety for flexibility when content types evolve.

- **Analytics Design**:
  - Click tracking is intentionally lightweight and non-blocking.
  - The current design focuses on recording engagement without impacting page load.
  - There is room for extending analytics to support richer reporting or external data pipelines.

---

## Contributing

1. Fork the repository.
2. Create a feature branch:

   ```bash
   git checkout -b feature/my-change
   ```

3. Make your changes (code, views, or backoffice + uSync).
4. Ensure the site builds and runs:

   ```bash
   dotnet build
   dotnet run
   ```

5. Commit and open a pull request with:
   - A clear description of the change
   - Notes on any new Umbraco document types / properties introduced

---

## License

This project’s license is not explicitly specified in the repository description.  
Please check the root of the repository for a `LICENSE` file or consult the repository owner before using this code in production or redistributing it.
