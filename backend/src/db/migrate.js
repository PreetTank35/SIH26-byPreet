const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

async function migrate() {
  console.log('[Migration] Running PostgreSQL database schema setup...');
  try {
    if (!pool) {
      throw new Error('PostgreSQL pool is not initialized. Check DATABASE_URL and pg configuration.');
    }

    await pool.query('SELECT 1');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await pool.query(schemaSql);
    console.log('[Migration] Schema created successfully with all tables and pg_trgm index!');
  } catch (err) {
    console.error('[Migration Error]', err.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  migrate();
}

module.exports = migrate;
