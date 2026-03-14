const db = require("../config/db");

// Helper: execute query
const execute = async (sql, params = []) => {
  const [rows] = await db.pool.execute(sql, params);
  return rows;
};

// GET /api/admin/coupons/stats
exports.getStats = async (req, res) => {
  try {
    const rows = await execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' AND (expiry_date IS NULL OR expiry_date > NOW()) THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'expired' OR (expiry_date IS NOT NULL AND expiry_date <= NOW()) THEN 1 ELSE 0 END) as expired
      FROM coupons
    `);
    const r = rows[0];
    res.json({
      total: r.total || 0,
      active: Number(r.active) || 0,
      expired: Number(r.expired) || 0,
    });
  } catch (err) {
    console.error("coupon getStats error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// GET /api/admin/coupons/service-options
exports.getServiceOptions = async (req, res) => {
  try {
    const rows = await execute(
      "SELECT id, name, display_name FROM service_types WHERE is_active = 1 ORDER BY id",
    );
    res.json({
      services: rows.map((r) => ({ id: r.id, name: r.display_name || r.name })),
    });
  } catch (err) {
    console.error("getServiceOptions error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Helper: map DB row to API promotion
function mapPromotion(c) {
  const discountType =
    c.discount_type === "PERCENTAGE" ? "Percentage" : "Fixed Amount";
  const discountValue = String(parseFloat(c.discount_amount));
  const discount =
    c.discount_type === "PERCENTAGE"
      ? `${discountValue}%`
      : `${discountValue} MAD`;

  let eligibleServices = [];
  if (c.eligible_service_ids) {
    try {
      const ids =
        typeof c.eligible_service_ids === "string"
          ? JSON.parse(c.eligible_service_ids)
          : c.eligible_service_ids;
      // Map service IDs to display names
      const serviceMap = {
        1: "Rides",
        2: "Motorcycle",
        3: "Taxi",
        4: "Rental Car",
      };
      eligibleServices = ids.map((id) => serviceMap[id] || `Service ${id}`);
    } catch (_) {
      /* ignore */
    }
  }

  return {
    id: String(c.id),
    dbId: c.id,
    name: c.promotion_name || c.code,
    code: c.code,
    discount,
    discountType,
    discountValue,
    validUntil: c.expiry_date
      ? new Date(c.expiry_date).toISOString().split("T")[0]
      : "",
    usageCount: c.current_usage || 0,
    maxUsage: c.usage_limit || 0,
    status:
      c.status === "active" &&
      (!c.expiry_date || new Date(c.expiry_date) > new Date())
        ? "Active"
        : "Expired",
    description: c.description || "",
    minOrderAmount: c.min_order_amount
      ? `${parseFloat(c.min_order_amount)} MAD`
      : "0 MAD",
    eligibleServices,
  };
}

// GET /api/admin/coupons
exports.listCoupons = async (req, res) => {
  try {
    const { status, search } = req.query;
    let where = ["1=1"];
    const params = [];

    if (status === "Active") {
      where.push(
        "c.status = 'active' AND (c.expiry_date IS NULL OR c.expiry_date > NOW())",
      );
    } else if (status === "Expired") {
      where.push(
        "(c.status = 'expired' OR (c.expiry_date IS NOT NULL AND c.expiry_date <= NOW()))",
      );
    }

    if (search) {
      where.push(
        "(c.promotion_name LIKE ? OR c.code LIKE ? OR CAST(c.id AS CHAR) LIKE ?)",
      );
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const sql = `SELECT * FROM coupons c WHERE ${where.join(" AND ")} ORDER BY c.created_at DESC`;
    const coupons = await execute(sql, params);

    res.json({
      promotions: coupons.map(mapPromotion),
    });
  } catch (err) {
    console.error("listCoupons error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// POST /api/admin/coupons
exports.createCoupon = async (req, res) => {
  try {
    const {
      promotionName,
      code,
      description,
      discountType,
      discountValue,
      expiryDate,
      isActive,
      maxUsage,
      minOrderAmount,
      eligibleServiceIds,
    } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Coupon code is required" });
    }

    const dbDiscountType =
      discountType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";
    const dbStatus = isActive !== false ? "active" : "disabled";

    const result = await execute(
      `INSERT INTO coupons 
        (code, promotion_name, description, discount_amount, discount_type, 
         usage_limit, expiry_date, status, min_order_amount, eligible_service_ids, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        promotionName || code,
        description || null,
        parseFloat(discountValue) || 0,
        dbDiscountType,
        maxUsage || 1000,
        expiryDate || null,
        dbStatus,
        parseFloat(minOrderAmount) || 0,
        eligibleServiceIds ? JSON.stringify(eligibleServiceIds) : null,
        isActive !== false ? 1 : 0,
      ],
    );

    res.status(201).json({
      message: "Promotion created successfully",
      id: result.insertId,
    });
  } catch (err) {
    console.error("createCoupon error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Coupon code already exists" });
    }
    res.status(500).json({ message: "Server Error" });
  }
};

// GET /api/admin/coupons/:id
exports.getCouponDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await execute("SELECT * FROM coupons WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Promotion not found" });
    }
    res.json(mapPromotion(rows[0]));
  } catch (err) {
    console.error("getCouponDetail error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// PUT /api/admin/coupons/:id
exports.updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      promotionName,
      code,
      description,
      discountType,
      discountValue,
      expiryDate,
      isActive,
      maxUsage,
      minOrderAmount,
      eligibleServiceIds,
    } = req.body;

    const fields = [];
    const params = [];

    if (promotionName !== undefined) {
      fields.push("promotion_name = ?");
      params.push(promotionName);
    }
    if (code !== undefined) {
      fields.push("code = ?");
      params.push(code);
    }
    if (description !== undefined) {
      fields.push("description = ?");
      params.push(description);
    }
    if (discountType !== undefined) {
      fields.push("discount_type = ?");
      params.push(discountType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED");
    }
    if (discountValue !== undefined) {
      fields.push("discount_amount = ?");
      params.push(parseFloat(discountValue) || 0);
    }
    if (expiryDate !== undefined) {
      fields.push("expiry_date = ?");
      params.push(expiryDate || null);
    }
    if (isActive !== undefined) {
      fields.push("status = ?");
      params.push(isActive ? "active" : "disabled");
      fields.push("is_active = ?");
      params.push(isActive ? 1 : 0);
    }
    if (maxUsage !== undefined) {
      fields.push("usage_limit = ?");
      params.push(maxUsage);
    }
    if (minOrderAmount !== undefined) {
      fields.push("min_order_amount = ?");
      params.push(parseFloat(minOrderAmount) || 0);
    }
    if (eligibleServiceIds !== undefined) {
      fields.push("eligible_service_ids = ?");
      params.push(
        eligibleServiceIds ? JSON.stringify(eligibleServiceIds) : null,
      );
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    params.push(id);
    await execute(
      `UPDATE coupons SET ${fields.join(", ")} WHERE id = ?`,
      params,
    );

    res.json({ message: "Promotion updated successfully" });
  } catch (err) {
    console.error("updateCoupon error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Coupon code already exists" });
    }
    res.status(500).json({ message: "Server Error" });
  }
};

// DELETE /api/admin/coupons/:id
exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    await execute("DELETE FROM coupons WHERE id = ?", [id]);
    res.json({ message: "Promotion deleted successfully" });
  } catch (err) {
    console.error("deleteCoupon error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};
