require("dotenv").config();
const db = require("./config/db");

async function migrate() {
  const conn = await db.pool.getConnection();
  try {
    console.log("Starting archive & verification migration...");

    async function addColumnIfMissing(table, column, definition) {
      const [cols] = await conn.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column],
      );
      if (cols.length === 0) {
        await conn.execute(
          `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`,
        );
        console.log(`  Added column ${table}.${column}`);
      } else {
        console.log(`  Column ${table}.${column} already exists`);
      }
    }

    // 1. Add archived_at and archive_reason to trips
    console.log("\n1. Adding archive columns to trips...");
    await addColumnIfMissing("trips", "archived_at", "DATETIME DEFAULT NULL");
    await addColumnIfMissing(
      "trips",
      "archive_reason",
      "VARCHAR(500) DEFAULT NULL",
    );

    // 2. Add verification columns to drivers
    console.log("\n2. Adding verification columns to drivers...");
    await addColumnIfMissing("drivers", "is_verified", "TINYINT(1) DEFAULT 0");
    await addColumnIfMissing(
      "drivers",
      "verified_date",
      "DATETIME DEFAULT NULL",
    );

    // 3. Add verification and rating columns to riders
    console.log("\n3. Adding verification columns to riders...");
    await addColumnIfMissing("riders", "is_verified", "TINYINT(1) DEFAULT 0");
    await addColumnIfMissing(
      "riders",
      "verified_date",
      "DATETIME DEFAULT NULL",
    );
    await addColumnIfMissing("riders", "rating", "FLOAT DEFAULT 0");

    // 4. Seed badge requirement settings
    console.log("\n4. Seeding badge requirement settings...");
    const badgeSettings = [
      ["badge_driver_min_trips", "100"],
      ["badge_driver_min_rating", "4.5"],
      ["badge_driver_min_acceptance", "85"],
      ["badge_passenger_min_trips", "100"],
      ["badge_passenger_min_rating", "4.5"],
    ];

    for (const [key, value] of badgeSettings) {
      const [existing] = await conn.execute(
        `SELECT id FROM settings WHERE key_name = ?`,
        [key],
      );
      if (existing.length === 0) {
        await conn.execute(
          `INSERT INTO settings (key_name, value_content) VALUES (?, ?)`,
          [key, value],
        );
        console.log(`  Seeded setting: ${key} = ${value}`);
      } else {
        console.log(`  Setting ${key} already exists`);
      }
    }

    // 5. Archive some old completed/cancelled trips for demo data
    console.log("\n5. Archiving old trips for demo data...");
    const [archiveResult] = await conn.execute(
      `UPDATE trips
       SET archived_at = DATE_ADD(created_at, INTERVAL 90 DAY),
           archive_reason = 'Auto-archived after 3 months'
       WHERE archived_at IS NULL
         AND status IN ('COMPLETED', 'CANCELLED')
         AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)`,
    );
    console.log(`  Archived ${archiveResult.affectedRows} trips`);

    // If no trips were archived, archive a few recent ones for demo
    if (archiveResult.affectedRows === 0) {
      console.log(
        "  No old trips to archive, archiving some recent trips for demo...",
      );
      const [demoResult] = await conn.execute(
        `UPDATE trips
         SET archived_at = NOW(),
             archive_reason = 'Auto-archived after 3 months'
         WHERE archived_at IS NULL
           AND status IN ('COMPLETED', 'CANCELLED')
         LIMIT 10`,
      );
      console.log(
        `  Archived ${demoResult.affectedRows} recent trips for demo`,
      );
    }

    // 6. Verify some drivers/riders for demo data
    console.log("\n6. Setting up demo verification data...");
    await conn.execute(
      `UPDATE drivers SET is_verified = 1, verified_date = DATE_SUB(NOW(), INTERVAL 30 DAY)
       WHERE trips >= 100 AND rating >= 4.5 AND is_verified = 0
       LIMIT 5`,
    );
    await conn.execute(
      `UPDATE riders SET is_verified = 1, verified_date = DATE_SUB(NOW(), INTERVAL 30 DAY)
       WHERE total_trips >= 10 AND is_verified = 0
       LIMIT 3`,
    );

    console.log("\nMigration complete!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    conn.release();
  }
}

migrate();
