const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { Pool } = require("pg");

const usePostgres = !!process.env.DATABASE_URL;

let pool = null;
let sqlite = null;

if (usePostgres) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  console.log("Database mode: PostgreSQL / Neon");
} else {
  const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");

  fs.mkdirSync(DATA_DIR, { recursive: true });

  sqlite = new Database(path.join(DATA_DIR, "werabe.db"));

  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("journal_mode = WAL");

  console.log("Database mode: SQLite");
}

function convertPlaceholders(sql) {
  let index = 0;

  return sql.replace(/\?/g, () => {
    index++;
    return `$${index}`;
  });
}

function prepare(sql) {
  return {
    async all(...params) {
      if (!usePostgres) {
        return sqlite.prepare(sql).all(...params);
      }

      const result = await pool.query(convertPlaceholders(sql), params);

      return result.rows;
    },

    async get(...params) {
      if (!usePostgres) {
        return sqlite.prepare(sql).get(...params);
      }

      const result = await pool.query(convertPlaceholders(sql), params);

      return result.rows[0];
    },

    async run(...params) {
      if (!usePostgres) {
        const result = sqlite.prepare(sql).run(...params);

        return {
          changes: result.changes,
          lastInsertRowid: result.lastInsertRowid,
        };
      }

      let query = convertPlaceholders(sql);

      if (/^\s*INSERT\s+/i.test(sql) && !/\bRETURNING\b/i.test(sql)) {
        query += " RETURNING id";
      }

      const result = await pool.query(query, params);

      return {
        changes: result.rowCount,
        lastInsertRowid: result.rows[0]?.id ?? null,
      };
    },
  };
}

async function exec(sql) {
  if (!usePostgres) {
    return sqlite.exec(sql);
  }

  return pool.query(sql);
}

async function close() {
  if (pool) {
    await pool.end();
  }

  if (sqlite) {
    sqlite.close();
  }
}

const db = {
  prepare,
  exec,
};

module.exports = {
  db,
  isPostgres: usePostgres,
  close,
};
