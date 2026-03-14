import logo from '../assets/Logo.png';
import { 
  X
} from 'lucide-react';

// Import custom icons
import dashboardIcon from '../assets/icons/dashboard.png';
import liveTripsIcon from '../assets/icons/live trips.png';
import rideAssignmentIcon from '../assets/icons/Ride Assignment.png';
import archiveTripsIcon from '../assets/icons/Archive Trips.png';
import verificationBadgesIcon from '../assets/icons/Verfication Badges.png';
import reservationIcon from '../assets/icons/Reservation.png';
import deliveryServicesIcon from '../assets/icons/Delivery Services.png';
import driversIcon from '../assets/icons/Drivers.png';
import ridersIcon from '../assets/icons/Riders.png';
import driverDocumentsIcon from '../assets/icons/Driver Documents.png';
import rentalCompaniesIcon from '../assets/icons/Rental Companies.png';
import paymentIcon from '../assets/icons/Payment.png';
import supportIcon from '../assets/icons/Support.png';
import reviewManagementIcon from '../assets/icons/Review Management.png';
import couponsIcon from '../assets/icons/Coupons.png';
import notificationsIcon from '../assets/icons/Notifications.png';
import reportsIcon from '../assets/icons/Reports.png';
import settingsIcon from '../assets/icons/Settings.png';
import allServicesIcon from '../assets/icons/All Services.png';

type SidebarProps = {
  activePage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
};

export const Sidebar = ({ activePage, onNavigate, isOpen, onClose }: SidebarProps) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: dashboardIcon },
    { id: 'live-trips', label: 'Live Trips', icon: liveTripsIcon },
    { id: 'ride-assignment', label: 'Ride Assignment', icon: rideAssignmentIcon },
    { id: 'archive-trips', label: 'Archive Trips', icon: archiveTripsIcon },
    { id: 'verification-badges', label: 'Verification Badges', icon: verificationBadgesIcon },
    { id: 'reservation', label: 'Reservation', icon: reservationIcon },
    { id: 'delivery-services', label: 'Delivery Services', icon: deliveryServicesIcon },
    { id: 'drivers', label: 'Drivers', icon: driversIcon },
    { id: 'riders', label: 'Riders', icon: ridersIcon },
    { id: 'driver-documents', label: 'Driver Documents', icon: driverDocumentsIcon },
    { id: 'rental-companies', label: 'Rental Companies', icon: rentalCompaniesIcon },
    { id: 'payment', label: 'Payment', icon: paymentIcon },
    { id: 'support', label: 'Support', icon: supportIcon },
    { id: 'review-management', label: 'Review Management', icon: reviewManagementIcon },
    { id: 'coupons', label: 'Coupons', icon: couponsIcon },
    { id: 'notifications', label: 'Notifications', icon: notificationsIcon },
    { id: 'report', label: 'Reports', icon: reportsIcon },
    { id: 'settings', label: 'Settings', icon: settingsIcon },
  ];


  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`} style={{ overflowY: 'auto' }}>
      <div className="sidebar-header" style={{ marginBottom: '2rem', padding: '0 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
          <img src={logo} alt="Hezzni Logo" style={{ height: '32px', width: 'auto' }} />
          <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0D4463', letterSpacing: '-0.04em', lineHeight: 1, marginLeft: '-8px' }}>ezzni</span>
        </div>
        <button 
          onClick={onClose}
          className="mobile-only"
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            padding: '4px',
            display: 'none' 
          }}
        >
          <X size={24} color="var(--text-secondary)" />
        </button>
        <style dangerouslySetInnerHTML={{ __html: `
          @media (max-width: 1024px) {
            .mobile-only { display: block !important; }
          }
        `}} />
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <a 
            key={item.id}
            href="#" 
            className={`nav-link ${activePage === item.id ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(item.id);
            }}
          >
            <img 
              src={item.icon} 
              alt={item.label} 
              style={{ 
                width: '20px', 
                height: '20px', 
                marginRight: '0.75rem',
                filter: activePage === item.id ? 'brightness(0) invert(1)' : 'brightness(0) opacity(0.4)'
              }} 
            />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
      
      <div
        className="sidebar-footer"
        onClick={() => onNavigate('all-services')}
        style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#eef7f0', borderRadius: '1rem', cursor: 'pointer', border: activePage === 'all-services' ? '2px solid #38AC57' : 'none', position: 'relative' }}
      >
         <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
             <div style={{ padding: '0.4rem', backgroundColor: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                 <img src={allServicesIcon} alt="All Services" style={{ width: '24px', height: '24px' }} />
             </div>
             <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                   <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.875rem', color: '#111827' }}>All Services</p>
                   <span style={{ backgroundColor: '#38AC57', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>New</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>9 Hezzni Services Hub</p>
             </div>
         </div>
      </div>
    </div>
  );
};
