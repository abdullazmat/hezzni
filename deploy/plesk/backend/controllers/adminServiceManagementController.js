const db = require("../config/db");

const execute = async (sql, params = []) => {
  const [rows] = await db.pool.execute(sql, params);
  return rows;
};

// ─── GET /kpis ─────────────────────────────────────────────────────────────
exports.getKpis = async (req, res) => {
  try {
    const [services] = await db.pool.execute(
      "SELECT COUNT(*) AS total, SUM(is_active = 1) AS enabled, SUM(is_active = 0) AS disabled FROM service_types",
    );
    const [active] = await db.pool.execute(
      "SELECT COUNT(*) AS cnt FROM trips WHERE status = 'in-progress'",
    );

    res.json({
      totalServices: Number(services[0].total) || 0,
      enabled: Number(services[0].enabled) || 0,
      disabled: Number(services[0].disabled) || 0,
      activeRequests: Number(active[0].cnt) || 0,
    });
  } catch (err) {
    console.error("getKpis error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /services ─────────────────────────────────────────────────────────
exports.getServices = async (req, res) => {
  try {
    const services = await execute(
      "SELECT id, name, display_name, is_active FROM service_types ORDER BY id",
    );

    const result = await Promise.all(
      services.map(async (svc) => {
        // Today's trip metrics
        const todayTrips = await execute(
          `SELECT COUNT(*) AS total,
                  SUM(status = 'in-progress') AS activeNow,
                  SUM(status = 'completed') AS completed,
                  SUM(status = 'cancelled') AS cancelled,
                  COALESCE(SUM(amount), 0) AS revenue
           FROM trips
           WHERE service_type_id = ? AND DATE(created_at) = CURDATE()`,
          [svc.id],
        );

        // Yesterday's revenue for growth calc
        const yesterdayTrips = await execute(
          `SELECT COALESCE(SUM(amount), 0) AS revenue
           FROM trips
           WHERE service_type_id = ? AND DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`,
          [svc.id],
        );

        // All-time stats
        const allTime = await execute(
          `SELECT COUNT(*) AS totalRequests,
                  SUM(status = 'completed') AS completed,
                  SUM(status = 'cancelled') AS cancelled,
                  COALESCE(AVG(CASE WHEN status = 'completed' THEN amount END), 0) AS avgFare
           FROM trips
           WHERE service_type_id = ?`,
          [svc.id],
        );

        // Active drivers for this service
        const drivers = await execute(
          `SELECT COUNT(*) AS cnt FROM drivers WHERE service_type_id = ? AND status = 'active'`,
          [svc.id],
        );

        // Average rating from reviews linked to drivers of this service type
        const ratings = await execute(
          `SELECT COALESCE(AVG(r.rating), 0) AS avg_rating
           FROM reviews r
           JOIN drivers d ON r.reviewee_id = d.id AND r.reviewee_type = 'DRIVER'
           WHERE d.service_type_id = ?`,
          [svc.id],
        );

        const todayRevenue = Number(todayTrips[0].revenue) || 0;
        const yesterdayRevenue = Number(yesterdayTrips[0].revenue) || 0;
        const totalCompleted = Number(allTime[0].completed) || 0;
        const totalRequests = Number(allTime[0].totalRequests) || 0;
        const growthPct =
          yesterdayRevenue > 0
            ? (
                ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) *
                100
              ).toFixed(1)
            : todayRevenue > 0
              ? "100.0"
              : "0.0";
        const completionRate =
          totalRequests > 0
            ? ((totalCompleted / totalRequests) * 100).toFixed(1)
            : "0.0";

        return {
          id: svc.id,
          name: svc.name,
          displayName: svc.display_name,
          isActive: Boolean(svc.is_active),
          priority: "Medium",
          activeNow: Number(todayTrips[0].activeNow) || 0,
          totalToday: Number(todayTrips[0].total) || 0,
          revenue: `${todayRevenue.toLocaleString("en")} MAD`,
          growth: `${Number(growthPct) >= 0 ? "+" : ""}${growthPct}%`,
          responseTime: "N/A",
          lastUpdated: new Date().toISOString().slice(0, 16).replace("T", " "),
          rating: Number(Number(ratings[0].avg_rating).toFixed(1)),
          completionRate: `${completionRate}%`,
          activeDrivers: Number(drivers[0].cnt) || 0,
          stats: {
            totalRequests,
            activeNow: Number(todayTrips[0].activeNow) || 0,
            completed: totalCompleted,
            cancelled: Number(allTime[0].cancelled) || 0,
          },
        };
      }),
    );

    res.json({ services: result });
  } catch (err) {
    console.error("getServices error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /services/:id ────────────────────────────────────────────────────
exports.getServiceDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await execute(
      "SELECT id, name, display_name, is_active FROM service_types WHERE id = ?",
      [id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Service not found" });
    }
    const svc = rows[0];

    // Stats
    const stats = await execute(
      `SELECT COUNT(*) AS totalRequests,
              SUM(status = 'in-progress') AS activeNow,
              SUM(status = 'completed') AS completed,
              SUM(status = 'cancelled') AS cancelled,
              COALESCE(SUM(amount), 0) AS totalRevenue
       FROM trips
       WHERE service_type_id = ?`,
      [id],
    );

    // Today revenue
    const todayR = await execute(
      `SELECT COALESCE(SUM(amount), 0) AS revenue FROM trips WHERE service_type_id = ? AND DATE(created_at) = CURDATE()`,
      [id],
    );

    // Rating
    const ratings = await execute(
      `SELECT COALESCE(AVG(r.rating), 0) AS avg_rating
       FROM reviews r
       JOIN drivers d ON r.reviewee_id = d.id AND r.reviewee_type = 'DRIVER'
       WHERE d.service_type_id = ?`,
      [id],
    );

    // Drivers
    const drivers = await execute(
      "SELECT COUNT(*) AS cnt FROM drivers WHERE service_type_id = ? AND status = 'active'",
      [id],
    );

    // Coverage — distinct cities from trips
    const cities = await execute(
      `SELECT DISTINCT c.name FROM trips t
       JOIN cities c ON t.city_id = c.id
       WHERE t.service_type_id = ? AND c.name IS NOT NULL`,
      [id],
    );

    const totalRequests = Number(stats[0].totalRequests) || 0;
    const completed = Number(stats[0].completed) || 0;
    const completionRate =
      totalRequests > 0
        ? ((completed / totalRequests) * 100).toFixed(1)
        : "0.0";

    res.json({
      id: svc.id,
      name: svc.name,
      displayName: svc.display_name,
      isActive: Boolean(svc.is_active),
      description: `${svc.display_name} service on the Hezzni platform.`,
      priority: "Medium",
      rating: Number(Number(ratings[0].avg_rating).toFixed(1)),
      completionRate: `${completionRate}%`,
      activeDrivers: Number(drivers[0].cnt) || 0,
      todayRevenue: `${(Number(todayR[0].revenue) || 0).toLocaleString("en")} MAD`,
      totalRevenue: `${(Number(stats[0].totalRevenue) || 0).toLocaleString("en")} MAD`,
      coverageAreas: cities.map((c) => c.name),
      features: [],
      stats: {
        totalRequests,
        activeNow: Number(stats[0].activeNow) || 0,
        completed,
        cancelled: Number(stats[0].cancelled) || 0,
      },
    });
  } catch (err) {
    console.error("getServiceDetail error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── PUT /services/:id ────────────────────────────────────────────────────
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      displayName,
      description,
      isActive,
      priority,
      features,
      coverageAreas,
    } = req.body;

    const fields = [];
    const params = [];

    if (displayName !== undefined) {
      fields.push("display_name = ?");
      params.push(displayName);
    }
    if (isActive !== undefined) {
      fields.push("is_active = ?");
      params.push(isActive ? 1 : 0);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    params.push(id);
    await execute(
      `UPDATE service_types SET ${fields.join(", ")} WHERE id = ?`,
      params,
    );

    res.json({ message: "Service updated successfully" });
  } catch (err) {
    console.error("updateService error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── PUT /services/:id/toggle ──────────────────────────────────────────────
exports.toggleService = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ message: "isActive is required" });
    }

    await execute("UPDATE service_types SET is_active = ? WHERE id = ?", [
      isActive ? 1 : 0,
      id,
    ]);

    res.json({
      message: `Service ${isActive ? "enabled" : "disabled"} successfully`,
    });
  } catch (err) {
    console.error("toggleService error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /services/:id/charts/revenue ──────────────────────────────────────
exports.getRevenueChart = async (req, res) => {
  try {
    const { id } = req.params;

    // Last 7 days revenue
    const rows = await execute(
      `SELECT DATE(created_at) AS day,
              COALESCE(SUM(amount), 0) AS revenue
       FROM trips
       WHERE service_type_id = ? AND status = 'completed'
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(created_at)
       ORDER BY day`,
      [id],
    );

    // Fill in missing days
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const found = rows.find((r) => String(r.day).slice(0, 10) === dateStr);
      data.push({
        day: dateStr,
        label: d.toLocaleDateString("en", { weekday: "short" }).toUpperCase(),
        revenue: found ? Number(found.revenue) : 0,
      });
    }

    const total = data.reduce((s, d) => s + d.revenue, 0);
    const prevWeek = await execute(
      `SELECT COALESCE(SUM(amount), 0) AS revenue
       FROM trips
       WHERE service_type_id = ? AND status = 'completed'
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
         AND created_at < DATE_SUB(CURDATE(), INTERVAL 6 DAY)`,
      [id],
    );
    const prev = Number(prevWeek[0].revenue) || 0;
    const growthPct =
      prev > 0
        ? (((total - prev) / prev) * 100).toFixed(1)
        : total > 0
          ? "100.0"
          : "0.0";

    res.json({
      data,
      total: `${total.toLocaleString("en")} MAD`,
      growth: `${Number(growthPct) >= 0 ? "+" : ""}${growthPct}% vs last week`,
    });
  } catch (err) {
    console.error("getRevenueChart error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /services/:id/charts/growth ───────────────────────────────────────
exports.getGrowthChart = async (req, res) => {
  try {
    const { id } = req.params;

    // Last 7 days request volume
    const rows = await execute(
      `SELECT DATE(created_at) AS day, COUNT(*) AS requests
       FROM trips
       WHERE service_type_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(created_at)
       ORDER BY day`,
      [id],
    );

    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const found = rows.find((r) => String(r.day).slice(0, 10) === dateStr);
      data.push({
        day: dateStr,
        label: d.toLocaleDateString("en", { weekday: "short" }).toUpperCase(),
        requests: found ? Number(found.requests) : 0,
      });
    }

    const total = data.reduce((s, d) => s + d.requests, 0);
    const prevWeek = await execute(
      `SELECT COUNT(*) AS cnt FROM trips
       WHERE service_type_id = ?
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
         AND created_at < DATE_SUB(CURDATE(), INTERVAL 6 DAY)`,
      [id],
    );
    const prev = Number(prevWeek[0].cnt) || 0;
    const growthPct =
      prev > 0
        ? (((total - prev) / prev) * 100).toFixed(1)
        : total > 0
          ? "100.0"
          : "0.0";

    res.json({
      data,
      total,
      growth: `${Number(growthPct) >= 0 ? "+" : ""}${growthPct}% vs last week`,
    });
  } catch (err) {
    console.error("getGrowthChart error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
