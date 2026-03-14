import React, { useState, useEffect } from 'react';
import { PassengerLogin } from './PassengerLogin';
import { CompleteRegistration } from './CompleteRegistration';
import { PassengerHome } from './PassengerHome';

export const PassengerPortal: React.FC = () => {
  const [step, setStep] = useState<'login' | 'register' | 'home'>('login');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (token && storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      if (parsedUser.isRegistered) {
        setStep('home');
      } else {
        setStep('register');
      }
    }
  }, []);

  const handleLoginSuccess = (data: any) => {
    setUser(data.user);
    if (data.isRegistered) {
      setStep('home');
    } else {
      setStep('register');
    }
  };

  const handleRegistrationComplete = () => {
    // Refresh user data from local storage (it was updated in CompleteRegistration)
    const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(updatedUser);
    setStep('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setStep('login');
    setUser(null);
  };

  return (
    <div className="passenger-portal-container">
      {step === 'home' && (
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <p style={{ margin: 0, fontWeight: 'bold' }}>Welcome, {user?.name || 'Passenger'}</p>
           <button onClick={handleLogout} className="btn-secondary" style={{ padding: '4px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer' }}>Logout</button>
        </div>
      )}

      
      {step === 'login' && <PassengerLogin onLoginSuccess={handleLoginSuccess} />}
      {step === 'register' && <CompleteRegistration onComplete={handleRegistrationComplete} />}
      {step === 'home' && <PassengerHome />}
      
      <style>{`
        .passenger-portal-container {
          max-width: 500px;
          margin: 0 auto;
          background: white;
          min-height: 80vh;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          overflow: hidden;
          padding: 20px;
        }
        .auth-container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }
        .auth-card {
          width: 100%;
          text-align: center;
        }
        .form-group {
          margin-bottom: 1.5rem;
          text-align: left;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #374151;
        }
        .form-group input, .form-group select {
          width: 100%;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          outline: none;
          box-sizing: border-box;
        }
        .form-row {
          display: flex;
          gap: 1rem;
        }
        .form-row .form-group {
          flex: 1;
        }
        .btn-primary {
          width: 100%;
          padding: 14px;
          background-color: #38AC57;
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.3s;
        }
        .btn-primary:hover {
          background-color: #2d8a46;
        }
        .error-message {
          color: #ef4444;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }
        
        /* Passenger Home Styles */
        .location-selection {
          background: #f3f4f6;
          padding: 1rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
        }
        .location-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .dot.pickup { background: #38AC57; }
        .dot.dropoff { background: #ef4444; }
        
        .services-list {
          display: flex;
          gap: 1rem;
          overflow-x: auto;
          padding-bottom: 1rem;
          margin-bottom: 1.5rem;
        }
        .service-card {
          flex: 0 0 100px;
          padding: 1rem;
          background: #f9fafb;
          border: 2px solid transparent;
          border-radius: 16px;
          text-align: center;
          cursor: pointer;
        }
        .service-card.active {
          border-color: #38AC57;
          background: #eef7f0;
        }
        .service-icon {
          font-size: 24px;
          margin-bottom: 0.5rem;
        }
        
        .ride-option-card {
           display: flex;
           justify-content: space-between;
           align-items: center;
           padding: 1rem;
           background: #f9fafb;
           border-radius: 12px;
           margin-bottom: 0.75rem;
        }
        .option-info h4 { margin: 0; font-size: 1rem; }
        .option-info p { margin: 4px 0 0; font-size: 0.8rem; color: #6b7280; }
        .option-price { font-weight: bold; color: #111827; }
        
        .coupon-section {
          display: flex;
          gap: 8px;
          margin-top: 1.5rem;
        }
        .coupon-section input {
          flex: 1;
          padding: 10px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
        .coupon-section button {
          padding: 10px 16px;
          background: #1f2937;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        .btn-confirm-ride {
          width: 100%;
          margin-top: 2rem;
          padding: 16px;
          background: #38AC57;
          color: white;
          border: none;
          border-radius: 16px;
          font-weight: bold;
          font-size: 1.1rem;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};
