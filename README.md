# KKR Portfolio Scraper

Production-ready NestJS application for scraping, storing, and querying KKR's portfolio companies from their public website.

## Overview

This application:
- **Fetches** 296+ portfolio companies from KKR's public API (20 pages)
- **Stores** normalized data in MongoDB with efficient indexing
- **Provides** flexible CLI for ingestion and querying
- **Filters** by asset class, industry, region
- **Exports** to table or JSON format

## Quick Start

### Prerequisites

- Node.js 22+ (tested with v22.13.1)
- MongoDB 7.0+ (Docker setup provided)
- Windows PowerShell (for `kkr-cli.ps1`) or Unix shell

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Start MongoDB (Docker)
docker run -d -p 27017:27017 --name kkr-mongo mongo:7.0

# 3. Configure environment
cp .env.example .env
# Edit .env if needed (defaults work for local Docker MongoDB)

# 4. Build application
npm run build

# 5. Ingest data (takes ~45 seconds)
.\kkr-cli.ps1 ingest
# or: node dist/main.js ingest
```

## Usage

### Windows (Recommended)

Use the PowerShell wrapper to preserve CLI flags:

```powershell
# Ingest all companies
.\kkr-cli.ps1 ingest

# Query all companies (table format)
.\kkr-cli.ps1 query

# Filter by region
.\kkr-cli.ps1 query --region "Americas"

# Filter by multiple criteria with JSON output
.\kkr-cli.ps1 query --industry "Healthcare" --region "Americas" --format json --limit 10

# Export to file
.\kkr-cli.ps1 query --assetClass "Tech Growth" --output results.json

# Pagination
.\kkr-cli.ps1 query --skip 20 --limit 10
```

### Development Mode and Cross-Platform (Direct Node)

```bash
# Direct ts-node invocation (no compilation needed)
npx ts-node -r tsconfig-paths/register src/main.ts -- ingest
npx ts-node -r tsconfig-paths/register src/main.ts -- query --industry "Financials" --format json
npx ts-node -r tsconfig-paths/register src/main.ts -- query --region "Americas" --limit 5
```

## CLI Commands

### `ingest`

Fetches all companies from KKR API and stores in MongoDB.

```bash
.\kkr-cli.ps1 ingest
```

- Fetches 20 pages (~296 companies)
- Rate-limited to 1 request/second
- Upserts by slug (safe to re-run)
- Logs progress every 25 companies

**Output:**
```
Starting ingestion...
[Nest] LOG [IngestionService] Processed 25 companies so far
[Nest] LOG [IngestionService] Processed 50 companies so far
...
Ingestion complete. processed=296 failed=0
```

### `query`

Search and filter portfolio companies.

**Options:**
- `--assetClass <name>` - Filter by asset class (e.g., "Private Equity", "Tech Growth", "Infrastructure")
- `--industry <name>` - Filter by industry (e.g., "Healthcare", "Financials", "Consumer Discretionary")
- `--region <name>` - Filter by region:
  - `"Americas"`
  - `"Asia Pacific"`
  - `"Europe, The Middle East And Africa"`
- `--format <table|json>` - Output format (default: table)
- `--output <path>` - Write to file instead of stdout
- `--limit <number>` - Maximum results (default: 20)
- `--skip <number>` - Skip first N results for pagination (default: 0)

**Examples:**

```bash
# All companies in table format
.\kkr-cli.ps1 query

# Healthcare companies in Americas
.\kkr-cli.ps1 query --industry "Healthcare" --region "Americas"

# Tech Growth asset class as JSON
.\kkr-cli.ps1 query --assetClass "Tech Growth" --format json

# Complex filter with export
.\kkr-cli.ps1 query --region "Asia Pacific" --industry "Information Technology" --limit 100 --output asia-tech.json

# Pagination (page 3, 10 per page)
.\kkr-cli.ps1 query --skip 20 --limit 10
```

**Table Output:**
```
Name                    Asset Class     Industry                Region
1-800 Contacts, Inc.    Private Equity  Consumer Discretionary  Americas
123Dentist              Private Equity  Healthcare              Americas
Accuris                 Private Equity  Information Technology  Americas
...
```

**JSON Output:**
```json
[
  {
    "_id": "698cbeb176ae337c8610f85d",
    "name": "1-800 Contacts, Inc.",
    "slug": "1-800-contacts-inc",
    "assetClasses": ["Private Equity"],
    "industry": "Consumer Discretionary",
    "region": "Americas",
    "yearOfInvestment": "2020",
    "headquarters": "Draper, Utah, United States",
    "description": "Leading online destination for contact lenses.",
    "website": "www.1800contacts.com",
    "logoPath": "/content/dam/kkr/portfolio/resized-logos/1800-contacts-logo-raw.png",
    ...
  }
]
```

## Data Model

### Company Schema

```typescript
{
  name: string;              // Company name
  slug: string;              // Unique URL-friendly identifier (indexed, unique)
  assetClasses: string[];    // ["Private Equity", "Tech Growth"]
  industry: string;          // "Healthcare", "Financials", etc.
  region: string;            // "Americas", "Asia Pacific", "Europe..."
  yearOfInvestment: string;  // "2020", "2024"
  headquarters: string;      // "San Francisco, CA, United States"
  description: string;       // Clean text (HTML stripped)
  website: string;           // "www.example.com"
  logoPath: string;          // Relative path to logo image
  source: {
    provider: "kkr";
    lastFetchedAt: Date;
  };
  raw: object;              // Original API response
  createdAt: Date;          // Auto-managed
  updatedAt: Date;          // Auto-managed
}
```

**Indexes:**
- `slug` (unique)
- `assetClasses`
- `industry`
- `region`

**Filter Behavior:**
- Case-insensitive exact match (uses MongoDB `$regex: ^value$` with `i` flag)
- Filters are AND-ed together
- Empty filters return all records (up to limit)

## Architecture

```
src/
├── companies/
│   ├── schemas/company.schema.ts      # Mongoose schema with indexes
│   ├── repositories/company.repository.ts  # Data access layer
│   └── companies.module.ts
├── ingestion/
│   ├── services/
│   │   ├── kkr-client.service.ts      # API fetching (rate-limited)
│   │   ├── normalizer.service.ts      # Data transformation
│   │   └── ingestion.service.ts       # Orchestration
│   ├── commands/
│   │   ├── ingest.command.ts          # CLI: ingest
│   │   └── query.command.ts           # CLI: query
│   └── ingestion.module.ts
├── config/configuration.ts            # Environment variables
└── main.ts                            # Bootstrap (CLI mode)
```

**Design Patterns:**
- **Repository Pattern**: Abstracts MongoDB queries
- **Service Layer**: Business logic separated from infrastructure
- **Command Pattern**: CLI commands as injectable services
- **Dependency Injection**: NestJS IoC container

## Configuration

Environment variables (`.env`):

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/kkr-portfolio

# KKR API
KKR_API_BASE_URL=https://www.kkr.com/bin/rp/query
KKR_RATE_LIMIT_MS=1000
KKR_REQUEST_TIMEOUT_MS=10000
```

**Defaults** (see [configuration.ts](src/config/configuration.ts)):
- MongoDB: `mongodb://localhost:27017/kkr-portfolio`
- Rate limit: 1 request/second
- Timeout: 10 seconds

## Development

```bash
# Install dependencies
npm install

# Lint
npm run lint

# Format
npm run format

# Run tests
npm run test

# Build for production
npm run build
```

## Docker Deployment

### Using Docker Compose (Recommended)

The easiest way to run the entire stack (MongoDB + application):

```bash
# Start services (MongoDB + app with ingest command)
docker-compose up -d

# View logs
docker-compose logs -f app

# Run query command
docker-compose run --rm app node dist/main.js query --format json --limit 10

# Stop services
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v
```

The default `docker-compose.yml` runs `ingest` on startup. To change the command:

```yaml
# Edit docker-compose.yml, replace:
command: node dist/main.js ingest
# With:
command: node dist/main.js query --format json
```

### Using Dockerfile Only

```bash
# Build image
docker build -t kkr-portfolio-scraper .

# Run MongoDB separately
docker run -d -p 27017:27017 --name kkr-mongo mongo:7.0

# Run ingest
docker run --rm --network host kkr-portfolio-scraper node dist/main.js ingest

# Run query
docker run --rm --network host kkr-portfolio-scraper node dist/main.js query --region "Americas" --format json
```

**Note:** On Windows, use `--network="host"` or configure bridge networking to connect container to host MongoDB.

## Troubleshooting

### How do I use the CLI?

**Recommended approaches:**

1. **Production (Windows)** - Use PowerShell wrapper:
   ```powershell
   .\kkr-cli.ps1 query --region "Americas"
   ```

2. **Production (Any OS)** - Use compiled JS directly:
   ```bash
   node dist/main.js query --region "Americas"
   ```

3. **Development** - Use direct ts-node invocation:
   ```bash
   npx ts-node -r tsconfig-paths/register src/main.ts -- query --region "Americas"
   ```

**Note:** Avoid using `npm run` to pass arguments on Windows PowerShell, as npm strips flag names from forwarded arguments.

### MongoDB connection fails

- Ensure MongoDB is running: `docker ps | grep mongo`
- Check `MONGODB_URI` in `.env`
- Verify port 27017 is not in use: `netstat -an | findstr 27017`

### TypeScript errors during development

- Ensure `tsconfig-paths` is installed: `npm install --save-dev tsconfig-paths`
- Ensure `ts-node` is installed: `npm install --save-dev ts-node`
- Clear TypeScript cache: `rm -rf node_modules/.cache`

### Filters return no results

- **Region names are exact** (case-insensitive): Use `"Americas"`, not `"America"`
- **Industry names must match**: Use `"Healthcare"`, not `"Health"`
- Query without filters first to see available values:
  ```bash
  .\kkr-cli.ps1 query --format json --limit 300 > all.json
  ```

## Data Quality

**Normalization Applied:**
- `assetClass` split on commas: `"Private Equity, Tech Growth"` → `["Private Equity", "Tech Growth"]`
- HTML stripped from `description`: `<p>Text</p>` → `Text`
- Whitespace trimmed from all string fields
- Unique `slug` generated via `slugify(name)`

**Known Data Variations:**
- Some companies have multiple asset classes (stored as array)
- Region names are verbose: `"Europe, The Middle East And Africa"`
- Year of investment is a string: `"2020"`, `"2024"`

## Performance

- **Ingestion**: ~45 seconds for 296 companies (rate-limited)
- **Query (no filters)**: <100ms for 20 results
- **Query (filtered)**: <50ms with indexes
- **Build time**: ~5 seconds

**Optimization:**
- MongoDB indexes on filter fields
- Upsert by slug (idempotent ingestion)
- Rate limiting prevents API throttling
- Pagination support for large result sets

## Future Enhancements

- [ ] Unit tests for normalizer/repository
- [ ] Incremental updates (fetch only changed companies)
- [ ] Export to CSV format
- [ ] REST API endpoints for querying
- [ ] Web UI for browsing portfolio
- [ ] Company logo download and caching