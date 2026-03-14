const db = require("../config/db");

// GET /api/admin/trips/stats — KPI Cards
async function getTripsStats(req, res) {
  try {
    const { period = "today", cityId, serviceTypeId } = req.query;

    const { dateCondition, params } = buildPeriodFilter(period);
    const { condition: cityCondition, params: cityParams } =
      buildOptionalFilter("t.city_id", cityId);
    const { condition: serviceCondition, params: serviceParams } =
      buildOptionalFilter("t.service_type_id", serviceTypeId);

    const allParams = [...params, ...cityParams, ...serviceParams];
    const whereClause = `WHERE ${dateCondition}${cityCondition}${serviceCondition}`;

    const [rows] = await db.pool.execute(
      `SELECT
        COUNT(*) AS totalArchived,
        SUM(CASE WHEN t.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN t.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
        CAST(COALESCE(SUM(CASE WHEN t.status = 'COMPLETED' THEN t.estimated_price ELSE 0 END), 0) AS DECIMAL(10,2)) AS totalEarnings
      FROM trips t
      ${whereClause}`,
      allParams,
    );

    // Get commission percentage from settings
    const [settings] = await db.pool.execute(
      `SELECT value_content FROM settings WHERE key_name = 'commission_percentage'`,
    );
    const commissionPercent =
      settings.length > 0 ? parseFloat(settings[0].value_content) : 15;
    const earned =
      parseFloat(rows[0].totalEarnings || 0) * (commissionPercent / 100);

    res.json({
      totalArchived: Number(rows[0].totalArchived),
      completed: Number(rows[0].completed),
      cancelled: Number(rows[0].cancelled),
      totalEarnings: parseFloat(rows[0].totalEarnings),
      commission: {
        percentage: commissionPercent,
        earned: Math.round(earned * 100) / 100,
      },
    });
  } catch (err) {
    console.error("getTripsStats error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/admin/trips — Paginated List
async function getTrips(req, res) {
  try {
    const {
      search,
      status,
      cityId,
      serviceTypeId,
      period,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    let conditions = [];
    let params = [];

    // Period filter
    if (period) {
      const pf = buildPeriodFilter(period);
      conditions.push(pf.dateCondition);
      params.push(...pf.params);
    }

    // Status filter
    if (status) {
      conditions.push("t.status = ?");
      params.push(status);
    }

    // City filter
    if (cityId) {
      conditions.push("t.city_id = ?");
      params.push(cityId);
    }

    // Service type filter
    if (serviceTypeId) {
      conditions.push("t.service_type_id = ?");
      params.push(serviceTypeId);
    }

    // Search filter — search by trip ID, rider name, or driver name
    if (search) {
      const tripIdPattern = `T-${search.replace(/^T-/i, "").padStart(5, "0")}`;
      conditions.push(
        "(CONCAT('T-', LPAD(t.id, 5, '0')) LIKE ? OR r.name LIKE ? OR d.name LIKE ?)",
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count total
    const [countResult] = await db.pool.execute(
      `SELECT COUNT(*) AS total
       FROM trips t
       LEFT JOIN riders r ON t.rider_id = r.id
       LEFT JOIN drivers d ON t.driver_id = d.id
       ${whereClause}`,
      params,
    );
    const total = Number(countResult[0].total);

    // Get paginated data
    const dataParams = [...params, String(limitNum), String(offset)];
    const [rows] = await db.pool.execute(
      `SELECT
        t.id,
        t.status,
        t.estimated_price AS fare,
        t.payment_method AS paymentMethod,
        t.start_time AS startTime,
        t.duration_minutes AS duration,
        t.created_at AS createdAt,
        st.name AS serviceTypeName,
        st.display_name AS serviceDisplayName,
        r.id AS riderId,
        r.name AS riderName,
        r.image_url AS riderImage,
        COALESCE(r.total_trips, 0) AS riderRating,
        d.id AS driverId,
        d.name AS driverName,
        d.image_url AS driverImage,
        d.rating AS driverRating,
        CASE
          WHEN st.name = 'MOTORCYCLE' THEN 'Motorcycle'
          WHEN st.name = 'TAXI' THEN 'Taxi'
          ELSE 'Car'
        END AS vehicleType
      FROM trips t
      LEFT JOIN riders r ON t.rider_id = r.id
      LEFT JOIN drivers d ON t.driver_id = d.id
      LEFT JOIN service_types st ON t.service_type_id = st.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?`,
      dataParams,
    );

    const trips = rows.map((row) => ({
      id: formatTripId(row.id),
      service: row.serviceDisplayName || row.serviceTypeName || "Unknown",
      rider: {
        name: row.riderName || "Unknown",
        id: `R-${String(row.riderId).padStart(5, "0")}`,
        rating: parseFloat(row.driverRating) || 0, // rider rating derived from trips
        img: row.riderImage || null,
      },
      driver: {
        name: row.driverName || "Unknown",
        id: `D-${String(row.driverId).padStart(5, "0")}`,
        rating: parseFloat(row.driverRating) || 0,
        img: row.driverImage || null,
      },
      vehicle: row.vehicleType,
      time: row.startTime
        ? formatTime(row.startTime)
        : formatTime(row.createdAt),
      duration: row.duration ? `${row.duration} min` : "—",
      status: mapStatus(row.status),
      fare: row.fare ? `${parseFloat(row.fare).toFixed(2)} MAD` : "0.00 MAD",
      paymentMethod: row.paymentMethod || "cash",
    }));

    res.json({
      trips,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("getTrips error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/admin/trips/:tripId — Trip Detail (Preview Popup)
async function getTripById(req, res) {
  try {
    const { tripId } = req.params;

    const [rows] = await db.pool.execute(
      `SELECT
        t.id,
        t.status,
        t.estimated_price AS fare,
        t.amount,
        t.payment_method AS paymentMethod,
        t.start_time AS startTime,
        t.end_time AS endTime,
        t.distance,
        t.duration_minutes AS duration,
        t.pickup_address AS pickupAddress,
        t.dropoff_address AS dropoffAddress,
        t.created_at AS createdAt,
        st.name AS serviceTypeName,
        st.display_name AS serviceDisplayName,
        r.id AS riderId,
        r.name AS riderName,
        r.email AS riderEmail,
        r.phone AS riderPhone,
        r.image_url AS riderImage,
        r.gender AS riderGender,
        c_r.name AS riderCity,
        d.id AS driverId,
        d.name AS driverName,
        d.email AS driverEmail,
        d.phone AS driverPhone,
        d.image_url AS driverImage,
        d.gender AS driverGender,
        d.rating AS driverRating,
        d.joined_date AS driverJoinDate,
        c_d.name AS driverCity,
        CASE
          WHEN st.name = 'MOTORCYCLE' THEN 'Motorcycle'
          WHEN st.name = 'TAXI' THEN 'Taxi'
          ELSE 'Car'
        END AS vehicleType
      FROM trips t
      LEFT JOIN riders r ON t.rider_id = r.id
      LEFT JOIN drivers d ON t.driver_id = d.id
      LEFT JOIN service_types st ON t.service_type_id = st.id
      LEFT JOIN cities c_r ON r.city_id = c_r.id
      LEFT JOIN cities c_d ON d.city_id = c_d.id
      WHERE t.id = ?`,
      [tripId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const row = rows[0];

    res.json({
      tripInfo: {
        id: formatTripId(row.id),
        startTime: row.startTime || row.createdAt,
        endTime: row.endTime || null,
        distance: row.distance ? `${row.distance}km` : null,
        status: mapStatus(row.status),
      },
      passenger: {
        fullName: row.riderName || "Unknown",
        customerId: `R-${String(row.riderId).padStart(5, "0")}`,
        category: row.serviceDisplayName || row.serviceTypeName || "Unknown",
        gender: row.riderGender || null,
        email: row.riderEmail || null,
        phone: row.riderPhone || null,
        city: row.riderCity || null,
        imageUrl: row.riderImage || null,
        rating: null,
      },
      driver: {
        fullName: row.driverName || "Unknown",
        driverId: `D-${String(row.driverId).padStart(5, "0")}`,
        vehicleType: row.vehicleType,
        gender: row.driverGender || null,
        email: row.driverEmail || null,
        phone: row.driverPhone || null,
        city: row.driverCity || null,
        imageUrl: row.driverImage || null,
        rating: parseFloat(row.driverRating) || 0,
      },
      vehicle: {
        driverId: `D-${String(row.driverId).padStart(5, "0")}`,
        colour: null,
        licencePlate: null,
        makeModel: null,
        year: null,
        joinDate: row.driverJoinDate || null,
      },
      route: {
        pickupAddress: row.pickupAddress || null,
        dropoffAddress: row.dropoffAddress || null,
      },
      payment: {
        method: row.paymentMethod || null,
        totalAmount:
          row.fare !== null && row.fare !== undefined
            ? `${parseFloat(row.fare).toFixed(2)} MAD`
            : null,
        tva: null,
        serviceFee: null,
        discount: null,
      },
    });
  } catch (err) {
    console.error("getTripById error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// --- Helpers ---

function formatTripId(id) {
  return `T-${String(id).padStart(5, "0")}`;
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

function mapStatus(status) {
  const map = {
    PENDING: "Searching",
    MATCHED: "Searching",
    ACCEPTED: "Accepted",
    IN_PROGRESS: "In_progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  return map[status] || status;
}

function buildPeriodFilter(period) {
  const now = new Date();
  let dateCondition = "";
  let params = [];

  switch (period) {
    case "today":
      dateCondition = "DATE(t.created_at) = CURDATE()";
      break;
    case "yesterday":
      dateCondition =
        "DATE(t.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)";
      break;
    case "last_week":
      dateCondition = "t.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
      break;
    case "last_month":
      dateCondition = "t.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
      break;
    default:
      dateCondition = "1=1";
  }

  return { dateCondition, params };
}

function buildOptionalFilter(column, value) {
  if (!value) return { condition: "", params: [] };
  return { condition: ` AND ${column} = ?`, params: [value] };
}

module.exports = {
  getTripsStats,
  getTrips,
  getTripById,
};
