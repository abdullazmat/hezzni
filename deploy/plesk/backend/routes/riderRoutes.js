const express = require('express');
const router = express.Router();
const riderController = require('../controllers/riderController');

router.get('/', riderController.getAllRiders);
router.get('/:id', riderController.getRiderById);
router.post('/', riderController.createRider);
router.put('/:id', riderController.updateRider);
router.delete('/:id', riderController.deleteRider);

module.exports = router;
