function normalizeLimit(limit, fallback) {
  const parsed = Number(limit);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, 100);
}

function normalizePage(page) {
  const parsed = Number(page);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }

  return Math.floor(parsed);
}

function normalizeFilters(filters) {
  if (!Array.isArray(filters)) {
    return [];
  }

  return filters.filter(
    (filter) =>
      filter &&
      typeof filter.column === "string" &&
      typeof filter.operator === "string" &&
      filter.value !== undefined &&
      filter.value !== null &&
      `${filter.value}`.trim() !== ""
  );
}

function applySingleFilter(query, filter) {
  const { column, operator, value } = filter;

  switch (operator) {
    case "eq":
      return query.eq(column, value);
    case "gte":
      return query.gte(column, value);
    case "lte":
      return query.lte(column, value);
    case "ilike":
      return query.ilike(column, `%${value}%`);
    case "in": {
      const values = `${value}`
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      return query.in(column, values);
    }
    default:
      return query;
  }
}

function escapeLikeValue(value) {
  return `${value}`.replace(/[%(),]/g, " ");
}

function applyGlobalSearch(query, tableConfig, search) {
  const searchableColumns = tableConfig.searchableColumns || [];
  const cleanedSearch = `${search}`.trim();

  if (!cleanedSearch || searchableColumns.length === 0) {
    return query;
  }

  const orExpression = searchableColumns
    .map((column) => `${column}.ilike.%${escapeLikeValue(cleanedSearch)}%`)
    .join(",");

  return query.or(orExpression);
}

export function buildSupabaseQuery({ client, tableName, tableConfig, payload }) {
  const filters = normalizeFilters(payload.filters);
  const limit = normalizeLimit(payload.limit, tableConfig.defaultLimit ?? 25);
  const page = normalizePage(payload.page);
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const sortColumn =
    payload.sort?.column && tableConfig.columns.includes(payload.sort.column)
      ? payload.sort.column
      : tableConfig.defaultSort?.column ?? tableConfig.columns[0];
  const ascending =
    typeof payload.sort?.ascending === "boolean"
      ? payload.sort.ascending
      : tableConfig.defaultSort?.ascending ?? true;

  let query = client
    .from(tableName)
    .select(tableConfig.columns.join(","), { count: "exact" })
    .order(sortColumn, { ascending })
    .range(from, to);

  for (const filter of filters) {
    const allowedOperators = tableConfig.filterableColumns[filter.column];

    if (!allowedOperators || !allowedOperators.includes(filter.operator)) {
      const error = new Error(
        `Unsupported filter: ${filter.column} ${filter.operator}`
      );
      error.statusCode = 400;
      throw error;
    }

    query = applySingleFilter(query, filter);
  }

  query = applyGlobalSearch(query, tableConfig, payload.search);

  return { query, page, limit };
}
