const db = require('./config/db');

async function migrate() {
  try {
    console.log('Connecting to database...');
    const conn = await db.pool.getConnection();
    console.log('Connected.');

    // 1. Create Cities Table
    console.log('Creating cities table...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS cities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Create Passenger Services Table
    console.log('Creating passenger_services table...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS passenger_services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        icon_url VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Create Ride Preferences Table
    console.log('Creating ride_preferences table...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ride_preferences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        passenger_service_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        preference_key VARCHAR(50) NOT NULL,
        description TEXT,
        base_price DECIMAL(10, 2) DEFAULT 0.00,
        FOREIGN KEY (passenger_service_id) REFERENCES passenger_services(id) ON DELETE CASCADE
      )
    `);

    // 4. Create Coupons Table
    console.log('Creating coupons table...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS coupons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        discount_amount DECIMAL(10, 2) NOT NULL,
        usage_limit INT DEFAULT 100,
        current_usage INT DEFAULT 0,
        expiry_date DATETIME,
        status ENUM('active', 'expired', 'disabled') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Update Riders Table
    console.log('Updating riders table schema...');
    const columnsToAdd = [
      { name: 'phone', type: 'VARCHAR(20) UNIQUE' },
      { name: 'image_url', type: 'VARCHAR(500)' },
      { name: 'dob', type: 'DATE' },
      { name: 'gender', type: "ENUM('MALE', 'FEMALE', 'OTHER')" },
      { name: 'city_id', type: 'INT' },
      { name: 'is_registered', type: 'BOOLEAN DEFAULT FALSE' }
    ];

    for (const col of columnsToAdd) {
      try {
        await conn.execute(`ALTER TABLE riders ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column: ${col.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column ${col.name} already exists.`);
        } else {
          console.error(`Error adding column ${col.name}:`, err.message);
        }
      }
    }

    // 6. Seed initial data
    console.log('Seeding initial data...');
    
    // Seed Cities
    const [cityRows] = await conn.execute('SELECT COUNT(*) as count FROM cities');
    if (cityRows[0].count === 0) {
      await conn.execute("INSERT INTO cities (name) VALUES ('Casablanca'), ('Rabat'), ('Marrakech'), ('Tanger')");
      console.log('Cities seeded.');
    }

    // Seed Passenger Services
    const [serviceRows] = await conn.execute('SELECT COUNT(*) as count FROM passenger_services');
    if (serviceRows[0].count === 0) {
      await conn.execute("INSERT INTO passenger_services (id, name) VALUES (1, 'Car Rides'), (2, 'Motorcycle'), (3, 'Taxi')");
      console.log('Passenger services seeded.');
    }

    // Seed Ride Preferences
    const [prefRows] = await conn.execute('SELECT COUNT(*) as count FROM ride_preferences');
    if (prefRows[0].count === 0) {
      await conn.execute(`
        INSERT INTO ride_preferences (passenger_service_id, name, preference_key, description, base_price) VALUES 
        (1, 'Standard', 'STANDARD', 'Regular everyday rides', 25.00),
        (1, 'Hezzni Comfort', 'COMFORT', 'Premium rides with higher fares', 35.50),
        (2, 'Fast Bike', 'FAST', 'Quick motorcycle rides', 15.00),
        (3, 'City Taxi', 'TAXI', 'Standard city taxi service', 20.00)
      `);
      console.log('Ride preferences seeded.');
    }

    // Seed a Coupon
    const [couponRows] = await conn.execute('SELECT COUNT(*) as count FROM coupons');
    if (couponRows[0].count === 0) {
      await conn.execute(`
        INSERT INTO coupons (code, discount_amount, usage_limit, expiry_date) VALUES 
        ('HEZZNI2024', 10.00, 1000, '2025-12-31 23:59:59'),
        ('WELCOME20', 20.00, 500, '2025-12-31 23:59:59')
      `);
      console.log('Coupons seeded.');
    }

    console.log('Migration completed successfully.');
    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
