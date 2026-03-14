import { Camera, Eye, Shield } from 'lucide-react';

export const ProfileTab = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* My Profile Header */}
            <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0.25rem 0' }}>My Profile</h2>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>Manage your personal information and profile settings</p>
            </div>

            {/* Profile Cover & Avatar */}
            <div style={{ position: 'relative', marginBottom: '4rem' }}>
                <div style={{ height: '180px', backgroundColor: '#38AC57', borderRadius: '1rem' }}></div>
                <div style={{ position: 'absolute', bottom: '-40px', left: '30px', display: 'flex', alignItems: 'flex-end', gap: '1.5rem' }}>
                    <div style={{ position: 'relative' }}>
                        <img 
                            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
                            alt="Profile" 
                            style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid white', backgroundColor: 'white' }} 
                        />
                        <button style={{ 
                            position: 'absolute', bottom: '5px', right: '5px', 
                            backgroundColor: 'white', border: '1px solid #e5e7eb', 
                            borderRadius: '50%', padding: '6px', cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                            <Camera size={16} />
                        </button>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.25rem 0' }}>Admin User</h3>
                        <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                            <div style={{ fontWeight: '600', color: '#374151' }}>Upload Guidelines</div>
                            <div>JPG, PNG or GIF | Max size: 2MB</div>
                            <div>Square image recommended</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Personal Information */}
            <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Personal Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Full Name</label>
                        <input type="text" placeholder="Enter Full Name" style={inputStyle} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Email Address</label>
                        <input type="email" placeholder="Enter Email Address" style={inputStyle} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Phone Number</label>
                        <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.75rem', backgroundColor: '#f9fafb', borderRight: '1px solid #e5e7eb' }}>
                                <span style={{ width: '16px', height: '12px', backgroundColor: '#c8102e' }}></span>
                                <span style={{ fontSize: '0.85rem' }}>+212 ⌄</span>
                            </div>
                            <input type="text" style={{ ...inputStyle, border: 'none' }} />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Department</label>
                        <input type="text" placeholder="Operation" style={inputStyle} />
                    </div>
                </div>

                <div style={{ 
                    backgroundColor: '#fffbeb', 
                    border: '1px solid #fef3c7', 
                    padding: '1rem', 
                    borderRadius: '0.5rem', 
                    display: 'flex', 
                    gap: '1rem', 
                    marginTop: '2rem',
                    marginBottom: '2rem'
                }}>
                    <div style={{ backgroundColor: '#fbbf24', color: 'white', padding: '6px', borderRadius: '4px', height: 'fit-content' }}>
                        <Shield size={20} />
                    </div>
                    <div style={{ fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: '600', color: '#92400e' }}>Security & Password</div>
                        <div style={{ color: '#b45309' }}>For security reasons, password changes require admin verification. Contact your system administrator to update your password or enable two-factor authentication.</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button style={{ backgroundColor: '#38AC57', color: 'white', border: 'none', padding: '0.75rem 2.5rem', borderRadius: '2rem', fontWeight: '600', cursor: 'pointer' }}>Save</button>
                    <button style={{ backgroundColor: 'white', border: '1px solid #374151', color: '#374151', padding: '0.75rem 2.5rem', borderRadius: '2rem', fontWeight: '600', cursor: 'pointer' }}>Reset</button>
                </div>
            </div>

            {/* Reset Password */}
            <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Reset Password</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
                    <div>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Current Password</label>
                        <div style={{ position: 'relative' }}>
                            <input type="password" placeholder="Enter Your Current Password" style={{ ...inputStyle, borderRadius: '0.75rem', paddingRight: '3rem' }} />
                            <Eye size={20} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem' }}>New Password</label>
                        <input type="password" placeholder="Enter Your New Password" style={{ ...inputStyle, borderRadius: '0.75rem' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Confirm Password</label>
                        <input type="password" placeholder="Confirm Your New Password" style={{ ...inputStyle, borderRadius: '0.75rem' }} />
                    </div>
                    <button style={{ backgroundColor: '#38AC57', color: 'white', border: 'none', padding: '0.75rem 2.5rem', borderRadius: '2rem', fontWeight: '600', cursor: 'pointer', width: 'fit-content' }}>Update Password</button>
                </div>
            </div>
        </div>
    );
};

const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid #e5e7eb',
    fontSize: '0.95rem',
    outline: 'none'
};
