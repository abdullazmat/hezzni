const db = require("../config/db");

// ──────────────────────────────────────────────────
// GET /api/admin/ride-assignment/stats  — KPI Cards
// ──────────────────────────────────────────────────
async function getStats(req, res) {
  try {
    // Waiting Customers – PENDING or MATCHED trips
    const [waitingRows] = await db.pool.execute(
      `SELECT COUNT(*) AS cnt FROM trips WHERE status IN ('PENDING','MATCHED')`,
    );

    // Available Drivers – online and available
    const [driverRows] = await db.pool.execute(
      `SELECT COUNT(*) AS cnt FROM drivers
       WHERE is_online = 1 AND is_available = 1 AND status = 'active'`,
    );

    // Active Assignments – manual, not completed/cancelled
    const [activeRows] = await db.pool.execute(
      `SELECT COUNT(*) AS cnt FROM trips
       WHERE is_manual_assignment = 1
         AND status NOT IN ('COMPLETED','CANCELLED')`,
    );

    // Completed Today – all trips completed since midnight
    const [completedRows] = await db.pool.execute(
      `SELECT COUNT(*) AS cnt FROM trips
       WHERE status = 'COMPLETED'
         AND DATE(end_time) = CURDATE()`,
    );

    res.json({
      waitingCustomers: Number(waitingRows[0].cnt),
      availableDrivers: Number(driverRows[0].cnt),
      activeAssignments: Number(activeRows[0].cnt),
      completedToday: Number(completedRows[0].cnt),
    });
  } catch (err) {
    console.error("ride-assignment getStats error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ──────────────────────────────────────────────────
// GET /api/admin/ride-assignment/preferences
// ──────────────────────────────────────────────────
async function getPreferences(req, res) {
  try {
    const [rows] = await db.pool.execute(
      `SELECT id, name, preference_key AS preferenceKey,
              description, base_price AS basePrice,
              passenger_service_id AS passengerServiceId
       FROM ride_preferences
       ORDER BY id`,
    );
    res.json(rows);
  } catch (err) {
    console.error("ride-assignment getPreferences error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ──────────────────────────────────────────────────
// GET /api/admin/ride-assignment/passenger-services
// ──────────────────────────────────────────────────
async function getPassengerServices(req, res) {
  try {
    const [rows] = await db.pool.execute(
      `SELECT id, name, icon_url AS iconUrl
       FROM passenger_services
       ORDER BY id`,
    );
    res.json(rows);
  } catch (err) {
    console.error("ride-assignment getPassengerServices error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ──────────────────────────────────────────────────
// GET /api/admin/ride-assignment/customers?search=
// ──────────────────────────────────────────────────
async function searchCustomers(req, res) {
  try {
    const { search } = req.query;
    let where = "WHERE 1=1";
    const params = [];

    if (search) {
      where += " AND (r.name LIKE ? OR r.email LIKE ? OR r.phone LIKE ?)";
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    const [rows] = await db.pool.execute(
      `SELECT r.id, r.name, r.email, r.phone, r.image_url AS imageUrl,
              r.total_trips AS totalTrips, r.rating, c.name AS city
       FROM riders r
       LEFT JOIN cities c ON r.city_id = c.id
       ${where}
       ORDER BY r.name
       LIMIT 20`,
      params,
    );

    res.json(
      rows.map((r) => ({
        id: r.id,
        displayId: `R-${String(r.id).padStart(5, "0")}`,
        name: r.name,
        email: r.email,
        phone: r.phone,
        imageUrl: r.imageUrl,
        rating: parseFloat(r.rating) || 0,
        totalTrips: Number(r.totalTrips),
        city: r.city || null,
      })),
    );
  } catch (err) {
    console.error("ride-assignment searchCustomers error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ──────────────────────────────────────────────────
// GET /api/admin/ride-assignment/drivers?search=&cityId=
// ──────────────────────────────────────────────────
async function searchDrivers(req, res) {
  try {
    const { search, cityId } = req.query;
    let where = "WHERE d.status = 'active'";
    const params = [];

    if (search) {
      where += " AND (d.name LIKE ? OR d.email LIKE ? OR d.phone LIKE ?)";
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }
    if (cityId) {
      where += " AND d.city_id = ?";
      params.push(cityId);
    }

    const [rows] = await db.pool.execute(
      `SELECT d.id, d.name, d.email, d.phone, d.image_url AS imageUrl,
              d.rating, d.trips, d.is_online AS isOnline,
              d.is_available AS isAvailable,
              c.name AS city,
              st.display_name AS serviceType
       FROM drivers d
       LEFT JOIN cities c ON d.city_id = c.id
       LEFT JOIN service_types st ON d.service_type_id = st.id
       ${where}
       ORDER BY d.name
       LIMIT 20`,
      params,
    );

    res.json(
      rows.map((r) => ({
        id: r.id,
        displayId: `D-${String(r.id).padStart(5, "0")}`,
        name: r.name,
        email: r.email,
        phone: r.phone,
        imageUrl: r.imageUrl,
        rating: parseFloat(r.rating) || 0,
        trips: Number(r.trips),
        isOnline: Boolean(r.isOnline),
        isAvailable: Boolean(r.isAvailable),
        city: r.city || null,
        serviceType: r.serviceType || null,
      })),
    );
  } catch (err) {
    console.error("ride-assignment searchDrivers error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ──────────────────────────────────────────────────
// GET /api/admin/ride-assignment/cities
// ──────────────────────────────────────────────────
async function getCities(req, res) {
  try {
    const [rows] = await db.pool.execute(
      `SELECT id, name FROM cities WHERE status = 'active' ORDER BY name`,
    );
    res.json(rows);
  } catch (err) {
    console.error("ride-assignment getCities error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ──────────────────────────────────────────────────
// GET /api/admin/ride-assignment/waiting-customers
// ──────────────────────────────────────────────────
async function getWaitingCustomers(req, res) {
  try {
    const [rows] = await db.pool.execute(
      `SELECT t.id AS tripId,
              t.status,
              t.estimated_price AS price,
              t.pickup_address AS pickupAddress,
              t.dropoff_address AS dropoffAddress,
              t.distance,
              t.created_at AS requestedAt,
              r.id AS riderId,
              r.name AS riderName,
              r.email AS riderEmail,
              r.phone AS riderPhone,
              r.image_url AS riderImage,
              r.rating AS riderRating,
              c.name AS city,
              rp.name AS category
       FROM trips t
       LEFT JOIN riders r ON t.rider_id = r.id
       LEFT JOIN cities c ON t.city_id = c.id
       LEFT JOIN ride_preferences rp ON t.service_type_id = rp.id
       WHERE t.status IN ('PENDING','MATCHED')
       ORDER BY t.created_at DESC`,
    );

    res.json(
      rows.map((row) => ({
        tripId: row.tripId,
        passengerId: row.riderId,
        displayId: `R-${String(row.riderId).padStart(5, "0")}`,
        name: row.riderName || "Unknown",
        email: row.riderEmail || null,
        phone: row.riderPhone || null,
        imageUrl: row.riderImage || null,
        rating: parseFloat(row.riderRating) || 0,
        city: row.city || null,
        category: row.category || null,
        from: row.pickupAddress || "—",
        to: row.dropoffAddress || "—",
        price: row.price ? `${parseFloat(row.price).toFixed(2)} MAD` : "—",
        distance: row.distance ? `${row.distance} km` : "—",
        time: formatTimeAgo(row.requestedAt),
        status: row.status,
      })),
    );
  } catch (err) {
    console.error("ride-assignment getWaitingCustomers error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ──────────────────────────────────────────────────
// GET /api/admin/ride-assignment/available-drivers
// ──────────────────────────────────────────────────
async function getAvailableDrivers(req, res) {
  try {
    const [rows] = await db.pool.execute(
      `SELECT d.id,
              d.name,
              d.email,
              d.phone,
              d.image_url AS imageUrl,
              d.rating,
              d.trips,
              d.joined_date AS joinDate,
              d.gender,
              c.name AS city,
              st.display_name AS serviceType,
              CASE
                WHEN st.name = 'MOTORCYCLE' THEN 'Motorcycle'
                WHEN st.name = 'TAXI' THEN 'Taxi'
                ELSE 'Car'
              END AS vehicleType
       FROM drivers d
       LEFT JOIN cities c ON d.city_id = c.id
       LEFT JOIN service_types st ON d.service_type_id = st.id
       WHERE d.is_online = 1
         AND d.is_available = 1
         AND d.status = 'active'
       ORDER BY d.rating DESC`,
    );

    res.json(
      rows.map((r) => ({
        id: r.id,
        displayId: `D-${String(r.id).padStart(5, "0")}`,
        name: r.name || "Unknown",
        email: r.email || null,
        phone: r.phone || null,
        imageUrl: r.imageUrl || null,
        rating: parseFloat(r.rating) || 0,
        trips: Number(r.trips),
        city: r.city || null,
        gender: r.gender || null,
        serviceType: r.serviceType || null,
        vehicleType: r.vehicleType || null,
        joinDate: r.joinDate || null,
      })),
    );
  } catch (err) {
    console.error("ride-assignment getAvailableDrivers error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ──────────────────────────────────────────────────
// POST /api/admin/ride-assignment/assign
// ──────────────────────────────────────────────────
async function assignService(req, res) {
  const conn = await db.pool.getConnection();
  try {
    const {
      passengerId,
      driverId,
      passengerServiceId,
      cityId,
      categoryIds,
      notes,
      requestId,
    } = req.body;

    if (!passengerId || !driverId) {
      return res
        .status(400)
        .json({ message: "passengerId and driverId are required" });
    }

    await conn.beginTransaction();

    // If we have a requestId, update that existing trip instead of creating new
    if (requestId) {
      await conn.execute(
        `UPDATE trips
         SET driver_id = ?,
             status = 'ACCEPTED',
             is_manual_assignment = 1,
             notes = ?,
             service_type_id = COALESCE(?, service_type_id),
             city_id = COALESCE(?, city_id)
         WHERE id = ? AND status IN ('PENDING','MATCHED')`,
        [
          driverId,
          notes || null,
          passengerServiceId || null,
          cityId || null,
          requestId,
        ],
      );

      // Mark driver as unavailable
      await conn.execute(`UPDATE drivers SET is_available = 0 WHERE id = ?`, [
        driverId,
      ]);

      await conn.commit();
      return res.status(201).json({
        message: "Assignment created",
        tripId: requestId,
      });
    }

    // Otherwise create a new trip row
    const [result] = await conn.execute(
      `INSERT INTO trips
        (rider_id, driver_id, status, is_manual_assignment, notes,
         service_type_id, city_id, created_at)
       VALUES (?, ?, 'ACCEPTED', 1, ?, ?, ?, NOW())`,
      [
        passengerId,
        driverId,
        notes || null,
        passengerServiceId || null,
        cityId || null,
      ],
    );

    // Mark driver as unavailable
    await conn.execute(`UPDATE drivers SET is_available = 0 WHERE id = ?`, [
      driverId,
    ]);

    await conn.commit();

    res.status(201).json({
      message: "Assignment created",
      tripId: result.insertId,
    });
  } catch (err) {
    await conn.rollback();
    console.error("ride-assignment assignService error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
}

// ──────────────────────────────────────────────────
// GET /api/admin/ride-assignment/recent
// ──────────────────────────────────────────────────
async function getRecentAssignments(req, res) {
  try {
    const [rows] = await db.pool.execute(
      `SELECT t.id,
              t.status,
              t.estimated_price AS fare,
              t.payment_method AS paymentMethod,
              t.start_time AS startTime,
              t.duration_minutes AS duration,
              t.created_at AS createdAt,
              t.notes,
              st.display_name AS serviceDisplayName,
              r.id AS riderId,
              r.name AS riderName,
              r.image_url AS riderImage,
              r.rating AS riderRating,
              d.id AS driverId,
              d.name AS driverName,
              d.image_url AS driverImage,
              d.rating AS driverRating,
              c.name AS cityName,
              CASE
                WHEN st.name = 'MOTORCYCLE' THEN 'Motorcycle'
                WHEN st.name = 'TAXI' THEN 'Taxi'
                ELSE 'Car'
              END AS vehicleType
       FROM trips t
       LEFT JOIN riders r ON t.rider_id = r.id
       LEFT JOIN drivers d ON t.driver_id = d.id
       LEFT JOIN service_types st ON t.service_type_id = st.id
       LEFT JOIN cities c ON t.city_id = c.id
       WHERE t.is_manual_assignment = 1
       ORDER BY t.created_at DESC
       LIMIT 50`,
    );

    const assignments = rows.map((row) => ({
      id: `T-${String(row.id).padStart(5, "0")}`,
      numericId: row.id,
      service: row.serviceDisplayName || "Unknown",
      rider: {
        name: row.riderName || "Unknown",
        id: `R-${String(row.riderId).padStart(5, "0")}`,
        img: row.riderImage || null,
        rating: parseFloat(row.riderRating) || 0,
      },
      driver: {
        name: row.driverName || "Unknown",
        id: `D-${String(row.driverId).padStart(5, "0")}`,
        img: row.driverImage || null,
        rating: parseFloat(row.driverRating) || 0,
      },
      vehicle: row.vehicleType,
      city: row.cityName || "—",
      time: row.startTime
        ? formatTime(row.startTime)
        : formatTime(row.createdAt),
      duration: row.duration ? `${row.duration} min` : "—",
      status: mapStatus(row.status),
      fare: row.fare ? `${parseFloat(row.fare).toFixed(2)} MAD` : "—",
      paymentMethod: row.paymentMethod || "cash",
      notes: row.notes || null,
    }));

    res.json(assignments);
  } catch (err) {
    console.error("ride-assignment getRecentAssignments error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ──────────────────────────────────────────────────
// GET /api/admin/ride-assignment/:tripId  — Detail
// ──────────────────────────────────────────────────
async function getAssignmentDetail(req, res) {
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
        t.notes,
        t.is_manual_assignment AS isManual,
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
      return res.status(404).json({ message: "Assignment not found" });
    }

    const row = rows[0];

    res.json({
      tripInfo: {
        id: `T-${String(row.id).padStart(5, "0")}`,
        startTime: row.startTime || row.createdAt,
        endTime: row.endTime || null,
        distance: row.distance ? `${row.distance} km` : null,
        status: mapStatus(row.status),
        notes: row.notes || null,
        isManualAssignment: Boolean(row.isManual),
      },
      passenger: {
        fullName: row.riderName || "Unknown",
        customerId: `R-${String(row.riderId).padStart(5, "0")}`,
        category: row.serviceDisplayName || "Unknown",
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
          row.fare != null ? `${parseFloat(row.fare).toFixed(2)} MAD` : null,
        tva: null,
        serviceFee: null,
        discount: null,
      },
    });
  } catch (err) {
    console.error("ride-assignment getAssignmentDetail error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ──────────────────────────────────────────────────
// POST /api/admin/ride-assignment/:tripId/cancel
// ──────────────────────────────────────────────────
async function cancelAssignment(req, res) {
  const conn = await db.pool.getConnection();
  try {
    const { tripId } = req.params;

    // Verify the trip exists and is not already completed/cancelled
    const [rows] = await conn.execute(
      `SELECT id, driver_id FROM trips
       WHERE id = ? AND status NOT IN ('COMPLETED','CANCELLED')`,
      [tripId],
    );

    if (rows.length === 0) {
      conn.release();
      return res
        .status(404)
        .json({ message: "Trip not found or already completed/cancelled" });
    }

    await conn.beginTransaction();

    await conn.execute(`UPDATE trips SET status = 'CANCELLED' WHERE id = ?`, [
      tripId,
    ]);

    // Release driver back to available
    if (rows[0].driver_id) {
      await conn.execute(`UPDATE drivers SET is_available = 1 WHERE id = ?`, [
        rows[0].driver_id,
      ]);
    }

    await conn.commit();

    res.status(201).json({ message: "Assignment cancelled" });
  } catch (err) {
    await conn.rollback();
    console.error("ride-assignment cancelAssignment error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
}

// ──────────────────────────── helpers ────────────────────────────

function formatTime(date) {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatTimeAgo(date) {
  if (!date) return "—";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
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

module.exports = {
  getStats,
  getPreferences,
  getPassengerServices,
  searchCustomers,
  searchDrivers,
  getCities,
  getWaitingCustomers,
  getAvailableDrivers,
  assignService,
  getRecentAssignments,
  getAssignmentDetail,
  cancelAssignment,
};
