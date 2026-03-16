const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { CreateReviewDto } = require('../validators/reviewValidators');

// POST — Submit reviews
// Passenger reviews a driver (authenticated as passenger via JWT)
router.post('/driver', authMiddleware, validate(CreateReviewDto), reviewController.reviewDriver);

// Driver reviews a passenger (authenticated as driver via JWT)
router.post('/passenger', authMiddleware, validate(CreateReviewDto), reviewController.reviewPassenger);

// GET — Public lookup by user ID
router.get('/driver/:driverId', reviewController.getDriverReviews);
router.get('/passenger/:passengerId', reviewController.getPassengerReviews);

// GET — Current passenger's reviews
router.get('/received/passenger', authMiddleware, reviewController.getReceivedPassengerReviews);
router.get('/given/passenger', authMiddleware, reviewController.getGivenPassengerReviews);

// GET — Current driver's reviews
router.get('/received/driver', authMiddleware, reviewController.getReceivedDriverReviews);
router.get('/given/driver', authMiddleware, reviewController.getGivenDriverReviews);

module.exports = router;

