const db = require('../config/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Login or Register with phone number
exports.login = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ status: 'error', message: 'Phone number is required' });
    }

    // Check if user exists
    let [rows] = await db.pool.execute('SELECT * FROM drivers WHERE phone = ?', [phone]);
    let user;

    if (rows.length === 0) {
      // Create new driver (Partial registration)
      const [result] = await db.pool.execute(
        'INSERT INTO drivers (phone, name, email, is_registered, status) VALUES (?, ?, ?, ?, ?)',
        [phone, '', '', false, 'pending']
      );
      const [newUser] = await db.pool.execute('SELECT * FROM drivers WHERE id = ?', [result.insertId]);
      user = newUser[0];
    } else {
      user = rows[0];
    }

    // Mock status data if missing
    if (user.is_registered) {
        if (!user.car_ride_status) user.car_ride_status = { status: 'PENDING', isNationalIdCompleted: true, isDriverLicenseCompleted: true, isProfessionalCardCompleted: true, isVehicleRegistrationCompleted: true, isVehicleInsuranceCompleted: true, isVehicleDetailsCompleted: true, isVehiclePhotosCompleted: true, isFaceVerificationCompleted: true };
        if (!user.motorcycle_status) user.motorcycle_status = { status: 'PENDING', isNationalIdCompleted: true, isDriverLicenseCompleted: true, isProfessionalCardCompleted: true, isVehicleRegistrationCompleted: true, isVehicleInsuranceCompleted: true, isVehicleDetailsCompleted: true, isVehiclePhotosCompleted: true, isFaceVerificationCompleted: true };
        if (!user.taxi_status) user.taxi_status = { status: 'PENDING', isNationalIdCompleted: true, isDriverLicenseCompleted: true, isTaxiLicenseCompleted: false, isProfessionalCardCompleted: false, isVehicleRegistrationCompleted: false, isVehicleInsuranceCompleted: false, isVehicleDetailsCompleted: false, isVehiclePhotosCompleted: false, isFaceVerificationCompleted: false };
        if (!user.rental_profile) user.rental_profile = {};
    }

    // Fetch service type details if set
    let serviceType = null;
    if (user.service_type_id) {
        const [stRows] = await db.pool.execute('SELECT * FROM service_types WHERE id = ?', [user.service_type_id]);
        if (stRows.length > 0) {
            serviceType = {
                id: stRows[0].id,
                name: stRows[0].name,
                displayName: stRows[0].display_name
            };
        }
    }

    // Generate Token
    const isRegistered = !!user.is_registered;
    const token = jwt.sign(
      { id: user.id, phone: user.phone, isRegistered, role: 'driver' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      status: 'success',
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name || '',
          email: user.email || '',
          imageUrl: user.image_url,
          dob: user.dob,
          gender: user.gender,
          cityId: user.city_id,
          isRegistered: !!user.is_registered,
          serviceType: serviceType,
          createdAt: user.joined_date,
          carRideStatus: user.car_ride_status,
          motorcycleStatus: user.motorcycle_status,
          taxiStatus: user.taxi_status,
          rentalProfile: user.rental_profile
        },
        isRegistered: !!user.is_registered
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Complete registration
exports.completeRegistration = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, dob, gender, cityId } = req.body;
    const imageUrl = req.file ? `/uploads/drivers/${req.file.filename}` : null;

    const sql = `
      UPDATE drivers 
      SET name = ?, email = ?, dob = ?, gender = ?, city_id = ?, image_url = COALESCE(?, image_url), is_registered = true 
      WHERE id = ?
    `;
    await db.pool.execute(sql, [name, email, dob, gender, cityId, imageUrl, userId]);

    // Refresh user data
    const [rows] = await db.pool.execute('SELECT * FROM drivers WHERE id = ?', [userId]);
    const user = rows[0];

    res.status(201).json({
      status: 'success',
      message: 'Registration completed successfully',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          imageUrl: user.image_url,
          dob: user.dob,
          gender: user.gender,
          cityId: user.city_id,
          isRegistered: !!user.is_registered,
          createdAt: user.joined_date
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Get current driver profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.pool.execute('SELECT * FROM drivers WHERE id = ?', [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const user = rows[0];

    // Fetch service type details if set
    let serviceType = null;
    if (user.service_type_id) {
        const [stRows] = await db.pool.execute('SELECT * FROM service_types WHERE id = ?', [user.service_type_id]);
        if (stRows.length > 0) {
            serviceType = {
                id: stRows[0].id,
                name: stRows[0].name,
                displayName: stRows[0].display_name
            };
        }
    }

    res.json({
      status: 'success',
      message: 'Profile retrieved successfully',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          imageUrl: user.image_url,
          dob: user.dob,
          gender: user.gender,
          cityId: user.city_id,
          isRegistered: !!user.is_registered,
          serviceType: serviceType,
          createdAt: user.joined_date,
          carRideStatus: user.car_ride_status || { status: 'PENDING' },
          motorcycleStatus: user.motorcycle_status || { status: 'PENDING' },
          taxiStatus: user.taxi_status || { status: 'PENDING' },
          rentalProfile: user.rental_profile || {}
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Update driver profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone, dob, gender, cityId } = req.body;
    const imageUrl = req.file ? `/uploads/drivers/${req.file.filename}` : null;

    const sql = `
      UPDATE drivers 
      SET name = ?, email = ?, phone = ?, dob = ?, gender = ?, city_id = ?, image_url = COALESCE(?, image_url) 
      WHERE id = ?
    `;
    await db.pool.execute(sql, [name, email, phone, dob, gender, cityId, imageUrl, userId]);

    const [rows] = await db.pool.execute('SELECT * FROM drivers WHERE id = ?', [userId]);
    const user = rows[0];

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          imageUrl: user.image_url,
          dob: user.dob,
          gender: user.gender,
          cityId: user.city_id,
          isRegistered: !!user.is_registered,
          createdAt: user.joined_date
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Get all available services
exports.getServices = async (req, res) => {
  try {
    const [services] = await db.pool.execute('SELECT id, name, display_name as displayName FROM service_types WHERE is_active = true');
    res.json({
      status: 'success',
      data: services
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Select service type
exports.selectService = async (req, res) => {
  try {
    const userId = req.user.id;
    const { serviceTypeId } = req.body;

    if (!serviceTypeId) {
      return res.status(400).json({ status: 'error', message: 'Service type ID is required' });
    }

    await db.pool.execute(
        'UPDATE drivers SET service_type_id = ? WHERE id = ?',
        [serviceTypeId, userId]
    );

    // Return the updated profile
    return exports.getProfile(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Get driver ride preferences
exports.getPreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Find driver's service type
        const [userRows] = await db.pool.execute('SELECT service_type_id FROM drivers WHERE id = ?', [userId]);
        if (userRows.length === 0) return res.status(404).json({ status: 'error', message: 'User not found' });
        
        const serviceTypeId = userRows[0].service_type_id;
        
        // Fetch preferences related to this service type
        // Note: The database has passenger_service_id in ride_preferences. 
        // We assume service_type_id 1(CAR) matches passenger_service_id 1(Car), etc.
        const [preferences] = await db.pool.execute(
            'SELECT id, name, preference_key as preferenceKey, description, base_price as basePrice FROM ride_preferences WHERE passenger_service_id = ?',
            [serviceTypeId || 1]
        );

        res.json({
            status: 'success',
            message: 'Preferences retrieved successfully',
            data: preferences
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
}

// Go Online
exports.goOnline = async (req, res) => {
    try {
        const userId = req.user.id;
        const { preferenceIds } = req.body;

        if (!preferenceIds || !Array.isArray(preferenceIds) || preferenceIds.length === 0) {
            return res.status(400).json({ status: 'error', message: 'At least one preference ID is required' });
        }

        await db.pool.execute(
            'UPDATE drivers SET is_online = true, active_preferences = ? WHERE id = ?',
            [JSON.stringify(preferenceIds), userId]
        );

        res.json({
            status: 'success',
            message: 'Driver is now online',
            data: { isOnline: true, activePreferences: preferenceIds }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
};

// Go Offline
exports.goOffline = async (req, res) => {
    try {
        const userId = req.user.id;

        await db.pool.execute(
            'UPDATE drivers SET is_online = false, active_preferences = NULL WHERE id = ?',
            [userId]
        );

        res.json({
            status: 'success',
            message: 'Driver is now offline',
            data: { isOnline: false }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
};


// Socket Info Documentation
exports.getRideSocketInfo = async (req, res) => {
    res.json({
        message: "Returns structure for documentation purposes"
    });
};

// Create Rental Profile
exports.createRentalProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { companyName, businessAddress, operatingCityId, website, crNumber } = req.body;
    
    // Check if user is RENTAL_CARS
    const [userRows] = await db.pool.execute('SELECT service_type_id FROM drivers WHERE id = ?', [userId]);
    if (userRows.length === 0) return res.status(404).json({ status: 'error', message: 'User not found' });
    
    // In a real app, we'd check if service_type_id matches RENTAL_CARS (ID 4)
    
    const logoUrl = req.files && req.files['logo'] ? `/uploads/drivers/${req.files['logo'][0].filename}` : null;
    const crDocumentUrl = req.files && req.files['crDocument'] ? `/uploads/drivers/${req.files['crDocument'][0].filename}` : null;

    const rentalProfile = {
      companyName,
      businessAddress,
      operatingCityId: operatingCityId ? parseInt(operatingCityId) : null,
      website,
      crNumber,
      logoUrl,
      crDocumentUrl,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    await db.pool.execute(
      'UPDATE drivers SET rental_profile = ? WHERE id = ?',
      [JSON.stringify(rentalProfile), userId]
    );

    res.status(201).json({
      status: 'success',
      message: 'Rental profile created successfully',
      data: rentalProfile,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Get Rental Profile
exports.getRentalProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.pool.execute('SELECT rental_profile FROM drivers WHERE id = ?', [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const rentalProfile = rows[0].rental_profile || {};

    res.json({
      status: 'success',
      message: 'Rental profile retrieved successfully',
      data: rentalProfile,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// ─── Car Rides Onboarding ──────────────────────────────────────────────────

// Get Car Rides Status
exports.getCarRidesStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.pool.execute('SELECT car_ride_status FROM drivers WHERE id = ?', [userId]);
    
    if (rows.length === 0) return res.status(404).json({ status: 'error', message: 'User not found' });
    
    const statusData = rows[0].car_ride_status || {
      status: "PENDING",
      isNationalIdCompleted: false,
      isDriverLicenseCompleted: false,
      isProfessionalCardCompleted: false,
      isVehicleRegistrationCompleted: false,
      isVehicleInsuranceCompleted: false,
      isVehicleDetailsCompleted: false,
      isVehiclePhotosCompleted: false,
      isFaceVerificationCompleted: false
    };

    res.json(statusData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Generic helper to update car_ride_status
const updateCarRideStatusField = async (userId, updateFn) => {
    const [rows] = await db.pool.execute('SELECT car_ride_status FROM drivers WHERE id = ?', [userId]);
    let currentStatus = rows[0].car_ride_status || { status: 'PENDING' };
    
    currentStatus = updateFn(currentStatus);
    
    await db.pool.execute(
        'UPDATE drivers SET car_ride_status = ? WHERE id = ?',
        [JSON.stringify(currentStatus), userId]
    );
    return currentStatus;
};

// Upload National ID
exports.uploadNationalId = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, nationalIdNumber, dob, gender, expiryDate, address } = req.body;
    const frontImage = req.files && req.files['frontImage'] ? `/uploads/drivers/${req.files['frontImage'][0].filename}` : null;
    const backImage = req.files && req.files['backImage'] ? `/uploads/drivers/${req.files['backImage'][0].filename}` : null;

    await updateCarRideStatusField(userId, (prev) => ({
      ...prev,
      isNationalIdCompleted: true,
      nationalId: { fullName, nationalIdNumber, dob, gender, expiryDate, address, frontImage, backImage }
    }));

    res.status(201).json({ status: 'success', message: 'National ID uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Upload Driver License
exports.uploadDriverLicense = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, licenseNumber, dob, expiryDate, issuingAuthority, address } = req.body;
    const frontImage = req.files && req.files['frontImage'] ? `/uploads/drivers/${req.files['frontImage'][0].filename}` : null;
    const backImage = req.files && req.files['backImage'] ? `/uploads/drivers/${req.files['backImage'][0].filename}` : null;

    await updateCarRideStatusField(userId, (prev) => ({
      ...prev,
      isDriverLicenseCompleted: true,
      driverLicense: { fullName, licenseNumber, dob, expiryDate, issuingAuthority, address, frontImage, backImage }
    }));

    res.status(201).json({ status: 'success', message: 'Driver License uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Upload Professional Card
exports.uploadProfessionalCard = async (req, res) => {
  try {
    const userId = req.user.id;
    const cardImage = req.file ? `/uploads/drivers/${req.file.filename}` : null;

    await updateCarRideStatusField(userId, (prev) => ({
      ...prev,
      isProfessionalCardCompleted: true,
      professionalCardImage: cardImage
    }));

    res.status(201).json({ status: 'success', message: 'Professional Card uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Upload Vehicle Registration
exports.uploadVehicleRegistration = async (req, res) => {
  try {
    const userId = req.user.id;
    const registrationImage = req.file ? `/uploads/drivers/${req.file.filename}` : null;

    await updateCarRideStatusField(userId, (prev) => ({
      ...prev,
      isVehicleRegistrationCompleted: true,
      vehicleRegistrationImage: registrationImage
    }));

    res.status(201).json({ status: 'success', message: 'Vehicle Registration uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Upload Vehicle Insurance
exports.uploadVehicleInsurance = async (req, res) => {
  try {
    const userId = req.user.id;
    const insuranceImage = req.file ? `/uploads/drivers/${req.file.filename}` : null;

    await updateCarRideStatusField(userId, (prev) => ({
      ...prev,
      isVehicleInsuranceCompleted: true,
      vehicleInsuranceImage: insuranceImage
    }));

    res.status(201).json({ status: 'success', message: 'Vehicle Insurance uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Update Vehicle Details
exports.updateVehicleDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const details = req.body;

    await updateCarRideStatusField(userId, (prev) => ({
      ...prev,
      isVehicleDetailsCompleted: true,
      vehicleDetails: details
    }));

    res.status(201).json({ status: 'success', message: 'Vehicle details updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Upload Vehicle Photos
exports.uploadVehiclePhotos = async (req, res) => {
  try {
    const userId = req.user.id;
    const photos = {
      frontView: req.files && req.files['frontView'] ? `/uploads/drivers/${req.files['frontView'][0].filename}` : null,
      rearView: req.files && req.files['rearView'] ? `/uploads/drivers/${req.files['rearView'][0].filename}` : null,
      leftView: req.files && req.files['leftView'] ? `/uploads/drivers/${req.files['leftView'][0].filename}` : null,
      rightView: req.files && req.files['rightView'] ? `/uploads/drivers/${req.files['rightView'][0].filename}` : null,
    };

    await updateCarRideStatusField(userId, (prev) => ({
      ...prev,
      isVehiclePhotosCompleted: true,
      vehiclePhotos: photos
    }));

    res.status(201).json({ status: 'success', message: 'Vehicle photos uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Upload Face Verification
exports.uploadFaceVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const selfieImage = req.file ? `/uploads/drivers/${req.file.filename}` : null;

    await updateCarRideStatusField(userId, (prev) => ({
      ...prev,
      isFaceVerificationCompleted: true,
      faceVerificationImage: selfieImage
    }));

    res.status(201).json({ status: 'success', message: 'Face verification uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// ─── Motorcycle Onboarding ─────────────────────────────────────────────────

// Get Motorcycle Status
exports.getMotorcycleStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.pool.execute('SELECT motorcycle_status FROM drivers WHERE id = ?', [userId]);
    
    if (rows.length === 0) return res.status(404).json({ status: 'error', message: 'User not found' });
    
    const statusData = rows[0].motorcycle_status || {
      status: "PENDING",
      isNationalIdCompleted: false,
      isDriverLicenseCompleted: false,
      isProfessionalCardCompleted: false,
      isVehicleRegistrationCompleted: false,
      isVehicleInsuranceCompleted: false,
      isVehicleDetailsCompleted: false,
      isVehiclePhotosCompleted: false,
      isFaceVerificationCompleted: false
    };

    res.json(statusData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Generic helper to update motorcycle_status
const updateMotorcycleStatusField = async (userId, updateFn) => {
    const [rows] = await db.pool.execute('SELECT motorcycle_status FROM drivers WHERE id = ?', [userId]);
    let currentStatus = rows[0].motorcycle_status || { status: 'PENDING' };
    
    currentStatus = updateFn(currentStatus);
    
    await db.pool.execute(
        'UPDATE drivers SET motorcycle_status = ? WHERE id = ?',
        [JSON.stringify(currentStatus), userId]
    );
    return currentStatus;
};

// Upload Motorcycle National ID
exports.uploadMotorcycleNationalId = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, nationalIdNumber, dob, gender, expiryDate, address } = req.body;
    const frontImage = req.files && req.files['frontImage'] ? `/uploads/drivers/${req.files['frontImage'][0].filename}` : null;
    const backImage = req.files && req.files['backImage'] ? `/uploads/drivers/${req.files['backImage'][0].filename}` : null;

    await updateMotorcycleStatusField(userId, (prev) => ({
      ...prev,
      isNationalIdCompleted: true,
      nationalId: { fullName, nationalIdNumber, dob, gender, expiryDate, address, frontImage, backImage }
    }));

    res.status(201).json({ status: 'success', message: 'National ID uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Upload Motorcycle Driver License
exports.uploadMotorcycleDriverLicense = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, licenseNumber, dob, expiryDate, issuingAuthority, address } = req.body;
    const frontImage = req.files && req.files['frontImage'] ? `/uploads/drivers/${req.files['frontImage'][0].filename}` : null;
    const backImage = req.files && req.files['backImage'] ? `/uploads/drivers/${req.files['backImage'][0].filename}` : null;

    await updateMotorcycleStatusField(userId, (prev) => ({
      ...prev,
      isDriverLicenseCompleted: true,
      driverLicense: { fullName, licenseNumber, dob, expiryDate, issuingAuthority, address, frontImage, backImage }
    }));

    res.status(201).json({ status: 'success', message: 'Driver License uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Upload Motorcycle Professional Card
exports.uploadMotorcycleProfessionalCard = async (req, res) => {
  try {
    const userId = req.user.id;
    const cardImage = req.file ? `/uploads/drivers/${req.file.filename}` : null;

    await updateMotorcycleStatusField(userId, (prev) => ({
      ...prev,
      isProfessionalCardCompleted: true,
      professionalCardImage: cardImage
    }));

    res.status(201).json({ status: 'success', message: 'Professional Card uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Upload Motorcycle Vehicle Registration
exports.uploadMotorcycleVehicleRegistration = async (req, res) => {
  try {
    const userId = req.user.id;
    const registrationImage = req.file ? `/uploads/drivers/${req.file.filename}` : null;

    await updateMotorcycleStatusField(userId, (prev) => ({
      ...prev,
      isVehicleRegistrationCompleted: true,
      vehicleRegistrationImage: registrationImage
    }));

    res.status(201).json({ status: 'success', message: 'Vehicle Registration uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Upload Motorcycle Vehicle Insurance
exports.uploadMotorcycleVehicleInsurance = async (req, res) => {
  try {
    const userId = req.user.id;
    const insuranceImage = req.file ? `/uploads/drivers/${req.file.filename}` : null;

    await updateMotorcycleStatusField(userId, (prev) => ({
      ...prev,
      isVehicleInsuranceCompleted: true,
      vehicleInsuranceImage: insuranceImage
    }));

    res.status(201).json({ status: 'success', message: 'Vehicle Insurance uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Update Motorcycle Vehicle Details
exports.updateMotorcycleVehicleDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const details = req.body;

    await updateMotorcycleStatusField(userId, (prev) => ({
      ...prev,
      isVehicleDetailsCompleted: true,
      vehicleDetails: details
    }));

    res.status(201).json({ status: 'success', message: 'Vehicle details updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Upload Motorcycle Vehicle Photos
exports.uploadMotorcycleVehiclePhotos = async (req, res) => {
  try {
    const userId = req.user.id;
    const photos = {
      frontView: req.files && req.files['frontView'] ? `/uploads/drivers/${req.files['frontView'][0].filename}` : null,
      rearView: req.files && req.files['rearView'] ? `/uploads/drivers/${req.files['rearView'][0].filename}` : null,
      leftView: req.files && req.files['leftView'] ? `/uploads/drivers/${req.files['leftView'][0].filename}` : null,
      rightView: req.files && req.files['rightView'] ? `/uploads/drivers/${req.files['rightView'][0].filename}` : null,
    };

    await updateMotorcycleStatusField(userId, (prev) => ({
      ...prev,
      isVehiclePhotosCompleted: true,
      vehiclePhotos: photos
    }));

    res.status(201).json({ status: 'success', message: 'Vehicle photos uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Upload Motorcycle Face Verification
exports.uploadMotorcycleFaceVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const selfieImage = req.file ? `/uploads/drivers/${req.file.filename}` : null;

    await updateMotorcycleStatusField(userId, (prev) => ({
      ...prev,
      isFaceVerificationCompleted: true,
      faceVerificationImage: selfieImage
    }));

    res.status(201).json({ status: 'success', message: 'Face verification uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// ─── Taxi Onboarding ───────────────────────────────────────────────────────

// Generic helper to update taxi_status
const updateTaxiStatusField = async (userId, updateFn) => {
    const [rows] = await db.pool.execute('SELECT taxi_status FROM drivers WHERE id = ?', [userId]);
    let currentStatus = rows[0].taxi_status || { status: 'PENDING' };
    currentStatus = updateFn(currentStatus);
    await db.pool.execute(
        'UPDATE drivers SET taxi_status = ? WHERE id = ?',
        [JSON.stringify(currentStatus), userId]
    );
    return currentStatus;
};

// Get Taxi Status
exports.getTaxiStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.pool.execute('SELECT taxi_status FROM drivers WHERE id = ?', [userId]);
    if (rows.length === 0) return res.status(404).json({ status: 'error', message: 'User not found' });
    const statusData = rows[0].taxi_status || {
      status: "PENDING",
      isNationalIdCompleted: false,
      isDriverLicenseCompleted: false,
      isTaxiLicenseCompleted: false,
      isProfessionalCardCompleted: false,
      isVehicleRegistrationCompleted: false,
      isVehicleInsuranceCompleted: false,
      isVehicleDetailsCompleted: false,
      isVehiclePhotosCompleted: false,
      isFaceVerificationCompleted: false,
      rejectionReason: null
    };
    res.json(statusData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Upload Taxi National ID
exports.uploadTaxiNationalId = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, nationalIdNumber, number, dob, gender, expiryDate, expiry, address } = req.body;
    const frontImage = req.files && req.files['frontImage'] ? `/uploads/drivers/${req.files['frontImage'][0].filename}` : null;
    const backImage = req.files && req.files['backImage'] ? `/uploads/drivers/${req.files['backImage'][0].filename}` : null;
    await updateTaxiStatusField(userId, (prev) => ({
      ...prev, isNationalIdCompleted: true,
      nationalId: { fullName, nationalIdNumber, dob, gender, expiryDate, address, frontImage, backImage }
    }));
    res.status(201).json({ status: 'success', message: 'National ID uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Upload Taxi Driver License
exports.uploadTaxiDriverLicense = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, licenseNumber, number, dob, expiryDate, expiry, issuingAuthority, authority, address } = req.body;
    const frontImage = req.files && req.files['frontImage'] ? `/uploads/drivers/${req.files['frontImage'][0].filename}` : null;
    const backImage = req.files && req.files['backImage'] ? `/uploads/drivers/${req.files['backImage'][0].filename}` : null;
    await updateTaxiStatusField(userId, (prev) => ({
      ...prev, isDriverLicenseCompleted: true,
      driverLicense: {
        fullName, number: number || licenseNumber,
        dob, expiry: expiry || expiryDate,
        authority: authority || issuingAuthority,
        address, frontImage, backImage
      }
    }));
    res.status(201).json({ status: 'success', message: 'Driver License uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Upload Taxi License (taxi-specific permit)
exports.uploadTaxiLicense = async (req, res) => {
  try {
    const userId = req.user.id;
    const licenseImage = req.file ? `/uploads/drivers/${req.file.filename}` : null;
    await updateTaxiStatusField(userId, (prev) => ({
      ...prev, isTaxiLicenseCompleted: true, taxiLicenseImage: licenseImage
    }));
    res.status(201).json({ status: 'success', message: 'Taxi License uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Upload Taxi Professional Card

exports.uploadTaxiProfessionalCard = async (req, res) => {
  try {
    const userId = req.user.id;
    const cardImage = req.file ? `/uploads/drivers/${req.file.filename}` : null;
    await updateTaxiStatusField(userId, (prev) => ({ ...prev, isProfessionalCardCompleted: true, professionalCardImage: cardImage }));
    res.status(201).json({ status: 'success', message: 'Professional Card uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Upload Taxi Vehicle Registration
exports.uploadTaxiVehicleRegistration = async (req, res) => {
  try {
    const userId = req.user.id;
    const registrationImage = req.file ? `/uploads/drivers/${req.file.filename}` : null;
    await updateTaxiStatusField(userId, (prev) => ({ ...prev, isVehicleRegistrationCompleted: true, vehicleRegistrationImage: registrationImage }));
    res.status(201).json({ status: 'success', message: 'Vehicle Registration uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Upload Taxi Vehicle Insurance
exports.uploadTaxiVehicleInsurance = async (req, res) => {
  try {
    const userId = req.user.id;
    const insuranceImage = req.file ? `/uploads/drivers/${req.file.filename}` : null;
    await updateTaxiStatusField(userId, (prev) => ({ ...prev, isVehicleInsuranceCompleted: true, vehicleInsuranceImage: insuranceImage }));
    res.status(201).json({ status: 'success', message: 'Vehicle Insurance uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Update Taxi Vehicle Details
exports.updateTaxiVehicleDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    await updateTaxiStatusField(userId, (prev) => ({ ...prev, isVehicleDetailsCompleted: true, vehicleDetails: req.body }));
    res.status(201).json({ status: 'success', message: 'Vehicle details updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Upload Taxi Vehicle Photos
exports.uploadTaxiVehiclePhotos = async (req, res) => {
  try {
    const userId = req.user.id;
    const photos = {
      frontView: req.files && req.files['frontView'] ? `/uploads/drivers/${req.files['frontView'][0].filename}` : null,
      rearView: req.files && req.files['rearView'] ? `/uploads/drivers/${req.files['rearView'][0].filename}` : null,
      leftView: req.files && req.files['leftView'] ? `/uploads/drivers/${req.files['leftView'][0].filename}` : null,
      rightView: req.files && req.files['rightView'] ? `/uploads/drivers/${req.files['rightView'][0].filename}` : null,
    };
    await updateTaxiStatusField(userId, (prev) => ({ ...prev, isVehiclePhotosCompleted: true, vehiclePhotos: photos }));
    res.status(201).json({ status: 'success', message: 'Vehicle photos uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// Upload Taxi Face Verification
exports.uploadTaxiFaceVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const selfieImage = req.file ? `/uploads/drivers/${req.file.filename}` : null;
    await updateTaxiStatusField(userId, (prev) => ({ ...prev, isFaceVerificationCompleted: true, faceVerificationImage: selfieImage }));
    res.status(201).json({ status: 'success', message: 'Face verification uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};
