const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function setup() {
  console.log("🚀 Initializing App Settings table in Turso...");
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Initialize maintenance mode to 'false' if it doesn't exist
    await client.execute({
      sql: "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('maintenance_mode', 'false')",
      args: []
    });

    console.log("✅ App Settings initialized successfully.");
  } catch (error) {
    console.error("❌ Failed to setup settings:", error);
  } finally {
    process.exit();
  }
}

setup();
