const db = require("./config/db");
const bcrypt = require("bcrypt");

async function updateSchema() {
  try {
    console.log("Connecting to database...");
    const conn = await db.pool.getConnection();
    console.log("Connected.");

    // 1. Create Settings Table
    console.log("Creating settings table...");
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        key_name VARCHAR(255) UNIQUE NOT NULL,
        value_content TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 2. Seed Settings
    const [settingsRows] = await conn.execute(
      "SELECT COUNT(*) as count FROM settings",
    );
    if (settingsRows[0].count === 0) {
      console.log("Seeding settings...");
      await conn.execute(`
        INSERT INTO settings (key_name, value_content) VALUES 
        ('privacy_policy', 'Welcome to Ezzni. Your privacy is important to us. We collect information such as your name, contact details, location data, and payment information to provide our services.'),
        ('terms_of_service', 'By using Ezzni, you agree to follow our terms and conditions. Users must provide accurate information and maintain account security.')
      `);
    }

    // 3. Update Admins Table Schema
    console.log("Updating admins table schema...");
    const columnsToAdd = [
      {
        name: "status",
        type: "ENUM('Available', 'Inactive') DEFAULT 'Available'",
      },
      { name: "avatar", type: "VARCHAR(255)" },
      { name: "role", type: "VARCHAR(100) DEFAULT 'Admin'" },
      { name: "language", type: "ENUM('EN', 'AR', 'FR') DEFAULT 'EN'" },
      { name: "department", type: "VARCHAR(100)" },
      { name: "manager", type: "VARCHAR(100)" },
      { name: "job_title", type: "VARCHAR(100)" },
      { name: "location", type: "VARCHAR(255)" },
      { name: "timezone", type: "VARCHAR(100)" },
      { name: "phone", type: "VARCHAR(20)" },
      { name: "onboarding_date", type: "DATE" },
    ];

    for (const col of columnsToAdd) {
      try {
        await conn.execute(
          `ALTER TABLE admins ADD COLUMN ${col.name} ${col.type}`,
        );
        console.log(`Added column: ${col.name}`);
      } catch (err) {
        if (err.code === "ER_DUP_FIELDNAME") {
          console.log(`Column ${col.name} already exists.`);
        } else {
          throw err;
        }
      }
    }

    // seed more admins
    const [adminCountRows] = await conn.execute(
      "SELECT COUNT(*) as count FROM admins",
    );
    if (adminCountRows[0].count <= 1) {
      console.log("Seeding more admins...");
      const hp = await bcrypt.hash("Admin@123", 10);
      await conn.execute(
        `
        INSERT INTO admins (name, email, password, role, status, department, job_title) VALUES 
        ('Ahmed El Mansouri', 'ahmed.mansouri@hezzni.ma', ?, 'Developer', 'Available', 'Tech', 'Senior Dev'),
        ('Fatima Zahra', 'fatima.zahra@hezzni.ma', ?, 'Developer', 'Available', 'Product', 'Designer'),
        ('Youssef Benali', 'youssef.benali@hezzni.ma', ?, 'Manager', 'Available', 'Ops', 'Ops Manager')
      `,
        [hp, hp, hp],
      );
    }

    // 4. Create Login History Table
    console.log("Creating admin_login_history table...");
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS admin_login_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        logout_time DATETIME,
        ip_address VARCHAR(45),
        device VARCHAR(255),
        FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
      )
    `);

    // 5. Create Trips Table
    console.log("Creating trips table...");
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS trips (
        id INT AUTO_INCREMENT PRIMARY KEY,
        driver_id INT,
        rider_id INT,
        amount DECIMAL(10, 2) NOT NULL,
        bonus DECIMAL(10, 2) DEFAULT 0,
        status ENUM('completed', 'cancelled', 'in-progress') DEFAULT 'completed',
        region VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_id) REFERENCES drivers(id),
        FOREIGN KEY (rider_id) REFERENCES riders(id)
      )
    `);

    // 6. Seed Trips
    const [tripRows] = await conn.execute(
      "SELECT COUNT(*) as count FROM trips",
    );
    if (tripRows[0].count === 0) {
      console.log("Seeding trips...");
      // Today trips
      await conn.execute(`
        INSERT INTO trips (driver_id, rider_id, amount, bonus, region, created_at) VALUES 
        (1, 1, 150.00, 10.00, 'Casablanca-Settat', NOW()),
        (4, 2, 85.50, 5.00, 'Rabat-Salé-Kénitra', NOW()),
        (1, 4, 200.00, 15.00, 'Marrakech-Safi', NOW()),
        (4, 1, 120.00, 8.00, 'Casablanca-Settat', NOW()),
        (1, 2, 95.00, 7.50, 'Fès-Meknès', NOW()),
        (4, 4, 180.00, 12.00, 'Tanger-Tetouan-Al Hoceima', NOW())
      `);
      // Yesterday trips
      await conn.execute(`
        INSERT INTO trips (driver_id, rider_id, amount, bonus, region, created_at) VALUES 
        (1, 2, 140.00, 9.00, 'Casablanca-Settat', DATE_SUB(NOW(), INTERVAL 1 DAY)),
        (4, 4, 75.00, 4.00, 'Rabat-Salé-Kénitra', DATE_SUB(NOW(), INTERVAL 1 DAY)),
        (1, 1, 220.00, 14.00, 'Marrakech-Safi', DATE_SUB(NOW(), INTERVAL 1 DAY)),
        (4, 2, 110.00, 6.00, 'Fès-Meknès', DATE_SUB(NOW(), INTERVAL 1 DAY))
      `);
      // Older trips (past week)
      for (let day = 2; day <= 7; day++) {
        await conn.execute(`
          INSERT INTO trips (driver_id, rider_id, amount, bonus, region, created_at) VALUES 
          (1, 1, ROUND(50 + RAND() * 200, 2), ROUND(RAND() * 15, 2), 'Casablanca-Settat', DATE_SUB(NOW(), INTERVAL ${day} DAY)),
          (4, 2, ROUND(50 + RAND() * 200, 2), ROUND(RAND() * 15, 2), 'Rabat-Salé-Kénitra', DATE_SUB(NOW(), INTERVAL ${day} DAY)),
          (1, 4, ROUND(50 + RAND() * 200, 2), ROUND(RAND() * 15, 2), 'Marrakech-Safi', DATE_SUB(NOW(), INTERVAL ${day} DAY))
        `);
      }
      console.log("Trips seeded.");
    }

    console.log("Schema update completed successfully.");
    conn.release();
    process.exit(0);
  } catch (err) {
    console.error("Schema update failed:", err);
    process.exit(1);
  }
}

updateSchema();
