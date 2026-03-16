import { useState, useEffect } from "react";
import { MoreVertical, Plane, Globe, Users } from "lucide-react";
import { extractArrayPayload, getRegionsOverviewApi } from "../../services/api";
import { useToast } from "../../hooks/useToast";

const SERVICE_REGIONS_STORAGE_KEY = "settingsServiceRegionsV1";

function loadStoredRegions(): any[] | null {
  try {
    const raw = localStorage.getItem(SERVICE_REGIONS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveStoredRegions(regions: any[]) {
  try {
    localStorage.setItem(SERVICE_REGIONS_STORAGE_KEY, JSON.stringify(regions));
  } catch {}
}

// Vehicle Icons
import carIcon from "../../assets/icons/car.png";
import taxiIcon from "../../assets/icons/taxi.png";
import bikeIcon from "../../assets/icons/bike.png";

const FALLBACK_REGIONS = [
  {
    id: 1,
    name: "Casablanca",
    drivers: 31,
    trips: 420,
    commission: "Enabled",
    status: "Active",
    services: [
      { id: 1, label: "Car Ride", isActive: true },
      { id: 2, label: "Motorcycle", isActive: true },
      { id: 3, label: "Taxi", isActive: true },
    ],
  },
  {
    id: 2,
    name: "Rabat",
    drivers: 22,
    trips: 290,
    commission: "Enabled",
    status: "Active",
    services: [
      { id: 4, label: "Car Ride", isActive: true },
      { id: 5, label: "Taxi", isActive: true },
    ],
  },
];

function normalizeRegionServices(services: any[] | undefined) {
  if (Array.isArray(services) && services.length > 0) {
    return services.map((service: any, serviceIndex: number) => ({
      id:
        service.id ||
        service.passengerServiceId ||
        service.serviceId ||
        serviceIndex + 1,
      label:
        service.serviceName ||
        service.name ||
        service.displayName ||
        `Service ${serviceIndex + 1}`,
      isActive: service.isActive !== undefined ? service.isActive : true,
    }));
  }

  return FALLBACK_REGIONS[0].services;
}

function getServiceIcon(serviceName: string) {
  const normalizedName = serviceName.toLowerCase();

  if (normalizedName.includes("moto") || normalizedName.includes("motor")) {
    return (
      <img
        src={bikeIcon}
        alt={serviceName}
        style={{ height: "18px", width: "auto" }}
      />
    );
  }

  if (normalizedName.includes("taxi")) {
    return (
      <img
        src={taxiIcon}
        alt={serviceName}
        style={{ height: "18px", width: "auto" }}
      />
    );
  }

  if (normalizedName.includes("airport")) {
    return <Plane size={14} />;
  }

  if (
    normalizedName.includes("intercity") ||
    normalizedName.includes("city to city")
  ) {
    return <Globe size={14} />;
  }

  if (normalizedName.includes("group")) {
    return <Users size={14} />;
  }

  return (
    <img
      src={carIcon}
      alt={serviceName}
      style={{ height: "18px", width: "auto" }}
    />
  );
}

export const ServiceRegions = () => {
  const { showToast, ToastContainer } = useToast();
  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [regions, setRegions] = useState<any[]>([]);

  useEffect(() => {
    loadRegions();
  }, []);

  const loadRegions = async () => {
    setLoading(true);
    try {
      const res = await getRegionsOverviewApi();
      if (res.ok && res.data) {
        const list = extractArrayPayload(res.data, [
          "regions",
          "overview",
          "items",
          "rows",
          "list",
          "data",
        ]);
        if (Array.isArray(list)) {
          const mapped = list.map((r: any) => ({
            id: r.id || r.regionId,
            name: r.regionName || r.name || "",
            drivers: r.activeDrivers ?? r.drivers ?? "0",
            trips: r.tripsThisMonth ?? r.trips ?? "0",
            commission: r.customCommission
              ? "Enabled"
              : r.commission || "Enabled",
            commissionPercentage:
              r.commissionPercentage ??
              r.customCommissionPercentage ??
              r.regionCommissionPercentage ??
              30,
            status:
              r.isActive !== undefined
                ? r.isActive
                  ? "Active"
                  : "Inactive"
                : r.status || "Active",
            services: normalizeRegionServices(r.services),
          }));
          const stored = loadStoredRegions();
          if (stored && stored.length > 0) {
            const merged = mapped.map((item: any) => {
              const found = stored.find(
                (s: any) => s.id === item.id || s.name === item.name,
              );
              return found ? { ...item, ...found } : item;
            });
            setRegions(merged.length > 0 ? merged : FALLBACK_REGIONS);
          } else {
            setRegions(mapped.length > 0 ? mapped : FALLBACK_REGIONS);
          }
        } else {
          const stored = loadStoredRegions();
          setRegions(stored && stored.length > 0 ? stored : FALLBACK_REGIONS);
        }
      } else {
        const stored = loadStoredRegions();
        setRegions(stored && stored.length > 0 ? stored : FALLBACK_REGIONS);
      }
    } catch (e) {
      console.error("Failed to load regions", e);
      const stored = loadStoredRegions();
      setRegions(stored && stored.length > 0 ? stored : FALLBACK_REGIONS);
    }
    setLoading(false);
  };

  const handleSaveRegion = () => {
    if (!selectedRegion) return;
    const updated = regions.map((region) =>
      region.id === selectedRegion.id ? { ...selectedRegion } : region,
    );
    setRegions(updated);
    saveStoredRegions(updated);
    setIsModalOpen(false);
    showToast(`${selectedRegion.name} settings saved`, "success");
  };

  return (
    <div className="vp-regions-container">
      <style>{`
        .vp-regions-container {
            animation: fadeIn 0.4s ease-out;
        }

        .vp-regions-header {
            margin-bottom: 2.5rem;
        }

        .vp-regions-header h2 {
            font-size: 1.75rem;
            font-weight: 900;
            color: #1e293b;
            margin: 0;
            letter-spacing: -0.025em;
        }

        .vp-regions-header p {
            color: #64748b;
            margin: 0.5rem 0 0 0;
            font-size: 1.1rem;
            font-weight: 500;
        }

        .vp-regions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
            gap: 2rem;
        }

        .vp-region-card {
            background: white;
            border-radius: 32px;
            padding: 2rem;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            position: relative;
            overflow: hidden;
        }

        .vp-region-card:hover {
            transform: translateY(-6px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            border-color: #38AC57;
        }

        .vp-region-card.inactive {
            opacity: 0.7;
        }

        .vp-region-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 2rem;
        }

        .vp-region-info h3 {
            font-size: 1.25rem;
            font-weight: 900;
            margin: 0 0 0.5rem 0;
            color: #1e293b;
        }

        .vp-status-badge {
            display: inline-flex;
            align-items: center;
            padding: 0.5rem 1.25rem;
            border-radius: 100px;
            font-size: 0.8rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .vp-status-badge.active {
            background: #f0fdf4;
            color: #38AC57;
        }

        .vp-status-badge.inactive {
            background: #f1f5f9;
            color: #64748b;
        }

        .vp-more-btn {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            color: #64748b;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
            z-index: 10;
        }

        .vp-more-btn:hover {
            background: #f1f5f9;
            color: #1e293b;
        }

        .vp-region-stats {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .vp-region-stat-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.95rem;
        }

        .vp-region-stat-row .label {
            color: #64748b;
            font-weight: 600;
        }

        .vp-region-stat-row .value {
            color: #1e293b;
            font-weight: 800;
        }

        .vp-services-preview {
            border-top: 1px solid #f1f5f9;
            padding-top: 1.5rem;
        }

        .vp-services-preview h4 {
            font-size: 0.875rem;
            font-weight: 800;
            color: #1e293b;
            margin-bottom: 1rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .vp-services-tag-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.75rem;
        }

        .vp-service-tag {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.8rem;
            font-weight: 700;
            color: #475569;
            background: #f8fafc;
            padding: 0.5rem;
            border-radius: 10px;
            border: 1px solid #f1f5f9;
        }

        @media (max-width: 768px) {
            .vp-regions-grid {
                grid-template-columns: 1fr;
            }
            .vp-region-card {
                padding: 1.5rem;
            }
            .vp-services-tag-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        .vp-region-modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 1.5rem;
        }

        .vp-region-modal {
            background: white;
            border-radius: 32px;
            width: 100%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3);
            animation: slideUp 0.3s ease-out;
        }

        .vp-modal-header {
            padding: 2.5rem 2.5rem 1.5rem 2.5rem;
            border-bottom: 1px solid #f1f5f9;
            position: sticky;
            top: 0;
            background: white;
            z-index: 10;
        }

        .vp-modal-header h3 {
            font-size: 1.5rem;
            font-weight: 900;
            margin: 0;
            color: #1e293b;
        }

        .vp-modal-content {
            padding: 2.5rem;
        }

        .vp-config-group {
            margin-bottom: 2rem;
        }

        .vp-config-group label {
            display: block;
            font-weight: 800;
            font-size: 0.95rem;
            color: #475569;
            margin-bottom: 1rem;
        }

        .vp-toggle-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .vp-toggle-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 1.5rem;
            background: #f8fafc;
            border-radius: 16px;
            border: 1px solid #e2e8f0;
        }

        .vp-toggle-item span {
            font-weight: 700;
            color: #1e293b;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .vp-modal-footer {
            padding: 1.5rem 2.5rem 2.5rem 2.5rem;
            border-top: 1px solid #f1f5f9;
            display: flex;
            gap: 1rem;
        }

        .vp-modal-btn {
            flex: 1;
            padding: 1rem;
            border-radius: 100px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
            font-size: 1rem;
        }

        .vp-modal-btn.cancel {
            background: #f1f5f9;
            color: #64748b;
        }

        .vp-modal-btn.save {
            background: #38AC57;
            color: white;
            box-shadow: 0 10px 15px -3px rgba(56, 172, 87, 0.2);
        }

        .vp-switch-sm {
            width: 40px;
            height: 22px;
            border-radius: 100px;
            position: relative;
            cursor: pointer;
            transition: all 0.3s;
        }

        .vp-switch-sm .knob {
            width: 16px;
            height: 16px;
            background: white;
            border-radius: 50%;
            position: absolute;
            top: 3px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

      `}</style>

      <div className="vp-regions-header">
        <h2>Service Regions</h2>
        <p>Manage service availability and configuration by region</p>
      </div>

      <div className="vp-regions-grid">
        {loading ? (
          <p
            style={{
              color: "#64748b",
              textAlign: "center",
              padding: "2rem",
              gridColumn: "1 / -1",
            }}
          >
            Loading regions...
          </p>
        ) : regions.length === 0 ? (
          <p
            style={{
              color: "#64748b",
              textAlign: "center",
              padding: "2rem",
              gridColumn: "1 / -1",
            }}
          >
            No region data returned from API.
          </p>
        ) : (
          regions.map((region, index) => (
            <div
              key={index}
              className={`vp-region-card ${region.status !== "Active" ? "inactive" : ""}`}
              onClick={() => {
                setSelectedRegion(region);
                setIsModalOpen(true);
              }}
            >
              <div className="vp-region-card-header">
                <div className="vp-region-info">
                  <h3>{region.name}</h3>
                  <span
                    className={`vp-status-badge ${region.status === "Active" ? "active" : "inactive"}`}
                  >
                    {region.status}
                  </span>
                </div>
                <button
                  className="vp-more-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRegion(region);
                    setIsModalOpen(true);
                  }}
                >
                  <MoreVertical size={20} />
                </button>
              </div>

              <div className="vp-region-stats">
                <div className="vp-region-stat-row">
                  <span className="label">Active Drivers</span>
                  <span className="value">{region.drivers}</span>
                </div>
                <div className="vp-region-stat-row">
                  <span className="label">Trips This Month</span>
                  <span className="value">{region.trips}</span>
                </div>
                <div className="vp-region-stat-row">
                  <span className="label">Custom Commission</span>
                  <span className="value" style={{ color: "#38AC57" }}>
                    {region.commission}
                  </span>
                </div>
              </div>

              <div className="vp-services-preview">
                <h4>Available Services</h4>
                <div className="vp-services-tag-grid">
                  {(region.services.length > 0
                    ? region.services
                    : FALLBACK_REGIONS[0].services
                  ).map((service: any) => (
                    <div key={service.id} className="vp-service-tag">
                      <span style={{ color: "#38AC57", display: "flex" }}>
                        {getServiceIcon(service.label)}
                      </span>
                      {service.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Region Management Modal */}
      {isModalOpen && selectedRegion && (
        <div
          className="vp-region-modal-overlay"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="vp-region-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vp-modal-header">
              <h3>Region Settings: {selectedRegion.name}</h3>
            </div>

            <div className="vp-modal-content">
              <div className="vp-config-group">
                <label>Regional Status</label>
                <div className="vp-toggle-item">
                  <span>Operation Status</span>
                  <div
                    className="vp-switch-sm"
                    style={{
                      background:
                        selectedRegion.status === "Active"
                          ? "#38AC57"
                          : "#e2e8f0",
                    }}
                    onClick={() =>
                      setSelectedRegion({
                        ...selectedRegion,
                        status:
                          selectedRegion.status === "Active"
                            ? "Inactive"
                            : "Active",
                      })
                    }
                  >
                    <div
                      className="knob"
                      style={{
                        left:
                          selectedRegion.status === "Active" ? "21px" : "3px",
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="vp-config-group">
                <label>Service Availability</label>
                <div className="vp-toggle-list">
                  {(selectedRegion.services.length > 0
                    ? selectedRegion.services
                    : FALLBACK_REGIONS[0].services
                  ).map((service: any) => (
                    <div key={service.id} className="vp-toggle-item">
                      <span>
                        {getServiceIcon(service.label)} {service.label}
                      </span>
                      <div
                        className="vp-switch-sm"
                        style={{
                          background: service.isActive ? "#38AC57" : "#e2e8f0",
                        }}
                        onClick={() =>
                          setSelectedRegion({
                            ...selectedRegion,
                            services: selectedRegion.services.map((s: any) =>
                              s.id === service.id
                                ? { ...s, isActive: !s.isActive }
                                : s,
                            ),
                          })
                        }
                      >
                        <div
                          className="knob"
                          style={{ left: service.isActive ? "21px" : "3px" }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="vp-config-group">
                <label>Regional Commission (%)</label>
                <div className="vp-toggle-item" style={{ background: "white" }}>
                  <input
                    type="number"
                    value={String(selectedRegion.commissionPercentage ?? 30)}
                    onChange={(e) =>
                      setSelectedRegion({
                        ...selectedRegion,
                        commissionPercentage:
                          Number.parseFloat(e.target.value || "0") || 0,
                      })
                    }
                    style={{
                      width: "100%",
                      border: "none",
                      outline: "none",
                      fontWeight: "800",
                      fontSize: "1.25rem",
                      color: "#1e293b",
                    }}
                  />
                  <span style={{ color: "#64748b" }}>%</span>
                </div>
              </div>
            </div>

            <div className="vp-modal-footer">
              <button
                className="vp-modal-btn cancel"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button className="vp-modal-btn save" onClick={handleSaveRegion}>
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
};
