import React, { useState, useEffect } from 'react';
import { getPassengerServicesApi, calculateRidePriceApi, PassengerService, RideOption } from '../../services/api';

export const PassengerHome: React.FC = () => {
  const [services, setServices] = useState<PassengerService[]>([]);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [rideOptions, setRideOptions] = useState<RideOption[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [pickup] = useState({ latitude: 33.5731, longitude: -7.5898, address: "Casablanca Marina" });
  const [dropoff] = useState({ latitude: 33.5922, longitude: -7.6012, address: "Morocco Mall" });

  useEffect(() => {
    const fetchServices = async () => {
      const response = await getPassengerServicesApi();
      if (response.ok) {
        setServices(response.data.data);
      }
    };
    fetchServices();
  }, []);

  const handleCalculatePrice = async (serviceId: number, code?: string) => {
    setSelectedService(serviceId);
    setLoading(true);
    setError('');

    try {
      const response = await calculateRidePriceApi({
        pickup,
        dropoff,
        passengerServiceId: serviceId,
        couponCode: code || undefined
      });

      if (response.ok) {
        setRideOptions(response.data.data.options);
      } else {
        setError(response.data.message || 'Price calculation failed');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const applyCoupon = () => {
    if (selectedService) {
      handleCalculatePrice(selectedService, couponCode);
    }
  };

  return (
    <div className="passenger-home">
      <header className="passenger-header">
        <h1>Where to?</h1>
      </header>

      <div className="location-selection">
        <div className="location-item">
          <span className="dot pickup"></span>
          <p>{pickup.address}</p>
        </div>
        <div className="location-item">
          <span className="dot dropoff"></span>
          <p>{dropoff.address}</p>
        </div>
      </div>

      <div className="services-list">
        {services.map(service => (
          <button 
            key={service.id} 
            className={`service-card ${selectedService === service.id ? 'active' : ''}`}
            onClick={() => handleCalculatePrice(service.id)}
          >
            <div className="service-icon">🚗</div>
            <p>{service.name}</p>
          </button>
        ))}
      </div>

      {rideOptions.length > 0 && (
        <div className="ride-options">
          <h3>Available Rides</h3>
          {rideOptions.map(option => (
            <div key={option.id} className="ride-option-card">
              <div className="option-info">
                <h4>{option.ridePreference}</h4>
                <p>{option.description}</p>
              </div>
              <div className="option-price">
                MAD {option.price.toFixed(2)}
              </div>
            </div>
          ))}

          <div className="coupon-section">
            <input 
              type="text" 
              placeholder="Enter coupon code" 
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
            />
            <button onClick={applyCoupon}>Apply</button>
          </div>

          {loading && <p className="loading-text">Calculating prices...</p>}
          {error && <p className="error-text">{error}</p>}

          <button className="btn-confirm-ride">Request Ride</button>
        </div>
      )}
    </div>
  );
};
