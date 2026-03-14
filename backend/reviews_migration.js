const db = require('./config/db');

async function migrate() {
  try {
    const conn = await db.pool.getConnection();
    console.log('Creating reviews table...');

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ride_request_id INT NOT NULL,
        reviewer_id INT NOT NULL,
        reviewer_type ENUM('PASSENGER', 'DRIVER') NOT NULL,
        reviewee_id INT NOT NULL,
        reviewee_type ENUM('PASSENGER', 'DRIVER') NOT NULL,
        rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_reviewee_driver (reviewee_id, reviewee_type),
        INDEX idx_reviewer (reviewer_id, reviewer_type)
      )
    `);

    console.log('Reviews table created successfully.');
    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
