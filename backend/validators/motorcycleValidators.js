/**
 * Validation schemas for Motorcycle onboarding endpoints.
 * Note: vehicle details use plateLetter + plateCode instead of color/seats/region.
 */

const MotorcycleUploadNationalIdDto = {
  fullName:         { required: true, type: 'string' },
  nationalIdNumber: { required: true, type: 'string' },
  dob:              { required: true, type: 'date'   },
  gender:           { required: true, enum: ['Male', 'Female'] },
  expiryDate:       { required: true, type: 'date'   },
  address:          { required: true, type: 'string' },
  frontImage:       { required: true, isFile: true   },
  backImage:        { required: true, isFile: true   },
};

const MotorcycleUploadDriverLicenseDto = {
  fullName:         { required: true, type: 'string' },
  licenseNumber:    { required: true, type: 'string' },
  dob:              { required: true, type: 'date'   },
  expiryDate:       { required: true, type: 'date'   },
  issuingAuthority: { required: true, type: 'string' },
  address:          { required: true, type: 'string' },
  frontImage:       { required: true, isFile: true   },
  backImage:        { required: true, isFile: true   },
};

const MotorcycleUploadProfessionalCardDto = {
  cardImage: { required: true, isFile: true },
};

const MotorcycleUploadVehicleRegistrationDto = {
  registrationImage: { required: true, isFile: true },
};

const MotorcycleUploadInsuranceDto = {
  insuranceImage: { required: true, isFile: true },
};

// Motorcycle uses 3-part plate (number | letter | code) instead of single plateNumber
const MotorcycleUpdateDetailsDto = {
  make:        { required: true, type: 'string' },
  model:       { required: true, type: 'string' },
  year:        { required: true, type: 'number' },
  plateNumber: { required: true, type: 'string' }, // Part 1 e.g. 123456
  plateLetter: { required: true, type: 'string' }, // Part 2 e.g. i
  plateCode:   { required: true, type: 'string' }, // Part 3 e.g. 89
  cityId:      { required: true, type: 'number' },
};

const MotorcycleUploadVehiclePhotosDto = {
  frontView: { required: true, isFile: true },
  rearView:  { required: true, isFile: true },
  leftView:  { required: true, isFile: true },
  rightView: { required: true, isFile: true },
};

const MotorcycleUploadFaceVerificationDto = {
  selfieImage: { required: true, isFile: true },
};

module.exports = {
  MotorcycleUploadNationalIdDto,
  MotorcycleUploadDriverLicenseDto,
  MotorcycleUploadProfessionalCardDto,
  MotorcycleUploadVehicleRegistrationDto,
  MotorcycleUploadInsuranceDto,
  MotorcycleUpdateDetailsDto,
  MotorcycleUploadVehiclePhotosDto,
  MotorcycleUploadFaceVerificationDto,
};
