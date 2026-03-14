import { useState, useEffect } from 'react';
import { 
  X, 
  ArrowLeft,
  Info
} from 'lucide-react';
import { Promotion } from './CouponTypes';
import carIcon from '../assets/icons/car.png';
import deliveryIcon from '../assets/icons/Delivery Services.png';
import motorcycleIcon from '../assets/icons/bike.png';
import rentalCarIcon from '../assets/icons/rental car.png';
import taxiIcon from '../assets/icons/taxi.png';

// --- Shared Styles ---
const sharedStyles = `
  .pm-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(8px);
    padding: 20px;
    overflow-y: auto;
  }
  .pm-container {
    background-color: white;
    border-radius: 32px;
    width: 95%;
    max-width: 850px;
    margin: 20px auto;
    position: relative;
    padding: 2.5rem;
    color: #111827;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(255, 255, 255, 0.1);
    animation: pm-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes pm-slide-up {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .pm-header-btn {
    border: none;
    background: #f3f4f6;
    cursor: pointer;
    padding: 10px;
    border-radius: 14px;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: fit-content;
    transition: all 0.2s;
  }
  .pm-header-btn:hover {
    background-color: #e5e7eb;
    transform: translateX(-4px);
  }
  .pm-section-card {
    background-color: #f9fafb;
    border-radius: 24px;
    padding: 2rem;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
    margin-bottom: 2rem;
    border: 1px solid #f3f4f6;
  }
  .pm-services-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 2.5rem;
  }
  .pm-footer-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }
  .pm-action-btn {
    flex: 1;
    padding: 16px;
    border-radius: 100px;
    font-weight: 800;
    font-size: 1.1rem;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
  }
  .pm-input-label {
    font-size: 13px;
    color: #6B7280;
    font-weight: 700;
    margin-bottom: 8px;
    display: block;
  }
  .pm-input {
    width: 100%;
    padding: 12px 16px;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    font-size: 14px;
    font-weight: 500;
    outline: none;
    background-color: white;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }
  .pm-input:focus {
    border-color: #38AC57;
    box-shadow: 0 0 0 4px rgba(56, 172, 87, 0.1);
  }
  .pm-col-span-2 { grid-column: span 2; }
  .pm-col-span-4 { grid-column: span 4; }

  /* Create Specific */
  .cpm-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-bottom: 2rem;
  }
  .cpm-service-select {
    flex: 1;
    padding: 1.25rem 1rem;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 110px;
    background-color: #fff;
    border: 1px solid #f3f4f6;
  }
  .cpm-service-select:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
    border-color: #38AC57;
  }
  
  @media (max-width: 1024px) {
    .pm-container { max-width: 700px; }
    .pm-section-card { grid-template-columns: repeat(2, 1fr); padding: 1.5rem; }
  }

  @media (max-width: 768px) {
    .pm-container { padding: 1.5rem; border-radius: 24px; margin: 10px auto; }
    .pm-section-card { grid-template-columns: 1fr; padding: 1.25rem; gap: 1rem; }
    .pm-col-span-2, .pm-col-span-4 { grid-column: span 1; }
    .pm-footer-actions { flex-direction: column; gap: 0.75rem; }
    .cpm-grid { grid-template-columns: 1fr; gap: 1.5rem; }
    .pm-services-grid { justify-content: center; }
    .pm-action-btn { font-size: 1rem; padding: 14px; }
  }

`;

interface CouponsModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotion: Promotion | null;
  onUpdate: (promotion: Promotion) => void;
  onDelete: (id: string) => void;
}

export const CouponsModal = ({ isOpen, onClose, promotion, onUpdate, onDelete }: CouponsModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPromo, setEditedPromo] = useState<Promotion | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (promotion) {
      setEditedPromo(promotion);
      setIsEditing(false);
    }
  }, [promotion]);

  if (!isOpen || !promotion || !editedPromo) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSave = () => {
    onUpdate(editedPromo);
    setIsEditing(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleToggleService = (serviceId: string) => {
    if (!isEditing) return;
    setEditedPromo(prev => {
      if (!prev) return null;
      const services = prev.eligibleServices.includes(serviceId)
        ? prev.eligibleServices.filter(id => id !== serviceId)
        : [...prev.eligibleServices, serviceId];
      return { ...prev, eligibleServices: services };
    });
  };

  const services = [
    { id: 'Rides', label: 'Rides', icon: carIcon },
    { id: 'Deliveries', label: 'Deliveries', icon: deliveryIcon },
    { id: 'Motorcycle', label: 'Motorcycle', icon: motorcycleIcon },
    { id: 'Rental Car', label: 'Rental Car', icon: rentalCarIcon },
    { id: 'Taxi', label: 'Taxi', icon: taxiIcon }
  ];

  return (
    <div className="pm-overlay" onClick={handleBackdropClick}>
      <style>{sharedStyles}</style>
      <div className="pm-container" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="pm-header-btn">
          <ArrowLeft size={22} />
        </button>

        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: '0 0 0.25rem 0' }}>Promotion Details</h2>
        <p style={{ margin: '0 0 2rem 0', color: '#6B7280', fontSize: '1rem' }}>Complete information about this promotion</p>

        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1rem' }}>Trip Summary</h3>
        
        <div className="pm-section-card">
          <div>
            <div className="pm-input-label">Promotion ID</div>
            <div style={{ fontWeight: '800', fontSize: '15px' }}>{editedPromo.id}</div>
          </div>
          <div>
            <div className="pm-input-label">Status</div>
            {isEditing ? (
              <select 
                className="pm-input"
                value={editedPromo.status} 
                onChange={(e) => setEditedPromo({...editedPromo, status: e.target.value as any})}
              >
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
              </select>
            ) : (
              <span style={{ 
                backgroundColor: editedPromo.status === 'Active' ? '#eef7f0' : '#FEE2E2',
                color: editedPromo.status === 'Active' ? '#38AC57' : '#EF4444',
                padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '800'
              }}>
                {editedPromo.status}
              </span>
            )}
          </div>
          <div className="pm-col-span-2">
            <div className="pm-input-label">Promotion Name</div>
            {isEditing ? (
              <input 
                className="pm-input"
                value={editedPromo.name} 
                onChange={(e) => setEditedPromo({...editedPromo, name: e.target.value})}
              />
            ) : (
              <div style={{ fontWeight: '800', fontSize: '15px' }}>{editedPromo.name}</div>
            )}
          </div>
          <div>
            <div className="pm-input-label">Promo Code</div>
            {isEditing ? (
              <input 
                className="pm-input"
                value={editedPromo.code} 
                onChange={(e) => setEditedPromo({...editedPromo, code: e.target.value})}
              />
            ) : (
              <div style={{ fontWeight: '800', fontSize: '15px' }}>{editedPromo.code}</div>
            )}
          </div>
          <div>
            <div className="pm-input-label">Discount</div>
            {isEditing ? (
              <input 
                className="pm-input"
                value={editedPromo.discount} 
                onChange={(e) => setEditedPromo({...editedPromo, discount: e.target.value})}
              />
            ) : (
              <div style={{ fontWeight: '800', fontSize: '15px' }}>{editedPromo.discount}</div>
            )}
          </div>
          <div>
            <div className="pm-input-label">Expire Date</div>
            {isEditing ? (
              <input 
                type="date"
                className="pm-input"
                value={editedPromo.validUntil} 
                onChange={(e) => setEditedPromo({...editedPromo, validUntil: e.target.value})}
              />
            ) : (
              <div style={{ fontWeight: '800', fontSize: '15px' }}>{editedPromo.validUntil}</div>
            )}
          </div>
          <div>
            <div className="pm-input-label">Min Order Amount</div>
            {isEditing ? (
              <input 
                className="pm-input"
                value={editedPromo.minOrderAmount} 
                onChange={(e) => setEditedPromo({...editedPromo, minOrderAmount: e.target.value})}
              />
            ) : (
              <div style={{ fontWeight: '800', fontSize: '15px' }}>{editedPromo.minOrderAmount}</div>
            )}
          </div>
          <div className="pm-col-span-4">
            <div className="pm-input-label">Usage Count</div>
            <div style={{ fontWeight: '800', fontSize: '15px' }}>{editedPromo.usageCount} of {editedPromo.maxUsage}</div>
          </div>
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1rem' }}>Description</h3>
        <textarea 
          value={editedPromo.description}
          readOnly={!isEditing}
          onChange={(e) => setEditedPromo({...editedPromo, description: e.target.value})}
          style={{ 
            width: '100%',
            backgroundColor: '#f9fafb',
            border: isEditing ? '1px solid #38AC57' : '1px solid #f3f4f6',
            borderRadius: '16px', padding: '1.5rem', fontSize: '15px', color: '#4B5563',
            minHeight: '100px', marginBottom: '2rem', outline: 'none', resize: 'none'
          }}
        />

        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1rem' }}>Eligible Services</h3>
        <div className="pm-services-grid">
          {services.map(service => (
            <button 
              key={service.id}
              onClick={() => handleToggleService(service.id)}
              style={{ 
                border: editedPromo.eligibleServices.includes(service.id) ? '2px solid #38AC57' : '1px solid #e5e7eb', 
                backgroundColor: editedPromo.eligibleServices.includes(service.id) ? '#eef7f0' : 'white',
                padding: '8px 20px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '14px', fontWeight: '700', color: '#374151',
                cursor: isEditing ? 'pointer' : 'default',
                transition: 'all 0.2s',
                minWidth: '120px',
                justifyContent: 'center'
              }}
            >
              <img src={service.icon} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} /> {service.label}
            </button>
          ))}
        </div>

        <div className="pm-footer-actions">
          {isEditing ? (
            <button onClick={handleSave} className="pm-action-btn" style={{ backgroundColor: '#38AC57', color: 'white' }}>
              Save Changes
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="pm-action-btn" style={{ backgroundColor: 'black', color: 'white' }}>
              Edit Promotion
            </button>
          )}
          
          <button onClick={() => onDelete(editedPromo.id)} className="pm-action-btn" style={{ backgroundColor: '#EF4444', color: 'white' }}>
            Delete Permanently
          </button>
        </div>

        {showToast && (
          <div style={{ 
            position: 'fixed', bottom: '2rem', right: '2rem', backgroundColor: 'white',
            padding: '1.25rem 2rem', borderRadius: '100px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '1rem',
            zIndex: 1100, color: '#111827'
          }}>
            <div style={{ width: '40px', height: '40px', backgroundColor: '#111827', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Info size={24} />
            </div>
            <span style={{ fontWeight: '700', fontSize: '16px' }}>Promotion has been updated</span>
            <button onClick={() => setShowToast(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9CA3AF', marginLeft: '1rem' }}><X size={20} /></button>
          </div>
        )}
      </div>
    </div>
  );
};

interface CreatePromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (promotion: Promotion) => void;
}

export const CreatePromotionModal = ({ isOpen, onClose, onCreate }: CreatePromotionModalProps) => {
  const [formData, setFormData] = useState<Partial<Promotion>>({
    name: '',
    code: '',
    description: '',
    discountType: 'Percentage',
    discountValue: '',
    validUntil: '',
    status: 'Active',
    maxUsage: 1000,
    minOrderAmount: '',
    eligibleServices: []
  });
  const [showToast, setShowToast] = useState(false);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const services = [
    { id: 'Rides', label: 'Rides', icon: carIcon },
    { id: 'Deliveries', label: 'Deliveries', icon: deliveryIcon },
    { id: 'Motorcycle', label: 'Motorcycle', icon: motorcycleIcon },
    { id: 'Rental Car', label: 'Rental Car', icon: rentalCarIcon },
    { id: 'Taxi', label: 'Taxi', icon: taxiIcon }
  ];

  const handleToggleService = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      eligibleServices: prev.eligibleServices?.includes(serviceId)
        ? prev.eligibleServices.filter(id => id !== serviceId)
        : [...(prev.eligibleServices || []), serviceId]
    }));
  };

  const handleCreate = () => {
    const newPromo: Promotion = {
      id: `PROMO${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      name: formData.name || '',
      code: formData.code || '',
      description: formData.description || '',
      discount: formData.discountType === 'Percentage' ? `${formData.discountValue}%` : `${formData.discountValue} MAD`,
      discountType: formData.discountType as any,
      discountValue: formData.discountValue || '',
      validUntil: formData.validUntil || '',
      usageCount: 0,
      maxUsage: formData.maxUsage || 1000,
      status: formData.status as any,
      minOrderAmount: formData.minOrderAmount || '0 MAD',
      eligibleServices: formData.eligibleServices || []
    };
    setShowToast(true);
    setTimeout(() => {
        setShowToast(false);
        onCreate(newPromo);
    }, 500);
  };

  return (
    <div className="pm-overlay" onClick={handleBackdropClick}>
        <style>{sharedStyles}</style>
        <div className="pm-container" onClick={e => e.stopPropagation()}>
          <button onClick={onClose} className="pm-header-btn">
            <ArrowLeft size={22} />
          </button>

          <h2 style={{ fontSize: '1.75rem', fontWeight: '900', margin: '0 0 0.25rem 0' }}>Create New Promotion</h2>
          <p style={{ margin: '0 0 2rem 0', color: '#6B7280', fontSize: '1rem' }}>Set up a new promotional campaign with discount codes and usage rules</p>

          <div className="cpm-grid">
            {/* Left Column */}
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>Basic Information</h3>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="pm-input-label">Promotion Name</label>
                <input type="text" placeholder="Type here" className="pm-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="pm-input-label">Promo Code</label>
                <input type="text" placeholder="Type here" className="pm-input" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="pm-input-label">Description</label>
                <textarea placeholder="Type here" className="pm-input" style={{minHeight: '100px', resize: 'none'}} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
            </div>

            {/* Right Column */}
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>Discount Settings</h3>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="pm-input-label">Discount Type</label>
                  <select className="pm-input" value={formData.discountType} onChange={e => setFormData({...formData, discountType: e.target.value as any})}>
                    <option value="Percentage">Percentage</option>
                    <option value="Fixed Amount">Fixed Amount</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="pm-input-label">Discount Amount</label>
                  <input type="text" placeholder="Type here" className="pm-input" value={formData.discountValue} onChange={e => setFormData({...formData, discountValue: e.target.value})} />
                </div>
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="pm-input-label">Expire Date</label>
                <input type="date" className="pm-input" value={formData.validUntil} onChange={e => setFormData({...formData, validUntil: e.target.value})} />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="pm-input-label">Status</label>
                <select className="pm-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '1rem 0 1.5rem 0' }}>Usage Limits & Requirements</h3>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ flex: 1 }}>
            <label className="pm-input-label">Maximum *</label>
            <input type="number" placeholder="Type here" className="pm-input" value={formData.maxUsage} onChange={e => setFormData({...formData, maxUsage: parseInt(e.target.value)})} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="pm-input-label">Minimum Oder Amount (MAD)</label>
            <input type="text" placeholder="Type here" className="pm-input" value={formData.minOrderAmount} onChange={e => setFormData({...formData, minOrderAmount: e.target.value})} />
          </div>
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem' }}>Eligible Services</h3>
        <p style={{ margin: '0 0 1.5rem 0', color: '#6B7280', fontSize: '0.9rem' }}>Select which services this promotion applies to. Leave empty to apply to all services.</p>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
          {services.map(service => (
            <div 
              key={service.id}
              onClick={() => handleToggleService(service.id)}
              className="cpm-service-select"
              style={{ 
                border: formData.eligibleServices?.includes(service.id) ? '2px solid #38AC57' : '1px solid #f3f4f6',
                backgroundColor: formData.eligibleServices?.includes(service.id) ? '#eef7f0' : 'white',
              }}
            >
              <div style={{ padding: '8px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
                <img src={service.icon} alt="" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#374151', textAlign: 'center' }}>{service.label}</span>
            </div>
          ))}
        </div>

        <div className="pm-footer-actions">
          <button 
            onClick={onClose}
            style={{ 
              flex: 1, padding: '16px', borderRadius: '100px', border: '1px solid #e5e7eb',
              backgroundColor: 'white', fontWeight: '800', fontSize: '1.1rem', cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button 
            onClick={handleCreate}
            style={{ 
              flex: 1, padding: '16px', borderRadius: '100px', border: 'none',
              backgroundColor: '#38AC57', color: 'white', fontWeight: '800', fontSize: '1.1rem', cursor: 'pointer'
            }}
          >
            Create Promotion
          </button>
        </div>

        {showToast && (
          <div style={{ 
            position: 'fixed', bottom: '2rem', right: '2rem', backgroundColor: 'white',
            padding: '1.25rem 2rem', borderRadius: '100px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '1rem',
            zIndex: 1100, color: '#111827'
          }}>
            <div style={{ width: '40px', height: '40px', backgroundColor: '#111827', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Info size={24} />
            </div>
            <span style={{ fontWeight: '700', fontSize: '16px' }}>Coupon Code has been created</span>
            <button onClick={() => setShowToast(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9CA3AF', marginLeft: '1rem' }}><X size={20} /></button>
          </div>
        )}
      </div>
    </div>
  );
};
