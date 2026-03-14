const db = require("../config/db");

// Helper: execute query
const execute = async (sql, params = []) => {
  const [rows] = await db.pool.execute(sql, params);
  return rows;
};

const formatReviewDate = (value) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().split("T")[0];
};

const mapHistoryItem = (
  row,
  counterpartName,
  counterpartAvatar,
  counterpartType,
) => ({
  id: String(row.id),
  rating: Number(row.rating) || 0,
  userName: counterpartName || "Unknown",
  userType: counterpartType === "DRIVER" ? "Driver" : "Passenger",
  date: formatReviewDate(row.created_at),
  comment: row.comment || "",
  tags: [],
  status: "Completed",
  avatar: counterpartAvatar || "",
  visible: Boolean(row.visible),
  isFlagged: Boolean(row.is_flagged),
});

// GET /api/admin/reviews/stats
exports.getStats = async (req, res) => {
  try {
    const rows = await execute(
      "SELECT COUNT(*) as total, SUM(visible = 1) as visible, SUM(rating >= 4) as highRated, SUM(rating < 3) as lowRated FROM reviews",
    );
    const r = rows[0];
    res.json({
      total: r.total || 0,
      visible: Number(r.visible) || 0,
      highRated: Number(r.highRated) || 0,
      lowRated: Number(r.lowRated) || 0,
    });
  } catch (err) {
    console.error("getStats error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// GET /api/admin/reviews
exports.listReviews = async (req, res) => {
  try {
    const {
      limit = 50,
      page = 1,
      tab,
      visible,
      type,
      rating,
      search,
    } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = ["1=1"];
    const params = [];

    // tab filter
    if (tab === "Driver Reviews") {
      where.push("r.reviewee_type = 'DRIVER'");
    } else if (tab === "Passenger Reviews") {
      where.push("r.reviewee_type = 'PASSENGER'");
    }

    // visible filter
    if (visible === "Flagged") {
      where.push("r.is_flagged = 1");
    } else if (visible === "Visible") {
      where.push("r.visible = 1");
    }

    // type filter
    if (type === "Driver") {
      where.push("r.reviewee_type = 'DRIVER'");
    } else if (type === "Passenger") {
      where.push("r.reviewee_type = 'PASSENGER'");
    }

    // rating filter
    if (rating) {
      where.push("r.rating = ?");
      params.push(Number(rating));
    }

    // search
    if (search) {
      where.push(
        "(d.name LIKE ? OR ri.name LIKE ? OR CAST(r.id AS CHAR) LIKE ?)",
      );
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const whereClause = where.join(" AND ");

    const countSql = `
      SELECT COUNT(*) as total
      FROM reviews r
      LEFT JOIN drivers d ON (r.reviewee_type = 'DRIVER' AND r.reviewee_id = d.id) OR (r.reviewer_type = 'DRIVER' AND r.reviewer_id = d.id)
      LEFT JOIN riders ri ON (r.reviewee_type = 'PASSENGER' AND r.reviewee_id = ri.id) OR (r.reviewer_type = 'PASSENGER' AND r.reviewer_id = ri.id)
      WHERE ${whereClause}
    `;
    const countRows = await execute(countSql, params);
    const total = countRows[0].total;

    const sql = `
      SELECT r.*,
        CASE WHEN r.reviewee_type = 'DRIVER'
          THEN (SELECT name FROM drivers WHERE id = r.reviewee_id)
          ELSE (SELECT name FROM riders WHERE id = r.reviewee_id)
        END as revieweeName,
        CASE WHEN r.reviewee_type = 'DRIVER'
          THEN (SELECT image_url FROM drivers WHERE id = r.reviewee_id)
          ELSE (SELECT image_url FROM riders WHERE id = r.reviewee_id)
        END as revieweeAvatar,
        CASE WHEN r.reviewer_type = 'DRIVER'
          THEN (SELECT name FROM drivers WHERE id = r.reviewer_id)
          ELSE (SELECT name FROM riders WHERE id = r.reviewer_id)
        END as reviewerName,
        CASE WHEN r.reviewer_type = 'DRIVER'
          THEN (SELECT image_url FROM drivers WHERE id = r.reviewer_id)
          ELSE (SELECT image_url FROM riders WHERE id = r.reviewer_id)
        END as reviewerAvatar
      FROM reviews r
      LEFT JOIN drivers d ON (r.reviewee_type = 'DRIVER' AND r.reviewee_id = d.id) OR (r.reviewer_type = 'DRIVER' AND r.reviewer_id = d.id)
      LEFT JOIN riders ri ON (r.reviewee_type = 'PASSENGER' AND r.reviewee_id = ri.id) OR (r.reviewer_type = 'PASSENGER' AND r.reviewer_id = ri.id)
      WHERE ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${offset}
    `;

    const reviews = await execute(sql, params);

    const mapped = reviews.map((r) => ({
      id: String(r.id),
      userType: r.reviewee_type === "DRIVER" ? "Driver" : "Passenger",
      userInfo: {
        name: r.revieweeName || "Unknown",
        id: `${r.reviewee_type === "DRIVER" ? "D" : "R"}-${String(r.reviewee_id).padStart(5, "0")}`,
        avatar: r.revieweeAvatar || "",
      },
      reviewDate: r.created_at
        ? new Date(r.created_at).toISOString().split("T")[0]
        : "",
      visible: Boolean(r.visible),
      isFlagged: Boolean(r.is_flagged),
      rating: r.rating,
      comment: r.comment || "",
      tags: [],
      status: "Completed",
    }));

    res.json({
      reviews: mapped,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    console.error("listReviews error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// GET /api/admin/reviews/:id
exports.getReviewDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await execute("SELECT * FROM reviews WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Review not found" });
    }
    const r = rows[0];

    // Get reviewee info
    let revieweeName = "Unknown",
      revieweeAvatar = "";
    if (r.reviewee_type === "DRIVER") {
      const dr = await execute(
        "SELECT name, image_url FROM drivers WHERE id = ?",
        [r.reviewee_id],
      );
      if (dr.length) {
        revieweeName = dr[0].name;
        revieweeAvatar = dr[0].image_url || "";
      }
    } else {
      const ri = await execute(
        "SELECT name, image_url FROM riders WHERE id = ?",
        [r.reviewee_id],
      );
      if (ri.length) {
        revieweeName = ri[0].name;
        revieweeAvatar = ri[0].image_url || "";
      }
    }

    // Get reviewer info
    let reviewerName = "Unknown",
      reviewerAvatar = "";
    if (r.reviewer_type === "DRIVER") {
      const dr = await execute(
        "SELECT name, image_url FROM drivers WHERE id = ?",
        [r.reviewer_id],
      );
      if (dr.length) {
        reviewerName = dr[0].name;
        reviewerAvatar = dr[0].image_url || "";
      }
    } else {
      const ri = await execute(
        "SELECT name, image_url FROM riders WHERE id = ?",
        [r.reviewer_id],
      );
      if (ri.length) {
        reviewerName = ri[0].name;
        reviewerAvatar = ri[0].image_url || "";
      }
    }

    const receivedHistoryRows = await execute(
      `
        SELECT r.*,
          CASE WHEN r.reviewer_type = 'DRIVER'
            THEN (SELECT name FROM drivers WHERE id = r.reviewer_id)
            ELSE (SELECT name FROM riders WHERE id = r.reviewer_id)
          END as counterpartName,
          CASE WHEN r.reviewer_type = 'DRIVER'
            THEN (SELECT image_url FROM drivers WHERE id = r.reviewer_id)
            ELSE (SELECT image_url FROM riders WHERE id = r.reviewer_id)
          END as counterpartAvatar
        FROM reviews r
        WHERE r.reviewee_id = ? AND r.reviewee_type = ?
        ORDER BY r.created_at DESC
        LIMIT 20
      `,
      [r.reviewee_id, r.reviewee_type],
    );

    const givenHistoryRows = await execute(
      `
        SELECT r.*,
          CASE WHEN r.reviewee_type = 'DRIVER'
            THEN (SELECT name FROM drivers WHERE id = r.reviewee_id)
            ELSE (SELECT name FROM riders WHERE id = r.reviewee_id)
          END as counterpartName,
          CASE WHEN r.reviewee_type = 'DRIVER'
            THEN (SELECT image_url FROM drivers WHERE id = r.reviewee_id)
            ELSE (SELECT image_url FROM riders WHERE id = r.reviewee_id)
          END as counterpartAvatar
        FROM reviews r
        WHERE r.reviewer_id = ? AND r.reviewer_type = ?
        ORDER BY r.created_at DESC
        LIMIT 20
      `,
      [r.reviewee_id, r.reviewee_type],
    );

    res.json({
      review: {
        id: String(r.id),
        userType: r.reviewee_type === "DRIVER" ? "Driver" : "Passenger",
        userInfo: {
          name: revieweeName,
          id: `${r.reviewee_type === "DRIVER" ? "D" : "R"}-${String(r.reviewee_id).padStart(5, "0")}`,
          avatar: revieweeAvatar,
        },
        reviewer: {
          name: reviewerName,
          id: `${r.reviewer_type === "DRIVER" ? "D" : "R"}-${String(r.reviewer_id).padStart(5, "0")}`,
          avatar: reviewerAvatar,
          type: r.reviewer_type === "DRIVER" ? "Driver" : "Passenger",
        },
        reviewDate: formatReviewDate(r.created_at),
        visible: Boolean(r.visible),
        isFlagged: Boolean(r.is_flagged),
        rating: r.rating,
        comment: r.comment || "",
        tags: [],
        status: "Completed",
      },
      receivedReviews: receivedHistoryRows.map((historyRow) =>
        mapHistoryItem(
          historyRow,
          historyRow.counterpartName,
          historyRow.counterpartAvatar,
          historyRow.reviewer_type,
        ),
      ),
      givenReviews: givenHistoryRows.map((historyRow) =>
        mapHistoryItem(
          historyRow,
          historyRow.counterpartName,
          historyRow.counterpartAvatar,
          historyRow.reviewee_type,
        ),
      ),
    });
  } catch (err) {
    console.error("getReviewDetail error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// PUT /api/admin/reviews/:id — Edit Review Content
exports.editReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    await execute("UPDATE reviews SET comment = ? WHERE id = ?", [comment, id]);
    res.json({ message: "Review updated successfully" });
  } catch (err) {
    console.error("editReview error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// DELETE /api/admin/reviews/:id
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    await execute("DELETE FROM reviews WHERE id = ?", [id]);
    res.json({ message: "Review deleted successfully" });
  } catch (err) {
    console.error("deleteReview error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// PATCH /api/admin/reviews/:id/toggle-visibility
exports.toggleVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    await execute("UPDATE reviews SET visible = NOT visible WHERE id = ?", [
      id,
    ]);
    const rows = await execute("SELECT visible FROM reviews WHERE id = ?", [
      id,
    ]);
    res.json({
      message: "Visibility toggled",
      visible: Boolean(rows[0]?.visible),
    });
  } catch (err) {
    console.error("toggleVisibility error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// PATCH /api/admin/reviews/:id/toggle-flag
exports.toggleFlag = async (req, res) => {
  try {
    const { id } = req.params;
    await execute(
      "UPDATE reviews SET is_flagged = NOT is_flagged WHERE id = ?",
      [id],
    );
    const rows = await execute(
      "SELECT is_flagged, visible FROM reviews WHERE id = ?",
      [id],
    );
    res.json({
      message: "Flag toggled",
      isFlagged: Boolean(rows[0]?.is_flagged),
      visible: Boolean(rows[0]?.visible),
    });
  } catch (err) {
    console.error("toggleFlag error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};
