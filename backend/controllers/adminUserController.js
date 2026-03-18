const db = require('../config/db');

// GET /api/admin/user/profile
exports.getProfile = async (req, res) => {
  const adminId = req.user.id;

  // Handle Super Admin (ID 0)
  if (adminId === 0) {
    return res.status(200).json({
      id: 0,
      name: process.env.ADMIN_NAME || "Super Admin",
      email: process.env.ADMIN_EMAIL,
      role: "Admin",
      status: "Available",
      avatar: null,
    });
  }

  try {
    const [rows] = await db.pool.execute(
      "SELECT id, name, email, status, avatar, role FROM admins WHERE id = ?",
      [adminId],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "User not found" });
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/admin/user/profile
exports.updateProfile = async (req, res) => {
  const adminId = req.user.id;
  const { name, email, role } = req.body;
  let avatar = req.file ? req.file.path : undefined;

  // In a real app, you'd handle the file path/URL properly
  // For now, let's just save the filename
  if (req.file) {
    avatar = req.file.filename;
  }

  try {
    let query = 'UPDATE admins SET name = ?, email = ?, role = ?';
    let params = [name, email, role];

    if (avatar) {
      query += ', avatar = ?';
      params.push(avatar);
    }

    query += ' WHERE id = ?';
    params.push(adminId);

    await db.pool.execute(query, params);
    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/admin/user/status
exports.updateStatus = async (req, res) => {
  const adminId = req.user.id;
  const { status } = req.body;
  
  if (!['Available', 'Inactive'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    await db.pool.execute('UPDATE admins SET status = ? WHERE id = ?', [status, adminId]);
    res.status(200).json({ message: 'Status updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/admin/user/language
exports.updateLanguage = async (req, res) => {
  const adminId = req.user.id;
  const { language } = req.body;

  if (!['EN', 'AR', 'FR'].includes(language)) {
    return res.status(400).json({ message: 'Invalid language' });
  }

  try {
    await db.pool.execute('UPDATE admins SET language = ? WHERE id = ?', [language, adminId]);
    res.status(200).json({ message: 'Language updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/admin/user/login-history
exports.getLoginHistory = async (req, res) => {
  const adminId = req.user.id;
  try {
    const [rows] = await db.pool.execute(
      'SELECT id, login_time, logout_time, ip_address, device FROM admin_login_history WHERE admin_id = ? ORDER BY login_time DESC LIMIT 50',
      [adminId]
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/admin/user/employment-details
exports.getEmploymentDetails = async (req, res) => {
  const adminId = req.user.id;
  try {
    const [rows] = await db.pool.execute(
      'SELECT department, manager, job_title as jobTitle, location, timezone, phone, onboarding_date as onboardingDate FROM admins WHERE id = ?',
      [adminId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/admin/user/employment-details
exports.updateEmploymentDetails = async (req, res) => {
  const adminId = req.user.id;
  const { department, manager, jobTitle, location, timezone, phone, onboardingDate } = req.body;

  try {
    await db.pool.execute(
      'UPDATE admins SET department = ?, manager = ?, job_title = ?, location = ?, timezone = ?, phone = ?, onboarding_date = ? WHERE id = ?',
      [department, manager, jobTitle, location, timezone, phone, onboardingDate, adminId]
    );
    res.status(200).json({ message: 'Employment details updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
