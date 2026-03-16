const db = require("../config/db");

const SERVICE_TYPES = ["CAR_RIDES", "MOTORCYCLE", "TAXI"];
const columnCache = new Map();
const tableCache = new Map();

async function getTableColumns(tableName) {
  if (columnCache.has(tableName)) {
    return columnCache.get(tableName);
  }

  const [rows] = await db.pool.execute(
    `
      SELECT COLUMN_NAME AS columnName
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `,
    [tableName],
  );

  const columns = new Set(rows.map((row) => row.columnName));
  columnCache.set(tableName, columns);
  return columns;
}

async function hasTable(tableName) {
  if (tableCache.has(tableName)) {
    return tableCache.get(tableName);
  }

  const [rows] = await db.pool.execute(
    `
      SELECT 1 AS existsFlag
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      LIMIT 1
    `,
    [tableName],
  );

  const exists = rows.length > 0;
  tableCache.set(tableName, exists);
  return exists;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculatePercentageChange(currentValue, previousValue) {
  const current = toNumber(currentValue);
  const previous = toNumber(previousValue);

  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round(((current - previous) / previous) * 100);
}

function toSqlDateString(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function shiftDate(dateValue, days) {
  const date = new Date(dateValue);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function getPeriodRange(period, referenceDate) {
  const endDate = new Date(referenceDate);
  endDate.setUTCHours(0, 0, 0, 0);

  const startDate = new Date(endDate);
  if (period === "weekly") {
    startDate.setUTCDate(endDate.getUTCDate() - 6);
  } else if (period === "monthly") {
    startDate.setUTCDate(1);
  }

  return {
    startDate: toSqlDateString(startDate),
    endDate: toSqlDateString(endDate),
  };
}

function buildCreatedAtDateFilter(alias, startDate, endDate, params) {
  params.push(startDate, endDate);
  return `DATE(${alias}.created_at) BETWEEN ? AND ?`;
}

function buildRegionFilter(alias, regionName, params) {
  if (!regionName) {
    return "";
  }

  params.push(regionName);
  return ` AND ${alias}.region = ?`;
}

function formatDateLabel(date) {
  return date.toISOString().slice(0, 10);
}

function buildPeriodLabels(period, referenceDate) {
  const labels = [];
  const anchorDate = new Date(referenceDate);
  anchorDate.setUTCHours(0, 0, 0, 0);

  if (period === "daily") {
    return ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00", "00:00"];
  }

  if (period === "weekly") {
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = shiftDate(anchorDate, -offset);
      labels.push(formatDateLabel(date));
    }
    return labels;
  }

  const current = new Date(
    Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth(), 1),
  );
  while (current <= anchorDate) {
    labels.push(formatDateLabel(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return labels;
}

function getDailyBucketCase() {
  return `
    CASE
      WHEN HOUR(t.created_at) BETWEEN 6 AND 8 THEN '06:00'
      WHEN HOUR(t.created_at) BETWEEN 9 AND 11 THEN '09:00'
      WHEN HOUR(t.created_at) BETWEEN 12 AND 14 THEN '12:00'
      WHEN HOUR(t.created_at) BETWEEN 15 AND 17 THEN '15:00'
      WHEN HOUR(t.created_at) BETWEEN 18 AND 20 THEN '18:00'
      WHEN HOUR(t.created_at) BETWEEN 21 AND 23 THEN '21:00'
      ELSE '00:00'
    END
  `;
}

function getServiceTypeExpression(withServiceTypes) {
  if (!withServiceTypes) {
    return "'CAR_RIDES'";
  }

  return `
    CASE
      WHEN st.name IN ('CAR_RIDES', 'MOTORCYCLE', 'TAXI') THEN st.name
      ELSE 'CAR_RIDES'
    END
  `;
}

function normalizePeriod(period) {
  if (period === "daily" || period === "weekly" || period === "monthly") {
    return period;
  }

  return null;
}

async function getRegionsCatalog() {
  const [rows] = await db.pool.execute(`
    SELECT DISTINCT TRIM(region) AS name
    FROM trips
    WHERE region IS NOT NULL AND TRIM(region) <> ''
    ORDER BY name ASC
  `);

  return rows.map((row, index) => ({
    id: index + 1,
    name: row.name,
  }));
}

async function getLatestTripDate(regionName = null) {
  const params = [];
  const regionFilter = buildRegionFilter("t", regionName, params);
  const [rows] = await db.pool.execute(
    `
      SELECT MAX(DATE(t.created_at)) AS latestTripDate
      FROM trips t
      WHERE t.created_at IS NOT NULL${regionFilter}
    `,
    params,
  );

  return rows[0]?.latestTripDate ? new Date(rows[0].latestTripDate) : null;
}

async function resolveRegionFilter(regionId) {
  const parsedId = Number(regionId || 0);
  if (!Number.isInteger(parsedId) || parsedId < 0) {
    return { invalid: true };
  }

  if (parsedId === 0) {
    return { regionId: 0, regionName: null };
  }

  const regions = await getRegionsCatalog();
  const match = regions.find((region) => region.id === parsedId);
  if (!match) {
    return { invalid: true };
  }

  return { regionId: match.id, regionName: match.name };
}

function getLocationExpression(alias, columns, cityTableAvailable, cityAlias) {
  if (columns.has("location")) {
    if (cityTableAvailable && columns.has("city_id")) {
      return `COALESCE(${alias}.location, ${cityAlias}.name, 'N/A')`;
    }
    return `COALESCE(${alias}.location, 'N/A')`;
  }

  if (cityTableAvailable && columns.has("city_id")) {
    return `COALESCE(${cityAlias}.name, 'N/A')`;
  }

  return "'N/A'";
}

async function getActiveDriverCondition(alias = "d") {
  const driverColumns = await getTableColumns("drivers");
  if (driverColumns.has("is_online") && driverColumns.has("status")) {
    return `(COALESCE(${alias}.is_online, 0) = TRUE OR LOWER(COALESCE(${alias}.status, '')) = 'active')`;
  }
  if (driverColumns.has("is_online")) {
    return `COALESCE(${alias}.is_online, 0) = TRUE`;
  }
  return `${alias}.status = 'active'`;
}

exports.getRegions = async (req, res) => {
  try {
    const regions = await getRegionsCatalog();
    res.status(200).json(regions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getStats = async (req, res) => {
  try {
    const region = await resolveRegionFilter(req.query.regionId);
    if (region.invalid) {
      return res.status(400).json({ message: "Invalid regionId" });
    }

    const referenceDate = await getLatestTripDate(region.regionName);
    if (!referenceDate) {
      return res.status(200).json({
        totalTripsToday: 0,
        activeDrivers: 0,
        totalEarnings: 0,
        dailyBonusEarned: 0,
        vsYesterday: {
          totalTripsToday: 0,
          activeDrivers: 0,
          totalEarnings: 0,
          dailyBonusEarned: 0,
        },
      });
    }

    const referenceDateSql = toSqlDateString(referenceDate);
    const previousDateSql = toSqlDateString(shiftDate(referenceDate, -1));

    const todayParams = [referenceDateSql];
    const todayRegionFilter = buildRegionFilter(
      "t",
      region.regionName,
      todayParams,
    );
    const yesterdayParams = [previousDateSql];
    const yesterdayRegionFilter = buildRegionFilter(
      "t",
      region.regionName,
      yesterdayParams,
    );
    const [todayRows] = await db.pool.execute(
      `
        SELECT
          COUNT(*) AS totalTripsToday,
          CAST(COALESCE(SUM(t.amount), 0) AS DECIMAL(10, 2)) AS totalEarnings,
          CAST(COALESCE(SUM(t.bonus), 0) AS DECIMAL(10, 2)) AS dailyBonusEarned
        FROM trips t
        WHERE DATE(t.created_at) = ?${todayRegionFilter}
      `,
      todayParams,
    );

    const [yesterdayRows] = await db.pool.execute(
      `
        SELECT
          COUNT(*) AS totalTripsToday,
          CAST(COALESCE(SUM(t.amount), 0) AS DECIMAL(10, 2)) AS totalEarnings,
          CAST(COALESCE(SUM(t.bonus), 0) AS DECIMAL(10, 2)) AS dailyBonusEarned
        FROM trips t
        WHERE DATE(t.created_at) = ?${yesterdayRegionFilter}
      `,
      yesterdayParams,
    );

    const activeDriverCondition = await getActiveDriverCondition("d");

    let activeDrivers = 0;
    let yesterdayActiveDrivers = 0;

    if (region.regionName) {
      const regionParams = [referenceDateSql, region.regionName];
      const [activeDriverRows] = await db.pool.execute(
        `
          SELECT COUNT(DISTINCT d.id) AS activeDrivers
          FROM drivers d
          JOIN trips t ON t.driver_id = d.id
          WHERE ${activeDriverCondition}
            AND DATE(t.created_at) = ?
            AND t.region = ?
        `,
        regionParams,
      );

      const yesterdayRegionParams = [previousDateSql, region.regionName];
      const [yesterdayActiveDriverRows] = await db.pool.execute(
        `
          SELECT COUNT(DISTINCT d.id) AS activeDrivers
          FROM drivers d
          JOIN trips t ON t.driver_id = d.id
          WHERE ${activeDriverCondition}
            AND DATE(t.created_at) = ?
            AND t.region = ?
        `,
        yesterdayRegionParams,
      );

      activeDrivers = toNumber(activeDriverRows[0]?.activeDrivers);
      yesterdayActiveDrivers = toNumber(
        yesterdayActiveDriverRows[0]?.activeDrivers,
      );
    } else {
      const [activeDriverRows] = await db.pool.execute(
        `SELECT COUNT(*) AS activeDrivers FROM drivers d WHERE ${activeDriverCondition}`,
      );

      const [yesterdayActiveDriverRows] = await db.pool.execute(
        `
          SELECT COUNT(DISTINCT d.id) AS activeDrivers
          FROM drivers d
          JOIN trips t ON t.driver_id = d.id
          WHERE ${activeDriverCondition}
            AND DATE(t.created_at) = ?
        `,
        [previousDateSql],
      );

      activeDrivers = toNumber(activeDriverRows[0]?.activeDrivers);
      yesterdayActiveDrivers = toNumber(
        yesterdayActiveDriverRows[0]?.activeDrivers,
      );
    }

    const today = todayRows[0] || {};
    const yesterday = yesterdayRows[0] || {};

    res.status(200).json({
      totalTripsToday: toNumber(today.totalTripsToday),
      activeDrivers,
      totalEarnings: toNumber(today.totalEarnings),
      dailyBonusEarned: toNumber(today.dailyBonusEarned),
      vsYesterday: {
        totalTripsToday: calculatePercentageChange(
          today.totalTripsToday,
          yesterday.totalTripsToday,
        ),
        activeDrivers: calculatePercentageChange(
          activeDrivers,
          yesterdayActiveDrivers,
        ),
        totalEarnings: calculatePercentageChange(
          today.totalEarnings,
          yesterday.totalEarnings,
        ),
        dailyBonusEarned: calculatePercentageChange(
          today.dailyBonusEarned,
          yesterday.dailyBonusEarned,
        ),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTripsChart = async (req, res) => {
  try {
    const period = normalizePeriod(req.query.period || "monthly");
    if (!period) {
      return res.status(400).json({ message: "Invalid period" });
    }

    const region = await resolveRegionFilter(req.query.regionId);
    if (region.invalid) {
      return res.status(400).json({ message: "Invalid regionId" });
    }

    const referenceDate = await getLatestTripDate(region.regionName);
    if (!referenceDate) {
      return res.status(200).json({
        period,
        serviceTypes: SERVICE_TYPES,
        data: [],
      });
    }

    const driverColumns = await getTableColumns("drivers");
    const withServiceTypes =
      (await hasTable("service_types")) && driverColumns.has("service_type_id");
    const params = [];
    const { startDate, endDate } = getPeriodRange(period, referenceDate);
    const dateFilter = buildCreatedAtDateFilter(
      "t",
      startDate,
      endDate,
      params,
    );
    const regionFilter = buildRegionFilter("t", region.regionName, params);
    const serviceTypeExpression = getServiceTypeExpression(withServiceTypes);
    const labelExpression =
      period === "daily"
        ? getDailyBucketCase()
        : "DATE_FORMAT(t.created_at, '%Y-%m-%d')";

    const joinClause = withServiceTypes
      ? "LEFT JOIN drivers d ON d.id = t.driver_id LEFT JOIN service_types st ON st.id = d.service_type_id"
      : "LEFT JOIN drivers d ON d.id = t.driver_id";

    const [rows] = await db.pool.execute(
      `
        SELECT
          ${labelExpression} AS label,
          ${serviceTypeExpression} AS serviceType,
          COUNT(*) AS totalTrips
        FROM trips t
        ${joinClause}
        WHERE ${dateFilter}${regionFilter}
        GROUP BY label, serviceType
        ORDER BY label ASC
      `,
      params,
    );

    const buckets = new Map();
    for (const label of buildPeriodLabels(period, referenceDate)) {
      buckets.set(label, {
        label,
        CAR_RIDES: 0,
        MOTORCYCLE: 0,
        TAXI: 0,
        TOTAL: 0,
      });
    }

    for (const row of rows) {
      if (!buckets.has(row.label)) {
        buckets.set(row.label, {
          label: row.label,
          CAR_RIDES: 0,
          MOTORCYCLE: 0,
          TAXI: 0,
          TOTAL: 0,
        });
      }

      const point = buckets.get(row.label);
      const serviceType = SERVICE_TYPES.includes(row.serviceType)
        ? row.serviceType
        : "CAR_RIDES";
      point[serviceType] = toNumber(row.totalTrips);
      point.TOTAL = point.CAR_RIDES + point.MOTORCYCLE + point.TAXI;
    }

    res.status(200).json({
      period,
      serviceTypes: SERVICE_TYPES,
      data: Array.from(buckets.values()),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTopRegions = async (req, res) => {
  try {
    const region = await resolveRegionFilter(req.query.regionId);
    if (region.invalid) {
      return res.status(400).json({ message: "Invalid regionId" });
    }

    const requestedLimit = Number(req.query.limit || 5);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(20, requestedLimit))
      : 5;
    const activeDriverCondition = await getActiveDriverCondition("d");

    const referenceDate = await getLatestTripDate(region.regionName);
    if (!referenceDate) {
      return res.status(200).json([]);
    }

    const referenceDateSql = toSqlDateString(referenceDate);
    const previousDateSql = toSqlDateString(shiftDate(referenceDate, -1));

    const todayParams = [referenceDateSql];
    const todayRegionFilter = buildRegionFilter(
      "t",
      region.regionName,
      todayParams,
    );
    const yesterdayParams = [previousDateSql];
    const yesterdayRegionFilter = buildRegionFilter(
      "t",
      region.regionName,
      yesterdayParams,
    );

    const [todayRows] = await db.pool.execute(
      `
        SELECT
          t.region AS regionName,
          COUNT(*) AS trips,
          COUNT(DISTINCT CASE WHEN ${activeDriverCondition} THEN d.id END) AS activeDrivers
        FROM trips t
        LEFT JOIN drivers d ON d.id = t.driver_id
        WHERE DATE(t.created_at) = ?${todayRegionFilter}
        GROUP BY t.region
        ORDER BY trips DESC, regionName ASC
      `,
      todayParams,
    );

    const [yesterdayRows] = await db.pool.execute(
      `
        SELECT
          t.region AS regionName,
          COUNT(*) AS trips
        FROM trips t
        WHERE DATE(t.created_at) = ?${yesterdayRegionFilter}
        GROUP BY t.region
      `,
      yesterdayParams,
    );

    const regions = await getRegionsCatalog();
    const regionIdMap = new Map(regions.map((entry) => [entry.name, entry.id]));
    const yesterdayMap = new Map(
      yesterdayRows.map((row) => [row.regionName, toNumber(row.trips)]),
    );

    res.status(200).json(
      todayRows.slice(0, limit).map((row) => ({
        regionId: regionIdMap.get(row.regionName) || 0,
        regionName: row.regionName,
        trips: toNumber(row.trips),
        activeDrivers: toNumber(row.activeDrivers),
        growthPercent: calculatePercentageChange(
          row.trips,
          yesterdayMap.get(row.regionName),
        ),
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTripsByRegion = async (req, res) => {
  try {
    const period = normalizePeriod(req.query.period || "monthly");
    if (!period) {
      return res.status(400).json({ message: "Invalid period" });
    }

    const region = await resolveRegionFilter(req.query.regionId);
    if (region.invalid) {
      return res.status(400).json({ message: "Invalid regionId" });
    }

    const referenceDate = await getLatestTripDate(region.regionName);
    if (!referenceDate) {
      return res.status(200).json({
        period,
        total: 0,
        data: [],
      });
    }

    const params = [];
    const { startDate, endDate } = getPeriodRange(period, referenceDate);
    const dateFilter = buildCreatedAtDateFilter(
      "t",
      startDate,
      endDate,
      params,
    );
    const regionFilter = buildRegionFilter("t", region.regionName, params);
    const [rows] = await db.pool.execute(
      `
        SELECT
          t.region AS regionName,
          COUNT(*) AS trips
        FROM trips t
        WHERE ${dateFilter}${regionFilter}
        GROUP BY t.region
        ORDER BY trips DESC, regionName ASC
      `,
      params,
    );

    const total = rows.reduce((sum, row) => sum + toNumber(row.trips), 0);
    res.status(200).json({
      period,
      total,
      data: rows.map((row) => ({
        regionName: row.regionName,
        trips: toNumber(row.trips),
        percentage:
          total > 0 ? Math.round((toNumber(row.trips) / total) * 100) : 0,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTopPerformers = async (req, res) => {
  try {
    const region = await resolveRegionFilter(req.query.regionId);
    if (region.invalid) {
      return res.status(400).json({ message: "Invalid regionId" });
    }

    const type = req.query.type === "passenger" ? "passenger" : "driver";
    const requestedLimit = Number(req.query.limit || 6);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(20, requestedLimit))
      : 6;
    const cityTableAvailable = await hasTable("cities");

    if (type === "driver") {
      const driverColumns = await getTableColumns("drivers");
      const imageExpression = driverColumns.has("image_url")
        ? "d.image_url"
        : "NULL";
      const ratingExpression = driverColumns.has("rating")
        ? "COALESCE(d.rating, 0)"
        : "0";
      const locationExpression = getLocationExpression(
        "d",
        driverColumns,
        cityTableAvailable,
        "c",
      );
      const joinCityClause =
        cityTableAvailable && driverColumns.has("city_id")
          ? "LEFT JOIN cities c ON c.id = d.city_id"
          : "";

      const params = [];
      const regionFilter = buildRegionFilter("t", region.regionName, params);
      params.push(limit);

      const [rows] = await db.pool.execute(
        `
          SELECT
            d.id,
            d.name,
            ${imageExpression} AS imageUrl,
            ${ratingExpression} AS rating,
            ${locationExpression} AS city,
            COUNT(*) AS totalTrips
          FROM drivers d
          JOIN trips t ON t.driver_id = d.id
          ${joinCityClause}
          WHERE t.status = 'COMPLETED'${regionFilter}
          GROUP BY d.id, d.name, imageUrl, rating, city
          ORDER BY totalTrips DESC, d.name ASC
          LIMIT ?
        `,
        params,
      );

      return res.status(200).json(
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          imageUrl: row.imageUrl,
          rating: toNumber(row.rating),
          city: row.city,
          totalTrips: toNumber(row.totalTrips),
        })),
      );
    }

    const riderColumns = await getTableColumns("riders");
    const imageExpression = riderColumns.has("image_url")
      ? "r.image_url"
      : "NULL";
    const ratingExpression = riderColumns.has("rating")
      ? "COALESCE(r.rating, 0)"
      : "4.9";
    const locationExpression = getLocationExpression(
      "r",
      riderColumns,
      cityTableAvailable,
      "c",
    );
    const joinCityClause =
      cityTableAvailable && riderColumns.has("city_id")
        ? "LEFT JOIN cities c ON c.id = r.city_id"
        : "";

    const params = [];
    const regionFilter = buildRegionFilter("t", region.regionName, params);
    params.push(limit);

    const [rows] = await db.pool.execute(
      `
        SELECT
          r.id,
          r.name,
          ${imageExpression} AS imageUrl,
          ${ratingExpression} AS rating,
          ${locationExpression} AS city,
          COUNT(*) AS totalTrips
        FROM riders r
        JOIN trips t ON t.rider_id = r.id
        ${joinCityClause}
        WHERE t.status = 'COMPLETED'${regionFilter}
        GROUP BY r.id, r.name, imageUrl, rating, city
        ORDER BY totalTrips DESC, r.name ASC
        LIMIT ?
      `,
      params,
    );

    return res.status(200).json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        imageUrl: row.imageUrl,
        rating: toNumber(row.rating),
        city: row.city,
        totalTrips: toNumber(row.totalTrips),
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
