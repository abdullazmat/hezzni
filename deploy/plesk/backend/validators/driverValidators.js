/**
 * Validation schemas for Driver general endpoints.
 */

const DriverSelectServiceDto = {
  serviceTypeId: { required: true, type: 'number' },
};

const GoOnlineDto = {
  preferenceIds: { required: true, type: 'array' }, // We'll need to update validate.js to handle arrays if needed, or just type check it
};

const CreateRentalProfileDto = {
  companyName:     { required: true, type: 'string' },
  businessAddress: { required: true, type: 'string' },
  operatingCityId: { required: true, type: 'number' },
  website:         { required: false, type: 'string' },
  crNumber:        { required: true, type: 'string' },
  logo:            { required: true, isFile: true },
  crDocument:      { required: true, isFile: true },
};

module.exports = {
  DriverSelectServiceDto,
  GoOnlineDto,
  CreateRentalProfileDto,
};
