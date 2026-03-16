const db = require('../config/db');

// Get all drivers
exports.getAllDrivers = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM drivers');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get single driver
exports.getDriverById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM drivers WHERE id = ?', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create a new driver
exports.createDriver = async (req, res) => {
  try {
    const { name, phone, email, dob, gender, cityId, status, serviceTypeId } = req.body;
    
    // Basic validation
    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and Phone are required' });
    }

    const sql = `
      INSERT INTO drivers (name, phone, email, dob, gender, city_id, status, is_registered, service_type_id, joined_date) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await db.query(sql, [
      name, 
      phone, 
      email || '', 
      dob || null, 
      gender || 'OTHER', 
      cityId || null, 
      status || 'pending', 
      true, // Admins typically create registered-ready accounts or we set it true if they provide enough info
      serviceTypeId || null, 
      new Date()
    ]);
    
    res.status(201).json({ message: 'Driver created successfully', id: result.rows.insertId });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Phone or Email already exists' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};


// Update driver
exports.updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, status, rating, trips } = req.body;

    const sql = `UPDATE drivers SET name = ?, phone = ?, status = ?, rating = ?, trips = ? WHERE id = ?`;
    const result = await db.query(sql, [name, phone, status, rating, trips, id]);

    if (result.rows.affectedRows === 0) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.json({ message: 'Driver updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Delete driver
exports.deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM drivers WHERE id = ?', [id]);

    if (result.rows.affectedRows === 0) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.json({ message: 'Driver deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};
