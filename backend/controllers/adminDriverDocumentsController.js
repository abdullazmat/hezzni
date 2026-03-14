const db = require("../config/db");

async function execute(sql, params = []) {
  const [rows] = await db.pool.execute(sql, params);
  return rows;
}

const TYPE_COLUMN_MAP = {
  CAR: "car_ride_status",
  MOTO: "motorcycle_status",
  TAXI: "taxi_status",
};

const DOCUMENT_CONFIG = {
  CAR: [
    {
      key: "nationalId",
      name: "National ID Card (CIN)",
      desc: "Government-issued identification.",
      completedKey: "isNationalIdCompleted",
    },
    {
      key: "driverLicense",
      name: "Driver's License",
      desc: "Valid and current driver's license.",
      completedKey: "isDriverLicenseCompleted",
    },
    {
      key: "professionalCard",
      name: "Pro Driver Card / Carte Professionnelle",
      desc: "Professional permit required for commercial drivers.",
      completedKey: "isProfessionalCardCompleted",
    },
    {
      key: "vehicleRegistration",
      name: "Vehicle Registration (Carte Grise)",
      desc: "Proof of vehicle ownership.",
      completedKey: "isVehicleRegistrationCompleted",
    },
    {
      key: "vehicleInsurance",
      name: "Vehicle Detail",
      desc: "Add current vehicle insurance details.",
      completedKey: "isVehicleInsuranceCompleted",
    },
    {
      key: "vehicleDetails",
      name: "Vehicle Details",
      desc: "Provide make, model, and plate number.",
      completedKey: "isVehicleDetailsCompleted",
    },
    {
      key: "vehiclePhotos",
      name: "Vehicle Photos",
      desc: "Upload clear exterior photos of your vehicle.",
      completedKey: "isVehiclePhotosCompleted",
    },
    {
      key: "faceVerification",
      name: "Face Verification",
      desc: "Take a selfie to confirm your identity.",
      completedKey: "isFaceVerificationCompleted",
    },
  ],
  MOTO: [
    {
      key: "nationalId",
      name: "National ID Card (CIN)",
      desc: "Government-issued identification.",
      completedKey: "isNationalIdCompleted",
    },
    {
      key: "driverLicense",
      name: "Driver's License",
      desc: "Valid and current driver's license.",
      completedKey: "isDriverLicenseCompleted",
    },
    {
      key: "vehicleRegistration",
      name: "Vehicle Registration (Carte Grise)",
      desc: "Proof of vehicle ownership.",
      completedKey: "isVehicleRegistrationCompleted",
    },
    {
      key: "vehicleDetails",
      name: "Vehicle Details",
      desc: "Provide make, model, and plate number.",
      completedKey: "isVehicleDetailsCompleted",
    },
    {
      key: "vehiclePhotos",
      name: "Vehicle Photos",
      desc: "Upload clear exterior photos of your vehicle.",
      completedKey: "isVehiclePhotosCompleted",
    },
    {
      key: "faceVerification",
      name: "Face Verification",
      desc: "Take a selfie to confirm your identity.",
      completedKey: "isFaceVerificationCompleted",
    },
  ],
  TAXI: [
    {
      key: "nationalId",
      name: "National ID Card (CIN)",
      desc: "Government-issued identification.",
      completedKey: "isNationalIdCompleted",
    },
    {
      key: "driverLicense",
      name: "Driver's License",
      desc: "Valid and current driver's license.",
      completedKey: "isDriverLicenseCompleted",
    },
    {
      key: "professionalCard",
      name: "Pro Driver Card / Carte Professionnelle",
      desc: "Professional permit required for commercial drivers.",
      completedKey: "isProfessionalCardCompleted",
    },
    {
      key: "taxiLicense",
      name: "Taxi License(Taxi Drivers Only)",
      desc: "Required only if you drive a taxi.",
      completedKey: "isTaxiLicenseCompleted",
    },
    {
      key: "vehicleRegistration",
      name: "Vehicle Registration (Carte Grise)",
      desc: "Proof of vehicle ownership.",
      completedKey: "isVehicleRegistrationCompleted",
    },
    {
      key: "vehicleDetails",
      name: "Vehicle Details",
      desc: "Provide make, model, and plate number.",
      completedKey: "isVehicleDetailsCompleted",
    },
    {
      key: "vehiclePhotos",
      name: "Vehicle Photos",
      desc: "Upload clear exterior photos of your vehicle.",
      completedKey: "isVehiclePhotosCompleted",
    },
    {
      key: "faceVerification",
      name: "Face Verification",
      desc: "Take a selfie to confirm your identity.",
      completedKey: "isFaceVerificationCompleted",
    },
  ],
};

const DISPLAY_TO_DB_STATUS = {
  Pending: "PENDING",
  "Under Review": "IN_REVIEW",
  Verified: "APPROVED",
  Updated: "IN_REVIEW",
  Rejected: "REJECTED",
  Expired: "EXPIRED",
  Completed: "APPROVED",
};

const DB_TO_DISPLAY_STATUS = {
  PENDING: "Pending",
  IN_REVIEW: "Under Review",
  APPROVED: "Verified",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

function parseJson(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function detectType(row) {
  const serviceTypeId = Number(row.service_type_id || 0);
  const serviceName = String(row.service_type_name || "").toLowerCase();
  if (serviceTypeId === 4 || serviceName.includes("rental")) return null;
  if (serviceTypeId === 3) return "TAXI";
  if (serviceTypeId === 2) return "MOTO";
  if (serviceTypeId === 1) return "CAR";
  if (serviceName.includes("taxi") || row.taxi_status) return "TAXI";
  if (serviceName.includes("motor") || row.motorcycle_status) return "MOTO";
  if (serviceName.includes("car") || row.car_ride_status) return "CAR";
  return "CAR";
}

function getStatusPayload(row, type) {
  return parseJson(row[TYPE_COLUMN_MAP[type]]);
}

function formatDriverCode(type, id) {
  return `${type.charAt(0)}-${String(id).padStart(5, "0")}`;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

function getNestedImages(docKey, payload) {
  const data = payload?.[docKey] || {};
  const images = [];

  const addValue = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(addValue);
      return;
    }
    if (typeof value === "object") {
      Object.values(value).forEach(addValue);
      return;
    }
    if (typeof value === "string") {
      images.push(value);
    }
  };

  addValue(data.frontImage);
  addValue(data.backImage);
  addValue(data.selfieImage);
  addValue(data.image);
  addValue(data.images);
  addValue(data.photos);
  addValue(data.vehiclePhotos);

  return [...new Set(images.filter(Boolean))];
}

function getVehicleInfo(payload) {
  const details = payload?.vehicleDetails || {};
  return {
    colour:
      details.color ||
      details.colour ||
      details.vehicleColor ||
      details.vehicleColour ||
      "",
    licensePlate:
      details.licencePlate ||
      details.licensePlate ||
      details.plateNumber ||
      details.registrationNumber ||
      "",
    makeModel:
      details.makeModel ||
      [details.make, details.model].filter(Boolean).join(" ") ||
      details.vehicleModel ||
      "",
    year: details.year || details.vehicleYear || "",
  };
}

function isExpiredDocument(docKey, payload) {
  const data = payload?.[docKey] || {};
  const expiryValue = data.expiryDate || data.expiry;
  if (!expiryValue) return false;
  const expiry = new Date(expiryValue);
  if (Number.isNaN(expiry.getTime())) return false;
  return expiry.getTime() < Date.now();
}

function buildDocumentStatus(type, config, payload) {
  const adminReview = parseJson(payload.adminReview);
  const overrides = parseJson(adminReview.documentStatuses);
  const overrideStatus = overrides[config.key];

  if (overrideStatus && DB_TO_DISPLAY_STATUS[overrideStatus]) {
    return DB_TO_DISPLAY_STATUS[overrideStatus];
  }
  if (isExpiredDocument(config.key, payload)) {
    return "Expired";
  }
  if (payload[config.completedKey]) {
    return payload.status === "IN_REVIEW" ? "Under Review" : "Verified";
  }
  if (payload.status === "REJECTED") return "Rejected";
  if (payload.status === "IN_REVIEW") return "Under Review";
  return "Pending";
}

function buildApplicationStatus(type, payload) {
  const adminReview = parseJson(payload.adminReview);
  const applicationStatus = adminReview.applicationStatus || payload.status;

  if (applicationStatus && DB_TO_DISPLAY_STATUS[applicationStatus]) {
    return DB_TO_DISPLAY_STATUS[applicationStatus];
  }

  const statuses = DOCUMENT_CONFIG[type].map((config) =>
    buildDocumentStatus(type, config, payload),
  );

  if (statuses.some((status) => status === "Rejected")) return "Rejected";
  if (statuses.some((status) => status === "Expired")) return "Expired";
  if (statuses.some((status) => status === "Under Review"))
    return "Under Review";
  if (statuses.length && statuses.every((status) => status === "Verified"))
    return "Completed";
  return "Pending";
}

function buildDocumentEntries(row, type) {
  const payload = getStatusPayload(row, type);
  return DOCUMENT_CONFIG[type].map((config) => ({
    key: config.key,
    name: config.name,
    desc: config.desc,
    status: buildDocumentStatus(type, config, payload),
    date:
      formatDate(payload?.[config.key]?.updatedAt) ||
      formatDate(row.joined_date),
    images: getNestedImages(config.key, payload),
  }));
}

function hasMeaningfulPayload(payload) {
  if (!payload || typeof payload !== "object") return false;

  return Object.entries(payload).some(([key, value]) => {
    if (key === "status") {
      return value && value !== "PENDING";
    }

    if (key === "adminReview") {
      const review = parseJson(value);
      return Object.keys(review).length > 0;
    }

    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object")
      return Object.keys(value).length > 0;
    return Boolean(value);
  });
}

function buildListEntries(row, type) {
  const payload = getStatusPayload(row, type);
  const applicationStatus = buildApplicationStatus(type, payload);

  if (!hasMeaningfulPayload(payload)) {
    return [
      {
        key: "registrationDocuments",
        name: "Registration Documents",
        desc: "Driver registration submission awaiting onboarding documents.",
        status: applicationStatus,
        date: formatDate(row.joined_date),
        images: [],
      },
    ];
  }

  return buildDocumentEntries(row, type);
}

async function getDriverRows() {
  const rows = await execute(
    `SELECT
        d.id,
        d.name,
        d.phone,
        d.email,
        d.gender,
        d.dob,
        d.status,
        d.image_url,
        d.joined_date,
        d.service_type_id,
          d.is_registered,
          d.location,
        d.car_ride_status,
        d.motorcycle_status,
        d.taxi_status,
        c.name AS city_name,
        st.name AS service_type_name
     FROM drivers d
     LEFT JOIN cities c ON c.id = d.city_id
        LEFT JOIN service_types st ON st.id = d.service_type_id
        ORDER BY d.joined_date DESC, d.id DESC`,
  );
  return rows;
}

exports.getStats = async (req, res) => {
  try {
    const rows = await getDriverRows();
    const applications = rows
      .map((row) => {
        const type = detectType(row);
        if (!type) return null;
        return {
          type,
          status: buildApplicationStatus(type, getStatusPayload(row, type)),
        };
      })
      .filter(Boolean);

    res.json({
      totalApplications: applications.length,
      pendingReview: applications.filter((item) => item.status === "Pending")
        .length,
      underReview: applications.filter((item) => item.status === "Under Review")
        .length,
      approved: applications.filter((item) => item.status === "Completed")
        .length,
      rejected: applications.filter((item) => item.status === "Rejected")
        .length,
      expired: applications.filter((item) => item.status === "Expired").length,
    });
  } catch (err) {
    console.error("getStats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getList = async (req, res) => {
  try {
    const { status, type, tab } = req.query;
    const rows = await getDriverRows();

    const documents = rows.flatMap((row) => {
      const resolvedType = detectType(row);
      if (!resolvedType || (type && type !== resolvedType)) {
        return [];
      }

      return buildListEntries(row, resolvedType).map((entry) => ({
        driverId: formatDriverCode(resolvedType, row.id),
        driverName: row.name || "Unknown",
        avatar: row.image_url || "",
        docType: entry.name,
        uploadDate: entry.date,
        status: entry.status,
        vehicleType: resolvedType,
        driverDbId: row.id,
      }));
    });

    const filteredDocuments = documents.filter((entry) => {
      if (status && DISPLAY_TO_DB_STATUS[entry.status] !== status) {
        return false;
      }
      if (
        tab === "Registration Requests" &&
        !["Pending", "Under Review"].includes(entry.status)
      ) {
        return false;
      }
      if (
        tab === "Expired Documents" &&
        !["Rejected", "Expired"].includes(entry.status)
      ) {
        return false;
      }
      return true;
    });

    res.json({ documents: filteredDocuments, total: filteredDocuments.length });
  } catch (err) {
    console.error("getList error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getDetail = async (req, res) => {
  try {
    const { type, id } = req.params;
    const rows = await getDriverRows();
    const row = rows.find((item) => Number(item.id) === Number(id));

    if (!row) {
      return res.status(404).json({ message: "Driver documents not found" });
    }

    const resolvedType = type || detectType(row);
    const payload = getStatusPayload(row, resolvedType);

    res.json({
      driver: {
        id: row.id,
        name: row.name || "Unknown",
        phone: row.phone || "",
        email: row.email || "",
        gender: row.gender || "",
        dob: row.dob || null,
        driverId: formatDriverCode(resolvedType, row.id),
        city: row.city_name || row.location || "",
        serviceType: row.service_type_name || resolvedType,
        joinDate: formatDate(row.joined_date),
        applicationDate: formatDate(row.joined_date),
        status: buildApplicationStatus(resolvedType, payload),
        avatar: row.image_url || "",
      },
      vehicle: getVehicleInfo(payload),
      documents: buildDocumentEntries(row, resolvedType),
      vehicleType: resolvedType,
    });
  } catch (err) {
    console.error("getDetail error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateDocumentStatus = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { documentName, status } = req.body;
    const column = TYPE_COLUMN_MAP[type];

    if (!column) {
      return res.status(400).json({ message: "Invalid type" });
    }

    const config = DOCUMENT_CONFIG[type].find(
      (item) => item.name === documentName,
    );
    if (!config) {
      return res.status(400).json({ message: "Invalid document name" });
    }

    const rows = await execute(`SELECT ${column} FROM drivers WHERE id = ?`, [
      id,
    ]);
    if (!rows.length) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const payload = parseJson(rows[0][column]);
    const adminReview = parseJson(payload.adminReview);
    const documentStatuses = parseJson(adminReview.documentStatuses);
    const dbStatus = DISPLAY_TO_DB_STATUS[status] || "PENDING";

    documentStatuses[config.key] = dbStatus;
    payload.adminReview = { ...adminReview, documentStatuses };

    if (dbStatus === "IN_REVIEW") payload.status = "IN_REVIEW";
    if (dbStatus === "REJECTED") payload.status = "REJECTED";

    await execute(`UPDATE drivers SET ${column} = ? WHERE id = ?`, [
      JSON.stringify(payload),
      id,
    ]);

    res.json({ message: "Document status updated", status });
  } catch (err) {
    console.error("updateDocumentStatus error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { status } = req.body;
    const column = TYPE_COLUMN_MAP[type];

    if (!column || !["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const rows = await execute(`SELECT ${column} FROM drivers WHERE id = ?`, [
      id,
    ]);
    if (!rows.length) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const payload = parseJson(rows[0][column]);
    const adminReview = parseJson(payload.adminReview);
    payload.status = status;
    payload.adminReview = { ...adminReview, applicationStatus: status };

    await execute(`UPDATE drivers SET ${column} = ?, status = ? WHERE id = ?`, [
      JSON.stringify(payload),
      status === "APPROVED" ? "active" : "blocked",
      id,
    ]);

    res.json({ message: `Application ${status.toLowerCase()}`, status });
  } catch (err) {
    console.error("updateApplicationStatus error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const { driverId } = req.params;
    const serviceTypes = await execute("SELECT id, name FROM service_types");

    let assignedIds = [];
    try {
      const driverCategories = await execute(
        "SELECT service_type_id FROM driver_categories WHERE driver_id = ?",
        [driverId],
      );
      assignedIds = driverCategories.map((item) => item.service_type_id);
    } catch {
      assignedIds = [];
    }

    res.json({
      categories: serviceTypes.map((serviceType) => ({
        id: serviceType.id,
        name: serviceType.name,
        assigned: assignedIds.includes(serviceType.id),
      })),
    });
  } catch (err) {
    console.error("getCategories error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.assignCategories = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { categoryIds } = req.body;

    if (!Array.isArray(categoryIds)) {
      return res.status(400).json({ message: "categoryIds must be an array" });
    }

    try {
      await execute("DELETE FROM driver_categories WHERE driver_id = ?", [
        driverId,
      ]);
      for (const categoryId of categoryIds) {
        await execute(
          "INSERT INTO driver_categories (driver_id, service_type_id) VALUES (?, ?)",
          [driverId, categoryId],
        );
      }
    } catch {
      if (categoryIds[0]) {
        await execute("UPDATE drivers SET service_type_id = ? WHERE id = ?", [
          categoryIds[0],
          driverId,
        ]);
      }
    }

    res
      .status(201)
      .json({ message: "Categories assigned successfully", categoryIds });
  } catch (err) {
    console.error("assignCategories error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
