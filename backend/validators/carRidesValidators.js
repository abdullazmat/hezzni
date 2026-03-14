/**
 * Validation schemas for Car Rides onboarding endpoints.
 */

const UploadNationalIdDto = {
  fullName:        { required: true, type: 'string' },
  nationalIdNumber:{ required: true, type: 'string' },
  dob:             { required: true, type: 'date'   },
  gender:          { required: true, enum: ['Male', 'Female'] },
  expiryDate:      { required: true, type: 'date'   },
  address:         { required: true, type: 'string' },
  frontImage:      { required: true, isFile: true   },
  backImage:       { required: true, isFile: true   },
};

const UploadDriverLicenseDto = {
  fullName:         { required: true, type: 'string' },
  licenseNumber:    { required: true, type: 'string' },
  dob:              { required: true, type: 'date'   },
  expiryDate:       { required: true, type: 'date'   },
  issuingAuthority: { required: true, type: 'string' },
  address:          { required: true, type: 'string' },
  frontImage:       { required: true, isFile: true   },
  backImage:        { required: true, isFile: true   },
};

const UploadProfessionalCardDto = {
  cardImage: { required: true, isFile: true },
};

const UploadVehicleRegistrationDto = {
  registrationImage: { required: true, isFile: true },
};

const UploadInsuranceDto = {
  insuranceImage: { required: true, isFile: true },
};

const UpdateVehicleDetailsDto = {
  make:        { required: true, type: 'string' },
  model:       { required: true, type: 'string' },
  year:        { required: true, type: 'number' },
  plateNumber: { required: true, type: 'string' },
  color:       { required: true, type: 'string' },
  seats:       { required: true, type: 'number' },
  region:      { required: true, type: 'string' },
  cityId:      { required: true, type: 'number' },
};

const UploadVehiclePhotosDto = {
  frontView: { required: true, isFile: true },
  rearView:  { required: true, isFile: true },
  leftView:  { required: true, isFile: true },
  rightView: { required: true, isFile: true },
};

const UploadFaceVerificationDto = {
  selfieImage: { required: true, isFile: true },
};

module.exports = {
  UploadNationalIdDto,
  UploadDriverLicenseDto,
  UploadProfessionalCardDto,
  UploadVehicleRegistrationDto,
  UploadInsuranceDto,
  UpdateVehicleDetailsDto,
  UploadVehiclePhotosDto,
  UploadFaceVerificationDto,
};
