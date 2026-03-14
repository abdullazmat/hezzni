const db = require('./config/db');

async function fix() {
  try {
    await db.pool.execute("UPDATE coupons SET expiry_date = '2027-12-31 23:59:59'");
    console.log('Coupons updated to 2027');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
