import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

let pool;

function getDbConfig() {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    throw new Error(
      "Missing MySQL environment variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME."
    );
  }

  return {
    host: DB_HOST,
    port: Number(DB_PORT || 3306),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
}

export function getMysqlPool() {
  if (!pool) {
    const config = getDbConfig();

    try {
      pool = mysql.createPool(config);
      console.log(`[MySQL] Connected successfully to database: ${config.database}`);
    } catch (error) {
      console.error(`[MySQL] Connection failed:`, error);
      throw error;
    }
  }

  return pool;
}

export function quoteIdentifier(identifier) {
  return `\`${String(identifier).replace(/`/g, "``")}\``;
}

function normalizeColumns(columns) {
  if (Array.isArray(columns)) {
    return columns.map((column) => `${column}`.trim()).filter(Boolean);
  }

  if (typeof columns === "string") {
    return columns
      .split(",")
      .map((column) => column.trim())
      .filter(Boolean);
  }

  return [];
}

function buildCondition(condition) {
  const column = quoteIdentifier(condition.column);

  if (condition.operator === "IN") {
    const values = Array.isArray(condition.value) ? condition.value : [condition.value];
    return {
      sql: `${column} IN (${values.map(() => "?").join(", ")})`,
      params: values
    };
  }

  return {
    sql: `${column} ${condition.operator} ?`,
    params: [condition.value]
  };
}

export function buildWhereClause(conditions = [], orConditions = []) {
  const parts = [];
  const params = [];

  for (const condition of conditions) {
    const built = buildCondition(condition);
    parts.push(built.sql);
    params.push(...built.params);
  }

  if (orConditions.length > 0) {
    const orPart = orConditions.map((condition) => buildCondition(condition).sql).join(" OR ");
    parts.push(`(${orPart})`);
    for (const condition of orConditions) {
      const built = buildCondition(condition);
      params.push(...built.params);
    }
  }

  return {
    sql: parts.length > 0 ? `WHERE ${parts.join(" AND ")}` : "",
    params
  };
}

export async function queryMysql(sql, params = []) {
  const mysqlPool = getMysqlPool();
  const [rows] = await mysqlPool.query(sql, params);
  return rows;
}

export class MysqlQueryBuilder {
  constructor(poolOrClient, table) {
    this.pool = poolOrClient;
    this.table = table;
    this.selectColumns = ["*"];
    this.conditions = [];
    this.orConditions = [];
    this.orderBy = null;
    this.limitValue = null;
  }

  select(columns) {
    this.selectColumns = normalizeColumns(columns);
    return this;
  }

  eq(column, value) {
    this.conditions.push({ column, operator: "=", value });
    return this;
  }

  ilike(column, value) {
    this.conditions.push({ column, operator: "LIKE", value: `%${String(value).trim()}%` });
    return this;
  }

  in(column, values) {
    this.conditions.push({ column, operator: "IN", value: values });
    return this;
  }

  or(expression) {
    const segments = typeof expression === "string"
      ? expression.split(",").map((segment) => segment.trim()).filter(Boolean)
      : [expression];

    for (const segment of segments) {
      const parsed = this.parseExpression(segment);
      if (parsed) {
        this.orConditions.push(parsed);
      }
    }

    return this;
  }

  parseExpression(expression) {
    const match = /^([A-Za-z0-9_.-]+)\.(ilike|eq|like|in)\.(.+)$/.exec(expression);

    if (!match) {
      return null;
    }

    const [, column, operator, rawValue] = match;
    const normalizedOperator = operator.toUpperCase();

    if (normalizedOperator === "ILIKE" || normalizedOperator === "LIKE") {
      const value = `%${String(rawValue).replace(/^%|%$/g, "")}%%`;
      return {
        sql: `${quoteIdentifier(column)} LIKE ?`,
        params: [value]
      };
    }

    if (normalizedOperator === "IN") {
      const values = String(rawValue)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      return {
        sql: `${quoteIdentifier(column)} IN (${values.map(() => "?").join(", ")})`,
        params: values
      };
    }

    return {
      sql: `${quoteIdentifier(column)} = ?`,
      params: [rawValue]
    };
  }

  order(column, ascending = true) {
    this.orderBy = { column, ascending };
    return this;
  }

  limit(limit) {
    this.limitValue = Number(limit);
    return this;
  }

  async execute() {
    const sqlParts = [
      `SELECT ${this.selectColumns.length > 0 ? this.selectColumns.map(quoteIdentifier).join(", ") : "*"} FROM ${quoteIdentifier(this.table)}`
    ];
    const params = [];
    const whereParts = [];

    for (const condition of this.conditions) {
      const built = buildCondition(condition);
      whereParts.push(built.sql);
      params.push(...built.params);
    }

    if (this.orConditions.length > 0) {
      const orSql = this.orConditions.map((condition) => condition.sql).join(" OR ");
      whereParts.push(`(${orSql})`);
      for (const condition of this.orConditions) {
        params.push(...condition.params);
      }
    }

    if (whereParts.length > 0) {
      sqlParts.push(`WHERE ${whereParts.join(" AND ")}`);
    }

    if (this.orderBy) {
      sqlParts.push(
        `ORDER BY ${quoteIdentifier(this.orderBy.column)} ${this.orderBy.ascending ? "ASC" : "DESC"}`
      );
    }

    if (Number.isFinite(this.limitValue) && this.limitValue > 0) {
      sqlParts.push("LIMIT ?");
      params.push(this.limitValue);
    }

    try {
      const [rows] = await this.pool.query(sqlParts.join(" "), params);
      return { data: rows, error: null };
    } catch (error) {
      console.error("[MySQL] Query failed:", error);
      return { data: [], error };
    }
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  catch(reject) {
    return this.execute().catch(reject);
  }
}

export const mysqlClient = {
  from(table) {
    return new MysqlQueryBuilder(getMysqlPool(), table);
  }
};
