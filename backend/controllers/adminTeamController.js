const db = require("../config/db");
const bcrypt = require("bcrypt");

function normalizeAdminRole(role) {
  if (typeof role !== "string") {
    return "Admin";
  }

  const trimmedRole = role.trim();
  if (!trimmedRole) {
    return "Admin";
  }

  const lower = trimmedRole.toLowerCase();
  
  // Distinguish Super Admin from regular Admin
  if (lower === "super admin" || lower === "superadmin") {
    return "Super Admin";
  }
  
  // Collapse other admin variants into Admin
  if (lower.includes("admin")) {
    return "Admin";
  }

  return trimmedRole;
}

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
    // Count all Management roles
    const [[{ admins }]] = await db.pool.execute(
      `SELECT COUNT(*) as admins FROM admins 
       WHERE LOWER(role) LIKE '%admin%' 
       OR LOWER(role) LIKE '%manager%' 
       OR LOWER(role) LIKE '%moderator%'`,
    );

    // Check if Super Admin (id 0) logged in today
    const [[{ super_admin_online }]] = await db.pool.execute(
      `SELECT COUNT(*) as count FROM admin_login_history WHERE admin_id = 0 AND DATE(login_time) = CURDATE()`,
    );
    const [[{ others_online }]] = await db.pool.execute(
      `SELECT COUNT(DISTINCT admin_id) as count FROM admin_login_history WHERE admin_id != 0 AND DATE(login_time) = CURDATE()`,
    );

    // Super admin is always counted as +1 to total, active, and admins
    res.status(200).json({
      totalMembers: total + 1,
      active: active + 1,
      admins: admins + 1,
      onlineToday: others_online + (super_admin_online > 0 ? 1 : 0),
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

    // Get Super Admin (ID 0) login/logout history
    const [saHistory] = await db.pool.execute(
      "SELECT login_time, logout_time FROM admin_login_history WHERE admin_id = 0 ORDER BY login_time DESC LIMIT 1",
    );

    const superAdmin = {
      id: 0,
      name: process.env.ADMIN_NAME || "Super Admin",
      email: process.env.ADMIN_EMAIL,
      role: "Super Admin",
      status: "Available",
      avatar: null,
      department: "Management",
      job_title: "Super Admin",
      city: "N/A",
      employee_id: "HEZZNI-001",
      last_login: saHistory.length > 0 ? saHistory[0].login_time : null,
      last_logout: saHistory.length > 0 ? saHistory[0].logout_time : null,
    };

    res.status(200).json([superAdmin, ...rows]);
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

    // Check duplicate email or name
    const [existing] = await db.pool.execute(
      "SELECT id, email, name FROM admins WHERE email = ? OR name = ?",
      [email, name],
    );
    if (existing.length > 0) {
      if (existing.some((r) => r.email === email)) {
        return res.status(400).json({ message: "Email already exists" });
      }
      return res.status(400).json({ message: "Name/Username already exists" });
    }

    const normalizedRole = normalizeAdminRole(role);
    const requesterId = req.user.id;
    const requesterRole = String(req.user.role || "").trim().toLowerCase();
    const isSuperAdminReq = requesterId === 0 || requesterRole === "super admin";

    if (normalizedRole === "Super Admin") {
      return res.status(403).json({ message: "There can only be one Super Admin (ID 0)" });
    }

    if (normalizedRole === "Admin" && !isSuperAdminReq) {
      return res.status(403).json({ message: "Only the Super Admin can create other Admins" });
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
        normalizedRole,
        department || null,
        city || null,
      ],
    );

    res.status(201).json({ message: "Team member added successfully" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      const msg = err.sqlMessage.includes("email")
        ? "Email already exists"
        : "Name/Username already exists";
      return res.status(400).json({ message: msg });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/admin/team/members/:id
exports.updateTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, status, department, jobTitle, city } =
      req.body;

    const requesterId = req.user.id;
    const requesterRole = String(req.user.role || "").trim();
    const isEditingSelf = parseInt(id) === requesterId;
    const isSuperAdmin = requesterId === 0 || requesterRole.toLowerCase() === "super admin";
    const isAdmin = requesterRole.toLowerCase() === "admin";

    // 1. Authorization: Only Super Admin and Admin can edit others
    if (!isSuperAdmin && !isAdmin && !isEditingSelf) {
      return res.status(403).json({
        message: "Permission denied: You can only edit your own profile",
      });
    }

    // 2. Load target member info if not self
    let targetRole = "";
    if (!isEditingSelf) {
      if (parseInt(id) === 0) {
        targetRole = "Super Admin";
      } else {
        const [targetRows] = await db.pool.execute("SELECT role FROM admins WHERE id = ?", [id]);
        if (targetRows.length === 0) {
          return res.status(404).json({ message: "Team member not found" });
        }
        targetRole = targetRows[0].role;
      }
    }

    // 3. Permission checks
    if (!isSuperAdmin && !isEditingSelf) {
      const targetRoleLower = targetRole.toLowerCase();
      
      // Admin cannot edit a Super Admin
      if (targetRoleLower === "super admin") {
        return res.status(403).json({ message: "Permission denied: Admins cannot edit Super Admins" });
      }
      
      // Admin cannot edit other Admins
      if (isAdmin && targetRoleLower === "admin") {
        return res.status(403).json({ message: "Permission denied: Admins cannot edit other Admins" });
      }
    }

    // 2. Security Check: Prevent self-promotion for non-admins
    if (!isSuperAdmin && !isAdmin && isEditingSelf) {
      if (role !== undefined || status !== undefined) {
        return res.status(403).json({
          message: "You cannot change your own role or account status",
        });
      }
    }

    // 3. Prepare Updates
    const updates = [];
    const params = [];

    // Uniqueness checks for email and name
    if (email !== undefined) { // Changed from `if (email)` to `if (email !== undefined)` for consistency
      const [existingEmail] = await db.pool.execute(
        "SELECT id FROM admins WHERE email = ? AND id != ?",
        [email, id],
      );
      if (existingEmail.length > 0) {
        return res.status(400).json({ message: "Email already exists" });
      }
    }
    if (name !== undefined) { // Changed from `if (name)` to `if (name !== undefined)` for consistency
      const [existingName] = await db.pool.execute(
        "SELECT id FROM admins WHERE name = ? AND id != ?",
        [name, id],
      );
      if (existingName.length > 0) {
        return res.status(400).json({ message: "Name/Username already exists" });
      }
    }

    if (name !== undefined) {
      updates.push("name = ?");
      params.push(name);
    }
    if (email !== undefined) {
      updates.push("email = ?");
      params.push(email);
    }
    if (password !== undefined && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push("password = ?");
      params.push(hashedPassword);
    }
    if (role !== undefined) {
      const normalizedRole = normalizeAdminRole(role);
      
      if (normalizedRole === "Super Admin") {
        return res.status(403).json({ message: "There can only be one Super Admin (ID 0)" });
      }

      const requesterId = req.user.id;
      const requesterRole = String(req.user.role || "").trim().toLowerCase();
      const isSuperAdminReq = requesterId === 0 || requesterRole === "super admin";

      if (normalizedRole === "Admin" && !isSuperAdminReq) {
        return res.status(403).json({ message: "Only the Super Admin can promote someone to the Admin role" });
      }

      updates.push("role = ?");
      params.push(normalizedRole);
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
    if (err.code === "ER_DUP_ENTRY") {
      const msg = err.sqlMessage.includes("email")
        ? "Email already exists"
        : "Name/Username already exists";
      return res.status(400).json({ message: msg });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/admin/team/members/:id/delete
exports.deleteTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const targetId = parseInt(id);
    const requesterId = req.user.id;
    const requesterRole = String(req.user.role || "").trim();
    const isSuperAdmin = requesterId === 0 || requesterRole.toLowerCase() === "super admin";
    const isAdmin = requesterRole.toLowerCase() === "admin";

    // 1. Initial Authorization: Only Super Admin and Admin can delete
    if (!isSuperAdmin && !isAdmin) {
      return res.status(403).json({ message: "Only Admins and Super Admins can delete team members" });
    }

    // 2. Prevent self-deletion
    if (targetId === requesterId) {
      return res.status(400).json({ message: "Cannot delete yourself" });
    }

    // 3. Protect Virtual Super Admin
    if (targetId === 0) {
      return res.status(403).json({ message: "Cannot delete the Super Admin" });
    }

    // 4. Fetch target info to check role
    const [rows] = await db.pool.execute("SELECT id, role FROM admins WHERE id = ?", [targetId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Team member not found" });
    }

    const targetUser = rows[0];
    const targetRoleLower = String(targetUser.role || "").trim().toLowerCase();

    // 5. Hierarchy protections for non-Super Admin admins
    if (!isSuperAdmin) {
       // Cannot delete another Super Admin (just in case there is a real one in the DB)
       if (targetRoleLower === "super admin") {
         return res.status(403).json({ message: "Permission denied: Cannot delete a Super Admin" });
       }
       
       // Admin cannot delete another Admin
       if (isAdmin && targetRoleLower === "admin") {
         return res.status(403).json({ message: "Permission denied: Admins cannot delete other Admins" });
       }
    }

    // 6. Perform deletion
    await db.pool.execute(
      "DELETE FROM admin_login_history WHERE admin_id = ?",
      [targetId],
    );
    await db.pool.execute("DELETE FROM admins WHERE id = ?", [targetId]);

    res.status(201).json({ message: "Team member deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
