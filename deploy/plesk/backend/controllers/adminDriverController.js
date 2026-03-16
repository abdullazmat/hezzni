const db = require("../config/db");

// --- Helpers ---
function formatDriverId(id) {
  return `D-${String(id).padStart(5, "0")}`;
}

function mapServiceTypeName(id, name) {
  if (name) {
    const map = {
      CAR_RIDES: "Car",
      MOTORCYCLE: "Motorcycle",
      TAXI: "Taxi",
      RENTAL_CARS: "Rental",
    };
    return map[name] || name;
  }
  return "Car";
}

function mapDriverStatus(status) {
  const map = { active: "Active", pending: "Pending", blocked: "Suspended" };
  return map[status] || status;
}

// GET /api/admin/driver/stats
exports.getDriverStats = async (req, res) => {
  try {
    const [rows] = await db.pool.execute(`
      SELECT
        COUNT(*) AS totalDrivers,
        SUM(CASE WHEN st.name = 'TAXI' THEN 1 ELSE 0 END) AS taxiDrivers,
        SUM(CASE WHEN st.name = 'MOTORCYCLE' THEN 1 ELSE 0 END) AS motorcycleDrivers,
        SUM(CASE WHEN st.name = 'CAR_RIDES' OR st.name IS NULL THEN 1 ELSE 0 END) AS carDrivers,
        SUM(CASE WHEN st.name = 'RENTAL_CARS' THEN 1 ELSE 0 END) AS rentalDrivers
      FROM drivers d
      LEFT JOIN service_types st ON d.service_type_id = st.id
    `);

    res.json({
      taxiDrivers: rows[0].taxiDrivers || 0,
      motorcycleDrivers: rows[0].motorcycleDrivers || 0,
      carDrivers: rows[0].carDrivers || 0,
      rentalCompany: rows[0].rentalDrivers || 0,
      totalDrivers: rows[0].totalDrivers || 0,
    });
  } catch (err) {
    console.error("getDriverStats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/driver/list
exports.getDriverList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      search,
      serviceTypeId,
      cityId,
    } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = ["1=1"];
    const params = [];

    if (status && status !== "All") {
      const statusMap = {
        Active: "active",
        Suspended: "blocked",
        Pending: "pending",
      };
      conditions.push("d.status = ?");
      params.push(statusMap[status] || status);
    }
    if (serviceTypeId) {
      conditions.push("d.service_type_id = ?");
      params.push(serviceTypeId);
    }
    if (cityId) {
      conditions.push("d.city_id = ?");
      params.push(cityId);
    }
    if (search) {
      conditions.push("(d.name LIKE ? OR d.phone LIKE ? OR d.email LIKE ?)");
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const whereClause = conditions.join(" AND ");

    const [countRows] = await db.pool.execute(
      `SELECT COUNT(*) AS total FROM drivers d WHERE ${whereClause}`,
      params,
    );

    const [rows] = await db.pool.execute(
      `SELECT d.*, st.name AS service_type_name, st.display_name AS service_type_display,
              c.name AS city_name
       FROM drivers d
       LEFT JOIN service_types st ON d.service_type_id = st.id
       LEFT JOIN cities c ON d.city_id = c.id
       WHERE ${whereClause}
       ORDER BY d.id DESC
       LIMIT ${parseInt(limit)} OFFSET ${offset}`,
      params,
    );

    const drivers = rows.map((d) => ({
      id: d.id,
      idNumber: formatDriverId(d.id),
      name: d.name,
      phone: d.phone,
      email: d.email || "",
      avatar: d.image_url || null,
      rating: d.rating || 0,
      location: d.location || "Casablanca",
      city: d.city_name || d.location || "Casablanca",
      vehicleType: mapServiceTypeName(d.service_type_id, d.service_type_name),
      totalTrips: d.trips || 0,
      status: mapDriverStatus(d.status),
      joinDate: d.joined_date,
      isOnline: !!d.is_online,
      isVerified: !!d.is_verified,
      serviceTypeId: d.service_type_id,
    }));

    res.json({
      drivers,
      total: countRows[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error("getDriverList error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/driver/detail/:id
exports.getDriverDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.pool.execute(
      `SELECT d.*, st.name AS service_type_name, st.display_name AS service_type_display,
              c.name AS city_name
       FROM drivers d
       LEFT JOIN service_types st ON d.service_type_id = st.id
       LEFT JOIN cities c ON d.city_id = c.id
       WHERE d.id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const d = rows[0];

    // Get trip stats
    const [tripStats] = await db.pool.execute(
      `SELECT 
        COUNT(*) AS totalTrips,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelledTrips,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completedTrips,
        SUM(CASE WHEN status = 'ACCEPTED' THEN 1 ELSE 0 END) AS acceptedTrips
       FROM trips WHERE driver_id = ?`,
      [id],
    );

    const stats = tripStats[0];
    const total = stats.totalTrips || 1;
    const cancelRate =
      total > 0 ? Math.round((stats.cancelledTrips / total) * 100) : 0;
    const acceptRate =
      total > 0
        ? Math.round(
            ((stats.completedTrips + stats.acceptedTrips) / total) * 100,
          )
        : 0;

    res.json({
      id: d.id,
      idNumber: formatDriverId(d.id),
      name: d.name,
      phone: d.phone,
      email: d.email || "",
      avatar: d.image_url || null,
      rating: d.rating || 0,
      location: d.location || "Casablanca",
      city: d.city_name || d.location || "Casablanca",
      region: d.location || "Casablanca",
      vehicleType: mapServiceTypeName(d.service_type_id, d.service_type_name),
      serviceTypeName: d.service_type_display || "Car Rides",
      totalTrips: d.trips || 0,
      status: mapDriverStatus(d.status),
      joinDate: d.joined_date,
      isOnline: !!d.is_online,
      isVerified: !!d.is_verified,
      gender: d.gender,
      dob: d.dob,
      serviceTypeId: d.service_type_id,
      stats: {
        cancelationRate: `${cancelRate}%`,
        acceptanceRate: `${acceptRate}%`,
        totalTrips: stats.totalTrips || 0,
        completedTrips: stats.completedTrips || 0,
        cancelledTrips: stats.cancelledTrips || 0,
      },
      vehicleDetails: {
        brand: d.service_type_display || "Hezzni Standard",
        color: "White",
        plate: "—",
        model: "—",
        year: "—",
      },
    });
  } catch (err) {
    console.error("getDriverDetail error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/admin/driver/suspend/:id
exports.suspendDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, hours } = req.body;

    await db.pool.execute(
      "UPDATE drivers SET status = 'blocked' WHERE id = ?",
      [id],
    );

    res.status(201).json({ message: "Driver suspended successfully" });
  } catch (err) {
    console.error("suspendDriver error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/admin/driver/activate/:id
exports.activateDriver = async (req, res) => {
  try {
    const { id } = req.params;

    await db.pool.execute("UPDATE drivers SET status = 'active' WHERE id = ?", [
      id,
    ]);

    res.status(201).json({ message: "Driver activated successfully" });
  } catch (err) {
    console.error("activateDriver error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/admin/driver/update/:id
exports.updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, region, city, cityId } = req.body;

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
      `UPDATE drivers SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );

    res.json({ message: "Driver updated successfully" });
  } catch (err) {
    console.error("updateDriver error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/driver/earnings/:id
exports.getDriverEarnings = async (req, res) => {
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
        SUM(t.amount) AS earnings,
        COUNT(*) AS tripCount,
        SUM(t.duration_minutes) AS totalMinutes
       FROM trips t
       WHERE t.driver_id = ? AND t.status = 'COMPLETED' AND ${dateRange}
       GROUP BY ${groupBy}
       ORDER BY MIN(t.created_at)`,
      [id],
    );

    const totalEarnings = rows.reduce(
      (s, r) => s + (Number(r.earnings) || 0),
      0,
    );
    const totalTrips = rows.reduce((s, r) => s + (Number(r.tripCount) || 0), 0);
    const totalMinutes = rows.reduce(
      (s, r) => s + (Number(r.totalMinutes) || 0),
      0,
    );
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    res.json({
      period,
      totalEarnings: `${totalEarnings.toFixed(2)} MAD`,
      onlineTime: `${hours}h ${mins}m`,
      totalTrips: String(totalTrips),
      data: rows.map((r) => ({
        label: r.label,
        value: Number(r.earnings) || 0,
      })),
    });
  } catch (err) {
    console.error("getDriverEarnings error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/driver/trips/:id
exports.getDriverTrips = async (req, res) => {
  try {
    const { id } = req.params;
    const { type = "all" } = req.query;

    let statusFilter = "";
    if (type === "completed") statusFilter = "AND t.status = 'COMPLETED'";
    else if (type === "cancelled") statusFilter = "AND t.status = 'CANCELLED'";

    const [rows] = await db.pool.execute(
      `SELECT t.*, r.name AS rider_name, r.image_url AS rider_avatar,
              st.name AS service_type_name
       FROM trips t
       LEFT JOIN riders r ON t.rider_id = r.id
       LEFT JOIN service_types st ON t.service_type_id = st.id
       WHERE t.driver_id = ? ${statusFilter}
       ORDER BY t.created_at DESC
       LIMIT 50`,
      [id],
    );

    const trips = rows.map((t) => ({
      id: t.id,
      riderName: t.rider_name || "Unknown Rider",
      riderAvatar: t.rider_avatar || null,
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
    console.error("getDriverTrips error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/driver/preferences
exports.getDriverPreferences = async (req, res) => {
  try {
    const [rows] = await db.pool.execute(
      "SELECT id, name, display_name, is_active FROM service_types ORDER BY id",
    );

    res.json({
      categories: rows.map((r) => ({
        id: r.id,
        name: r.name,
        displayName: r.display_name,
        isActive: !!r.is_active,
      })),
    });
  } catch (err) {
    console.error("getDriverPreferences error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/admin/driver/update-preferences/:id
exports.updateDriverPreferences = async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceTypeId } = req.body;

    if (serviceTypeId !== undefined) {
      await db.pool.execute(
        "UPDATE drivers SET service_type_id = ? WHERE id = ?",
        [serviceTypeId, id],
      );
    }

    res.status(201).json({ message: "Preferences updated successfully" });
  } catch (err) {
    console.error("updateDriverPreferences error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
