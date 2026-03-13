/**
 * Database Query Tool
 * Usage: node query_db.js "SELECT * FROM users"
 *        node query_db.js tables
 *        node query_db.js schema users
 */
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = 'd:/Projects/Student_frndly/backend/data/app.db';
const db = new Database(DB_PATH, { readonly: true });

const arg = process.argv.slice(2).join(' ');

if (!arg || arg === 'tables') {
    // List all tables
    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all();
    console.log('\n=== TABLES IN DATABASE ===');
    tables.forEach(t => {
        const count = db.prepare(`SELECT COUNT(*) as c FROM "${t.name}"`).get().c;
        console.log(`  ${t.name.padEnd(25)} — ${count} rows`);
    });

} else if (arg.startsWith('schema ')) {
    const tableName = arg.replace('schema ', '').trim();
    const schema = db.prepare(`SELECT sql FROM sqlite_master WHERE name = ?`).get(tableName);
    console.log(`\n=== SCHEMA: ${tableName} ===`);
    console.log(schema?.sql || 'Table not found');

} else {
    // Run a raw SQL query
    try {
        const stmt = db.prepare(arg);
        const rows = stmt.all();
        console.log(`\n=== QUERY: ${arg} ===`);
        console.log(`${rows.length} row(s) returned\n`);
        if (rows.length > 0) console.table(rows);
    } catch (e) {
        console.error('SQL Error:', e.message);
    }
}

db.close();
