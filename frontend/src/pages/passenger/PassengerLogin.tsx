import React, { useState } from 'react';
import { passengerLoginApi } from '../../services/api';

interface PassengerLoginProps {
  onLoginSuccess: (data: any) => void;
}

export const PassengerLogin: React.FC<PassengerLoginProps> = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await passengerLoginApi(phone);
      if (response.ok) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        onLoginSuccess(response.data.data);
      } else {
        setError(response.data.message || 'Login failed');
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
        <h1>Passenger Login</h1>
        <p>Enter your phone number to continue</p>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              placeholder="+212600000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Processing...' : 'Login / Register'}
          </button>
        </form>
      </div>
    </div>
  );
};
