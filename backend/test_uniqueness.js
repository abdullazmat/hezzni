const db = require('./config/db');

async function testUpdate() {
  const adminId = 1;// some non-zero id
  const name = 'test';
  const email = 'testing@gmail.com';
  const role = 'Admin';
  
  try {
    if (email) {
      const [existing] = await db.pool.execute(
        "SELECT id FROM admins WHERE email = ? AND id != ?",
        [email, adminId],
      );
      console.log('Duplicate email rows:', existing.length);
    }
    if (name) {
      const [existing] = await db.pool.execute(
        "SELECT id FROM admins WHERE name = ? AND id != ?",
        [name, adminId],
      );
      console.log('Duplicate name rows:', existing.length);
    }
    console.log('Test completed successfully');
  } catch (err) {
    console.error('Test FAILED:', err);
  } finally {
      process.exit();
  }
}

testUpdate();
