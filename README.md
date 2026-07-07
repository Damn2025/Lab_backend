# Backend

This backend exposes a small API that reads data from a MySQL database hosted on Hostinger/phpMyAdmin and returns joined lab + test rows for the frontend table view based on search text, selected filters, sorting, and pagination.

## Tech Stack

- `Node.js + Express`: API server and routing.
- `mysql2`: Queries MySQL tables safely from the server.
- `dotenv`: Loads environment variables.
- `cors`: Allows the frontend app to call the API locally.

## Folder Flow

- `src/index.js`: Starts the backend server.
- `src/app.js`: Registers middleware and API routes.
- `src/config/allowedTables.js`: Logical dataset config for `BioLabs`, `ChemicalLabs`, `BioTests`, and `ChemicalTest`.
- `src/services/labSearchService.js`: Applies the requested filters, queries MySQL, and combines lab rows with test rows.
- `src/services/mysqlService.js`: Creates the MySQL connection pool and query builder.

## API Endpoints

- `GET /api/health`: Quick health check.
- `GET /api/config`: Returns the datasets, columns, and state dropdown options.
- `POST /api/data`: Accepts `{ tableName, search, filters, limit, page, sort }` and returns rows + count.

## Why The Whitelist Exists

The frontend should not be able to query any random table or column. `allowedTables.js` is where you decide:

- which logical datasets are visible,
- which lab/test tables are joined,
- which columns are returned,
- which columns are used in the global search bar,
- which fixed filters are supported.

This makes the API safer and easier to maintain.

## Supported Filter Operators

- `eq`: exact match
- `ilike`: case-insensitive contains search
- `gte`: greater than or equal
- `lte`: less than or equal
- `in`: comma-separated list, for example `India,USA`

## Environment Setup

Copy `.env.example` to `.env` and fill in your Hostinger MySQL values:

```env
PORT=4000
FRONTEND_URL=http://localhost:5173
DB_HOST=your-hosting-mysql-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-database-name
```

## Run

```bash
npm install
npm run dev
```

## Customizing For Your Database

Open `src/config/allowedTables.js` and confirm the table names and column names match your real MySQL schema exactly.

For each dataset, define:

- `labTable`: source lab table, for example `BioLabs`
- `testTable`: source test table, for example `BioTests`
- `labIdColumn` and `testLabIdColumn`: columns used to join the data
- `resultColumns`: columns returned to the frontend table
- `searchableLabColumns` and `searchableTestColumns`: fields searched by the main search bar
- `filterFields`: the fixed frontend filters
- `defaultSort`: the default order
- `defaultLimit`: how many rows to fetch by default
