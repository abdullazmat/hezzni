import { useState } from 'react';
import loginImage from '../assets/login_page.jpg';
import logo from '../assets/Logo.png';
import { loginApi } from '../services/api';

interface LoginProps {
  onLogin: () => void;
  onForgotPassword: () => void;
}

export const Login = ({ onLogin, onForgotPassword }: LoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    let isValid = true;
    const newErrors = { email: '', password: '' };

    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Invalid Email';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Invalid Password';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setIsLoading(true);

      try {
        const result = await loginApi({ email, password });

        if (!result.ok) {
          const errorMsg = result.data?.message || 'Login failed. Please check your credentials.';
          throw new Error(errorMsg);
        }

        // Store token and user data from API response
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        
        onLogin();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'An error occurred. Please try again.';
        setErrors({ email: message, password: '' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="login-container" style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#fff', color: '#333' }}>
      {/* Left Side - Form */}
      <div className="login-form-side" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '0', marginLeft: '-4px' }}>
            <img src={logo} alt="Hezzni Logo" style={{ height: '40px', width: 'auto' }} />
            <span style={{ fontSize: '2.2rem', fontWeight: '900', color: '#0D4463', letterSpacing: '-0.04em', lineHeight: 1, marginLeft: '-10px' }}>ezzni</span>
          </div>
          
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '2rem', color: '#111827' }}>Login</h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  borderRadius: '0.75rem',
                  border: errors.email ? '1px solid #ef4444' : '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb',
                  fontSize: '1rem',
                  outline: 'none',
                  color: '#111827',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px rgba(56, 172, 87, 0.1)'}
                onBlur={(e) => e.target.style.boxShadow = 'none'}
              />
              {errors.email && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.4rem', display: 'block' }}>{errors.email}</span>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  borderRadius: '0.75rem',
                  border: errors.password ? '1px solid #ef4444' : '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb',
                  fontSize: '1rem',
                  outline: 'none',
                  color: '#111827',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px rgba(56, 172, 87, 0.1)'}
                onBlur={(e) => e.target.style.boxShadow = 'none'}
              />
              {errors.password && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.4rem', display: 'block' }}>{errors.password}</span>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.875rem', color: '#4b5563' }}>
                <input type="checkbox" style={{ width: '1rem', height: '1rem', accentColor: '#38AC57', cursor: 'pointer' }} />
                <span>Remember me</span>
              </label>
              <button 
                type="button" 
                onClick={onForgotPassword}
                style={{ background: 'none', border: 'none', color: '#111827', fontWeight: '600', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Forget Password
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                backgroundColor: '#38AC57',
                color: 'white',
                padding: '0.875rem',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                marginTop: '1.5rem',
                boxShadow: '0 4px 6px -1px rgba(56, 172, 87, 0.2)',
                transition: 'transform 0.1s, background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d8a46'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#38AC57'}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>

      {/* Right Side - Image - Hidden on mobile via CSS class */}
      <div className="login-image-side" style={{ flex: 1.2, position: 'relative', overflow: 'hidden' }}>
        <div 
          style={{
            position: 'absolute',
            top: '0',
            right: '0',
            bottom: '0',
            left: '0',
            backgroundImage: `url(${loginImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(56, 172, 87, 0.3) 0%, rgba(0, 0, 0, 0.7) 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '4rem',
            color: 'white'
          }}>
            <h1 style={{ fontSize: '3.5rem', fontWeight: '900', lineHeight: 1.1, marginBottom: '1.5rem', maxWidth: '500px' }}>
              Drive. Deliver.<br />Dominate.
            </h1>
            <p style={{ fontSize: '1.125rem', opacity: 0.9, maxWidth: '450px', lineHeight: 1.6 }}>
              Take Full Control Of Rides, Deliveries, And Drivers. Monitor Everything In Real Time And Keep Your Operations Moving.
            </p>
            <div style={{ position: 'absolute', right: '-4rem', bottom: '12rem', transform: 'rotate(-90deg)', fontSize: '8rem', fontWeight: '900', opacity: 0.1, whiteSpace: 'nowrap' }}>
              EZZNI
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .login-image-side {
            display: none !important;
          }
          .login-form-side {
            padding: 1.5rem !important;
          }
        }
        @media (min-width: 768px) and (max-width: 1024px) {
          .login-image-side {
            flex: 1 !important;
          }
        }
        @media (max-width: 480px) {
           h2 {
             font-size: 1.75rem !important;
           }
           input {
             font-size: 16px !important; /* Prevent zoom on iOS */
           }
        }
      `}</style>
    </div>

  );
};
