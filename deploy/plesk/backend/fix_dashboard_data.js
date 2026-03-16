const db = require('./config/db');

async function seed() {
    try {
        console.log('Updating trips to be current...');
        
        // Update existing trips to be today/yesterday relative to current time
        await db.pool.execute("UPDATE trips SET created_at = NOW() WHERE id % 2 = 0");
        await db.pool.execute("UPDATE trips SET created_at = DATE_SUB(NOW(), INTERVAL 1 DAY) WHERE id % 2 = 1");
        
        // Ensure we have some drivers with 'active' status
        await db.pool.execute("UPDATE drivers SET status = 'active' WHERE id > 0");
        
        // Add more trips for better distribution
        const regions = ['Casablanca-Settat', 'Rabat-Salé-Kénitra', 'Marrakech-Safi', 'Fès-Meknès', 'Tanger-Tetouan-Al Hoceima'];
        for (const region of regions) {
            await db.pool.execute(
                "INSERT INTO trips (driver_id, rider_id, amount, bonus, region, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
                [1, 1, Math.random() * 200 + 50, Math.random() * 20, region]
            );
             await db.pool.execute(
                "INSERT INTO trips (driver_id, rider_id, amount, bonus, region, created_at) VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL 1 DAY))",
                [4, 2, Math.random() * 100 + 30, Math.random() * 10, region]
            );
        }

        console.log('Seed completed.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
