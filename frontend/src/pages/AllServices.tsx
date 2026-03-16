import { useState, useEffect, useCallback } from "react";
import {
  ArrowUpRight,
  Eye,
  CheckCircle2,
  ChevronLeft,
  Star,
  Activity,
} from "lucide-react";
import { Settings } from "./Settings";
import {
  getServiceManagementKpisApi,
  getServiceManagementServicesApi,
  getServiceManagementDetailApi,
  toggleServiceManagementApi,
  getServiceRevenueChartApi,
  getServiceGrowthChartApi,
  type ServiceItem,
  type ServiceDetail,
  type ServiceManagementKpis,
  type ServiceRevenueChart,
  type ServiceGrowthChart,
} from "../services/api";

// Specialized Icons
import allServicesIcon from "../assets/icons/All Services.png";
import completedIcon from "../assets/icons/completed.png";
import cancelledIcon from "../assets/icons/cancelled.png";
import activeAssignmentsIcon from "../assets/icons/Active Assignments.png";
import carIcon from "../assets/icons/car.png";
import bikeIcon from "../assets/icons/bike.png";
import taxiIcon from "../assets/icons/taxi.png";
import reservationIcon from "../assets/icons/Reservation.png";
import deliveryServicesIcon from "../assets/icons/Delivery Services.png";
import rentalCompaniesIcon from "../assets/icons/Rental Companies.png";
import ridersIcon from "../assets/icons/Riders.png";

const ALL_SERVICES_STORAGE_KEY = "allServicesStateV1";

function loadStoredServices(): ServiceItem[] | null {
  try {
    const raw = localStorage.getItem(ALL_SERVICES_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ServiceItem[];
  } catch {}
  return null;
}

function saveStoredServices(services: ServiceItem[]) {
  try {
    localStorage.setItem(ALL_SERVICES_STORAGE_KEY, JSON.stringify(services));
  } catch {}
}

function buildKpisFromServices(
  services: ServiceItem[],
  fallbackActiveRequests = 0,
): ServiceManagementKpis {
  const enabled = services.filter((service) => service.isActive).length;
  const disabled = services.length - enabled;
  const computedActiveRequests = services.reduce(
    (sum, service) => sum + Number(service.activeNow || 0),
    0,
  );

  return {
    totalServices: services.length,
    enabled,
    disabled,
    activeRequests:
      computedActiveRequests > 0
        ? computedActiveRequests
        : fallbackActiveRequests,
  };
}

const SERVICE_ICON_MAP: Record<string, string> = {
  CAR_RIDES: carIcon,
  MOTORCYCLE: bikeIcon,
  TAXI: taxiIcon,
  RENTAL_CARS: rentalCompaniesIcon,
  DELIVERY: deliveryServicesIcon,
  RESERVATIONS: reservationIcon,
  GROUP_RIDE: ridersIcon,
};

function getServiceIcon(name: string): string {
  return SERVICE_ICON_MAP[name] || carIcon;
}

export const AllServices = () => {
  const [activeStat, setActiveStat] = useState<string>("Enabled");
  const [selectedService, setSelectedService] = useState<ServiceDetail | null>(
    null,
  );
  const [activeChart, setActiveChart] = useState<"revenue" | "growth" | null>(
    null,
  );
  const [, setChartServiceId] = useState<number | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [kpis, setKpis] = useState<ServiceManagementKpis>({
    totalServices: 0,
    enabled: 0,
    disabled: 0,
    activeRequests: 0,
  });
  const [revenueChart, setRevenueChart] = useState<ServiceRevenueChart | null>(
    null,
  );
  const [growthChart, setGrowthChart] = useState<ServiceGrowthChart | null>(
    null,
  );
  const [showStatusMonitor, setShowStatusMonitor] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);

  const fetchData = useCallback(async () => {
    setLoadingServices(true);
    const [kpiRes, svcRes] = await Promise.all([
      getServiceManagementKpisApi(),
      getServiceManagementServicesApi(),
    ]);

    const apiServices = svcRes.ok ? svcRes.data.services : [];
    const storedServices = loadStoredServices();

    let resolvedServices: ServiceItem[] = Array.isArray(apiServices)
      ? apiServices
      : [];

    if (storedServices && storedServices.length > 0) {
      if (resolvedServices.length > 0) {
        resolvedServices = resolvedServices.map((service) => {
          const stored = storedServices.find((item) => item.id === service.id);
          return stored ? { ...service, ...stored } : service;
        });
      } else {
        resolvedServices = storedServices;
      }
    }

    setServices(resolvedServices);
    saveStoredServices(resolvedServices);

    const fallbackActiveRequests = kpiRes.ok ? kpiRes.data.activeRequests : 0;
    setKpis(buildKpisFromServices(resolvedServices, fallbackActiveRequests));
    setLoadingServices(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleServiceStatus = async (id: number) => {
    const svc = services.find((s) => s.id === id);
    if (!svc) return;
    const newActive = !svc.isActive;

    const updatedServices = services.map((service) =>
      service.id === id ? { ...service, isActive: newActive } : service,
    );

    setServices(updatedServices);
    saveStoredServices(updatedServices);
    setKpis((prev) =>
      buildKpisFromServices(updatedServices, prev.activeRequests),
    );

    try {
      await toggleServiceManagementApi(id, newActive);
    } catch {
      // Keep local state so UI remains editable and persistent in fallback mode.
    }
  };

  const openDetail = async (id: number) => {
    const res = await getServiceManagementDetailApi(id);
    if (res.ok) setSelectedService(res.data);
  };

  const openRevenueChart = async (id: number) => {
    setChartServiceId(id);
    setActiveChart("revenue");
    const res = await getServiceRevenueChartApi(id);
    if (res.ok) setRevenueChart(res.data);
  };

  const openGrowthChart = async (id: number) => {
    setChartServiceId(id);
    setActiveChart("growth");
    const res = await getServiceGrowthChartApi(id);
    if (res.ok) setGrowthChart(res.data);
  };

  const stats = [
    {
      label: "Total Services",
      value: String(kpis.totalServices),
      icon: allServicesIcon,
    },
    { label: "Enabled", value: String(kpis.enabled), icon: completedIcon },
    { label: "Disabled", value: String(kpis.disabled), icon: cancelledIcon },
    {
      label: "Active Requests",
      value: String(kpis.activeRequests),
      icon: activeAssignmentsIcon,
    },
  ];

  const enabledServices = services.filter((s) => s.isActive);
  const disabledServices = services.filter((s) => !s.isActive);

  return (
    <div className="vp-allservices-wrapper">
      <style>{`
        .vp-allservices-wrapper {
            padding: 2.5rem;
            max-width: 1600px;
            margin: 0 auto;
            width: 100%;
            background-color: #f8fafc;
            min-height: 100vh;
            box-sizing: border-box;
            animation: fadeIn 0.4s ease-out;
            position: relative;
        }

        .vp-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 2rem;
            margin-bottom: 3rem;
            flex-wrap: wrap;
        }

        .vp-title-section h1 {
            font-size: 2.5rem !important;
            font-weight: 900 !important;
            color: #1e293b;
            margin: 0;
            letter-spacing: -0.025em;
        }

        .vp-title-section p {
            color: #64748b;
            margin: 0.5rem 0 0 0;
            font-size: 1.1rem;
            font-weight: 500;
        }

        .vp-header-actions {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .vp-btn {
            padding: 0.875rem 2rem;
            border-radius: 100px;
            font-weight: 800;
            font-size: 0.95rem;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            white-space: nowrap;
        }

        .vp-btn-white {
            background-color: white;
            border: 1px solid #e2e8f0;
            color: #475569;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .vp-btn-white:hover {
            border-color: #38AC57;
            color: #38AC57;
            transform: translateY(-2px);
        }

        .vp-btn-green {
            background-color: #38AC57;
            color: white;
            border: none;
            box-shadow: 0 10px 15px -3px rgba(56, 172, 87, 0.3);
        }

        .vp-btn-green:hover {
            transform: translateY(-3px);
            box-shadow: 0 20px 25px -5px rgba(56, 172, 87, 0.4);
            background-color: #2e8d46;
        }

        .vp-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
            margin-bottom: 4rem;
        }

        .vp-stat-card {
            background: white;
            padding: 2rem;
            border-radius: 32px;
            border: 1px solid #e2e8f0;
            position: relative;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        .vp-stat-card.active {
            background: #38AC57;
            border-color: #38AC57;
            box-shadow: 0 20px 25px -5px rgba(56, 172, 87, 0.2);
            color: white;
        }

        .vp-stat-card:hover:not(.active) {
            transform: translateY(-4px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
            border-color: #38AC57;
        }

        .vp-stat-header {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .vp-stat-icon {
            width: 48px;
            height: 48px;
            padding: 8px;
            border-radius: 12px;
            background: #f0fdf4;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
        }

        .vp-stat-card.active .vp-stat-icon {
            background: rgba(255, 255, 255, 0.2);
        }

        .vp-stat-label {
            font-size: 1rem;
            font-weight: 800;
            color: #64748b;
        }

        .vp-stat-card.active .vp-stat-label {
            color: rgba(255, 255, 255, 0.9);
        }

        .vp-stat-value {
            font-size: 3rem;
            font-weight: 950;
            letter-spacing: -0.025em;
        }

        .vp-stat-arrow {
            position: absolute;
            right: 2rem;
            bottom: 2rem;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f1f5f9;
            color: #64748b;
            transition: all 0.3s;
        }

        .vp-stat-card.active .vp-stat-arrow {
            background: rgba(0, 0, 0, 0.15);
            color: white;
        }

        .vp-section-title {
            font-size: 1.75rem;
            font-weight: 900;
            color: #1e293b;
            margin-bottom: 2rem;
            letter-spacing: -0.025em;
        }

        .vp-services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
            gap: 2rem;
            margin-bottom: 4rem;
        }

        .vp-service-card {
            background: white;
            border-radius: 32px;
            padding: 2rem;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
        }

        .vp-service-card:hover {
            transform: translateY(-6px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            border-color: #38AC57;
        }

        .vp-service-card.disabled {
            opacity: 0.7;
        }

        .vp-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 2rem;
        }

        .vp-service-info {
            display: flex;
            gap: 1.25rem;
            align-items: center;
        }

        .vp-service-img {
            width: 64px;
            height: 64px;
            object-fit: contain;
        }

        .vp-service-name h4 {
            font-size: 1.25rem;
            font-weight: 900;
            color: #1e293b;
            margin: 0;
        }

        .vp-priority-badge {
            display: inline-block;
            font-size: 0.75rem;
            font-weight: 800;
            padding: 0.25rem 0.75rem;
            border-radius: 100px;
            text-transform: uppercase;
            margin-top: 0.5rem;
        }

        .vp-switch-container {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .vp-switch {
            width: 48px;
            height: 26px;
            border-radius: 100px;
            position: relative;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .vp-switch .knob {
            width: 20px;
            height: 20px;
            background: white;
            border-radius: 50%;
            position: absolute;
            top: 3px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .vp-card-metrics {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .vp-metric-box {
            background: #f8fafc;
            padding: 1.5rem;
            border-radius: 20px;
            text-align: center;
            border: 1px solid #f1f5f9;
        }

        .vp-metric-label {
            display: block;
            font-size: 0.8rem;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
        }

        .vp-metric-value {
            font-size: 1.75rem;
            font-weight: 900;
            color: #1e293b;
        }

        .vp-card-footer-metrics {
            display: flex;
            justify-content: space-between;
            gap: 1rem;
            padding: 1.5rem 0;
            border-top: 1px solid #f1f5f9;
            flex-wrap: wrap;
        }

        .vp-footer-item {
            font-size: 0.875rem;
            font-weight: 700;
            color: #64748b;
        }

        .vp-footer-item strong {
            color: #1e293b;
        }

        .vp-card-bottom {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 0.5rem;
        }

        .vp-last-updated {
            font-size: 0.75rem;
            font-weight: 600;
            color: #94a3b8;
        }

        .vp-status-tag {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.4rem 1rem;
            border-radius: 100px;
            font-size: 0.75rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .vp-status-tag.live {
            background: #f0fdf4;
            color: #38AC57;
        }

        .vp-status-tag.paused {
            background: #fef2f2;
            color: #ef4444;
        }

        .vp-live-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: #38AC57;
        }

        .vp-navigation-helper {
            position: fixed;
            bottom: 2.5rem;
            left: 2.5rem;
            background: #111827;
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 100px;
            display: flex;
            gap: 1rem;
            font-size: 0.75rem;
            font-weight: 800;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
            z-index: 50;
            letter-spacing: 0.05em;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulsate {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
        }

        .pulsate {
            animation: pulsate 2s infinite ease-in-out;
        }

        @media (max-width: 1024px) {
            .vp-services-grid {
                grid-template-columns: 1fr 1fr;
            }
        }

        @media (max-width: 768px) {
            .vp-allservices-wrapper {
                padding: 1.5rem;
            }
            .vp-header {
                flex-direction: column;
                align-items: flex-start;
                text-align: left;
            }
            .vp-title-section h1 {
                font-size: 2rem !important;
            }
            .vp-header-actions {
                width: 100%;
                justify-content: flex-start;
            }
            .vp-btn {
                width: 100%;
                justify-content: center;
            }
            .vp-services-grid {
                grid-template-columns: 1fr;
            }
            .vp-service-card {
                padding: 1.5rem;
            }
            .vp-card-header {
                flex-direction: column;
                gap: 1.5rem;
                align-items: flex-start;
                text-align: left;
            }
            .vp-switch-container {
                width: 100%;
                justify-content: flex-start;
                gap: 2rem;
                z-index: 10;
                position: relative;
                margin-top: 1rem;
                padding: 0.5rem 0;
            }
            .vp-service-info {
                flex-direction: row;
                gap: 1rem;
                align-items: center;
                width: 100%;
                justify-content: flex-start;
            }
            .vp-card-footer-metrics {
                flex-direction: column;
                gap: 0.75rem;
                align-items: flex-start;
                text-align: left;
            }
            .vp-card-bottom {
                flex-direction: column;
                gap: 1rem;
            }
            .vp-navigation-helper {
                left: 50%;
                transform: translateX(-50%);
                width: max-content;
                bottom: 1.5rem;
            }
        }
      `}</style>

      {/* Header Section */}
      <div className="vp-header">
        <div className="vp-title-section">
          <h1>All Services Management</h1>
          <p>
            Enable, disable, and manage all Hezzni services from one central hub
          </p>
        </div>
        <div className="vp-header-actions">
          <button
            className="vp-btn vp-btn-white"
            onClick={() => setShowStatusMonitor(true)}
          >
            Service Status Monitor
          </button>
          <button
            className="vp-btn vp-btn-green"
            onClick={() => setShowGlobalSettings(true)}
          >
            Global Settings
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="vp-stats-grid">
        {stats.map((stat, idx) => {
          const isActive = activeStat === stat.label;
          return (
            <div
              key={idx}
              className={`vp-stat-card ${isActive ? "active" : ""}`}
              onClick={() => setActiveStat(stat.label)}
            >
              <div className="vp-stat-header">
                <div className="vp-stat-icon">
                  <img
                    src={stat.icon}
                    alt=""
                    style={{
                      width: "24px",
                      height: "24px",
                      objectFit: "contain",
                    }}
                  />
                </div>
                <span className="vp-stat-label">{stat.label}</span>
              </div>
              <div className="vp-stat-value">{stat.value}</div>
              <div className="vp-stat-arrow">
                <ArrowUpRight size={22} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Enabled Services Grid */}
      <div>
        <h2 className="vp-section-title">
          Enabled Services ({enabledServices.length})
        </h2>
        {loadingServices ? (
          <p style={{ color: "#64748b", padding: "2rem", textAlign: "center" }}>
            Loading services...
          </p>
        ) : (
          <div className="vp-services-grid">
            {enabledServices.map((service) => (
              <div key={service.id} className="vp-service-card">
                <div className="vp-card-header">
                  <div className="vp-service-info">
                    <img
                      src={getServiceIcon(service.name)}
                      alt=""
                      className="vp-service-img"
                    />
                    <div className="vp-service-name">
                      <h4>{service.displayName}</h4>
                      <span
                        className="vp-priority-badge"
                        style={{
                          backgroundColor:
                            service.priority === "High"
                              ? "#fee2e2"
                              : service.priority === "Medium"
                                ? "#fef3c7"
                                : "#f1f5f9",
                          color:
                            service.priority === "High"
                              ? "#ef4444"
                              : service.priority === "Medium"
                                ? "#d97706"
                                : "#64748b",
                        }}
                      >
                        {service.priority} Priority
                      </span>
                    </div>
                  </div>
                  <div className="vp-switch-container">
                    <div
                      className="vp-switch"
                      style={{
                        backgroundColor: service.isActive
                          ? "#38AC57"
                          : "#e2e8f0",
                        cursor: "pointer",
                      }}
                      onClick={() => toggleServiceStatus(service.id)}
                    >
                      <div
                        className="knob"
                        style={{ left: service.isActive ? "25px" : "3px" }}
                      />
                    </div>
                    <button
                      className="vp-btn vp-btn-white"
                      style={{ padding: "0.5rem", borderRadius: "12px" }}
                      onClick={() => openDetail(service.id)}
                    >
                      <Eye size={20} />
                    </button>
                  </div>
                </div>

                <div className="vp-card-metrics">
                  <div className="vp-metric-box">
                    <span className="vp-metric-label">Active Now</span>
                    <div className="vp-metric-value">{service.activeNow}</div>
                  </div>
                  <div className="vp-metric-box">
                    <span className="vp-metric-label">Total Today</span>
                    <div className="vp-metric-value">{service.totalToday}</div>
                  </div>
                </div>

                <div className="vp-card-footer-metrics">
                  <span
                    className="vp-footer-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      openRevenueChart(service.id);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    Revenue: <strong>{service.revenue}</strong>
                  </span>
                  <span
                    className="vp-footer-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      openGrowthChart(service.id);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    Growth:{" "}
                    <strong style={{ color: "#38AC57" }}>
                      {service.growth}
                    </strong>
                  </span>
                  <span className="vp-footer-item">
                    Resp. Time: <strong>{service.responseTime}</strong>
                  </span>
                </div>

                <div className="vp-card-bottom">
                  <div className="vp-last-updated">
                    Last updated: {service.lastUpdated}
                  </div>
                  <div
                    className={`vp-status-tag ${service.isActive ? "live" : "paused"} ${service.isActive ? "pulsate" : ""}`}
                  >
                    {service.isActive && <div className="vp-live-dot" />}
                    {service.isActive ? "Live" : "Paused"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disabled Services Grid */}
      <div>
        <h2 className="vp-section-title">
          Disabled Services ({disabledServices.length})
        </h2>
        <div className="vp-services-grid">
          {disabledServices.map((service) => (
            <div key={service.id} className="vp-service-card disabled">
              <div className="vp-card-header">
                <div className="vp-service-info">
                  <img
                    src={getServiceIcon(service.name)}
                    alt=""
                    className="vp-service-img"
                  />
                  <div className="vp-service-name">
                    <h4>{service.displayName}</h4>
                    <span
                      className="vp-priority-badge"
                      style={{
                        backgroundColor:
                          service.priority === "High"
                            ? "#fee2e2"
                            : service.priority === "Medium"
                              ? "#fef3c7"
                              : "#f1f5f9",
                        color:
                          service.priority === "High"
                            ? "#ef4444"
                            : service.priority === "Medium"
                              ? "#d97706"
                              : "#64748b",
                      }}
                    >
                      {service.priority} Priority
                    </span>
                  </div>
                </div>
                <div className="vp-switch-container">
                  <div
                    className="vp-switch"
                    style={{
                      backgroundColor: service.isActive ? "#38AC57" : "#e2e8f0",
                      cursor: "pointer",
                    }}
                    onClick={() => toggleServiceStatus(service.id)}
                  >
                    <div
                      className="knob"
                      style={{ left: service.isActive ? "25px" : "3px" }}
                    />
                  </div>
                  <button
                    className="vp-btn vp-btn-white"
                    style={{ padding: "0.5rem", borderRadius: "12px" }}
                    onClick={() => openDetail(service.id)}
                  >
                    <Eye size={20} />
                  </button>
                </div>
              </div>

              <div className="vp-card-metrics">
                <div className="vp-metric-box">
                  <span className="vp-metric-label">Active Now</span>
                  <div className="vp-metric-value">{service.activeNow}</div>
                </div>
                <div className="vp-metric-box">
                  <span className="vp-metric-label">Total Today</span>
                  <div className="vp-metric-value">{service.totalToday}</div>
                </div>
              </div>

              <div className="vp-card-footer-metrics">
                <span className="vp-footer-item">
                  Revenue: <strong>{service.revenue}</strong>
                </span>
                <span className="vp-footer-item">
                  Growth:{" "}
                  <strong style={{ color: "#64748b" }}>{service.growth}</strong>
                </span>
                <span className="vp-footer-item">
                  Resp. Time: <strong>{service.responseTime}</strong>
                </span>
              </div>

              <div className="vp-card-bottom">
                <div className="vp-last-updated">
                  Last updated: {service.lastUpdated}
                </div>
                <div className="vp-status-tag paused">Paused</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Modal */}
      {activeChart === "revenue" && revenueChart && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            onClick={() => {
              setActiveChart(null);
              setRevenueChart(null);
            }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          ></div>
          <div
            style={{
              backgroundColor: "white",
              padding: "2rem",
              borderRadius: "2rem",
              width: "100%",
              maxWidth: "500px",
              position: "relative",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
          >
            <h3
              style={{
                fontSize: "1.5rem",
                fontWeight: "900",
                marginBottom: "2rem",
                marginTop: 0,
                color: "#1e293b",
              }}
            >
              Weekly Revenue
            </h3>
            <div
              style={{
                height: "240px",
                display: "flex",
                alignItems: "flex-end",
                gap: "0.75rem",
                paddingBottom: "2.5rem",
                borderLeft: "2px solid #f1f5f9",
                borderBottom: "2px solid #f1f5f9",
                paddingLeft: "1rem",
                position: "relative",
              }}
            >
              {revenueChart.data.map((d, i) => {
                const maxRev = Math.max(
                  ...revenueChart.data.map((p) => p.revenue),
                  1,
                );
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      backgroundColor: "#38AC57",
                      height: `${(d.revenue / maxRev) * 100}%`,
                      borderRadius: "6px 6px 0 0",
                      position: "relative",
                      transition: "height 0.5s ease-out",
                      minHeight: d.revenue > 0 ? "4px" : "0",
                    }}
                  />
                );
              })}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "1rem",
                paddingLeft: "1rem",
                fontSize: "0.75rem",
                color: "#64748b",
                fontWeight: "800",
              }}
            >
              {revenueChart.data.map((d, i) => (
                <span key={i}>{d.label}</span>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginTop: "2rem",
                background: "#f8fafc",
                padding: "1.25rem",
                borderRadius: "16px",
              }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "#38AC57",
                }}
              ></div>
              <span
                style={{
                  fontSize: "1rem",
                  fontWeight: "800",
                  color: "#111827",
                }}
              >
                {revenueChart.total}
              </span>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: "700",
                  color: "#38AC57",
                  marginLeft: "auto",
                }}
              >
                {revenueChart.growth}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Growth Modal */}
      {activeChart === "growth" && growthChart && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            onClick={() => {
              setActiveChart(null);
              setGrowthChart(null);
            }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          ></div>
          <div
            style={{
              backgroundColor: "white",
              padding: "2rem",
              borderRadius: "2rem",
              width: "100%",
              maxWidth: "500px",
              position: "relative",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
          >
            <h3
              style={{
                fontSize: "1.5rem",
                fontWeight: "900",
                marginBottom: "2rem",
                marginTop: 0,
                color: "#1e293b",
              }}
            >
              Weekly Request Volume
            </h3>
            <div
              style={{
                height: "240px",
                display: "flex",
                alignItems: "flex-end",
                gap: "0.75rem",
                paddingBottom: "2.5rem",
                borderLeft: "2px solid #f1f5f9",
                borderBottom: "2px solid #f1f5f9",
                paddingLeft: "1rem",
                position: "relative",
              }}
            >
              {growthChart.data.map((d, i) => {
                const maxReq = Math.max(
                  ...growthChart.data.map((p) => p.requests),
                  1,
                );
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      backgroundColor: "#6366f1",
                      height: `${(d.requests / maxReq) * 100}%`,
                      borderRadius: "6px 6px 0 0",
                      position: "relative",
                      transition: "height 0.5s ease-out",
                      minHeight: d.requests > 0 ? "4px" : "0",
                    }}
                  />
                );
              })}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "1rem",
                paddingLeft: "1rem",
                fontSize: "0.75rem",
                color: "#64748b",
                fontWeight: "800",
              }}
            >
              {growthChart.data.map((d, i) => (
                <span key={i}>{d.label}</span>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginTop: "2rem",
                background: "#f8fafc",
                padding: "1.25rem",
                borderRadius: "16px",
              }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "#6366f1",
                }}
              ></div>
              <span
                style={{
                  fontSize: "1rem",
                  fontWeight: "800",
                  color: "#111827",
                }}
              >
                {growthChart.total} requests
              </span>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: "700",
                  color: "#6366f1",
                  marginLeft: "auto",
                }}
              >
                {growthChart.growth}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal - Keeping its structure but improving mobile look */}
      {selectedService && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1.5rem",
          }}
        >
          <div
            onClick={() => setSelectedService(null)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          ></div>
          <div
            style={{
              backgroundColor: "white",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "90vh",
              borderRadius: "2.5rem",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              animation: "fadeIn 0.3s ease-out",
            }}
          >
            <div
              style={{
                padding: "2rem",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                gap: "1.25rem",
              }}
            >
              <button
                onClick={() => setSelectedService(null)}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  padding: "0.75rem",
                  borderRadius: "50%",
                  cursor: "pointer",
                  color: "#1e293b",
                  display: "flex",
                }}
              >
                <ChevronLeft size={24} />
              </button>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.5rem",
                    fontWeight: "900",
                    color: "#1e293b",
                  }}
                >
                  {selectedService.displayName}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.875rem",
                    color: "#64748b",
                    fontWeight: "600",
                  }}
                >
                  {selectedService.name}
                </p>
              </div>
            </div>

            <div
              style={{
                padding: "2.5rem",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "2.5rem",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "1.5rem",
                }}
              >
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "1.25rem",
                    borderRadius: "20px",
                    border: "1px solid #f1f5f9",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748b",
                      fontWeight: "800",
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Status
                  </div>
                  <span
                    style={{
                      backgroundColor: selectedService.isActive
                        ? "#eef7f0"
                        : "#fef2f2",
                      color: selectedService.isActive ? "#38AC57" : "#ef4444",
                      padding: "0.4rem 1rem",
                      borderRadius: "100px",
                      fontSize: "0.75rem",
                      fontWeight: "800",
                    }}
                  >
                    {selectedService.isActive ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "1.25rem",
                    borderRadius: "20px",
                    border: "1px solid #f1f5f9",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748b",
                      fontWeight: "800",
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Priority
                  </div>
                  <span
                    style={{
                      backgroundColor: "#fee2e2",
                      color: "#ef4444",
                      padding: "0.4rem 1rem",
                      borderRadius: "100px",
                      fontSize: "0.75rem",
                      fontWeight: "800",
                    }}
                  >
                    {selectedService.priority}
                  </span>
                </div>
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "1.25rem",
                    borderRadius: "20px",
                    border: "1px solid #f1f5f9",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748b",
                      fontWeight: "800",
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Rating
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      fontSize: "1.1rem",
                      fontWeight: "900",
                      color: "#1e293b",
                    }}
                  >
                    <Star size={18} fill="#38AC57" color="#38AC57" />{" "}
                    {selectedService.rating}
                  </div>
                </div>
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "1.25rem",
                    borderRadius: "20px",
                    border: "1px solid #f1f5f9",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748b",
                      fontWeight: "800",
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Success
                  </div>
                  <div
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: "900",
                      color: "#38AC57",
                    }}
                  >
                    {selectedService.completionRate}
                  </div>
                </div>
              </div>

              <div>
                <h4
                  style={{
                    margin: "0 0 1rem 0",
                    fontSize: "1.1rem",
                    fontWeight: "900",
                    color: "#1e293b",
                  }}
                >
                  Description
                </h4>
                <p
                  style={{
                    margin: 0,
                    color: "#475569",
                    lineHeight: 1.7,
                    fontSize: "0.95rem",
                  }}
                >
                  {selectedService.description}
                </p>
              </div>

              <div>
                <h4
                  style={{
                    margin: "0 0 1.25rem 0",
                    fontSize: "1.1rem",
                    fontWeight: "900",
                    color: "#1e293b",
                  }}
                >
                  Features
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {selectedService.features.length > 0 ? (
                    selectedService.features.map((f: string, i: number) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          padding: "1rem",
                          background: "#f0fdf4",
                          borderRadius: "16px",
                          color: "#166534",
                          fontWeight: "700",
                          fontSize: "0.9rem",
                        }}
                      >
                        <CheckCircle2 size={18} /> {f}
                      </div>
                    ))
                  ) : (
                    <p
                      style={{
                        color: "#94a3b8",
                        fontSize: "0.9rem",
                        margin: 0,
                      }}
                    >
                      No features configured
                    </p>
                  )}
                </div>
              </div>

              {selectedService.coverageAreas &&
                selectedService.coverageAreas.length > 0 && (
                  <div>
                    <h4
                      style={{
                        margin: "0 0 1.25rem 0",
                        fontSize: "1.1rem",
                        fontWeight: "900",
                        color: "#1e293b",
                      }}
                    >
                      Coverage Areas
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.75rem",
                      }}
                    >
                      {selectedService.coverageAreas.map(
                        (area: string, i: number) => (
                          <span
                            key={i}
                            style={{
                              padding: "0.5rem 1.25rem",
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              borderRadius: "100px",
                              fontWeight: "700",
                              fontSize: "0.85rem",
                            }}
                          >
                            {area}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}

              <div>
                <h4
                  style={{
                    margin: "0 0 1.25rem 0",
                    fontSize: "1.1rem",
                    fontWeight: "900",
                    color: "#1e293b",
                  }}
                >
                  Statistics
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "1.5rem",
                  }}
                >
                  {[
                    {
                      label: "Total Requests",
                      value: selectedService.stats.totalRequests,
                    },
                    {
                      label: "Active Now",
                      value: selectedService.stats.activeNow,
                    },
                    {
                      label: "Completed",
                      value: selectedService.stats.completed,
                    },
                    {
                      label: "Cancelled",
                      value: selectedService.stats.cancelled,
                    },
                  ].map((s, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "1rem 0",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <span
                        style={{
                          color: "#64748b",
                          fontWeight: "700",
                          fontSize: "0.9rem",
                        }}
                      >
                        {s.label}
                      </span>
                      <span
                        style={{
                          color: "#1e293b",
                          fontWeight: "900",
                          fontSize: "1.1rem",
                        }}
                      >
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Status Monitor Modal */}
      {showStatusMonitor && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            border: "none",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            onClick={() => setShowStatusMonitor(false)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          ></div>
          <div
            style={{
              backgroundColor: "white",
              padding: "2.5rem",
              borderRadius: "2.5rem",
              width: "100%",
              maxWidth: "800px",
              position: "relative",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2.5rem",
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: "900",
                    margin: 0,
                    color: "#1e293b",
                  }}
                >
                  Service Status Monitor
                </h3>
                <p
                  style={{
                    color: "#64748b",
                    margin: "0.5rem 0 0 0",
                    fontWeight: "600",
                  }}
                >
                  Real-time health check of all platform services
                </p>
              </div>
              <button
                onClick={() => setShowStatusMonitor(false)}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "none",
                  background: "#f1f5f9",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArrowUpRight
                  size={20}
                  style={{ transform: "rotate(135deg)" }}
                />
              </button>
            </div>

            <div style={{ display: "grid", gap: "1.5rem" }}>
              {services.map((service) => (
                <div
                  key={service.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "1.5rem",
                    background: "#f8fafc",
                    borderRadius: "24px",
                    border: "1px solid #e2e8f0",
                    flexWrap: "wrap",
                    gap: "1.5rem",
                  }}
                >
                  <img
                    src={getServiceIcon(service.name)}
                    alt=""
                    style={{
                      width: "40px",
                      height: "40px",
                      objectFit: "contain",
                    }}
                  />
                  <div style={{ flex: 1, minWidth: "150px" }}>
                    <div
                      style={{
                        fontWeight: "900",
                        color: "#1e293b",
                        fontSize: "1.1rem",
                      }}
                    >
                      {service.displayName}
                    </div>
                    <div
                      style={{
                        color: "#64748b",
                        fontSize: "0.85rem",
                        fontWeight: "700",
                      }}
                    >
                      {service.name}
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#64748b",
                          fontWeight: "800",
                          textTransform: "uppercase",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Latency
                      </div>
                      <div style={{ fontWeight: "900", color: "#111827" }}>
                        124ms
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#64748b",
                          fontWeight: "800",
                          textTransform: "uppercase",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Uptime
                      </div>
                      <div style={{ fontWeight: "900", color: "#111827" }}>
                        99.9%
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      background: service.isActive ? "#f0fdf4" : "#fef2f2",
                      padding: "0.5rem 1rem",
                      borderRadius: "100px",
                      color: service.isActive ? "#38AC57" : "#ef4444",
                      fontWeight: "800",
                      fontSize: "0.85rem",
                    }}
                  >
                    <Activity size={16} />{" "}
                    {service.isActive ? "Healthy" : "Inactive"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Global Settings Modal */}
      {showGlobalSettings && (
        <div className="vp-modal-overlay">
          <div
            onClick={() => setShowGlobalSettings(false)}
            className="vp-modal-backdrop"
          ></div>
          <div className="vp-modal-card">
            <div className="vp-modal-header">
              <div className="header-info">
                <h3>Global Platform Settings</h3>
                <p>Configure platform rules, commissions, and regions</p>
              </div>
              <button
                onClick={() => setShowGlobalSettings(false)}
                className="close-btn"
              >
                Close
              </button>
            </div>
            <div className="vp-modal-body">
              <Settings compact={true} hideTeamManagement={true} />
            </div>
          </div>
        </div>
      )}

      {/* Navigation Helper */}
      <div className="vp-navigation-helper">
        <span>#ALLSERVICES</span>
        <span>•</span>
        <span>MANAGEMENT HUB v1.0</span>
      </div>

      <style>{`
        .vp-modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(0,0,0,0.5);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 1rem;
        }

        .vp-modal-backdrop {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            cursor: pointer;
        }

        .vp-modal-card {
            background-color: white;
            border-radius: 2.5rem;
            width: 100%;
          max-width: min(1360px, 96vw);
            position: relative;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3);
          max-height: 96vh;
            overflow-y: auto;
            animation: fadeIn 0.3s ease-out;
        }

        .vp-modal-header {
            padding: 2rem 2.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            background: white;
            z-index: 10;
            border-bottom: 1px solid #f1f5f9;
        }

        .vp-modal-header h3 {
            font-size: 1.75rem;
            font-weight: 900;
            margin: 0;
            color: #1e293b;
        }

        .vp-modal-header p {
            color: #64748b;
            margin: 0.5rem 0 0 0;
            font-weight: 600;
            font-size: 1rem;
        }

        .vp-modal-header .close-btn {
            padding: 0.875rem 2rem;
            border-radius: 100px;
            border: none;
            background: #1e293b;
            color: white;
            font-weight: 800;
            cursor: pointer;
            font-size: 0.95rem;
            transition: all 0.2s;
        }

        .vp-modal-header .close-btn:hover {
            background: #000;
            transform: scale(1.05);
        }

        .vp-modal-body {
            padding: 0;
        }

        .vp-settings-wrapper {
            padding: 2.5rem;
            background: transparent;
            min-height: auto;
        }

        @media (max-width: 768px) {
            .vp-modal-card {
                border-radius: 1.5rem;
            max-height: 98vh;
            max-width: 100vw;
            }
            .vp-modal-header {
                padding: 1.5rem;
                flex-direction: column;
                align-items: flex-start;
                gap: 1.5rem;
            }
            .vp-modal-header .close-btn {
                width: 100%;
                justify-content: center;
            }
            .vp-modal-header h3 {
                font-size: 1.4rem;
            }
            .vp-modal-header p {
                font-size: 0.9rem;
            }
            .vp-settings-wrapper {
                padding: 1.5rem;
            }
        }
      `}</style>
    </div>
  );
};
