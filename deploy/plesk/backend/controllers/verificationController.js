const db = require("../config/db");

// GET /api/admin/verification/stats — KPI Cards
async function getVerificationStats(req, res) {
  try {
    const [driverRows] = await db.pool.execute(
      `SELECT
        COUNT(*) AS totalDrivers,
        SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) AS verifiedDrivers
      FROM drivers`,
    );

    const [riderRows] = await db.pool.execute(
      `SELECT
        COUNT(*) AS totalRiders,
        SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) AS verifiedRiders
      FROM riders`,
    );

    const totalUsers =
      Number(driverRows[0].totalDrivers) + Number(riderRows[0].totalRiders);
    const totalVerified =
      Number(driverRows[0].verifiedDrivers) +
      Number(riderRows[0].verifiedRiders);

    res.json({
      totalUsers,
      totalVerified,
      verifiedDrivers: Number(driverRows[0].verifiedDrivers),
      verifiedPassengers: Number(riderRows[0].verifiedRiders),
    });
  } catch (err) {
    console.error("getVerificationStats error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/admin/verification/settings — Badge Requirements Settings
async function getVerificationSettings(req, res) {
  try {
    const keys = [
      "badge_driver_min_trips",
      "badge_driver_min_rating",
      "badge_driver_min_acceptance",
      "badge_passenger_min_trips",
      "badge_passenger_min_rating",
    ];

    const placeholders = keys.map(() => "?").join(",");
    const [rows] = await db.pool.execute(
      `SELECT key_name, value_content FROM settings WHERE key_name IN (${placeholders})`,
      keys,
    );

    const settingsMap = {};
    for (const row of rows) {
      settingsMap[row.key_name] = row.value_content;
    }

    res.json({
      driver: {
        minTrips: parseInt(settingsMap.badge_driver_min_trips || "100", 10),
        minRating: parseFloat(settingsMap.badge_driver_min_rating || "4.5"),
        minAcceptance: parseInt(
          settingsMap.badge_driver_min_acceptance || "85",
          10,
        ),
      },
      passenger: {
        minTrips: parseInt(settingsMap.badge_passenger_min_trips || "100", 10),
        minRating: parseFloat(settingsMap.badge_passenger_min_rating || "4.5"),
      },
    });
  } catch (err) {
    console.error("getVerificationSettings error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /api/admin/verification/settings — Update Badge Requirements Settings
async function updateVerificationSettings(req, res) {
  try {
    const { driver, passenger } = req.body;

    const updates = [];
    if (driver) {
      if (driver.minTrips !== undefined)
        updates.push(["badge_driver_min_trips", String(driver.minTrips)]);
      if (driver.minRating !== undefined)
        updates.push(["badge_driver_min_rating", String(driver.minRating)]);
      if (driver.minAcceptance !== undefined)
        updates.push([
          "badge_driver_min_acceptance",
          String(driver.minAcceptance),
        ]);
    }
    if (passenger) {
      if (passenger.minTrips !== undefined)
        updates.push(["badge_passenger_min_trips", String(passenger.minTrips)]);
      if (passenger.minRating !== undefined)
        updates.push([
          "badge_passenger_min_rating",
          String(passenger.minRating),
        ]);
    }

    for (const [key, value] of updates) {
      await db.pool.execute(
        `INSERT INTO settings (key_name, value_content) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE value_content = ?`,
        [key, value, value],
      );
    }

    res.json({ message: "Settings updated successfully" });
  } catch (err) {
    console.error("updateVerificationSettings error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/admin/verification/filters/cities
async function getVerificationCities(req, res) {
  try {
    const [rows] = await db.pool.execute(
      `SELECT id, name FROM cities WHERE status = 'active' ORDER BY name ASC`,
    );
    res.json(rows);
  } catch (err) {
    console.error("getVerificationCities error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/admin/verification/users — List users for verification
async function getVerificationUsers(req, res) {
  try {
    const { cityId, status, userType, search } = req.query;

    const results = [];

    // Fetch drivers if not filtered to passengers only
    if (!userType || userType === "Driver") {
      let driverConditions = ["1=1"];
      let driverParams = [];

      if (cityId) {
        driverConditions.push("d.city_id = ?");
        driverParams.push(cityId);
      }
      if (status === "Verified") {
        driverConditions.push("d.is_verified = 1");
      } else if (status === "Unverified") {
        driverConditions.push("(d.is_verified = 0 OR d.is_verified IS NULL)");
      }
      if (search) {
        driverConditions.push(
          "(d.name LIKE ? OR CONCAT('D-', LPAD(d.id, 5, '0')) LIKE ?)",
        );
        driverParams.push(`%${search}%`, `%${search}%`);
      }

      const [drivers] = await db.pool.execute(
        `SELECT
          d.id,
          d.name,
          d.phone,
          d.email,
          d.image_url AS imageUrl,
          d.rating,
          d.trips AS totalTrips,
          d.joined_date AS joinDate,
          d.is_verified AS isVerified,
          d.verified_date AS verifiedDate,
          c.name AS city
        FROM drivers d
        LEFT JOIN cities c ON d.city_id = c.id
        WHERE ${driverConditions.join(" AND ")}
        ORDER BY d.id DESC`,
        driverParams,
      );

      for (const d of drivers) {
        results.push({
          id: d.id,
          displayId: `D-${String(d.id).padStart(5, "0")}`,
          name: d.name || "Unknown",
          avatar: d.imageUrl || null,
          rating: parseFloat(d.rating) || 0,
          phone: d.phone || "—",
          email: d.email || "—",
          city: d.city || "—",
          totalTrips: Number(d.totalTrips) || 0,
          userType: "Driver",
          isVerified: !!d.isVerified,
          verifiedDate: d.verifiedDate
            ? new Date(d.verifiedDate).toISOString().split("T")[0]
            : null,
          joinDate: d.joinDate
            ? new Date(d.joinDate).toISOString().split("T")[0]
            : "—",
        });
      }
    }

    // Fetch passengers/riders if not filtered to drivers only
    if (!userType || userType === "Passenger") {
      let riderConditions = ["1=1"];
      let riderParams = [];

      if (cityId) {
        riderConditions.push("r.city_id = ?");
        riderParams.push(cityId);
      }
      if (status === "Verified") {
        riderConditions.push("r.is_verified = 1");
      } else if (status === "Unverified") {
        riderConditions.push("(r.is_verified = 0 OR r.is_verified IS NULL)");
      }
      if (search) {
        riderConditions.push(
          "(r.name LIKE ? OR CONCAT('R-', LPAD(r.id, 5, '0')) LIKE ?)",
        );
        riderParams.push(`%${search}%`, `%${search}%`);
      }

      const [riders] = await db.pool.execute(
        `SELECT
          r.id,
          r.name,
          r.phone,
          r.email,
          r.image_url AS imageUrl,
          r.rating,
          r.total_trips AS totalTrips,
          r.joined_date AS joinDate,
          r.is_verified AS isVerified,
          r.verified_date AS verifiedDate,
          c.name AS city
        FROM riders r
        LEFT JOIN cities c ON r.city_id = c.id
        WHERE ${riderConditions.join(" AND ")}
        ORDER BY r.id DESC`,
        riderParams,
      );

      for (const r of riders) {
        results.push({
          id: r.id,
          displayId: `R-${String(r.id).padStart(5, "0")}`,
          name: r.name || "Unknown",
          avatar: r.imageUrl || null,
          rating: parseFloat(r.rating) || 0,
          phone: r.phone || "—",
          email: r.email || "—",
          city: r.city || "—",
          totalTrips: Number(r.totalTrips) || 0,
          userType: "Passenger",
          isVerified: !!r.isVerified,
          verifiedDate: r.verifiedDate
            ? new Date(r.verifiedDate).toISOString().split("T")[0]
            : null,
          joinDate: r.joinDate
            ? new Date(r.joinDate).toISOString().split("T")[0]
            : "—",
        });
      }
    }

    res.json(results);
  } catch (err) {
    console.error("getVerificationUsers error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// POST /api/admin/verification/users/:type/:id/action — Manual Badge Action
async function manualBadgeAction(req, res) {
  try {
    const { type, id } = req.params;
    const { action } = req.body; // "grant" or "remove"

    const table = type === "Driver" ? "drivers" : "riders";
    const numericId = parseInt(id, 10);

    if (isNaN(numericId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (action === "grant") {
      await db.pool.execute(
        `UPDATE ${table} SET is_verified = 1, verified_date = NOW() WHERE id = ?`,
        [numericId],
      );
    } else if (action === "remove") {
      await db.pool.execute(
        `UPDATE ${table} SET is_verified = 0, verified_date = NULL WHERE id = ?`,
        [numericId],
      );
    } else {
      return res
        .status(400)
        .json({ message: "Invalid action. Use 'grant' or 'remove'." });
    }

    res.status(201).json({ message: `Badge ${action}ed successfully` });
  } catch (err) {
    console.error("manualBadgeAction error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/admin/verification/users/:type/:id — Badge Management Profile
async function getBadgeProfile(req, res) {
  try {
    const { type, id } = req.params;
    const numericId = parseInt(id, 10);

    if (isNaN(numericId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (type === "Driver") {
      const [rows] = await db.pool.execute(
        `SELECT
          d.id,
          d.name,
          d.phone,
          d.email,
          d.image_url AS imageUrl,
          d.rating,
          d.trips AS totalTrips,
          d.joined_date AS joinDate,
          d.is_verified AS isVerified,
          d.verified_date AS verifiedDate,
          d.gender,
          c.name AS city,
          d.car_ride_status,
          d.motorcycle_status,
          d.taxi_status
        FROM drivers d
        LEFT JOIN cities c ON d.city_id = c.id
        WHERE d.id = ?`,
        [numericId],
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "Driver not found" });
      }

      const driver = rows[0];

      // Parse vehicle details from the driver's onboarding status blobs.
      let vehicleInfo = null;
      let vehicleType = null;
      const statuses = [
        { raw: driver.car_ride_status, type: "Car Rides" },
        { raw: driver.motorcycle_status, type: "Motorcycle" },
        { raw: driver.taxi_status, type: "Taxi" },
      ];
      for (const statusEntry of statuses) {
        if (!statusEntry.raw) continue;

        try {
          const parsed =
            typeof statusEntry.raw === "string"
              ? JSON.parse(statusEntry.raw)
              : statusEntry.raw;
          const details = parsed?.vehicleInfo || parsed?.vehicleDetails || null;

          if (!details) continue;

          const makeModel = [details.make, details.model]
            .filter(Boolean)
            .join(" ")
            .trim();

          vehicleInfo = {
            licensePlate:
              details.licensePlate ||
              details.licencePlate ||
              details.plateNumber ||
              details.registrationNumber ||
              null,
            makeModel:
              details.makeModel ||
              makeModel ||
              details.brand ||
              details.vehicleName ||
              null,
            year: details.year || details.manufactureYear || null,
            transmission:
              details.transmission ||
              details.gearbox ||
              details.transmissionType ||
              null,
            color: details.color || details.colour || null,
          };
          vehicleType = statusEntry.type;
          break;
        } catch {
          // ignore parse errors
        }
      }

      res.json({
        id: driver.id,
        displayId: `D-${String(driver.id).padStart(5, "0")}`,
        name: driver.name || "Unknown",
        avatar: driver.imageUrl || null,
        rating: parseFloat(driver.rating) || 0,
        phone: driver.phone || "—",
        email: driver.email || "—",
        city: driver.city || "—",
        totalTrips: Number(driver.totalTrips) || 0,
        userType: "Driver",
        isVerified: !!driver.isVerified,
        verifiedDate: driver.verifiedDate
          ? new Date(driver.verifiedDate).toISOString().split("T")[0]
          : null,
        joinDate: driver.joinDate
          ? new Date(driver.joinDate).toISOString().split("T")[0]
          : "—",
        gender: driver.gender || null,
        vehicleType,
        vehicleInfo: vehicleInfo
          ? {
              licensePlate: vehicleInfo.licensePlate || null,
              makeModel: vehicleInfo.makeModel || null,
              year: vehicleInfo.year || null,
              transmission: vehicleInfo.transmission || null,
              color: vehicleInfo.color || null,
            }
          : null,
      });
    } else {
      // Passenger
      const [rows] = await db.pool.execute(
        `SELECT
          r.id,
          r.name,
          r.phone,
          r.email,
          r.image_url AS imageUrl,
          r.rating,
          r.total_trips AS totalTrips,
          r.joined_date AS joinDate,
          r.is_verified AS isVerified,
          r.verified_date AS verifiedDate,
          r.gender,
          c.name AS city
        FROM riders r
        LEFT JOIN cities c ON r.city_id = c.id
        WHERE r.id = ?`,
        [numericId],
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "Passenger not found" });
      }

      const rider = rows[0];

      res.json({
        id: rider.id,
        displayId: `R-${String(rider.id).padStart(5, "0")}`,
        name: rider.name || "Unknown",
        avatar: rider.imageUrl || null,
        rating: parseFloat(rider.rating) || 0,
        phone: rider.phone || "—",
        email: rider.email || "—",
        city: rider.city || "—",
        totalTrips: Number(rider.totalTrips) || 0,
        userType: "Passenger",
        isVerified: !!rider.isVerified,
        verifiedDate: rider.verifiedDate
          ? new Date(rider.verifiedDate).toISOString().split("T")[0]
          : null,
        joinDate: rider.joinDate
          ? new Date(rider.joinDate).toISOString().split("T")[0]
          : "—",
        gender: rider.gender || null,
      });
    }
  } catch (err) {
    console.error("getBadgeProfile error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  getVerificationStats,
  getVerificationSettings,
  updateVerificationSettings,
  getVerificationCities,
  getVerificationUsers,
  manualBadgeAction,
  getBadgeProfile,
};
