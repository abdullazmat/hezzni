const db = require("../config/db");

// --- Helpers ---
function formatRiderId(id) {
  return `T-${String(id).padStart(5, "0")}`;
}

function mapRiderStatus(status) {
  const map = { active: "Active", blocked: "Suspended" };
  return map[status] || status;
}

// GET /api/admin/rider/stats
exports.getRiderStats = async (req, res) => {
  try {
    const [rows] = await db.pool.execute(`
      SELECT
        COUNT(*) AS totalRiders,
        AVG(CASE WHEN r.total_trips > 0 THEN COALESCE(r.rating, 0) END) AS avgRating,
        SUM(CASE WHEN r.status = 'active' THEN 1 ELSE 0 END) AS activeRiders,
        SUM(r.total_spent) AS totalSpent
      FROM riders r
    `);

    res.json({
      totalRiders: rows[0].totalRiders || 0,
      avgRating: rows[0].avgRating
        ? Number(rows[0].avgRating).toFixed(1)
        : "0.0",
      activeNow: rows[0].activeRiders || 0,
      totalSpent: Math.round(Number(rows[0].totalSpent || 0)),
    });
  } catch (err) {
    console.error("getRiderStats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/rider/list
exports.getRiderList = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = ["1=1"];
    const params = [];

    if (status && status !== "All") {
      const statusMap = { Active: "active", Suspended: "blocked" };
      conditions.push("r.status = ?");
      params.push(statusMap[status] || status);
    }
    if (search) {
      conditions.push("(r.name LIKE ? OR r.email LIKE ? OR r.phone LIKE ?)");
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const whereClause = conditions.join(" AND ");

    const [countRows] = await db.pool.execute(
      `SELECT COUNT(*) AS total FROM riders r WHERE ${whereClause}`,
      params,
    );

    const [rows] = await db.pool.execute(
      `SELECT r.*, c.name AS city_name
       FROM riders r
       LEFT JOIN cities c ON r.city_id = c.id
       WHERE ${whereClause}
       ORDER BY r.id DESC
       LIMIT ${parseInt(limit)} OFFSET ${offset}`,
      params,
    );

    const riders = rows.map((r) => ({
      id: r.id,
      idNumber: formatRiderId(r.id),
      name: r.name,
      phone: r.phone || "",
      email: r.email,
      avatar: r.image_url || null,
      rating: r.rating || 0,
      location: r.location || "Casablanca",
      city: r.city_name || r.location || "Casablanca",
      totalTrips: r.total_trips || 0,
      totalSpent: Number(r.total_spent || 0),
      status: mapRiderStatus(r.status),
      joinDate: r.joined_date,
      isVerified: !!r.is_verified,
    }));

    res.json({
      riders,
      total: countRows[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error("getRiderList error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/rider/detail/:id
exports.getRiderDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.pool.execute(
      `SELECT r.*, c.name AS city_name
       FROM riders r
       LEFT JOIN cities c ON r.city_id = c.id
       WHERE r.id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Rider not found" });
    }

    const r = rows[0];

    res.json({
      id: r.id,
      idNumber: formatRiderId(r.id),
      name: r.name,
      phone: r.phone || "",
      email: r.email,
      avatar: r.image_url || null,
      rating: r.rating || 0,
      location: r.location || "Casablanca",
      city: r.city_name || r.location || "Casablanca",
      region: r.location || "Casablanca",
      totalTrips: r.total_trips || 0,
      totalSpent: Number(r.total_spent || 0),
      status: mapRiderStatus(r.status),
      joinDate: r.joined_date,
      isVerified: !!r.is_verified,
      gender: r.gender,
      dob: r.dob,
    });
  } catch (err) {
    console.error("getRiderDetail error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/admin/rider/suspend/:id
exports.suspendRider = async (req, res) => {
  try {
    const { id } = req.params;

    await db.pool.execute("UPDATE riders SET status = 'blocked' WHERE id = ?", [
      id,
    ]);

    res.status(201).json({ message: "Rider suspended successfully" });
  } catch (err) {
    console.error("suspendRider error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/admin/rider/activate/:id
exports.activateRider = async (req, res) => {
  try {
    const { id } = req.params;

    await db.pool.execute("UPDATE riders SET status = 'active' WHERE id = ?", [
      id,
    ]);

    res.status(201).json({ message: "Rider activated successfully" });
  } catch (err) {
    console.error("activateRider error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/admin/rider/update/:id
exports.updateRider = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, region, cityId } = req.body;

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push("name = ?");
      params.push(name);
    }
    if (phone !== undefined) {
      updates.push("phone = ?");
      params.push(phone);
    }
    if (email !== undefined) {
      updates.push("email = ?");
      params.push(email);
    }
    if (region !== undefined) {
      updates.push("location = ?");
      params.push(region);
    }
    if (cityId !== undefined) {
      updates.push("city_id = ?");
      params.push(cityId);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    params.push(id);
    await db.pool.execute(
      `UPDATE riders SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );

    res.json({ message: "Rider updated successfully" });
  } catch (err) {
    console.error("updateRider error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/rider/spending/:id
exports.getRiderSpending = async (req, res) => {
  try {
    const { id } = req.params;
    const { period = "monthly" } = req.query;

    let dateFormat, groupBy, dateRange;

    switch (period) {
      case "today":
        dateFormat = "%H:00";
        groupBy = "HOUR(t.created_at)";
        dateRange = "DATE(t.created_at) = CURDATE()";
        break;
      case "weekly":
        dateFormat = "%a";
        groupBy = "DAYOFWEEK(t.created_at)";
        dateRange = "t.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
        break;
      case "monthly":
      default:
        dateFormat = "%b";
        groupBy = "MONTH(t.created_at)";
        dateRange = "t.created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)";
        break;
    }

    const [rows] = await db.pool.execute(
      `SELECT 
        DATE_FORMAT(t.created_at, '${dateFormat}') AS label,
        SUM(t.amount) AS spending,
        COUNT(*) AS tripCount
       FROM trips t
       WHERE t.rider_id = ? AND t.status = 'COMPLETED' AND ${dateRange}
       GROUP BY ${groupBy}
       ORDER BY MIN(t.created_at)`,
      [id],
    );

    const totalSpending = rows.reduce(
      (s, r) => s + (Number(r.spending) || 0),
      0,
    );
    const totalTrips = rows.reduce((s, r) => s + (Number(r.tripCount) || 0), 0);

    res.json({
      period,
      totalSpending: `${totalSpending.toFixed(2)} MAD`,
      totalTrips: String(totalTrips),
      data: rows.map((r) => ({
        label: r.label,
        value: Number(r.spending) || 0,
      })),
    });
  } catch (err) {
    console.error("getRiderSpending error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/rider/trips/:id
exports.getRiderTrips = async (req, res) => {
  try {
    const { id } = req.params;
    const { type = "all" } = req.query;

    let statusFilter = "";
    if (type === "completed") statusFilter = "AND t.status = 'COMPLETED'";
    else if (type === "cancelled") statusFilter = "AND t.status = 'CANCELLED'";

    const [rows] = await db.pool.execute(
      `SELECT t.*, d.name AS driver_name, d.image_url AS driver_avatar,
              st.name AS service_type_name
       FROM trips t
       LEFT JOIN drivers d ON t.driver_id = d.id
       LEFT JOIN service_types st ON t.service_type_id = st.id
       WHERE t.rider_id = ? ${statusFilter}
       ORDER BY t.created_at DESC
       LIMIT 50`,
      [id],
    );

    const trips = rows.map((t) => ({
      id: t.id,
      driverName: t.driver_name || "Unknown Driver",
      driverAvatar: t.driver_avatar || null,
      date: t.created_at,
      status: t.status,
      amount: `${Number(t.amount || 0).toFixed(0)} MAD`,
      pickupAddress: t.pickup_address || "—",
      dropoffAddress: t.dropoff_address || "—",
      distance: t.distance ? `${Number(t.distance).toFixed(1)} km` : "—",
      duration: t.duration_minutes ? `${t.duration_minutes} min` : "—",
      rating: t.rating || null,
    }));

    res.json({ trips });
  } catch (err) {
    console.error("getRiderTrips error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
