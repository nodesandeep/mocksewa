require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function test() {
    try {
        const res = await client.execute('SELECT 1');
        console.log('Success:', res.rows);
    } catch (e) {
        console.error('Error:', e.message);
    }
    process.exit(0);
}

test();
