const express = require('express');
const router = express.Router();
const driverUserController = require('../controllers/driverUserController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

// Taxi validators
const {
  TaxiUploadNationalIdDto,
  TaxiUploadDriverLicenseDto,
  TaxiUploadTaxiLicenseDto,
  TaxiUploadProfessionalCardDto,
  TaxiUploadVehicleRegistrationDto,
  TaxiUploadInsuranceDto,
  TaxiUpdateVehicleDetailsDto,
  TaxiUploadVehiclePhotosDto,
  TaxiUploadFaceVerificationDto,
} = require('../validators/taxiValidators');

// Car Rides validators
const {
  UploadNationalIdDto,
  UploadDriverLicenseDto,
  UploadProfessionalCardDto,
  UploadVehicleRegistrationDto,
  UploadInsuranceDto,
  UpdateVehicleDetailsDto,
  UploadVehiclePhotosDto,
  UploadFaceVerificationDto,
} = require('../validators/carRidesValidators');

// Motorcycle validators
const {
  MotorcycleUploadNationalIdDto,
  MotorcycleUploadDriverLicenseDto,
  MotorcycleUploadProfessionalCardDto,
  MotorcycleUploadVehicleRegistrationDto,
  MotorcycleUploadInsuranceDto,
  MotorcycleUpdateDetailsDto,
  MotorcycleUploadVehiclePhotosDto,
  MotorcycleUploadFaceVerificationDto,
} = require('../validators/motorcycleValidators');

const {
  DriverSelectServiceDto,
  GoOnlineDto,
  CreateRentalProfileDto,
} = require('../validators/driverValidators');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const driverUploadDir = 'uploads/drivers';
if (!fs.existsSync(driverUploadDir)) {
  fs.mkdirSync(driverUploadDir, { recursive: true });
}

// Multer Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, driverUploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'driver-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Public routes
router.post('/login', driverUserController.login);

// Protected routes
router.post('/complete-registration', authMiddleware, upload.single('image'), driverUserController.completeRegistration);
router.get('/profile', authMiddleware, driverUserController.getProfile);
router.put('/profile', authMiddleware, upload.single('image'), driverUserController.updateProfile);
router.get('/services', authMiddleware, driverUserController.getServices);
router.post('/select-service', authMiddleware, validate(DriverSelectServiceDto), driverUserController.selectService);
router.get('/preferences', authMiddleware, driverUserController.getPreferences);
router.post('/status/online', authMiddleware, validate(GoOnlineDto), driverUserController.goOnline);
router.post('/status/offline', authMiddleware, driverUserController.goOffline);
router.get('/ride-socket-info', authMiddleware, driverUserController.getRideSocketInfo);

// Rental Company routes
router.post('/rental/profile', authMiddleware, upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'crDocument', maxCount: 1 }
]), validate(CreateRentalProfileDto), driverUserController.createRentalProfile);

router.get('/rental/profile', authMiddleware, driverUserController.getRentalProfile);

// Car Rides Onboarding routes
router.get('/car-rides/status', authMiddleware, driverUserController.getCarRidesStatus);

router.post('/car-rides/national-id', authMiddleware, upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 }
]), validate(UploadNationalIdDto), driverUserController.uploadNationalId);

router.post('/car-rides/driver-license', authMiddleware, upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 }
]), validate(UploadDriverLicenseDto), driverUserController.uploadDriverLicense);

router.post('/car-rides/professional-card', authMiddleware, upload.single('cardImage'), validate(UploadProfessionalCardDto), driverUserController.uploadProfessionalCard);
router.post('/car-rides/vehicle-registration', authMiddleware, upload.single('registrationImage'), validate(UploadVehicleRegistrationDto), driverUserController.uploadVehicleRegistration);
router.post('/car-rides/insurance', authMiddleware, upload.single('insuranceImage'), validate(UploadInsuranceDto), driverUserController.uploadVehicleInsurance);
router.post('/car-rides/vehicle-details', authMiddleware, validate(UpdateVehicleDetailsDto), driverUserController.updateVehicleDetails);

router.post('/car-rides/vehicle-photos', authMiddleware, upload.fields([
    { name: 'frontView', maxCount: 1 },
    { name: 'rearView', maxCount: 1 },
    { name: 'leftView', maxCount: 1 },
    { name: 'rightView', maxCount: 1 }
]), validate(UploadVehiclePhotosDto), driverUserController.uploadVehiclePhotos);

router.post('/car-rides/face-verification', authMiddleware, upload.single('selfieImage'), validate(UploadFaceVerificationDto), driverUserController.uploadFaceVerification);

// Motorcycle Onboarding routes
router.get('/motorcycle/status', authMiddleware, driverUserController.getMotorcycleStatus);

router.post('/motorcycle/national-id', authMiddleware, upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 }
]), validate(MotorcycleUploadNationalIdDto), driverUserController.uploadMotorcycleNationalId);

router.post('/motorcycle/driver-license', authMiddleware, upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 }
]), validate(MotorcycleUploadDriverLicenseDto), driverUserController.uploadMotorcycleDriverLicense);

router.post('/motorcycle/professional-card', authMiddleware, upload.single('cardImage'), validate(MotorcycleUploadProfessionalCardDto), driverUserController.uploadMotorcycleProfessionalCard);
router.post('/motorcycle/vehicle-registration', authMiddleware, upload.single('registrationImage'), validate(MotorcycleUploadVehicleRegistrationDto), driverUserController.uploadMotorcycleVehicleRegistration);
router.post('/motorcycle/insurance', authMiddleware, upload.single('insuranceImage'), validate(MotorcycleUploadInsuranceDto), driverUserController.uploadMotorcycleVehicleInsurance);
router.post('/motorcycle/vehicle-details', authMiddleware, validate(MotorcycleUpdateDetailsDto), driverUserController.updateMotorcycleVehicleDetails);

router.post('/motorcycle/vehicle-photos', authMiddleware, upload.fields([
    { name: 'frontView', maxCount: 1 },
    { name: 'rearView', maxCount: 1 },
    { name: 'leftView', maxCount: 1 },
    { name: 'rightView', maxCount: 1 }
]), validate(MotorcycleUploadVehiclePhotosDto), driverUserController.uploadMotorcycleVehiclePhotos);

router.post('/motorcycle/face-verification', authMiddleware, upload.single('selfieImage'), validate(MotorcycleUploadFaceVerificationDto), driverUserController.uploadMotorcycleFaceVerification);

// Taxi Onboarding routes
router.get('/taxi/status', authMiddleware, driverUserController.getTaxiStatus);

router.post('/taxi/national-id', authMiddleware, upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 }
]), validate(TaxiUploadNationalIdDto), driverUserController.uploadTaxiNationalId);

router.post('/taxi/driver-license', authMiddleware, upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 }
]), validate(TaxiUploadDriverLicenseDto), driverUserController.uploadTaxiDriverLicense);

router.post('/taxi/taxi-license', authMiddleware, upload.single('licenseImage'), validate(TaxiUploadTaxiLicenseDto), driverUserController.uploadTaxiLicense);

router.post('/taxi/professional-card', authMiddleware, upload.single('cardImage'), validate(TaxiUploadProfessionalCardDto), driverUserController.uploadTaxiProfessionalCard);
router.post('/taxi/vehicle-registration', authMiddleware, upload.single('registrationImage'), validate(TaxiUploadVehicleRegistrationDto), driverUserController.uploadTaxiVehicleRegistration);
router.post('/taxi/insurance', authMiddleware, upload.single('insuranceImage'), validate(TaxiUploadInsuranceDto), driverUserController.uploadTaxiVehicleInsurance);
router.post('/taxi/vehicle-details', authMiddleware, validate(TaxiUpdateVehicleDetailsDto), driverUserController.updateTaxiVehicleDetails);

router.post('/taxi/vehicle-photos', authMiddleware, upload.fields([
    { name: 'frontView', maxCount: 1 },
    { name: 'rearView', maxCount: 1 },
    { name: 'leftView', maxCount: 1 },
    { name: 'rightView', maxCount: 1 }
]), validate(TaxiUploadVehiclePhotosDto), driverUserController.uploadTaxiVehiclePhotos);

router.post('/taxi/face-verification', authMiddleware, upload.single('selfieImage'), validate(TaxiUploadFaceVerificationDto), driverUserController.uploadTaxiFaceVerification);

module.exports = router;
