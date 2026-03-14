/**
 * Migration: Add columns needed for Ride Assignment feature
 *  - trips.is_manual_assignment  (BOOLEAN default 0)
 *  - trips.notes                 (TEXT, nullable)
 *  - trips.request_id            (INT, nullable — links to an original ride request)
 *  - drivers.is_available        (BOOLEAN default 1 — not on an active trip)
 */
require("dotenv").config();
const db = require("./config/db");

async function migrate() {
  const conn = await db.pool.getConnection();
  try {
    console.log("=== Ride Assignment Migration ===\n");

    // 1. Add is_manual_assignment to trips
    const [maCols] = await conn.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'trips'
         AND COLUMN_NAME = 'is_manual_assignment'`,
    );
    if (maCols.length === 0) {
      await conn.execute(
        `ALTER TABLE trips ADD COLUMN is_manual_assignment TINYINT(1) NOT NULL DEFAULT 0`,
      );
      console.log("✅ Added trips.is_manual_assignment");
    } else {
      console.log("⏭️  trips.is_manual_assignment already exists");
    }

    // 2. Add notes to trips
    const [notesCols] = await conn.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'trips'
         AND COLUMN_NAME = 'notes'`,
    );
    if (notesCols.length === 0) {
      await conn.execute(`ALTER TABLE trips ADD COLUMN notes TEXT NULL`);
      console.log("✅ Added trips.notes");
    } else {
      console.log("⏭️  trips.notes already exists");
    }

    // 3. Add request_id to trips (optional link to a waiting request)
    const [reqCols] = await conn.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'trips'
         AND COLUMN_NAME = 'request_id'`,
    );
    if (reqCols.length === 0) {
      await conn.execute(`ALTER TABLE trips ADD COLUMN request_id INT NULL`);
      console.log("✅ Added trips.request_id");
    } else {
      console.log("⏭️  trips.request_id already exists");
    }

    // 4. Add is_available to drivers
    const [avCols] = await conn.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'drivers'
         AND COLUMN_NAME = 'is_available'`,
    );
    if (avCols.length === 0) {
      await conn.execute(
        `ALTER TABLE drivers ADD COLUMN is_available TINYINT(1) NOT NULL DEFAULT 1`,
      );
      console.log("✅ Added drivers.is_available");
    } else {
      console.log("⏭️  drivers.is_available already exists");
    }

    // 5. Seed a few manual assignments for demo data
    const [existing] = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM trips WHERE is_manual_assignment = 1`,
    );
    if (Number(existing[0].cnt) === 0) {
      // Pick some completed trips and mark them as manual assignments
      await conn.execute(
        `UPDATE trips
         SET is_manual_assignment = 1,
             notes = 'Manual dispatch by admin'
         WHERE id IN (
           SELECT id FROM (
             SELECT id FROM trips ORDER BY id LIMIT 5
           ) AS sub
         )`,
      );
      console.log("✅ Seeded 5 manual assignments from existing trips");
    } else {
      console.log(`⏭️  ${existing[0].cnt} manual assignments already exist`);
    }

    console.log("\n=== Migration complete ===");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrate();
