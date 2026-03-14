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

  // Login verification is intentionally env-only.
  const adminEmail = String(process.env.ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || "");

  if (!adminEmail || !adminPassword) {
    return res.status(500).json({
      message: "Admin credentials are not configured in environment variables",
    });
  }

  if (submittedEmail !== adminEmail || submittedPassword !== adminPassword) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  try {
    const token = jwt.sign(
      {
        id: 1,
        email: adminEmail,
        name: process.env.ADMIN_NAME || "Admin",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: 1,
        name: process.env.ADMIN_NAME || "Admin",
        email: adminEmail,
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
