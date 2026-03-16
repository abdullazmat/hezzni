/**
 * Validation schemas for Taxi onboarding endpoints.
 * Each schema maps field names to validation rules, used by the validate() middleware.
 */

const TaxiUploadNationalIdDto = {
  number:    { required: true,  type: 'string' },
  fullName:  { required: true,  type: 'string' },
  dob:       { required: true,  type: 'date'   },
  gender:    { required: true,  enum: ['Male', 'Female'] },
  expiry:    { required: true,  type: 'date'   },
  address:   { required: true,  type: 'string' },
  frontImage: { required: true, isFile: true   },
  backImage:  { required: true, isFile: true   },
};

const TaxiUploadDriverLicenseDto = {
  number:    { required: true,  type: 'string' },
  fullName:  { required: true,  type: 'string' },
  dob:       { required: true,  type: 'date'   },
  expiry:    { required: true,  type: 'date'   },
  authority: { required: true,  type: 'string' },
  address:   { required: true,  type: 'string' },
  frontImage: { required: true, isFile: true   },
  backImage:  { required: true, isFile: true   },
};

const TaxiUploadTaxiLicenseDto = {
  licenseImage: { required: true, isFile: true },
};

const TaxiUploadProfessionalCardDto = {
  cardImage: { required: true, isFile: true },
};

const TaxiUploadVehicleRegistrationDto = {
  registrationImage: { required: true, isFile: true },
};

const TaxiUploadInsuranceDto = {
  insuranceImage: { required: true, isFile: true },
};

const TaxiUpdateVehicleDetailsDto = {
  make:        { required: true, type: 'string' },
  model:       { required: true, type: 'string' },
  year:        { required: true, type: 'number' },
  plateNumber: { required: true, type: 'string' },
  color:       { required: true, type: 'string' },
  seats:       { required: true, type: 'number' },
  region:      { required: true, type: 'string' },
  cityId:      { required: true, type: 'number' },
};

const TaxiUploadVehiclePhotosDto = {
  frontView: { required: true, isFile: true },
  rearView:  { required: true, isFile: true },
  leftView:  { required: true, isFile: true },
  rightView: { required: true, isFile: true },
};

const TaxiUploadFaceVerificationDto = {
  selfieImage: { required: true, isFile: true },
};

module.exports = {
  TaxiUploadNationalIdDto,
  TaxiUploadDriverLicenseDto,
  TaxiUploadTaxiLicenseDto,
  TaxiUploadProfessionalCardDto,
  TaxiUploadVehicleRegistrationDto,
  TaxiUploadInsuranceDto,
  TaxiUpdateVehicleDetailsDto,
  TaxiUploadVehiclePhotosDto,
  TaxiUploadFaceVerificationDto,
};
