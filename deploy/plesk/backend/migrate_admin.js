const db = require("./config/db");

(async () => {
  try {
    // Reviews table - add visible and is_flagged columns
    await db.pool
      .execute(
        "ALTER TABLE reviews ADD COLUMN IF NOT EXISTS visible TINYINT(1) NOT NULL DEFAULT 1",
      )
      .catch(() => {});
    await db.pool
      .execute(
        "ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_flagged TINYINT(1) NOT NULL DEFAULT 0",
      )
      .catch(() => {});
    console.log("Reviews columns added");

    // Coupons table - add missing columns
    await db.pool
      .execute(
        "ALTER TABLE coupons ADD COLUMN IF NOT EXISTS promotion_name VARCHAR(255) DEFAULT NULL",
      )
      .catch(() => {});
    await db.pool
      .execute(
        "ALTER TABLE coupons ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL",
      )
      .catch(() => {});
    await db.pool
      .execute(
        "ALTER TABLE coupons ADD COLUMN IF NOT EXISTS discount_type ENUM('PERCENTAGE','FIXED') DEFAULT 'FIXED'",
      )
      .catch(() => {});
    await db.pool
      .execute(
        "ALTER TABLE coupons ADD COLUMN IF NOT EXISTS min_order_amount DECIMAL(10,2) DEFAULT 0",
      )
      .catch(() => {});
    await db.pool
      .execute(
        "ALTER TABLE coupons ADD COLUMN IF NOT EXISTS eligible_service_ids JSON DEFAULT NULL",
      )
      .catch(() => {});
    await db.pool
      .execute(
        "ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1",
      )
      .catch(() => {});
    console.log("Coupons columns added");

    // Update existing coupons to have promotion_name
    await db.pool.execute(
      "UPDATE coupons SET promotion_name = CONCAT('Promo ', code) WHERE promotion_name IS NULL",
    );
    console.log("Existing coupons updated");

    // Verify
    const [rc] = await db.pool.execute("DESCRIBE reviews");
    console.log("Reviews cols:", rc.map((c) => c.Field).join(", "));
    const [cc] = await db.pool.execute("DESCRIBE coupons");
    console.log("Coupons cols:", cc.map((c) => c.Field).join(", "));
  } catch (e) {
    console.log("Error:", e.message);
  }
  process.exit(0);
})();
