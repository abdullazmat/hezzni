import { useState } from 'react';
import logo from '../assets/Logo.png';
import { forgotPasswordApi } from '../services/api';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

export const ForgotPassword = ({ onBackToLogin }: ForgotPasswordProps) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      const result = await forgotPasswordApi({ email });

      if (!result.ok) {
        const errorMsg = result.data?.message || 'Failed to send reset link. Please try again.';
        throw new Error(errorMsg);
      }

      setIsSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', color: '#333' }}>
      
      {/* Centered Card Content */}
      <div className="forgot-password-container" style={{ width: '100%', maxWidth: '450px', padding: '2rem', textAlign: 'center' }}>
        <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0' }}>
          <img src={logo} alt="Hezzni Logo" style={{ height: '40px', width: 'auto' }} />
          <span style={{ fontSize: '2.2rem', fontWeight: '900', color: '#0D4463', letterSpacing: '-0.04em', lineHeight: 1, marginLeft: '-10px' }}>ezzni</span>
        </div>

        <h2 style={{ fontSize: '2.25rem', fontWeight: '800', marginBottom: '2.5rem', color: '#111827' }}>Forgot Password?</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>Enter your email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@hezzni.com"
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                borderRadius: '0.75rem',
                border: error ? '1px solid #ef4444' : '1px solid #e5e7eb',
                backgroundColor: '#f9fafb',
                fontSize: '1rem',
                outline: 'none',
                color: '#111827',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px rgba(56, 172, 87, 0.1)'}
              onBlur={(e) => e.target.style.boxShadow = 'none'}
            />
            {error && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.4rem', display: 'block' }}>{error}</span>}
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
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d8a46'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#38AC57'}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div style={{ marginTop: '2.5rem' }}>
          <button 
            onClick={onBackToLogin}
            style={{ background: 'none', border: 'none', color: '#111827', fontWeight: '600', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            Back to Login
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {isSubmitted && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          backgroundColor: '#f3f4f6',
          padding: '1rem 2rem',
          borderRadius: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <div style={{ 
            width: '24px', 
            height: '24px', 
            borderRadius: '50%', 
            border: '2px solid #000', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontWeight: 'bold' 
          }}>
            i
          </div>
          <span>Reset link sent to your email</span>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @media (max-width: 480px) {
           h2 {
             font-size: 1.75rem !important;
           }
           .forgot-password-container {
             padding: 1rem !important;
           }
        }
      `}</style>
    </div>
  );
};
