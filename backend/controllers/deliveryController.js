const db = require("../config/db");

// --- Helpers ---

function formatTripId(id) {
  return `T-${String(id).padStart(5, "0")}`;
}

function formatDeliveryId(id) {
  return `DEL-${String(id).padStart(5, "0")}`;
}

function formatDisplayId(prefix, id) {
  return `${prefix}-${String(id).padStart(5, "0")}`;
}

function formatTime(date) {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDate(date) {
  if (!date) return "—";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

function mapDeliveryStatus(status) {
  const map = {
    PENDING: "Pending",
    MATCHED: "Arriving",
    ACCEPTED: "Accepted",
    IN_PROGRESS: "In_progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  return map[status] || status;
}

function buildPeriodFilter(period, dateCol) {
  switch (period) {
    case "today":
      return `DATE(${dateCol}) = CURDATE()`;
    case "yesterday":
      return `DATE(${dateCol}) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`;
    case "last_week":
      return `${dateCol} >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;
    case "last_month":
      return `${dateCol} >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;
    default:
      return "1=1";
  }
}

// GET /api/admin/delivery/stats
async function getDeliveryStats(req, res) {
  try {
    const { period, cityId } = req.query;

    let conditions = ["1=1"];
    const params = [];

    if (period) {
      conditions.push(buildPeriodFilter(period, "t.created_at"));
    }
    if (cityId) {
      conditions.push("t.city_id = ?");
      params.push(cityId);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const [rows] = await db.pool.execute(
      `SELECT
        COUNT(*) AS totalDeliveries,
        SUM(CASE WHEN t.status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN t.status = 'ACCEPTED' THEN 1 ELSE 0 END) AS accepted,
        SUM(CASE WHEN t.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled
      FROM trips t
      ${whereClause}`,
      params,
    );

    res.json({
      totalDeliveries: Number(rows[0].totalDeliveries),
      pending: Number(rows[0].pending),
      accepted: Number(rows[0].accepted),
      cancelled: Number(rows[0].cancelled),
    });
  } catch (err) {
    console.error("getDeliveryStats error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/admin/delivery/list
async function getDeliveryList(req, res) {
  try {
    const {
      search,
      status,
      serviceType,
      paymentMethod,
      cityId,
      period,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    let conditions = ["1=1"];
    const params = [];

    if (period) {
      conditions.push(buildPeriodFilter(period, "t.created_at"));
    }
    if (status) {
      conditions.push("t.status = ?");
      params.push(status);
    }
    if (serviceType) {
      conditions.push("st.name = ?");
      params.push(serviceType);
    }
    if (paymentMethod) {
      conditions.push("t.payment_method = ?");
      params.push(paymentMethod);
    }
    if (cityId) {
      conditions.push("t.city_id = ?");
      params.push(cityId);
    }
    if (search) {
      conditions.push(
        "(CONCAT('T-', LPAD(t.id, 5, '0')) LIKE ? OR r.name LIKE ? OR d.name LIKE ?)",
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const [countResult] = await db.pool.execute(
      `SELECT COUNT(*) AS total
       FROM trips t
       LEFT JOIN riders r ON t.rider_id = r.id
       LEFT JOIN drivers d ON t.driver_id = d.id
       LEFT JOIN service_types st ON t.service_type_id = st.id
       ${whereClause}`,
      params,
    );
    const total = Number(countResult[0].total);

    const dataParams = [...params, String(limitNum), String(offset)];
    const [rows] = await db.pool.execute(
      `SELECT
        t.id,
        t.status,
        t.estimated_price AS fare,
        t.payment_method AS paymentMethod,
        t.start_time AS startTime,
        t.end_time AS endTime,
        t.distance,
        t.pickup_address AS pickup,
        t.dropoff_address AS dropoff,
        t.created_at AS createdAt,
        st.name AS serviceTypeName,
        st.display_name AS serviceDisplayName,
        r.id AS riderId,
        r.name AS riderName,
        r.image_url AS riderImage,
        r.rating AS riderRating,
        r.phone AS riderPhone,
        r.email AS riderEmail,
        r.gender AS riderGender,
        c_r.name AS riderCity,
        d.id AS driverId,
        d.name AS driverName,
        d.image_url AS driverImage,
        d.rating AS driverRating,
        d.phone AS driverPhone,
        d.email AS driverEmail,
        d.gender AS driverGender,
        c_d.name AS driverCity
      FROM trips t
      LEFT JOIN riders r ON t.rider_id = r.id
      LEFT JOIN drivers d ON t.driver_id = d.id
      LEFT JOIN service_types st ON t.service_type_id = st.id
      LEFT JOIN cities c_r ON r.city_id = c_r.id
      LEFT JOIN cities c_d ON d.city_id = c_d.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?`,
      dataParams,
    );

    const deliveries = rows.map((row) => ({
      id: formatTripId(row.id),
      numericId: row.id,
      serviceType: row.serviceDisplayName || "Regular Ride",
      rider: {
        name: row.riderName || "Unknown",
        id: formatDisplayId("R", row.riderId),
        avatar: row.riderImage || null,
        rating: parseFloat(row.riderRating) || 0,
        phone: row.riderPhone || "",
        email: row.riderEmail || "",
        city: row.riderCity || "Casablanca",
        gender: row.riderGender === "FEMALE" ? "Female" : "Male",
        category: "Hezzni Standard",
      },
      driver: {
        name: row.driverName || "Unknown",
        id: formatDisplayId("D", row.driverId),
        avatar: row.driverImage || null,
        rating: parseFloat(row.driverRating) || 0,
        phone: row.driverPhone || "",
        email: row.driverEmail || "",
        city: row.driverCity || "Casablanca",
        gender: row.driverGender === "FEMALE" ? "Female" : "Male",
      },
      vehicleType: "Delivery",
      status: mapDeliveryStatus(row.status),
      fare: row.fare ? parseFloat(row.fare) : 0,
      currency: "MAD",
      paymentMethod: row.paymentMethod || "Cash",
      deliveryId: formatDeliveryId(row.id),
      sendingDescription: "Important business contracts",
      weight: "0.5 kg",
      vehicleInfo: {
        brand: "Hezzni Standard",
        plate: "12345-A-6",
        transmission: "Manual",
        model: "Dacia Logan",
        color: "White",
        year: "2020",
        joinDate: "2023-01-15",
      },
      pickup: row.pickup || "—",
      destination: row.dropoff || "—",
      tva: "1%",
      serviceFee: 0,
      discount: "0%",
      startTime: formatTime(row.startTime || row.createdAt),
      endTime: formatTime(row.endTime),
      distance: row.distance ? `${row.distance}km` : "—",
      scheduleDate: formatDate(row.startTime || row.createdAt),
      scheduleTime: formatTime(row.startTime || row.createdAt),
    }));

    res.json({
      deliveries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("getDeliveryList error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/admin/delivery/details/:id
async function getDeliveryDetail(req, res) {
  try {
    const { id } = req.params;
    const numericId = String(id).replace(/\D/g, "");

    const [rows] = await db.pool.execute(
      `SELECT
        t.id,
        t.status,
        t.estimated_price AS fare,
        t.payment_method AS paymentMethod,
        t.start_time AS startTime,
        t.end_time AS endTime,
        t.distance,
        t.pickup_address AS pickup,
        t.dropoff_address AS dropoff,
        t.created_at AS createdAt,
        st.name AS serviceTypeName,
        st.display_name AS serviceDisplayName,
        r.id AS riderId,
        r.name AS riderName,
        r.email AS riderEmail,
        r.phone AS riderPhone,
        r.image_url AS riderImage,
        r.gender AS riderGender,
        r.rating AS riderRating,
        c_r.name AS riderCity,
        d.id AS driverId,
        d.name AS driverName,
        d.email AS driverEmail,
        d.phone AS driverPhone,
        d.image_url AS driverImage,
        d.gender AS driverGender,
        d.rating AS driverRating,
        d.joined_date AS driverJoinDate,
        c_d.name AS driverCity
      FROM trips t
      LEFT JOIN riders r ON t.rider_id = r.id
      LEFT JOIN drivers d ON t.driver_id = d.id
      LEFT JOIN service_types st ON t.service_type_id = st.id
      LEFT JOIN cities c_r ON r.city_id = c_r.id
      LEFT JOIN cities c_d ON d.city_id = c_d.id
      WHERE t.id = ?`,
      [numericId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    const row = rows[0];

    res.json({
      id: formatTripId(row.id),
      numericId: row.id,
      serviceType: row.serviceDisplayName || "Regular Ride",
      rider: {
        name: row.riderName || "Unknown",
        id: formatDisplayId("R", row.riderId),
        avatar: row.riderImage || null,
        rating: parseFloat(row.riderRating) || 0,
        phone: row.riderPhone || "",
        email: row.riderEmail || "",
        city: row.riderCity || "Casablanca",
        gender: row.riderGender === "FEMALE" ? "Female" : "Male",
        category: "Hezzni Standard",
      },
      driver: {
        name: row.driverName || "Unknown",
        id: formatDisplayId("D", row.driverId),
        avatar: row.driverImage || null,
        rating: parseFloat(row.driverRating) || 0,
        phone: row.driverPhone || "",
        email: row.driverEmail || "",
        city: row.driverCity || "Casablanca",
        gender: row.driverGender === "FEMALE" ? "Female" : "Male",
      },
      vehicleType: "Delivery",
      status: mapDeliveryStatus(row.status),
      fare: row.fare ? parseFloat(row.fare) : 0,
      currency: "MAD",
      paymentMethod: row.paymentMethod || "Cash",
      deliveryId: formatDeliveryId(row.id),
      sendingDescription: "Important business contracts",
      weight: "0.5 kg",
      vehicleInfo: {
        brand: "Hezzni Standard",
        plate: "12345-A-6",
        transmission: "Manual",
        model: "Dacia Logan",
        color: "White",
        year: "2020",
        joinDate: row.driverJoinDate
          ? formatDate(row.driverJoinDate)
          : "2023-01-15",
      },
      pickup: row.pickup || "—",
      destination: row.dropoff || "—",
      tva: "1%",
      serviceFee: 0,
      discount: "0%",
      startTime: formatTime(row.startTime || row.createdAt),
      endTime: formatTime(row.endTime),
      distance: row.distance ? `${row.distance}km` : "—",
      scheduleDate: formatDate(row.startTime || row.createdAt),
      scheduleTime: formatTime(row.startTime || row.createdAt),
    });
  } catch (err) {
    console.error("getDeliveryDetail error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/admin/delivery/top-drivers
async function getTopDrivers(req, res) {
  try {
    const { limit = 12 } = req.query;
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 12));

    const [rows] = await db.pool.execute(
      `SELECT
        d.id,
        d.name,
        d.image_url AS avatar,
        d.rating,
        c.name AS city,
        COUNT(t.id) AS trips
      FROM drivers d
      LEFT JOIN trips t ON t.driver_id = d.id
      LEFT JOIN cities c ON d.city_id = c.id
      GROUP BY d.id
      ORDER BY trips DESC
      LIMIT ?`,
      [String(limitNum)],
    );

    const drivers = rows.map((row) => ({
      id: formatDisplayId("D", row.id),
      name: row.name || "Unknown",
      location: row.city || "Unknown",
      trips: Number(row.trips),
      avatar: row.avatar || null,
      rating: parseFloat(row.rating) || 0,
      type: "Driver",
      vehicleIcon: true,
    }));

    res.json(drivers);
  } catch (err) {
    console.error("getTopDrivers error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/admin/delivery/top-riders
async function getTopRiders(req, res) {
  try {
    const { limit = 12 } = req.query;
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 12));

    const [rows] = await db.pool.execute(
      `SELECT
        r.id,
        r.name,
        r.image_url AS avatar,
        r.rating,
        c.name AS city,
        COUNT(t.id) AS trips
      FROM riders r
      LEFT JOIN trips t ON t.rider_id = r.id
      LEFT JOIN cities c ON r.city_id = c.id
      GROUP BY r.id
      ORDER BY trips DESC
      LIMIT ?`,
      [String(limitNum)],
    );

    const riders = rows.map((row) => ({
      id: formatDisplayId("R", row.id),
      name: row.name || "Unknown",
      location: row.city || "Unknown",
      trips: Number(row.trips),
      avatar: row.avatar || null,
      rating: parseFloat(row.rating) || 0,
      type: "Rider",
      vehicleIcon: false,
    }));

    res.json(riders);
  } catch (err) {
    console.error("getTopRiders error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  getDeliveryStats,
  getDeliveryList,
  getDeliveryDetail,
  getTopDrivers,
  getTopRiders,
};
