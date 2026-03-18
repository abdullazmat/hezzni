const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  const submittedEmail = String(email).trim().toLowerCase();
  const submittedPassword = String(password);

  try {
    let user = null;

    // 1. Check if this is the Super Admin (controlled by ENV variables ONLY)
    const superAdminEmail = String(process.env.ADMIN_EMAIL || "")
      .trim()
      .toLowerCase();
    const superAdminPassword = String(process.env.ADMIN_PASSWORD || "");

    if (
      superAdminEmail &&
      submittedEmail === superAdminEmail &&
      submittedPassword === superAdminPassword
    ) {
      user = {
        id: 0, // Specialized ID for Super Admin
        email: superAdminEmail,
        name: process.env.ADMIN_NAME || "Super Admin",
        role: "Super Admin",
        status: "Available",
      };
      console.log("Super Admin logged in via ENV");
    }

    // 2. If not Super Admin, check the database for other roles
    if (!user) {
      const [rows] = await db.pool.execute(
        "SELECT * FROM admins WHERE email = ?",
        [submittedEmail],
      );

      if (rows.length > 0) {
        const dbUser = rows[0];
        const isMatch = await bcrypt.compare(submittedPassword, dbUser.password);
        if (isMatch) {
          user = dbUser;
          console.log(`User ${user.email} logged in via DB`);
        }
      }
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 3. Check status (only applicable if user came from DB)
    if (user.status && user.status === "Inactive") {
      return res.status(403).json({ message: "Your account is inactive" });
    }

    // 4. Record login in history
    try {
      await db.pool.execute(
        "INSERT INTO admin_login_history (admin_id, ip_address, device) VALUES (?, ?, ?)",
        [user.id, req.ip || null, req.headers["user-agent"] || null],
      );
    } catch (historyErr) {
      console.error("Failed to record login history:", historyErr.message);
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || "Admin",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const [rows] = await db.pool.execute(
      "SELECT * FROM admins WHERE email = ?",
      [email],
    );
    if (rows.length === 0) {
      // For security, don't reveal if user exists. Just say link sent.
      return res.status(201).json({ message: "Reset link sent" });
    }

    // Generate a random token
    const token =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const expiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save token to DB (assumes columns reset_token and reset_token_expiry exist)
    await db.pool.execute(
      "UPDATE admins SET reset_token = ?, reset_token_expiry = ? WHERE id = ?",
      [token, expiry, rows[0].id],
    );

    // In a real app, send email here. For now, we just return success.
    console.log(`Reset token for ${email}: ${token}`);

    res.status(201).json({ message: "Reset link sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    return res.status(400).json({ message: "Token and new password required" });

  try {
    const [rows] = await db.pool.execute(
      "SELECT * FROM admins WHERE reset_token = ? AND reset_token_expiry > NOW()",
      [token],
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.pool.execute(
      "UPDATE admins SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?",
      [hashedPassword, rows[0].id],
    );

    res.status(201).json({ message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const adminId = req.user.id;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  try {
    const [rows] = await db.pool.execute(
      "SELECT password FROM admins WHERE id = ?",
      [adminId],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.pool.execute("UPDATE admins SET password = ? WHERE id = ?", [
      hashedPassword,
      adminId,
    ]);

    res.status(201).json({ message: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.logout = async (req, res) => {
  // In a JWT setup, logout is mainly handled by the client clearing the token.
  // We can log the event here if needed.
  res.status(201).json({ message: "Logout successful" });
};
