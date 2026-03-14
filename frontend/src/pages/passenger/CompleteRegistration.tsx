import React, { useState, useEffect } from 'react';
import { completePassengerRegistrationApi, getCitiesApi, City } from '../../services/api';

interface CompleteRegistrationProps {
  onComplete: () => void;
}

export const CompleteRegistration: React.FC<CompleteRegistrationProps> = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dob: '',
    gender: 'MALE',
    cityId: ''
  });
  const [image, setImage] = useState<File | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCities = async () => {
      const response = await getCitiesApi();
      if (response.ok) {
        setCities(response.data.data);
      }
    };
    fetchCities();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('email', formData.email);
      data.append('dob', formData.dob);
      data.append('gender', formData.gender);
      data.append('cityId', formData.cityId);
      if (image) {
        data.append('image', image);
      }

      const response = await completePassengerRegistrationApi(data);
      if (response.ok) {
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        onComplete();
      } else {
        setError(response.data.message || 'Registration failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Complete Profile</h1>
        <p>Please provide a few more details to start riding</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date of Birth</label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>City</label>
            <select
              value={formData.cityId}
              onChange={(e) => setFormData({ ...formData, cityId: e.target.value })}
              required
            >
              <option value="">Select City</option>
              {cities.map(city => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Profile Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : 'Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  );
};
