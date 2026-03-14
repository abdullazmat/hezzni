const db = require("../config/db");
const bcrypt = require("bcrypt");

// Ensure extra columns exist
(async () => {
  const cols = [
    { name: "employee_id", type: "VARCHAR(50)" },
    { name: "city", type: "VARCHAR(100)" },
  ];
  for (const col of cols) {
    try {
      await db.pool.execute(
        `ALTER TABLE admins ADD COLUMN ${col.name} ${col.type}`,
      );
    } catch (_) {
      /* column already exists */
    }
  }
})();

// GET /api/admin/team/stats
exports.getTeamStats = async (req, res) => {
  try {
    const [[{ total }]] = await db.pool.execute(
      "SELECT COUNT(*) as total FROM admins",
    );
    const [[{ active }]] = await db.pool.execute(
      "SELECT COUNT(*) as active FROM admins WHERE status = 'Available'",
    );
    const [[{ admins }]] = await db.pool.execute(
      "SELECT COUNT(*) as admins FROM admins WHERE role = 'Super Admin'",
    );
    const [[{ online_today }]] = await db.pool.execute(
      `SELECT COUNT(DISTINCT admin_id) as online_today FROM admin_login_history WHERE DATE(login_time) = CURDATE()`,
    );

    res.status(200).json({
      totalMembers: total,
      active,
      admins,
      onlineToday: online_today,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/team/members
exports.getTeamMembers = async (req, res) => {
  try {
    const query = `
      SELECT 
        a.id, 
        a.name, 
        a.email, 
        a.role, 
        a.status, 
        a.avatar,
        a.department,
        a.job_title,
        a.city,
        a.employee_id,
        (SELECT login_time FROM admin_login_history WHERE admin_id = a.id ORDER BY login_time DESC LIMIT 1) as last_login,
        (SELECT logout_time FROM admin_login_history WHERE admin_id = a.id ORDER BY login_time DESC LIMIT 1) as last_logout
      FROM admins a
    `;
    const [rows] = await db.pool.execute(query);
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/admin/team/members
exports.addTeamMember = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      employeeId,
      jobTitle,
      role,
      department,
      city,
    } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email and password are required" });
    }

    // Check if requester is Super Admin
    const [adminRows] = await db.pool.execute(
      "SELECT role FROM admins WHERE id = ?",
      [req.user.id],
    );
    if (adminRows.length === 0 || adminRows[0].role !== "Super Admin") {
      return res
        .status(403)
        .json({ message: "Only Super Admin can add team members" });
    }

    // Check duplicate email
    const [existing] = await db.pool.execute(
      "SELECT id FROM admins WHERE email = ?",
      [email],
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.pool.execute(
      `INSERT INTO admins (name, email, password, employee_id, job_title, role, department, city, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Available')`,
      [
        name,
        email,
        hashedPassword,
        employeeId || null,
        jobTitle || null,
        role || "Admin",
        department || null,
        city || null,
      ],
    );

    res.status(201).json({ message: "Team member added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/admin/team/members/:id
exports.updateTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, status, department, jobTitle, city } = req.body;

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push("name = ?");
      params.push(name);
    }
    if (email !== undefined) {
      updates.push("email = ?");
      params.push(email);
    }
    if (role !== undefined) {
      updates.push("role = ?");
      params.push(role);
    }
    if (status !== undefined) {
      updates.push("status = ?");
      params.push(status);
    }
    if (department !== undefined) {
      updates.push("department = ?");
      params.push(department);
    }
    if (jobTitle !== undefined) {
      updates.push("job_title = ?");
      params.push(jobTitle);
    }
    if (city !== undefined) {
      updates.push("city = ?");
      params.push(city);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    params.push(id);
    await db.pool.execute(
      `UPDATE admins SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );

    res.status(200).json({ message: "Team member updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/admin/team/members/:id/delete
exports.deleteTeamMember = async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: "Cannot delete yourself" });
    }

    const [rows] = await db.pool.execute("SELECT id FROM admins WHERE id = ?", [
      id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Team member not found" });
    }

    await db.pool.execute(
      "DELETE FROM admin_login_history WHERE admin_id = ?",
      [id],
    );
    await db.pool.execute("DELETE FROM admins WHERE id = ?", [id]);

    res.status(201).json({ message: "Team member deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
