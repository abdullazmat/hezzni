const db = require("../config/db");

async function execute(sql, params = []) {
  const [rows] = await db.pool.execute(sql, params);
  return rows;
}

function parseJson(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function formatDate(value, withTime = false) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (withTime) {
    return date.toISOString().slice(0, 16).replace("T", " ");
  }
  return date.toISOString().split("T")[0];
}

function mapRentalStatus(dbStatus) {
  const map = {
    AVAILABLE: "Available",
    APPROVED: "Approved",
    PENDING: "Pending",
    IN_REVIEW: "Pending",
    REJECTED: "Rejected",
    EXPIRED: "Rejected",
    BOOKED: "Approved",
    active: "Available",
    pending: "Pending",
    blocked: "Rejected",
  };
  return map[dbStatus] || dbStatus || "Pending";
}

function mapVehicleStatus(dbStatus) {
  const map = {
    AVAILABLE: "Approved",
    Available: "Approved",
    APPROVED: "Approved",
    Approved: "Approved",
    PENDING: "Pending Review",
    Pending: "Pending Review",
    IN_REVIEW: "Pending Review",
    REJECTED: "Rejected",
    Rejected: "Rejected",
    BOOKED: "Approved",
    active: "Approved",
    pending: "Pending Review",
    blocked: "Rejected",
  };
  return map[dbStatus] || dbStatus || "Pending Review";
}

function mapDriverStatusForRentalReview(status) {
  if (["AVAILABLE", "APPROVED", "BOOKED"].includes(status)) {
    return "active";
  }
  if (status === "REJECTED") {
    return "blocked";
  }
  return "pending";
}

async function getDriverCompanyRows() {
  const rows = await execute(
    `SELECT d.id, d.name AS driver_name, d.email, d.phone, d.image_url, d.status, d.joined_date, d.location, d.is_registered, d.service_type_id, d.rental_profile, c.name AS city_name
     FROM drivers d
     LEFT JOIN cities c ON c.id = d.city_id
     ORDER BY d.joined_date DESC, d.id DESC`,
  );

  return rows;
}

function buildCompanyFromDriver(row) {
  const profile = parseJson(row.rental_profile);
  const profileVehicles = Array.isArray(profile.vehicles)
    ? profile.vehicles
    : [];

  return {
    id: row.id,
    name: profile.companyName || row.driver_name || `Driver ${row.id}`,
    email: row.email || "",
    phone: row.phone || "",
    logo: profile.logoUrl || row.image_url || "",
    location:
      row.city_name || row.location || profile.businessAddress || "Casablanca",
    region:
      profile.businessAddress || row.city_name || row.location || "Casablanca",
    fleetSize: profileVehicles.length,
    vehicleTypes: profile.vehicleTypes || "Rental Cars",
    commission: profile.commission
      ? `${profile.commission}% commission`
      : "15% commission",
    documents: profile.crDocumentUrl ? "Complete" : "Pending",
    status: mapRentalStatus(profile.status || row.status),
    submitted: formatDate(profile.createdAt || row.joined_date),
    contract: formatDate(profile.contractDate),
    website: profile.website || "",
    crNumber: profile.crNumber || "",
    driverId: row.id,
    source: profile.companyName ? "profile" : "driver",
  };
}

async function getRentalProfileCompanies() {
  const rows = await getDriverCompanyRows();
  const explicitRows = rows.filter((row) => {
    const profile = parseJson(row.rental_profile);
    return (
      Boolean(profile.companyName) || Number(row.service_type_id || 0) === 4
    );
  });

  const sourceRows = explicitRows.length ? explicitRows : rows;

  return sourceRows.map(buildCompanyFromDriver).filter(Boolean);
}

async function getTableCompanies(search) {
  try {
    let where = "WHERE 1=1";
    const params = [];

    if (search) {
      const q = `%${search}%`;
      where +=
        " AND (rc.company_name LIKE ? OR rc.email LIKE ? OR rc.location LIKE ?)";
      params.push(q, q, q);
    }

    const rows = await execute(
      `SELECT rc.*, COUNT(rv.id) AS fleet_size
       FROM rental_companies rc
       LEFT JOIN rental_vehicles rv ON rv.company_id = rc.id
       ${where}
       GROUP BY rc.id
       ORDER BY rc.created_at DESC`,
      params,
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.company_name || row.name || "Unknown",
      email: row.email || "",
      phone: row.phone || "",
      logo: row.logo_url || row.logo || "",
      location: row.location || row.city || "",
      region: row.region || "",
      fleetSize: Number(row.fleet_size || 0),
      vehicleTypes: row.vehicle_types || "Rental Cars",
      commission: row.commission
        ? `${row.commission}% commission`
        : "15% commission",
      documents: row.documents_status || "Pending",
      status: mapRentalStatus(row.status),
      submitted: formatDate(row.created_at),
      contract: formatDate(row.contract_date),
      website: row.website || "",
      crNumber: row.cr_number || "",
    }));
  } catch {
    return [];
  }
}

async function getVehicleRows(search, tab) {
  try {
    let where = "WHERE 1=1";
    const params = [];

    if (search) {
      const q = `%${search}%`;
      where +=
        " AND (rv.name LIKE ? OR rv.make_model LIKE ? OR rc.company_name LIKE ?)";
      params.push(q, q, q);
    }

    if (tab === "Pending")
      where += " AND rv.status IN ('PENDING', 'IN_REVIEW')";
    if (tab === "Approved")
      where += " AND rv.status IN ('AVAILABLE', 'APPROVED', 'BOOKED')";
    if (tab === "Rejected") where += " AND rv.status = 'REJECTED'";

    const rows = await execute(
      `SELECT rv.*, rc.company_name, rc.logo_url, rc.email AS company_email, rc.phone AS company_phone
       FROM rental_vehicles rv
       LEFT JOIN rental_companies rc ON rv.company_id = rc.id
       ${where}
       ORDER BY rv.created_at DESC`,
      params,
    );

    return rows.map((row) => {
      const imagePayload = parseJson(
        row.image_urls || row.images || row.photos,
      );
      const imageUrls = Array.isArray(imagePayload)
        ? imagePayload
        : Array.isArray(imagePayload.images)
          ? imagePayload.images
          : [];

      return {
        id: row.license_plate || `T${row.id}`,
        dbId: row.id,
        name: row.make_model || row.name || "Unknown",
        price: row.daily_rate ? `${row.daily_rate} MAD/day` : "N/A",
        year: row.year ? String(row.year) : "N/A",
        transmission: row.transmission || "Automatic",
        fuel: row.fuel_type || "Petrol",
        color: row.color || "Black",
        status: mapVehicleStatus(row.status),
        company: row.company_name || "Unknown",
        companyLogo: row.company_name
          ? String(row.company_name).charAt(0).toUpperCase()
          : "R",
        companyLogoUrl: row.logo_url || "",
        companyEmail: row.company_email || "",
        companyPhone: row.company_phone || "",
        carsAvailable: Number(row.available_units || 0),
        licensePlate: row.license_plate || "",
        seats: row.seats || 5,
        submittedDate: formatDate(row.created_at, true),
        description: row.description || "",
        imageUrls,
      };
    });
  } catch {
    const companies = await getRentalProfileCompanies();
    return companies
      .map((company) => ({
        id: `R-${company.id}`,
        dbId: company.id,
        name: `${company.name} Fleet Listing`,
        price: "N/A",
        year: "N/A",
        transmission: "Automatic",
        fuel: "Petrol",
        color: "Black",
        status: mapVehicleStatus(company.status),
        company: company.name,
        companyLogo: company.name
          ? String(company.name).charAt(0).toUpperCase()
          : "R",
        companyLogoUrl: company.logo || "",
        companyEmail: company.email || "",
        companyPhone: company.phone || "",
        carsAvailable: Number(company.fleetSize || 0),
        licensePlate: "Pending",
        seats: 5,
        submittedDate: company.submitted ? `${company.submitted} 00:00` : "",
        description:
          company.source === "profile"
            ? "Rental company profile submitted for admin review."
            : "Driver record awaiting rental company profile completion.",
        imageUrls: [],
      }))
      .filter((vehicle) => {
        if (search) {
          const term = String(search).toLowerCase();
          if (
            !vehicle.name.toLowerCase().includes(term) &&
            !vehicle.company.toLowerCase().includes(term)
          ) {
            return false;
          }
        }

        if (tab === "Pending" && vehicle.status !== "Pending Review")
          return false;
        if (tab === "Approved" && vehicle.status !== "Approved") return false;
        if (tab === "Rejected" && vehicle.status !== "Rejected") return false;
        return true;
      });
  }
}

exports.getStats = async (req, res) => {
  try {
    const vehicles = await getVehicleRows();
    if (vehicles.length) {
      res.json({
        available: vehicles.filter((item) => item.status === "Approved").length,
        booked: vehicles.filter((item) => item.status === "Approved").length,
        underReview: vehicles.filter((item) => item.status === "Pending Review")
          .length,
        rejected: vehicles.filter((item) => item.status === "Rejected").length,
      });
      return;
    }

    const companies = await getRentalProfileCompanies();
    res.json({
      available: companies.filter((item) => item.status === "Available").length,
      booked: companies.filter((item) => item.status === "Approved").length,
      underReview: companies.filter((item) => item.status === "Pending").length,
      rejected: companies.filter((item) => item.status === "Rejected").length,
    });
  } catch (err) {
    console.error("rental getStats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getCompanies = async (req, res) => {
  try {
    const { search } = req.query;
    const tableCompanies = await getTableCompanies(search);
    const companies = tableCompanies.length
      ? tableCompanies
      : await getRentalProfileCompanies();

    const filtered = companies.filter((company) => {
      if (!search) return true;
      const term = String(search).toLowerCase();
      return (
        company.name.toLowerCase().includes(term) ||
        company.location.toLowerCase().includes(term) ||
        company.email.toLowerCase().includes(term)
      );
    });

    res.json({ companies: filtered });
  } catch (err) {
    console.error("getCompanies error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getVehicles = async (req, res) => {
  try {
    const { tab, search } = req.query;
    const vehicles = await getVehicleRows(search, tab);
    res.json({ vehicles });
  } catch (err) {
    console.error("getVehicles error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getVehicleDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicles = await getVehicleRows();
    const vehicle = vehicles.find((item) => Number(item.dbId) === Number(id));

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    res.json(vehicle);
  } catch (err) {
    console.error("getVehicleDetail error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateVehicleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const validStatuses = [
      "AVAILABLE",
      "REJECTED",
      "PENDING",
      "BOOKED",
      "APPROVED",
      "IN_REVIEW",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    let vehicleUpdated = false;

    try {
      const vehicleResult = await execute(
        "UPDATE rental_vehicles SET status = ?, rejection_reason = ? WHERE id = ?",
        [status, reason || null, id],
      );
      vehicleUpdated = Number(vehicleResult?.affectedRows || 0) > 0;
    } catch (error) {
      // Fallback mode can run without rental_vehicles records/table; continue with driver profile update.
      console.warn("rental vehicle status update fallback:", error?.message);
    }

    if (!vehicleUpdated) {
      const driverRows = await execute(
        "SELECT id, rental_profile FROM drivers WHERE id = ? LIMIT 1",
        [id],
      );

      if (!driverRows.length) {
        return res.status(404).json({ message: "Vehicle not found" });
      }

      const profile = parseJson(driverRows[0].rental_profile);
      profile.status = status;
      profile.reviewedAt = new Date().toISOString();

      if (status === "REJECTED") {
        profile.rejectionReason = reason || "Rejected by admin";
      } else if (profile.rejectionReason) {
        delete profile.rejectionReason;
      }

      await execute(
        "UPDATE drivers SET rental_profile = ?, status = ? WHERE id = ?",
        [
          JSON.stringify(profile),
          mapDriverStatusForRentalReview(status),
          driverRows[0].id,
        ],
      );
    }

    res.json({ message: "Vehicle status updated", status });
  } catch (err) {
    console.error("updateVehicleStatus error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
