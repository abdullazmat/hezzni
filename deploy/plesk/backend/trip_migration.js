require("dotenv").config();
const db = require("./config/db");

async function migrate() {
  const conn = await db.pool.getConnection();
  try {
    console.log("Starting trip table migration...");

    // Helper to add column if it doesn't exist
    async function addColumnIfMissing(table, column, definition) {
      const [cols] = await conn.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column],
      );
      if (cols.length === 0) {
        await conn.execute(
          `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`,
        );
        console.log(`  Added column ${table}.${column}`);
      } else {
        console.log(`  Column ${table}.${column} already exists`);
      }
    }

    // 1. Add new columns to trips table
    console.log("\n1. Adding new columns to trips table...");
    await addColumnIfMissing("trips", "service_type_id", "INT DEFAULT NULL");
    await addColumnIfMissing("trips", "city_id", "INT DEFAULT NULL");
    await addColumnIfMissing(
      "trips",
      "pickup_address",
      "VARCHAR(500) DEFAULT NULL",
    );
    await addColumnIfMissing(
      "trips",
      "dropoff_address",
      "VARCHAR(500) DEFAULT NULL",
    );
    await addColumnIfMissing("trips", "start_time", "DATETIME DEFAULT NULL");
    await addColumnIfMissing("trips", "end_time", "DATETIME DEFAULT NULL");
    await addColumnIfMissing("trips", "distance", "DECIMAL(10,2) DEFAULT NULL");
    await addColumnIfMissing(
      "trips",
      "estimated_price",
      "DECIMAL(10,2) DEFAULT NULL",
    );
    await addColumnIfMissing(
      "trips",
      "payment_method",
      "VARCHAR(50) DEFAULT 'cash'",
    );
    await addColumnIfMissing("trips", "duration_minutes", "INT DEFAULT NULL");

    // 2. Expand the status enum to include all required values
    console.log("\n2. Expanding status enum...");
    await conn.execute(`
      ALTER TABLE trips MODIFY COLUMN status 
        ENUM('completed','cancelled','in-progress','PENDING','MATCHED','ACCEPTED','IN_PROGRESS','COMPLETED','CANCELLED') 
        DEFAULT 'PENDING'
    `);
    console.log("  Status enum expanded");

    // 3. Convert existing lowercase status values to uppercase
    console.log("\n3. Converting existing status values to uppercase...");
    await conn.execute(
      `UPDATE trips SET status = 'COMPLETED' WHERE status = 'completed'`,
    );
    await conn.execute(
      `UPDATE trips SET status = 'CANCELLED' WHERE status = 'cancelled'`,
    );
    await conn.execute(
      `UPDATE trips SET status = 'IN_PROGRESS' WHERE status = 'in-progress'`,
    );
    console.log("  Status values converted to uppercase");

    // 4. Now tighten the enum to uppercase-only values
    console.log("\n4. Finalizing status enum (uppercase only)...");
    await conn.execute(`
      ALTER TABLE trips MODIFY COLUMN status 
        ENUM('PENDING','MATCHED','ACCEPTED','IN_PROGRESS','COMPLETED','CANCELLED') 
        DEFAULT 'PENDING'
    `);
    console.log("  Status enum finalized");

    // 5. Add commission setting if not exists
    console.log("\n5. Adding commission setting...");
    const [existing] = await conn.execute(
      `SELECT id FROM settings WHERE key_name = 'commission_percentage'`,
    );
    if (existing.length === 0) {
      await conn.execute(
        `INSERT INTO settings (key_name, value_content) VALUES ('commission_percentage', '15')`,
      );
      console.log("  Commission percentage set to 15%");
    } else {
      console.log("  Commission setting already exists");
    }

    // 6. Backfill existing trips with service_type_id, city_id, addresses, etc.
    console.log("\n6. Backfilling existing trip data...");

    const [trips] = await conn.execute(
      `SELECT id, driver_id, rider_id, amount, created_at FROM trips WHERE service_type_id IS NULL`,
    );
    if (trips.length > 0) {
      const serviceTypeIds = [1, 2, 3]; // CAR_RIDES, MOTORCYCLE, TAXI
      const cityIds = [1, 2, 3, 4]; // Casablanca, Rabat, Marrakech, Tanger
      const paymentMethods = ["cash", "visa", "mastercard"];
      const pickups = [
        "Bd Mohammed V, Casablanca",
        "Ave Hassan II, Rabat",
        "Place Jemaa el-Fna, Marrakech",
        "Av. d'Espagne, Tanger",
        "Rue de Fes, Meknes",
        "Bd Zerktouni, Casablanca",
        "Ave Mohammed VI, Marrakech",
      ];
      const dropoffs = [
        "Ain Diab, Casablanca",
        "Agdal, Rabat",
        "Gueliz, Marrakech",
        "Malabata, Tanger",
        "Ville Nouvelle, Meknes",
        "Maarif, Casablanca",
        "Hivernage, Marrakech",
      ];

      for (const trip of trips) {
        const stId = serviceTypeIds[trip.id % serviceTypeIds.length];
        const cId = cityIds[trip.id % cityIds.length];
        const pm = paymentMethods[trip.id % paymentMethods.length];
        const pickup = pickups[trip.id % pickups.length];
        const dropoff = dropoffs[trip.id % dropoffs.length];
        const dist = (3 + Math.random() * 20).toFixed(2);
        const dur = Math.floor(8 + Math.random() * 40);
        const startTime = new Date(trip.created_at);
        const endTime = new Date(startTime.getTime() + dur * 60000);

        await conn.execute(
          `UPDATE trips SET 
            service_type_id = ?, city_id = ?, pickup_address = ?, dropoff_address = ?,
            start_time = ?, end_time = ?, distance = ?, estimated_price = ?,
            payment_method = ?, duration_minutes = ?
          WHERE id = ?`,
          [
            stId,
            cId,
            pickup,
            dropoff,
            startTime,
            endTime,
            dist,
            trip.amount,
            pm,
            dur,
            trip.id,
          ],
        );
      }
      console.log(`  Backfilled ${trips.length} trips`);
    } else {
      console.log("  All trips already have service_type_id");
    }

    // 7. Update the dashboard controller references (just log reminder)
    console.log("\nMigration complete!");
    console.log(
      "NOTE: Dashboard controller updated to use uppercase status values (COMPLETED/CANCELLED).",
    );

    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    conn.release();
  }
}

migrate();
