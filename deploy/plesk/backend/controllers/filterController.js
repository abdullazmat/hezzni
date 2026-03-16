const db = require("../config/db");

// GET /api/admin/filters/cities — City Dropdown
async function getCities(req, res) {
  try {
    const [rows] = await db.pool.execute(
      `SELECT id, name FROM cities WHERE status = 'active' ORDER BY name ASC`,
    );
    res.json(rows);
  } catch (err) {
    console.error("getCities error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/admin/filters/service-types — Service Type Dropdown (excludes Rental Company)
async function getServiceTypes(req, res) {
  try {
    const [rows] = await db.pool.execute(
      `SELECT id, name, display_name AS displayName 
       FROM service_types 
       WHERE is_active = 1 AND name != 'RENTAL_CARS' 
       ORDER BY id ASC`,
    );
    res.json(rows);
  } catch (err) {
    console.error("getServiceTypes error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/admin/filters/ride-preferences — Vehicle Type Dropdown
async function getRidePreferences(req, res) {
  try {
    const [rows] = await db.pool.execute(
      `SELECT id, name, preference_key AS preferenceKey, description, base_price AS basePrice
       FROM ride_preferences 
       ORDER BY id ASC`,
    );
    res.json(rows);
  } catch (err) {
    console.error("getRidePreferences error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  getCities,
  getServiceTypes,
  getRidePreferences,
};
