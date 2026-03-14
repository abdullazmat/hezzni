import { useState } from 'react';
import { 
  Users, 
  Percent, 
  Layout, 
  MapPin,
  FileText,
  Gift
} from 'lucide-react';

// Sub-components
import { 
  CommissionRules, 
  FareStructure, 
  DailyBonus, 
  ServiceRegions, 
  DocumentRequirements, 
  TeamManagement 
} from './settings_tabs';



export const Settings = ({ compact = false }: { compact?: boolean }) => {
  const [activeTab, setActiveTab] = useState('commission-rules');

  const tabs = [
    { id: 'commission-rules', label: 'Commission Rules', icon: <Percent size={18} /> },
    { id: 'fare-structure', label: 'Fare Structure', icon: <Layout size={18} /> },
    { id: 'daily-bonus', label: 'Daily Bonus', icon: <Gift size={18} /> },
    { id: 'service-regions', label: 'Service Regions', icon: <MapPin size={18} /> },
    { id: 'document-requirements', label: 'Document Requirements', icon: <FileText size={18} /> },
    { id: 'team-management', label: 'Team Management', icon: <Users size={18} /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'commission-rules':
        return <CommissionRules />;
      case 'fare-structure':
        return <FareStructure />;
      case 'daily-bonus':
        return <DailyBonus />;
      case 'service-regions':
        return <ServiceRegions />;
      case 'document-requirements':
        return <DocumentRequirements />;
      case 'team-management':
        return <TeamManagement />;
      default:
        return <DailyBonus />;
    }
  };

  return (
    <div className="vp-settings-wrapper">
      <style>{`
        .vp-settings-wrapper {
            background-color: ${compact ? 'transparent' : '#f8fafc'};
            min-height: ${compact ? 'auto' : '100vh'};
            box-sizing: border-box;
            padding: ${compact ? '0' : '2.5rem'};
        }

        .vp-settings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 2rem;
            margin-bottom: 2rem;
            flex-wrap: wrap;
        }

        .vp-settings-title h1 {
            font-size: 2.5rem !important;
            font-weight: 900 !important;
            color: #1e293b;
            margin: 0;
            letter-spacing: -0.025em;
        }

        .vp-settings-title p {
            color: #64748b;
            margin: 0.5rem 0 0 0;
            font-size: 1.1rem;
            font-weight: 500;
        }

        .vp-analytics-btn {
            background-color: #38AC57;
            color: white;
            border: none;
            padding: 0.875rem 2.25rem;
            border-radius: 100px;
            font-weight: 800;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 12px rgba(56, 172, 87, 0.2);
        }

        .vp-analytics-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(56, 172, 87, 0.3);
            background-color: #2e8a46;
        }

        .vp-settings-tabs {
            display: flex;
            gap: 0.625rem;
            background: #f1f5f9;
            padding: 8px;
            border-radius: 100px;
            width: fit-content;
            margin-bottom: 3rem;
            overflow-x: auto;
            max-width: 100%;
            scrollbar-width: none;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
        }

        .vp-settings-tabs::-webkit-scrollbar {
            display: none;
        }

        .vp-tab-trigger {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem 2.25rem;
            border-radius: 100px;
            border: none;
            background: transparent;
            color: #64748b;
            font-weight: 800;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            white-space: nowrap;
        }

        .vp-tab-trigger.active {
            background: #38AC57;
            color: white;
            box-shadow: 0 10px 15px -3px rgba(56, 172, 87, 0.3);
        }

        @media (max-width: 1024px) {
            .vp-header-search {
                width: 100%;
                order: 2;
            }
            .vp-settings-actions {
                width: 100%;
                justify-content: space-between;
            }
        }

        @media (max-width: 768px) {
            .vp-settings-wrapper {
                padding: 1.5rem;
            }
            .vp-settings-header {
                flex-direction: column;
                align-items: center;
                text-align: center;
                gap: 1.5rem;
            }
            .vp-settings-title h1 {
                font-size: 2rem !important;
            }
            .vp-settings-actions {
                flex-direction: column;
                gap: 1.25rem;
            }
            .vp-header-profile {
                width: 100%;
                justify-content: center;
                order: 1;
            }
            .vp-analytics-bar {
                justify-content: center;
            }
            .vp-analytics-btn {
                width: 100%;
            }
            .vp-settings-tabs {
                border-radius: 20px;
                padding: 6px;
            }
            .vp-tab-trigger {
                padding: 0.875rem 1.5rem;
                font-size: 0.9rem;
            }
        }
      `}</style>

      {/* Header */}
      {!compact && (
        <div className="vp-settings-header">
          <div className="vp-settings-title">
            <h1>Settings</h1>
            <p>Configure platform settings and preferences</p>
          </div>
          
        </div>
      )}

      {/* Tab Navigation */}
      <div className="vp-settings-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`vp-tab-trigger ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="vp-settings-main-content">
        {renderContent()}
      </div>
    </div>
  );
};

