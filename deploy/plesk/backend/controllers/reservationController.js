const db = require("../config/db");

// --- Helpers ---

function formatReservationId(id) {
  return `HZ${String(id).padStart(6, "0")}`;
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

function mapReservationStatus(status) {
  const map = {
    PENDING: "Pending",
    MATCHED: "Arriving",
    ACCEPTED: "Accepted",
    IN_PROGRESS: "In_progress",
    COMPLETED: "Completed",
    CANCELLED: "Missed",
  };
  return map[status] || status;
}

function mapVehicleType(serviceTypeName) {
  const map = {
    CAR_RIDES: "Car Ride",
    MOTORCYCLE: "Motorcycle",
    TAXI: "Taxi",
  };
  return map[serviceTypeName] || "Car Ride";
}

function mapServiceType(serviceTypeName) {
  const services = ["Airport", "Car Ride", "City to City", "Delivery"];
  if (!serviceTypeName) return "Car Ride";
  const map = {
    CAR_RIDES: "Car Ride",
    MOTORCYCLE: "City to City",
    TAXI: "Airport",
  };
  return map[serviceTypeName] || services[0];
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

// GET /api/admin/reservations/stats
async function getReservationStats(req, res) {
  try {
    const { period, cityId, serviceTypeId } = req.query;

    let conditions = ["1=1"];
    const params = [];

    if (period) {
      conditions.push(buildPeriodFilter(period, "t.created_at"));
    }
    if (cityId) {
      conditions.push("t.city_id = ?");
      params.push(cityId);
    }
    if (serviceTypeId) {
      conditions.push("t.service_type_id = ?");
      params.push(serviceTypeId);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const [rows] = await db.pool.execute(
      `SELECT
        COUNT(*) AS totalReservations,
        SUM(CASE WHEN t.status IN ('PENDING','MATCHED') THEN 1 ELSE 0 END) AS scheduled,
        SUM(CASE WHEN t.status IN ('ACCEPTED','COMPLETED') THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN DATE(t.created_at) = CURDATE() THEN 1 ELSE 0 END) AS todaysBookings
      FROM trips t
      ${whereClause}`,
      params,
    );

    res.json({
      totalReservations: Number(rows[0].totalReservations),
      scheduled: Number(rows[0].scheduled),
      confirmed: Number(rows[0].confirmed),
      todaysBookings: Number(rows[0].todaysBookings),
    });
  } catch (err) {
    console.error("getReservationStats error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/admin/reservations/filters/cities
async function getReservationCities(req, res) {
  try {
    const [rows] = await db.pool.execute(
      `SELECT id, name FROM cities WHERE status = 'active' ORDER BY name ASC`,
    );
    res.json(rows);
  } catch (err) {
    console.error("getReservationCities error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/admin/reservations/filters/service-types
async function getReservationServiceTypes(req, res) {
  try {
    const [rows] = await db.pool.execute(
      `SELECT id, name, display_name AS displayName
       FROM service_types
       WHERE is_active = 1 AND name != 'RENTAL_CARS'
       ORDER BY id ASC`,
    );
    res.json(rows);
  } catch (err) {
    console.error("getReservationServiceTypes error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/admin/reservations/list
async function getReservationList(req, res) {
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

    let conditions = ["1=1"];
    const params = [];

    if (period) {
      conditions.push(buildPeriodFilter(period, "t.created_at"));
    }
    if (status) {
      const statuses = String(status)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      if (statuses.length === 1) {
        conditions.push("t.status = ?");
        params.push(statuses[0]);
      } else if (statuses.length > 1) {
        conditions.push(`t.status IN (${statuses.map(() => "?").join(", ")})`);
        params.push(...statuses);
      }
    }
    if (cityId) {
      conditions.push("t.city_id = ?");
      params.push(cityId);
    }
    if (serviceTypeId) {
      conditions.push("t.service_type_id = ?");
      params.push(serviceTypeId);
    }
    if (search) {
      conditions.push(
        "(CONCAT('HZ', LPAD(t.id, 6, '0')) LIKE ? OR r.name LIKE ? OR d.name LIKE ?)",
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const [countResult] = await db.pool.execute(
      `SELECT COUNT(*) AS total
       FROM trips t
       LEFT JOIN riders r ON t.rider_id = r.id
       LEFT JOIN drivers d ON t.driver_id = d.id
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

    const reservations = rows.map((row) => ({
      id: formatReservationId(row.id),
      numericId: row.id,
      customer: {
        name: row.riderName || "Unknown",
        id: formatDisplayId("R", row.riderId),
        avatar: row.riderImage || null,
        rating: parseFloat(row.riderRating) || 0,
        phone: row.riderPhone || "",
        email: row.riderEmail || "",
        city: row.riderCity || "Casablanca",
        gender: row.riderGender === "FEMALE" ? "Female" : "Male",
        category: mapServiceType(row.serviceTypeName),
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
      serviceType: mapServiceType(row.serviceTypeName),
      vehicleType: mapVehicleType(row.serviceTypeName),
      status: mapReservationStatus(row.status),
      fare: row.fare ? parseFloat(row.fare) : 0,
      currency: "MAD",
      startTime: formatTime(row.startTime || row.createdAt),
      endTime: formatTime(row.endTime),
      distance: row.distance ? `${row.distance}km` : "—",
      scheduleDate: formatDate(row.startTime || row.createdAt),
      scheduleTime: formatTime(row.startTime || row.createdAt),
      pickup: row.pickup || "—",
      destination: row.dropoff || "—",
      paymentMethod: row.paymentMethod || "Cash",
      tva: "1%",
      serviceFee: 0,
      discount: "0%",
      archivedDate: "",
      archiveReason: "",
    }));

    res.json({
      reservations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("getReservationList error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/admin/reservations/:id
async function getReservationDetail(req, res) {
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
        t.archived_at AS archivedAt,
        t.archive_reason AS archiveReason,
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
      return res.status(404).json({ message: "Reservation not found" });
    }

    const row = rows[0];

    res.json({
      id: formatReservationId(row.id),
      numericId: row.id,
      customer: {
        name: row.riderName || "Unknown",
        id: formatDisplayId("R", row.riderId),
        avatar: row.riderImage || null,
        rating: parseFloat(row.riderRating) || 0,
        phone: row.riderPhone || "",
        email: row.riderEmail || "",
        city: row.riderCity || "Casablanca",
        gender: row.riderGender === "FEMALE" ? "Female" : "Male",
        category: mapServiceType(row.serviceTypeName),
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
      serviceType: mapServiceType(row.serviceTypeName),
      vehicleType: mapVehicleType(row.serviceTypeName),
      status: mapReservationStatus(row.status),
      fare: row.fare ? parseFloat(row.fare) : 0,
      currency: "MAD",
      startTime: formatTime(row.startTime || row.createdAt),
      endTime: formatTime(row.endTime),
      distance: row.distance ? `${row.distance}km` : "—",
      scheduleDate: formatDate(row.startTime || row.createdAt),
      scheduleTime: formatTime(row.startTime || row.createdAt),
      pickup: row.pickup || "—",
      destination: row.dropoff || "—",
      paymentMethod: row.paymentMethod || "Cash",
      tva: "1%",
      serviceFee: 0,
      discount: "0%",
      archivedDate: row.archivedAt
        ? new Date(row.archivedAt).toISOString().replace("T", " ").slice(0, 16)
        : "",
      archiveReason: row.archiveReason || "",
      vehicle: {
        driverId: formatDisplayId("D", row.driverId),
        colour: "White",
        licencePlate: "8 | i | 26363",
        makeModel: "Dacia Logan",
        year: "2020",
        joinDate: row.driverJoinDate
          ? formatDate(row.driverJoinDate)
          : "2023-01-15",
      },
    });
  } catch (err) {
    console.error("getReservationDetail error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  getReservationStats,
  getReservationCities,
  getReservationServiceTypes,
  getReservationList,
  getReservationDetail,
};
