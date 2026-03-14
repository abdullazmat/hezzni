export const PageLoader = ({ label = 'Loading...' }: { label?: string }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: '400px',
    gap: '1.5rem',
    backgroundColor: 'transparent',
  }}>
    <style>{`
      @keyframes spin-modern {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes dash-modern {
        0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
        50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
        100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
      }
      @keyframes pulse-soft {
        0%, 100% { transform: scale(1); opacity: 0.3; }
        50% { transform: scale(1.1); opacity: 0.1; }
      }
      .loader-container {
        animation: spin-modern 2s linear infinite;
      }
      .loader-circle {
        stroke: #38AC57;
        stroke-linecap: round;
        animation: dash-modern 1.5s ease-in-out infinite;
      }
    `}</style>
    
    <div style={{ position: 'relative', width: '64px', height: '64px' }}>
      {/* Ghost Pulse */}
      <div style={{
        position: 'absolute',
        inset: '-10px',
        backgroundColor: '#38AC57',
        borderRadius: '50%',
        animation: 'pulse-soft 2s ease-in-out infinite',
      }} />
      
      {/* SVG Spinner */}
      <svg viewBox="0 0 50 50" className="loader-container" style={{ width: '100%', height: '100%' }}>
        <circle 
          cx="25" cy="25" r="20" 
          fill="none" 
          stroke="#e5e7eb" 
          strokeWidth="4" 
        />
        <circle 
          className="loader-circle"
          cx="25" cy="25" r="20" 
          fill="none" 
          strokeWidth="4" 
        />
      </svg>
      
      {/* Inner Center Dot */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '6px', height: '6px',
        backgroundColor: '#38AC57',
        borderRadius: '50%',
      }} />
    </div>

    {label && (
      <p style={{
        margin: 0,
        color: '#64748b',
        fontSize: '0.9rem',
        fontWeight: '600',
        letterSpacing: '0.01em'
      }}>
        {label}
      </p>
    )}
  </div>
);
