const db = require("./config/db");
(async () => {
  try {
    const [rows] = await db.pool.execute(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'admin_login_history'",
    );
    console.log("admin_login_history exists:", rows.length > 0);

    // Also check if admins table has data
    const [admins] = await db.pool.execute(
      "SELECT id, email FROM admins LIMIT 5",
    );
    console.log("admins:", admins);
  } catch (e) {
    console.log("Error:", e.message);
  }
  process.exit();
})();
