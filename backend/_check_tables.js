require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const db = require("./config/db");

(async () => {
  try {
    const [rows] = await db.pool.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('notification_campaigns','team_notifications')",
    );
    console.log(
      "Found tables:",
      rows.map((r) => r.TABLE_NAME),
    );

    // Create if missing
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
    console.log("team_notifications ensured");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
