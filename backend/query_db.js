/**
 * Database Query Tool for Student_frndly
 * 
 * Usage (run from d:\Projects\Student_frndly\backend):
 * 
 *   node query_db.js                          → list all tables with row counts
 *   node query_db.js tables                   → same as above
 *   node query_db.js schema users             → show table schema
 *   node query_db.js "SELECT * FROM users"    → run any SQL query
 *   node query_db.js "SELECT * FROM messages" → see all messages
 */
import Database from 'better-sqlite3';

const DB_PATH = './data/app.db';
const db = new Database(DB_PATH, { readonly: true });

const args = process.argv.slice(2);
const arg = args.join(' ').trim();

if (!arg || arg === 'tables') {
    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all();
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║     STUDENT_FRNDLY DATABASE TABLES   ║');
    console.log('╚══════════════════════════════════════╝');
    tables.forEach(t => {
        const count = db.prepare(`SELECT COUNT(*) as c FROM "${t.name}"`).get().c;
        console.log(`  ${t.name.padEnd(28)} ${count} rows`);
    });
    console.log('');

} else if (arg.startsWith('schema ')) {
    const tableName = arg.replace('schema ', '').trim();
    const schema = db.prepare(`SELECT sql FROM sqlite_master WHERE name = ?`).get(tableName);
    console.log(`\n=== SCHEMA: ${tableName} ===`);
    console.log(schema?.sql || '  Table not found');
    console.log('');

} else {
    try {
        const stmt = db.prepare(arg);
        const rows = stmt.all();
        console.log(`\n=== QUERY ===`);
        console.log(`SQL: ${arg}`);
        console.log(`Returned: ${rows.length} row(s)\n`);
        if (rows.length > 0) console.table(rows);
        else console.log('  (no rows)');
    } catch (e) {
        console.error('\nSQL Error:', e.message);
        console.log('\nTip: Try listing tables first with:  node query_db.js tables');
    }
}

db.close();
