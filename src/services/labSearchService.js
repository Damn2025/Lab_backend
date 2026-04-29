import {
  getPublicSearchConfig,
  searchSources,
  sharedColumns
} from "../config/allowedTables.js";
import { supabase } from "./supabaseService.js";

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

function escapeLikeValue(value) {
  return `${value}`.trim().replace(/[%(),]/g, " ");
}

function escapeInValue(value) {
  return `${value}`.trim().replace(/[(),]/g, " ");
}

function hasText(value) {
  return typeof value === "string" && value.trim() !== "";
}

function hasTestFilters(filters) {
  return hasText(filters.product) || hasText(filters.test) || hasText(filters.testMethod);
}

function applyLabFilters(query, filters, selectedLabType) {
  if (hasText(selectedLabType)) {
    query = query.ilike("disciplineName", `%${escapeLikeValue(selectedLabType)}%`);
  }

  if (hasText(filters.state)) {
    query = query.eq("State", filters.state.trim());
  }

  if (hasText(filters.city)) {
    query = query.ilike("City", `%${escapeLikeValue(filters.city)}%`);
  }

  if (hasText(filters.labName)) {
    query = query.ilike("LaboratoryName", `%${escapeLikeValue(filters.labName)}%`);
  }

  return query;
}

function applyTestFilters(query, filters) {
  if (hasText(filters.product)) {
    const cleaned = escapeLikeValue(filters.product);
    query = query.ilike("product", `%${cleaned}%`);
  }

  if (hasText(filters.test)) {
    query = query.ilike("test", `%${escapeLikeValue(filters.test)}%`);
  }

  if (hasText(filters.testMethod)) {
    const cleaned = escapeLikeValue(filters.testMethod);
    query = query.or(`test.ilike.%${cleaned}%,method.ilike.%${cleaned}%`);
  }

  return query;
}

function buildSearchOrExpression(search, searchMatchedLabIds, source) {
  const cleanedSearch = escapeLikeValue(search);
  const segments = [];

  for (const column of source.searchableTestColumns) {
    segments.push(`${column}.ilike.%${cleanedSearch}%`);
  }

  if (Array.isArray(searchMatchedLabIds) && searchMatchedLabIds.length > 0) {
    const joinedLabIds = searchMatchedLabIds.map(escapeInValue).join(",");
    segments.push(`${source.testLabIdColumn}.in.(${joinedLabIds})`);
  }

  return segments.join(",");
}

async function fetchMatchingLabIds(source, filters, search, selectedLabType, lookupLimit) {
  const needsLabLookup =
    hasText(selectedLabType) ||
    hasText(filters.state) ||
    hasText(filters.city) ||
    hasText(filters.labName) ||
    hasText(search);

  if (!needsLabLookup) {
    return null;
  }

  let query = supabase
    .from(source.labTable)
    .select(source.labIdColumn)
    .limit(lookupLimit);

  query = applyLabFilters(query, filters, selectedLabType);

  if (hasText(search)) {
    const cleanedSearch = escapeLikeValue(search);
    const expression = sharedColumns.searchableLabColumns
      .map((column) => `${column}.ilike.%${cleanedSearch}%`)
      .join(",");
    query = query.or(expression);
  }

  const { data, error } = await query;
  console.log(`[Supabase] fetchMatchingLabIds (${source.sourceKey}):`, data);

  if (error) {
    throw new Error(error.message);
  }

  return [...new Set((data || []).map((row) => row[source.labIdColumn]).filter(Boolean))];
}

async function fetchLabMap(source, labIds) {
  if (!Array.isArray(labIds) || labIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from(source.labTable)
    .select(source.labColumns.join(","))
    .in(source.labIdColumn, labIds);
  console.log(`[Supabase] fetchLabMap (${source.sourceKey}):`, data);

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data || []).map((row) => [row[source.labIdColumn], row]));
}

function sortMergedRows(rows, sort) {
  const column = sort?.column;

  if (!column) {
    return rows;
  }

  const direction = sort?.ascending ? 1 : -1;

  return [...rows].sort((left, right) => {
    const leftValue = left[column] ?? "";
    const rightValue = right[column] ?? "";
    return `${leftValue}`.localeCompare(`${rightValue}`, undefined, {
      numeric: true,
      sensitivity: "base"
    }) * direction;
  });
}

function dedupeRows(rows) {
  const byIdentity = new Map();

  for (const row of rows) {
    const identityKey = [
      row["Lab Name"] || "",
      row.Address || "",
      row.State || "",
      row["Phone Number"] || "",
      row.Email || ""
    ].join("|");
    const existing = byIdentity.get(identityKey);

    if (!existing) {
      byIdentity.set(identityKey, row);
      continue;
    }

    if (existing.__source === "biological" && row.__source === "chemical") {
      byIdentity.set(identityKey, row);
    }
  }

  return [...byIdentity.values()];
}

function buildAddress(row) {
  return [row.PrimeAddress, row.City, row.Pin]
    .filter((value) => value !== undefined && value !== null && `${value}`.trim() !== "")
    .join(", ");
}

function buildNoResultsMessage({ labType, filters, search }) {
  const hasFilters = Object.values(filters || {}).some(
    (value) => value !== undefined && value !== null && `${value}`.trim() !== ""
  );

  if (hasText(search)) {
    return `No labs found matching "${search.trim()}".`;
  }

  if (hasFilters || hasText(labType)) {
    return "No matching labs found for the selected filters.";
  }

  return "No labs found in the database.";
}

export async function fetchStateOptions() {
  const settled = await Promise.all(
    searchSources.map(async (source) => {
      const { data, error } = await supabase
        .from(source.labTable)
        .select("State")
        .order("State", { ascending: true })
        .limit(5000);
      console.log(`[Supabase] fetchStateOptions (${source.labTable}):`, data);

      if (error) {
        return [];
      }

      return (data || []).map((row) => row.State).filter(Boolean);
    })
  );

  return [...new Set(settled.flat())].sort((left, right) =>
    `${left}`.localeCompare(`${right}`)
  );
}

function mapLabRowToResult(row, source) {
  return {
    "Sr. No": 0,
    "Lab Name": row?.LaboratoryName ?? "-",
    Address: buildAddress(row || {}),
    State: row?.State ?? "-",
    "Phone Number": row?.ContactMobile ?? row?.LandLine ?? "-",
    Email: row?.ContactEmail ?? "-",
    labId: row?.[source.labIdColumn] ?? "-",
    __source: source.sourceKey,
    "Discipline Name": row?.disciplineName ?? "-",
    "Group Name": row?.groupName ?? "-"
  };
}

async function searchLabsOnlySource(source, filters, selectedLabType, candidateLimit) {
  let query = supabase
    .from(source.labTable)
    .select(source.labColumns.join(","))
    .limit(candidateLimit);

  query = applyLabFilters(query, filters, selectedLabType);
  query = query.order(source.labIdColumn, { ascending: true });

  const { data, error } = await query;
  console.log(`[Supabase] searchLabsOnlySource (${source.sourceKey}):`, data);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data || []).map((row) => mapLabRowToResult(row, source));

  return {
    count: rows.length,
    rows
  };
}

async function searchSingleSource(source, payload, selectedLabType, candidateLimit) {
  const filters = payload.filters || {};
  const lookupLimit = Math.min(Math.max(candidateLimit * 3, 50), 200);
  const testLookupLimit = Math.min(Math.max(candidateLimit * 10, 100), 1000);
  const labIdsFromFilters = await fetchMatchingLabIds(
    source,
    filters,
    "",
    selectedLabType,
    lookupLimit
  );
  const searchMatchedLabIds = hasText(payload.search)
    ? await fetchMatchingLabIds(source, {}, payload.search, selectedLabType, lookupLimit)
    : [];

  if (Array.isArray(labIdsFromFilters) && labIdsFromFilters.length === 0) {
    return { count: 0, rows: [] };
  }

  let query = supabase
    .from(source.testTable)
    .select(source.testLabIdColumn)
    .limit(testLookupLimit);

  query = applyTestFilters(query, filters);

  if (Array.isArray(labIdsFromFilters)) {
    query = query.in(source.testLabIdColumn, labIdsFromFilters);
  }

  if (hasText(payload.search)) {
    const searchExpression = buildSearchOrExpression(
      payload.search,
      searchMatchedLabIds,
      source
    );

    if (searchExpression) {
      query = query.or(searchExpression);
    }
  }

  const sortColumn = payload.sort?.column;
  const canSortInDb =
    sortColumn &&
    source.testColumns.includes(sortColumn) &&
    sortColumn !== "id";

  if (canSortInDb) {
    query = query.order(sortColumn, {
      ascending: Boolean(payload.sort?.ascending)
    });
  }

  const { data, error } = await query;
  console.log(`[Supabase] searchSingleSource (${source.sourceKey}):`, data);

  if (error) {
    throw new Error(`${source.sourceKey} search failed: ${error.message}`);
  }

  const labIds = [...new Set((data || []).map((row) => row[source.testLabIdColumn]).filter(Boolean))];
  const labMap = await fetchLabMap(source, labIds);
  const mergedRows = labIds
    .map((labId) =>
      mapLabRowToResult(
        {
          ...labMap.get(labId),
          [source.labIdColumn]: labMap.get(labId)?.[source.labIdColumn] ?? labId
        },
        source
      )
    )
    .slice(0, candidateLimit);

  return {
    count: mergedRows.length,
    rows: mergedRows
  };
}

export async function searchLabsDataset(payload) {
  const publicConfig = getPublicSearchConfig();
  const page = normalizePage(payload.page);
  const limit = normalizeLimit(payload.limit, publicConfig.defaultLimit ?? 50);
  const from = (page - 1) * limit;
  const to = from + limit;
  const candidateLimit = limit;
  const selectedLabType = payload.labType || "";
  const filters = payload.filters || {};
  const sourceSearchFn = hasTestFilters(filters) ? searchSingleSource : searchLabsOnlySource;

  const sourceResults = await Promise.all(
    searchSources.map((source) =>
      sourceSearchFn(source, hasTestFilters(filters) ? payload : filters, selectedLabType, candidateLimit)
    )
  );

  const combinedCount = sourceResults.reduce((sum, result) => sum + result.count, 0);
  const mergedRows = sourceResults.flatMap((result) => result.rows);
  const dedupedRows = dedupeRows(mergedRows);
  const sortedRows = sortMergedRows(dedupedRows, payload.sort);
  const pagedRows = sortedRows.slice(from, to).map((row, index) => ({
    ...row,
    "Sr. No": from + index + 1
  }));

  return {
    labType: selectedLabType,
    columns: publicConfig.columns,
    page,
    limit,
    count: pagedRows.length,
    totalPages: 1,
    rows: pagedRows,
    message:
      pagedRows.length === 0
        ? buildNoResultsMessage({ labType: selectedLabType, filters, search: payload.search })
        : ""
  };
}

export async function getLabTests(sourceKey, labId) {
  const source = searchSources.find((s) => s.sourceKey === sourceKey);
  if (!source) {
    throw new Error(`Invalid source key: ${sourceKey}`);
  }

  const { data, error } = await supabase
    .from(source.testTable)
    .select("product, test, method")
    .eq(source.testLabIdColumn, labId)
    .order("test", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}
