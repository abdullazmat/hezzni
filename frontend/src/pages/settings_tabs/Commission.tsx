import { MapPin } from 'lucide-react';

export const Commission = () => {
    const cities = [
        'Casablanca', 'Rabat', 'Marrakech', 'Tangier',
        'Agadir', 'Meknes', 'Oujda', 'Kenitra',
        'Tetouan', 'Safi', 'Tetouan', 'Safi',
        'Casablanca', 'Rabat', 'Marrakech', 'Tangier',
        'Agadir', 'Meknes', 'Oujda', 'Kenitra',
        'Tetouan', 'Safi', 'Tetouan', 'Safi'
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Regional Commission Rates</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select style={{ 
                        padding: '0.5rem 1rem', 
                        borderRadius: '2rem', 
                        border: '1px solid #e5e7eb', 
                        backgroundColor: 'white',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                    }}>
                        <option>Casablanca</option>
                    </select>
                </div>
            </div>
            <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.9rem' }}>
                Customized commission percentages for each Moroccan city • No global rates
            </p>

            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: '1rem' 
            }}>
                {cities.map((city, index) => (
                    <div key={index} style={{ 
                        backgroundColor: 'white', 
                        padding: '1rem', 
                        borderRadius: '0.75rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ 
                                backgroundColor: '#eef7f0', 
                                padding: '0.5rem', 
                                borderRadius: '50%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center' 
                            }}>
                                <MapPin size={18} color="#38AC57" />
                            </div>
                            <span style={{ fontWeight: '500' }}>{city}</span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input 
                                    type="text" 
                                    defaultValue="9" 
                                    style={{ 
                                        width: '50px', 
                                        padding: '0.4rem 0.5rem', 
                                        borderRadius: '0.5rem', 
                                        border: '1px solid #e5e7eb',
                                        fontSize: '0.9rem',
                                        textAlign: 'center'
                                    }} 
                                />
                                <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '2px' }}>
                                    <span style={{ fontSize: '10px', cursor: 'pointer' }}>▲</span>
                                    <span style={{ fontSize: '10px', cursor: 'pointer' }}>▼</span>
                                </div>
                            </div>
                            
                            {/* Toggle Switch */}
                            <label style={{ 
                                position: 'relative', 
                                display: 'inline-block', 
                                width: '40px', 
                                height: '22px' 
                            }}>
                                <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
                                <span style={{
                                    position: 'absolute',
                                    cursor: 'pointer',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: '#38AC57',
                                    transition: '.4s',
                                    borderRadius: '34px'
                                }}>
                                    <span style={{
                                        position: 'absolute',
                                        content: '""',
                                        height: '16px',
                                        width: '16px',
                                        left: '20px',
                                        bottom: '3px',
                                        backgroundColor: 'white',
                                        transition: '.4s',
                                        borderRadius: '50%'
                                    }}></span>
                                </span>
                            </label>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
