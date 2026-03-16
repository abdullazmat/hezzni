const db = require('../config/db');

// Helper to compute average rating and return formatted reviews list
const formatReviews = (rows) => rows.map(r => ({
  id: r.id,
  rideRequestId: r.ride_request_id,
  reviewerId: r.reviewer_id,
  reviewerType: r.reviewer_type,
  rating: r.rating,
  comment: r.comment,
  createdAt: r.created_at
}));

// POST /api/reviews/driver  — Passenger reviews driver
exports.reviewDriver = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const { rideRequestId, revieweeId, rating, comment } = req.body;

    if (!rideRequestId || !revieweeId || !rating) {
      return res.status(400).json({ status: 'error', message: 'rideRequestId, revieweeId and rating are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ status: 'error', message: 'Rating must be between 1 and 5' });
    }

    await db.pool.execute(
      `INSERT INTO reviews (ride_request_id, reviewer_id, reviewer_type, reviewee_id, reviewee_type, rating, comment)
       VALUES (?, ?, 'PASSENGER', ?, 'DRIVER', ?, ?)`,
      [rideRequestId, reviewerId, revieweeId, rating, comment || null]
    );

    res.status(201).json({ status: 'success', message: 'Review submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// POST /api/reviews/passenger  — Driver reviews passenger
exports.reviewPassenger = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const { rideRequestId, revieweeId, rating, comment } = req.body;

    if (!rideRequestId || !revieweeId || !rating) {
      return res.status(400).json({ status: 'error', message: 'rideRequestId, revieweeId and rating are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ status: 'error', message: 'Rating must be between 1 and 5' });
    }

    await db.pool.execute(
      `INSERT INTO reviews (ride_request_id, reviewer_id, reviewer_type, reviewee_id, reviewee_type, rating, comment)
       VALUES (?, ?, 'DRIVER', ?, 'PASSENGER', ?, ?)`,
      [rideRequestId, reviewerId, revieweeId, rating, comment || null]
    );

    res.status(201).json({ status: 'success', message: 'Review submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// GET /api/reviews/driver/:driverId  — All reviews for a specific driver
exports.getDriverReviews = async (req, res) => {
  try {
    const { driverId } = req.params;
    const [rows] = await db.pool.execute(
      `SELECT * FROM reviews WHERE reviewee_id = ? AND reviewee_type = 'DRIVER' ORDER BY created_at DESC`,
      [driverId]
    );

    const avgRating = rows.length > 0
      ? (rows.reduce((sum, r) => sum + r.rating, 0) / rows.length).toFixed(2)
      : null;

    res.json({
      status: 'success',
      data: {
        averageRating: avgRating ? parseFloat(avgRating) : null,
        totalReviews: rows.length,
        reviews: formatReviews(rows)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// GET /api/reviews/passenger/:passengerId  — All reviews for a specific passenger
exports.getPassengerReviews = async (req, res) => {
  try {
    const { passengerId } = req.params;
    const [rows] = await db.pool.execute(
      `SELECT * FROM reviews WHERE reviewee_id = ? AND reviewee_type = 'PASSENGER' ORDER BY created_at DESC`,
      [passengerId]
    );

    const avgRating = rows.length > 0
      ? (rows.reduce((sum, r) => sum + r.rating, 0) / rows.length).toFixed(2)
      : null;

    res.json({
      status: 'success',
      data: {
        averageRating: avgRating ? parseFloat(avgRating) : null,
        totalReviews: rows.length,
        reviews: formatReviews(rows)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// GET /api/reviews/received/passenger  — Current passenger's received reviews
exports.getReceivedPassengerReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.pool.execute(
      `SELECT * FROM reviews WHERE reviewee_id = ? AND reviewee_type = 'PASSENGER' ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ status: 'success', data: formatReviews(rows) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// GET /api/reviews/given/passenger  — Current passenger's given reviews
exports.getGivenPassengerReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.pool.execute(
      `SELECT * FROM reviews WHERE reviewer_id = ? AND reviewer_type = 'PASSENGER' ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ status: 'success', data: formatReviews(rows) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// GET /api/reviews/received/driver  — Current driver's received reviews
exports.getReceivedDriverReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.pool.execute(
      `SELECT * FROM reviews WHERE reviewee_id = ? AND reviewee_type = 'DRIVER' ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ status: 'success', data: formatReviews(rows) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// GET /api/reviews/given/driver  — Current driver's given reviews
exports.getGivenDriverReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.pool.execute(
      `SELECT * FROM reviews WHERE reviewer_id = ? AND reviewer_type = 'DRIVER' ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ status: 'success', data: formatReviews(rows) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};
