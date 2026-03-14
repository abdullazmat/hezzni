const db = require('../config/db');

// Get all riders
exports.getAllRiders = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM riders');
    
    // Check if table exists/is empty. If not found, returning empty array is standard.
    // If the table "riders" does not exist, this will throw an error, which is caught below.
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get single rider
exports.getRiderById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM riders WHERE id = ?', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Rider not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create a new rider
exports.createRider = async (req, res) => {
  try {
    const { name, email, status, totalSpent, totalTrips, joinedDate } = req.body;
    
    // Basic validation
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and Email are required' });
    }

    const sql = `INSERT INTO riders (name, email, status, total_spent, total_trips, joined_date) VALUES (?, ?, ?, ?, ?, ?)`;
    const result = await db.query(sql, [name, email, status || 'active', totalSpent || 0, totalTrips || 0, joinedDate || new Date()]);
    
    res.status(201).json({ message: 'Rider created successfully', id: result.rows.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update rider
exports.updateRider = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, status, totalSpent, totalTrips } = req.body;

    const sql = `UPDATE riders SET name = ?, email = ?, status = ?, total_spent = ?, total_trips = ? WHERE id = ?`;
    const result = await db.query(sql, [name, email, status, totalSpent, totalTrips, id]);

    if (result.rows.affectedRows === 0) {
      return res.status(404).json({ message: 'Rider not found' });
    }

    res.json({ message: 'Rider updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Delete rider
exports.deleteRider = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM riders WHERE id = ?', [id]);

    if (result.rows.affectedRows === 0) {
      return res.status(404).json({ message: 'Rider not found' });
    }

    res.json({ message: 'Rider deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};
