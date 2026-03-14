const db = require("../config/db");
const PDFDocument = require("pdfkit");

// ─── Helpers ───────────────────────────────────────────────────────────────

const SERVICE_LABEL_MAP = {
  CAR_RIDES: "Car Ride",
  CAR_RIDE: "Car Ride",
  MOTORCYCLE: "Motorcycle",
  RENTAL_CAR: "Rental Car",
  RESERVATION: "Reservation",
  CITY_TO_CITY: "City To City",
  DELIVERY: "Delivery",
  FAST_DELIVERY: "Delivery",
  TAXI: "Taxi",
  GROUP_RIDE: "Group Ride",
  AIRPORT_RIDE: "Airport Ride",
};

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeServiceLabel(value) {
  const raw = String(value || "Other").trim();
  if (!raw) return "Other";

  const normalizedKey = raw
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .toUpperCase();

  if (SERVICE_LABEL_MAP[normalizedKey]) {
    return SERVICE_LABEL_MAP[normalizedKey];
  }

  return raw
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getPeriodCondition(period, dateCol) {
  switch (period) {
    case "today":
      return `DATE(${dateCol}) = CURDATE()`;
    case "yesterday":
      return `DATE(${dateCol}) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`;
    case "last_week":
      return `${dateCol} >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;
    case "this_month":
      return `MONTH(${dateCol}) = MONTH(CURDATE()) AND YEAR(${dateCol}) = YEAR(CURDATE())`;
    case "year_to_date":
      return `YEAR(${dateCol}) = YEAR(CURDATE())`;
    case "last_month":
      return `MONTH(${dateCol}) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(${dateCol}) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))`;
    default:
      return "1=1";
  }
}

function buildTripWhereClause(
  { period, regionId, serviceTypeId, dateCol },
  params,
) {
  const clauses = [getPeriodCondition(period, dateCol || "t.created_at")];

  if (regionId) {
    clauses.push("t.city_id = ?");
    params.push(regionId);
  }

  if (serviceTypeId) {
    clauses.push("t.service_type_id = ?");
    params.push(serviceTypeId);
  }

  return clauses.length > 0 ? clauses.join(" AND ") : "1=1";
}

function buildPdfReport(rows) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 42,
      size: "A4",
      bufferPages: true,
      info: {
        Title: "Ezzni Report Export",
        Author: "Ezzni Admin",
      },
    });

    const buffers = [];
    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const columns = [
      { label: "#", width: 28 },
      { label: "Rider", width: 112 },
      { label: "Driver", width: 112 },
      { label: "City", width: 72 },
      { label: "Status", width: 78 },
      { label: "Fare", width: 56 },
      { label: "Date", width: 96 },
    ];

    const drawHeader = () => {
      const generatedAt = new Date().toLocaleString();
      doc
        .fillColor("#0f172a")
        .font("Helvetica-Bold")
        .fontSize(22)
        .text("Ezzni Report Export", doc.page.margins.left, 36, {
          width: pageWidth,
        });

      doc
        .moveDown(0.25)
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#475569")
        .text(`Generated ${generatedAt}`, {
          width: pageWidth,
        })
        .text(`Rows exported: ${rows.length}`, {
          width: pageWidth,
        });

      const summaryTop = 98;
      doc
        .roundedRect(doc.page.margins.left, summaryTop, pageWidth, 52, 12)
        .fill("#f8fafc");

      const totalRevenue = rows.reduce(
        (sum, row) => sum + toNumber(row.price),
        0,
      );
      const completedTrips = rows.filter(
        (row) => row.status === "COMPLETED",
      ).length;

      doc
        .fillColor("#0f172a")
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("Completed Trips", doc.page.margins.left + 18, summaryTop + 14)
        .text("Total Revenue", doc.page.margins.left + 185, summaryTop + 14)
        .text("Coverage", doc.page.margins.left + 360, summaryTop + 14);

      doc
        .fontSize(18)
        .fillColor("#16a34a")
        .text(
          String(completedTrips),
          doc.page.margins.left + 18,
          summaryTop + 28,
        )
        .text(
          `${totalRevenue.toFixed(2)} MAD`,
          doc.page.margins.left + 185,
          summaryTop + 28,
        )
        .text(
          `${new Set(rows.map((row) => row.city).filter(Boolean)).size} cities`,
          doc.page.margins.left + 360,
          summaryTop + 28,
        );
    };

    const drawTableHeader = (y) => {
      let x = doc.page.margins.left;
      doc.roundedRect(x, y, pageWidth, 24, 8).fill("#16a34a");
      doc.fillColor("white").font("Helvetica-Bold").fontSize(9);

      columns.forEach((column) => {
        doc.text(column.label, x + 6, y + 8, {
          width: column.width - 12,
          ellipsis: true,
        });
        x += column.width;
      });
    };

    const ensureSpace = (requiredHeight) => {
      if (doc.y + requiredHeight <= doc.page.height - doc.page.margins.bottom) {
        return;
      }

      doc.addPage();
      drawHeader();
      drawTableHeader(170);
      doc.y = 202;
    };

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    drawHeader();
    drawTableHeader(170);
    doc.y = 202;

    rows.forEach((row, index) => {
      ensureSpace(26);

      const values = [
        String(index + 1),
        row.passengerName || "Unknown Rider",
        row.driverName || "Unknown Driver",
        row.city || "N/A",
        row.status || "N/A",
        `${toNumber(row.price).toFixed(2)} MAD`,
        row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "N/A",
      ];

      const rowTop = doc.y;
      const bgColor = index % 2 === 0 ? "#ffffff" : "#f8fafc";
      doc
        .roundedRect(doc.page.margins.left, rowTop - 4, pageWidth, 24, 6)
        .fill(bgColor);

      let x = doc.page.margins.left;
      values.forEach((value, valueIndex) => {
        doc
          .fillColor(
            valueIndex === 4 && value === "COMPLETED" ? "#16a34a" : "#0f172a",
          )
          .font(valueIndex === 0 ? "Helvetica-Bold" : "Helvetica")
          .fontSize(9)
          .text(value, x + 6, rowTop + 3, {
            width: columns[valueIndex].width - 12,
            ellipsis: true,
          });
        x += columns[valueIndex].width;
      });

      doc.y = rowTop + 24;
    });

    const pageRange = doc.bufferedPageRange();
    for (let pageIndex = 0; pageIndex < pageRange.count; pageIndex += 1) {
      doc.switchToPage(pageIndex);
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#64748b")
        .text(
          `Page ${pageIndex + 1} of ${pageRange.count}`,
          doc.page.margins.left,
          doc.page.height - 28,
          {
            width: pageWidth,
            align: "right",
          },
        );
    }

    doc.end();
  });
}

async function getReportFilters(req, res) {
  try {
    const [regionRows] = await db.pool.execute(
      `SELECT DISTINCT c.id, c.name
       FROM trips t
       JOIN cities c ON t.city_id = c.id
       ORDER BY c.name ASC`,
    );

    const [serviceRows] = await db.pool.execute(
      `SELECT DISTINCT st.id,
              COALESCE(NULLIF(st.display_name, ''), st.name) AS label
       FROM trips t
       JOIN service_types st ON t.service_type_id = st.id
       ORDER BY label ASC`,
    );

    const seenServiceIds = new Set();
    const services = serviceRows
      .filter((row) => {
        if (seenServiceIds.has(row.id)) return false;
        seenServiceIds.add(row.id);
        return true;
      })
      .map((row) => ({
        id: toNumber(row.id),
        label: normalizeServiceLabel(row.label),
      }));

    res.json({
      regions: regionRows.map((row) => ({
        id: toNumber(row.id),
        name: row.name,
      })),
      services,
    });
  } catch (err) {
    console.error("getReportFilters error:", err);
    res.json({ regions: [], services: [] });
  }
}

exports.getFilters = getReportFilters;

// ─── GET /api/admin/reports/kpis ───────────────────────────────────────────
exports.getKpis = async (req, res) => {
  try {
    const { regionId, period, serviceTypeId } = req.query;
    const params = [];
    const whereClause = buildTripWhereClause(
      { period, regionId, serviceTypeId, dateCol: "t.created_at" },
      params,
    );

    // Total trips & earnings
    const [tripRows] = await db.pool.execute(
      `SELECT COUNT(*) AS totalTrips,
              COALESCE(SUM(t.amount), 0) AS totalEarnings
       FROM trips t
       WHERE ${whereClause}`,
      params,
    );

    let activeDrivers = 0;
    let fleetSize = 0;

    if (regionId || serviceTypeId || period) {
      const driverParams = [];
      const driverWhereClause = buildTripWhereClause(
        { period, regionId, serviceTypeId, dateCol: "t.created_at" },
        driverParams,
      );

      const [driverRows] = await db.pool.execute(
        `SELECT COUNT(DISTINCT CASE WHEN d.is_online = 1 THEN d.id END) AS activeDrivers,
                COUNT(DISTINCT d.id) AS fleetSize
         FROM trips t
         JOIN drivers d ON d.id = t.driver_id
         WHERE ${driverWhereClause}`,
        driverParams,
      );

      activeDrivers = toNumber(driverRows[0]?.activeDrivers);
      fleetSize = toNumber(driverRows[0]?.fleetSize);
    } else {
      const [driverRows] = await db.pool.execute(
        `SELECT COUNT(*) AS activeDrivers FROM drivers WHERE is_online = 1`,
      );

      const [fleetRows] = await db.pool.execute(
        `SELECT COUNT(*) AS fleetSize FROM drivers`,
      );

      activeDrivers = toNumber(driverRows[0]?.activeDrivers);
      fleetSize = toNumber(fleetRows[0]?.fleetSize);
    }

    const t = tripRows[0] || {};
    res.json({
      totalTrips: toNumber(t.totalTrips),
      totalEarnings: toNumber(t.totalEarnings),
      activeDrivers,
      fleetSize,
    });
  } catch (err) {
    console.error("getKpis error:", err);
    res.json({
      totalTrips: 0,
      totalEarnings: 0,
      activeDrivers: 0,
      fleetSize: 0,
    });
  }
};

// ─── GET /api/admin/reports/charts/service-volume ──────────────────────────
exports.getServiceVolume = async (req, res) => {
  try {
    const { regionId, period, serviceTypeId } = req.query;
    const params = [];
    const whereClause = buildTripWhereClause(
      { period, regionId, serviceTypeId, dateCol: "t.created_at" },
      params,
    );

    const [rows] = await db.pool.execute(
      `SELECT HOUR(t.created_at) AS hour,
              COALESCE(NULLIF(st.display_name, ''), st.name, 'Other') AS serviceType,
              COUNT(*) AS cnt
       FROM trips t
       LEFT JOIN service_types st ON t.service_type_id = st.id
       WHERE ${whereClause}
       GROUP BY hour, serviceType
       ORDER BY hour`,
      params,
    );

    // Group by hour
    const hourMap = {};
    for (const row of rows) {
      const timeLabel = `${String(row.hour).padStart(2, "0")}:00`;
      if (!hourMap[timeLabel]) hourMap[timeLabel] = { time: timeLabel };
      hourMap[timeLabel][normalizeServiceLabel(row.serviceType)] = toNumber(
        row.cnt,
      );
    }

    res.json(Object.values(hourMap));
  } catch (err) {
    console.error("getServiceVolume error:", err);
    res.json([]);
  }
};

// ─── GET /api/admin/reports/charts/revenue-by-service ──────────────────────
exports.getRevenueByService = async (req, res) => {
  try {
    const { regionId, period, serviceTypeId } = req.query;
    const params = [];
    const whereClause = buildTripWhereClause(
      { period, regionId, serviceTypeId, dateCol: "t.created_at" },
      params,
    );

    const [rows] = await db.pool.execute(
      `SELECT DAYNAME(t.created_at) AS day,
              COALESCE(SUM(t.amount), 0) AS revenue
       FROM trips t
       WHERE ${whereClause}
       GROUP BY day, DAYOFWEEK(t.created_at)
       ORDER BY DAYOFWEEK(t.created_at)`,
      params,
    );

    const data = rows.map((r) => ({
      day: r.day ? r.day.substring(0, 3) : "N/A",
      revenue: toNumber(r.revenue),
    }));

    res.json(data);
  } catch (err) {
    console.error("getRevenueByService error:", err);
    res.json([]);
  }
};

// ─── GET /api/admin/reports/charts/regional-performance ────────────────────
exports.getRegionalPerformance = async (req, res) => {
  try {
    const { period, regionId, serviceTypeId } = req.query;
    const params = [];
    const whereClause = buildTripWhereClause(
      { period, regionId, serviceTypeId, dateCol: "t.created_at" },
      params,
    );

    const [rows] = await db.pool.execute(
      `SELECT c.name AS regionName,
              COUNT(*) AS trips,
              COALESCE(SUM(t.amount), 0) AS revenue
       FROM trips t
       JOIN cities c ON t.city_id = c.id
       WHERE ${whereClause}
       GROUP BY c.id, c.name
       ORDER BY trips DESC`,
      params,
    );

    const total = rows.reduce((s, r) => s + toNumber(r.trips), 0);
    const colors = [
      "#38AC57",
      "#0ea5e9",
      "#f97316",
      "#eab308",
      "#ef4444",
      "#8b5cf6",
      "#ec4899",
    ];

    const data = rows.map((r, i) => ({
      name: r.regionName,
      value: total > 0 ? Math.round((toNumber(r.trips) / total) * 100) : 0,
      color: colors[i % colors.length],
      revenue: toNumber(r.revenue).toLocaleString(),
    }));

    res.json(data);
  } catch (err) {
    console.error("getRegionalPerformance error:", err);
    res.json([]);
  }
};

// ─── GET /api/admin/reports/top-performers ─────────────────────────────────
exports.getTopPerformers = async (req, res) => {
  try {
    const { type, period, regionId, serviceTypeId } = req.query;
    const tripParams = [];
    const tripWhereClause = buildTripWhereClause(
      { period, regionId, serviceTypeId, dateCol: "t.created_at" },
      tripParams,
    );

    if (type === "rider") {
      const [rows] = await db.pool.execute(
        `SELECT r.id, r.name, r.image_url AS imageUrl,
                c.name AS region,
                COUNT(t.id) AS trips,
                COALESCE(SUM(t.amount), 0) AS earnings,
                COALESCE((SELECT AVG(rv.rating) FROM reviews rv WHERE rv.reviewee_id = r.id), 0) AS rating
         FROM riders r
         LEFT JOIN trips t ON t.rider_id = r.id AND ${tripWhereClause}
         LEFT JOIN cities c ON r.city_id = c.id
         GROUP BY r.id
         ORDER BY trips DESC
         LIMIT 10`,
        tripParams,
      );

      res.json(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          region: r.region || "N/A",
          trips: toNumber(r.trips),
          earnings: toNumber(r.earnings).toLocaleString(),
          rating: parseFloat(Number(r.rating).toFixed(1)),
          status: "Frequent",
          imageUrl: r.imageUrl,
        })),
      );
    } else {
      // driver
      const [rows] = await db.pool.execute(
        `SELECT d.id, d.name, d.image_url AS imageUrl,
                COALESCE(c.name, trip_city.name) AS region,
                COUNT(t.id) AS trips,
                COALESCE(SUM(t.amount), 0) AS earnings,
                COALESCE((SELECT AVG(rv.rating) FROM reviews rv WHERE rv.reviewee_id = d.id), 0) AS rating
         FROM drivers d
         LEFT JOIN trips t ON t.driver_id = d.id AND ${tripWhereClause}
         LEFT JOIN cities c ON d.city_id = c.id
         LEFT JOIN cities trip_city ON t.city_id = trip_city.id
         GROUP BY d.id
         ORDER BY trips DESC
         LIMIT 10`,
        tripParams,
      );

      res.json(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          region: r.region || "N/A",
          trips: toNumber(r.trips),
          earnings: toNumber(r.earnings).toLocaleString(),
          rating: parseFloat(Number(r.rating).toFixed(1)),
          status: "Active",
          imageUrl: r.imageUrl,
        })),
      );
    }
  } catch (err) {
    console.error("getTopPerformers error:", err);
    res.json([]);
  }
};

// ─── GET /api/admin/reports/regional-summary ───────────────────────────────
exports.getRegionalSummary = async (req, res) => {
  try {
    const { period, regionId, serviceTypeId } = req.query;
    const params = [];
    const whereClause = buildTripWhereClause(
      { period, regionId, serviceTypeId, dateCol: "t.created_at" },
      params,
    );

    const [rows] = await db.pool.execute(
      `SELECT c.name AS region,
              COUNT(t.id) AS trips,
              COALESCE(SUM(t.amount), 0) AS revenue,
              COUNT(DISTINCT t.driver_id) AS activeDrivers,
              COALESCE(AVG(t.amount), 0) AS avgTripValue
       FROM trips t
       JOIN cities c ON t.city_id = c.id
       WHERE ${whereClause}
       GROUP BY c.id, c.name
       ORDER BY trips DESC`,
      params,
    );

    const totalTrips = rows.reduce((s, r) => s + toNumber(r.trips), 0);
    const colors = [
      "#38AC57",
      "#0ea5e9",
      "#f97316",
      "#eab308",
      "#ef4444",
      "#8b5cf6",
      "#ec4899",
    ];

    const data = rows.map((r, i) => ({
      region: r.region,
      share:
        totalTrips > 0
          ? `${((toNumber(r.trips) / totalTrips) * 100).toFixed(1)}%`
          : "0%",
      revenue: `${toNumber(r.revenue).toLocaleString()} MAD`,
      activeDrivers: toNumber(r.activeDrivers),
      growth: "+0%",
      avgTripValue: `${toNumber(r.avgTripValue).toFixed(2)} MAD`,
      color: colors[i % colors.length],
    }));

    res.json(data);
  } catch (err) {
    console.error("getRegionalSummary error:", err);
    res.json([]);
  }
};

// ─── GET /api/admin/reports/export ─────────────────────────────────────────
exports.exportData = async (req, res) => {
  try {
    const { format, regionId, serviceTypeId, period } = req.query;
    const params = [];
    const whereClause = buildTripWhereClause(
      { period, regionId, serviceTypeId, dateCol: "t.created_at" },
      params,
    );

    const [rows] = await db.pool.execute(
      `SELECT t.id, t.status, t.amount AS price,
              t.created_at AS createdAt,
              r.name AS passengerName,
              d.name AS driverName,
              c.name AS city
       FROM trips t
       LEFT JOIN riders r ON t.rider_id = r.id
       LEFT JOIN drivers d ON t.driver_id = d.id
       LEFT JOIN cities c ON t.city_id = c.id
       WHERE ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT 1000`,
      params,
    );

    if (format === "csv") {
      const header = "ID,Passenger,Driver,City,Status,Price,Date\n";
      const csvRows = rows.map(
        (r) =>
          `${r.id},"${r.passengerName || ""}","${r.driverName || ""}","${r.city || ""}",${r.status},${r.price || 0},${r.createdAt}`,
      );
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=report.csv");
      res.send(header + csvRows.join("\n"));
    } else if (format === "pdf") {
      const pdfBuffer = await buildPdfReport(rows);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=report.pdf");
      res.send(pdfBuffer);
    } else if (format === "excel") {
      const header = "ID\tPassenger\tDriver\tCity\tStatus\tPrice\tDate\n";
      const excelRows = rows.map(
        (r) =>
          `${r.id}\t${r.passengerName || ""}\t${r.driverName || ""}\t${r.city || ""}\t${r.status || ""}\t${r.price || 0}\t${r.createdAt}`,
      );
      res.setHeader("Content-Type", "application/vnd.ms-excel");
      res.setHeader("Content-Disposition", "attachment; filename=report.xls");
      res.send(header + excelRows.join("\n"));
    } else {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=report.json");
      res.json(rows);
    }
  } catch (err) {
    console.error("exportData error:", err);
    res.status(500).json({ message: "Export failed" });
  }
};
