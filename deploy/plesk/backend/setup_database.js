const db = require('./config/db');
const bcrypt = require('bcrypt');

async function run() {
  try {
    console.log('Connecting...');
    const conn = await db.pool.getConnection();
    console.log('Connected.');
    conn.release();

    // Drivers Table
    console.log('Creating drivers table...');
    await db.pool.execute(`
      CREATE TABLE IF NOT EXISTS drivers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        status ENUM('active', 'pending', 'blocked') DEFAULT 'pending',
        rating FLOAT DEFAULT 0,
        trips INT DEFAULT 0,
        joined_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Drivers table ready.');

    // Riders Table
    console.log('Creating riders table...');
    await db.pool.execute(`
      CREATE TABLE IF NOT EXISTS riders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        status ENUM('active', 'blocked') DEFAULT 'active',
        total_spent FLOAT DEFAULT 0,
        total_trips INT DEFAULT 0,
        joined_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Riders table ready.');

    // Admins Table
    console.log('Creating admins table...');
    await db.pool.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        reset_token VARCHAR(255) DEFAULT NULL,
        reset_token_expiry DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Admins table ready.');

    // Seed Drivers
    const [driverRows] = await db.pool.execute('SELECT COUNT(*) as count FROM drivers');
    if (driverRows[0].count === 0) {
      console.log('Seeding drivers...');
      await db.pool.execute(`
        INSERT INTO drivers (name, phone, status, rating, trips) VALUES 
        ('Ahmed Khan', '+92 300 1234567', 'active', 4.8, 156),
        ('Mustafa Ali', '+92 311 7654321', 'pending', 0.0, 0),
        ('Zeeshan Malik', '+92 322 9876543', 'blocked', 3.2, 45),
        ('Bilal Ahmed', '+92 344 5556667', 'active', 4.9, 89)
      `);
      console.log('Drivers seeded.');
    } else {
      console.log('Drivers table already has data.');
    }

    // Seed Riders
    const [riderRows] = await db.pool.execute('SELECT COUNT(*) as count FROM riders');
    if (riderRows[0].count === 0) {
      console.log('Seeding riders...');
      await db.pool.execute(`
        INSERT INTO riders (name, email, status, total_spent, total_trips) VALUES 
        ('Sarah Jenkins', 'sarah@example.com', 'active', 450.50, 34),
        ('John Doe', 'john.doe@example.com', 'active', 120.00, 12),
        ('Michael Scott', 'boss@dundermifflin.com', 'blocked', 890.20, 78),
        ('Pam Beesly', 'pam@example.com', 'active', 55.40, 5)
      `);
      console.log('Riders seeded.');
    } else {
      console.log('Riders table already has data.');
    }

    // Seed Admin
    const [adminRows] = await db.pool.execute('SELECT COUNT(*) as count FROM admins WHERE email = ?', ['admin@hezzni.com']);
    if (adminRows[0].count === 0) {
      console.log('Seeding default admin...');
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      await db.pool.execute(`
        INSERT INTO admins (name, email, password) VALUES 
        ('Admin User', 'admin@hezzni.com', ?)
      `, [hashedPassword]);
      console.log('Default admin created: admin@hezzni.com / admin123');
    } else {
      console.log('Admin user already exists.');
    }

    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

run();
