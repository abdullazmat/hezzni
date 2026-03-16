const db = require('./config/db');

async function migrate() {
  try {
    console.log('Connecting to database...');
    const conn = await db.pool.getConnection();
    console.log('Connected.');

    // 1. Update Drivers Table
    console.log('Updating drivers table schema...');
    
    // Check and add columns
    const columnsToAdd = [
      { name: 'email', type: 'VARCHAR(255)' },
      { name: 'image_url', type: 'VARCHAR(500)' },
      { name: 'dob', type: 'DATE' },
      { name: 'gender', type: "ENUM('MALE', 'FEMALE', 'OTHER')" },
      { name: 'city_id', type: 'INT' },
      { name: 'is_registered', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'service_type_id', type: 'INT' },
      { name: 'car_ride_status', type: 'JSON' },
      { name: 'motorcycle_status', type: 'JSON' },
      { name: 'taxi_status', type: 'JSON' },
      { name: 'rental_profile', type: 'JSON' },
      { name: 'is_online', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'active_preferences', type: 'JSON' }
    ];


    for (const col of columnsToAdd) {
      try {
        await conn.execute(`ALTER TABLE drivers ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column: ${col.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column ${col.name} already exists.`);
        } else {
          console.error(`Error adding column ${col.name}:`, err.message);
        }
      }
    }

    // 2. Add email to drivers table uniqueness if it doesn't exist
    try {
        await conn.execute('ALTER TABLE drivers ADD UNIQUE(email)');
        console.log('Added unique constraint to email.');
    } catch (err) {}

    // 3. Ensure phone is unique
    try {
        await conn.execute('ALTER TABLE drivers ADD UNIQUE(phone)');
        console.log('Added unique constraint to phone.');
    } catch (err) {}

    // 4. Create Service Types table if not exists
    console.log('Creating service_types table...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS service_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);

    // 5. Seed Service Types
    const [serviceRows] = await conn.execute('SELECT COUNT(*) as count FROM service_types');
    if (serviceRows[0].count === 0) {
      await conn.execute(`
        INSERT INTO service_types (name, display_name) VALUES 
        ('CAR_RIDES', 'Car Rides'),
        ('MOTORCYCLE', 'Motorcycle'),
        ('TAXI', 'Taxi'),
        ('RENTAL_CARS', 'Rental Cars')
      `);
      console.log('Service types seeded.');
    }

    console.log('Driver migration completed successfully.');
    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
