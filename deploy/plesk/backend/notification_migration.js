require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const db = require("./config/db");

async function migrate() {
  try {
    await db.pool.execute(`
      CREATE TABLE IF NOT EXISTS notification_campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        target_audience VARCHAR(50) DEFAULT 'All',
        filters JSON DEFAULT NULL,
        status VARCHAR(50) DEFAULT 'Sent',
        scheduled_at DATETIME DEFAULT NULL,
        delivery_count INT DEFAULT 0,
        read_count INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Created notification_campaigns table");

    await db.pool.execute(`
      CREATE TABLE IF NOT EXISTS team_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        target_departments JSON DEFAULT NULL,
        category VARCHAR(50) DEFAULT 'System',
        status VARCHAR(50) DEFAULT 'Sent',
        scheduled_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Created team_notifications table");

    console.log("Migration complete!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
