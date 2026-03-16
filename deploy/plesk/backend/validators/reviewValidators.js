/**
 * Validation schemas for the Reviews endpoints.
 */

const CreateReviewDto = {
  rideRequestId: { required: true, type: 'number' },
  revieweeId:    { required: true, type: 'number' },
  rating:        { required: true, type: 'number', min: 1, max: 5 },
  comment:       { required: false, type: 'string' }, // optional
};

module.exports = { CreateReviewDto };
