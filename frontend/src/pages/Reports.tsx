import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  FileText,
  FileSpreadsheet,
  Download,
  ArrowUpRight,
  ChevronRight,
  Star,
} from "lucide-react";
import { UserAvatar } from "../components/UserAvatar";

// Specialized Icons
import totalTripsIcon from "../assets/icons/Total Trips Today.png";
import activeDriversIcon from "../assets/icons/Active Drivers.png";
import revenueIcon from "../assets/icons/Revenue.png";
import carIcon from "../assets/icons/car.png";
import {
  getReportFiltersApi,
  getReportKpisApi,
  getServiceVolumeApi,
  getRevenueByServiceApi,
  getRegionalPerformanceApi,
  getReportTopPerformersApi,
  getRegionalSummaryApi,
  resolveApiUrl,
  resolveApiAssetUrl,
  type ReportKpis,
  type ServiceVolumePoint,
  type RevenueByServicePoint,
  type RegionalPerformanceItem,
  type ReportFilterOptions,
  type TopPerformerItem,
  type RegionalSummaryItem,
} from "../services/api";

const SERVICE_COLORS: Record<string, string> = {
  "Car Ride": "#38AC57",
  Motorcycle: "#0ea5e9",
  "Rental Car": "#f97316",
  Reservation: "#ef4444",
  "City To City": "#8b5cf6",
  Delivery: "#ec4899",
  Taxi: "#22c55e",
  "Group Ride": "#f59e0b",
  "Airport Ride": "#dc2626",
  Other: "#64748b",
};

export const Reports = () => {
  const [regionFilter, setRegionFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState("This Month");
  const [activeTab, setActiveTab] = useState<"drivers" | "riders">("drivers");
  const [activeStat, setActiveStat] = useState<string>("Total Earning");
  const [filterOptions, setFilterOptions] = useState<ReportFilterOptions>({
    regions: [],
    services: [],
  });

  // API data state
  const [kpis, setKpis] = useState<ReportKpis>({
    totalTrips: 0,
    totalEarnings: 0,
    activeDrivers: 0,
    fleetSize: 0,
  });
  const [serviceVolumeData, setServiceVolumeData] = useState<
    ServiceVolumePoint[]
  >([]);
  const [revenueData, setRevenueData] = useState<RevenueByServicePoint[]>([]);
  const [regionalData, setRegionalData] = useState<RegionalPerformanceItem[]>(
    [],
  );
  const [driversData, setDriversData] = useState<TopPerformerItem[]>([]);
  const [ridersData, setRidersData] = useState<TopPerformerItem[]>([]);
  const [regionalSummary, setRegionalSummary] = useState<RegionalSummaryItem[]>(
    [],
  );

  const mapTimePeriod = (label: string) => {
    switch (label) {
      case "Today":
        return "today";
      case "This Week":
        return "last_week";
      case "This Month":
        return "this_month";
      case "Year To Date":
        return "year_to_date";
      default:
        return undefined;
    }
  };

  const loadData = useCallback(async () => {
    const period = mapTimePeriod(timeFilter);
    const params = {
      period,
      regionId: regionFilter ? Number(regionFilter) : undefined,
      serviceTypeId: serviceFilter ? Number(serviceFilter) : undefined,
    };

    try {
      const [
        filtersRes,
        kpiRes,
        svRes,
        revRes,
        rpRes,
        driverRes,
        riderRes,
        rsRes,
      ] = await Promise.all([
        getReportFiltersApi(),
        getReportKpisApi(params),
        getServiceVolumeApi(params),
        getRevenueByServiceApi(params),
        getRegionalPerformanceApi(params),
        getReportTopPerformersApi({ type: "driver", ...params }),
        getReportTopPerformersApi({ type: "rider", ...params }),
        getRegionalSummaryApi(params),
      ]);
      if (filtersRes.ok) setFilterOptions(filtersRes.data);
      if (kpiRes.ok) setKpis(kpiRes.data);
      if (svRes.ok) setServiceVolumeData(svRes.data);
      if (revRes.ok) setRevenueData(revRes.data);
      if (rpRes.ok) setRegionalData(rpRes.data);
      if (driverRes.ok) setDriversData(driverRes.data);
      if (riderRes.ok) setRidersData(riderRes.data);
      if (rsRes.ok) setRegionalSummary(rsRes.data);
    } catch (e) {
      console.error("Failed to load reports", e);
    }
  }, [regionFilter, serviceFilter, timeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* Handlers */
  const handleExport = (type: string) => {
    const format = type.toLowerCase();
    const token = localStorage.getItem("token");
    const params = new URLSearchParams({ format });
    const period = mapTimePeriod(timeFilter);
    if (period) params.set("period", period);
    if (regionFilter) params.set("regionId", regionFilter);
    if (serviceFilter) params.set("serviceTypeId", serviceFilter);

    const url = resolveApiUrl(`/api/admin/reports/export?${params.toString()}`);
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Export failed");
        }

        const disposition = response.headers.get("content-disposition") || "";
        const filenameMatch = disposition.match(/filename=([^;]+)/i);
        const filename = filenameMatch
          ? filenameMatch[1].replace(/"/g, "")
          : `report.${format === "pdf" ? "pdf" : format === "csv" ? "csv" : "xls"}`;
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => alert(`Export failed`));
  };

  const chartServiceKeys = useMemo(() => {
    if (serviceFilter) {
      const selected = filterOptions.services.find(
        (service) => String(service.id) === serviceFilter,
      );
      return selected ? [selected.label] : [];
    }

    const keysFromData = new Set<string>();
    serviceVolumeData.forEach((point) => {
      Object.keys(point).forEach((key) => {
        if (key !== "time") {
          keysFromData.add(key);
        }
      });
    });

    if (keysFromData.size > 0) {
      return Array.from(keysFromData);
    }

    return filterOptions.services.map((service) => service.label);
  }, [filterOptions.services, serviceFilter, serviceVolumeData]);

  const normalizedServiceVolumeData = useMemo(() => {
    if (serviceVolumeData.length === 0) {
      return [];
    }

    const parseHour = (timeLabel: string) => {
      const [hour] = String(timeLabel || "0:00").split(":");
      const parsed = Number(hour);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const sourceMap = new Map<number, ServiceVolumePoint>();
    serviceVolumeData.forEach((point) => {
      sourceMap.set(parseHour(String(point.time)), point);
    });

    const allHours = Array.from(sourceMap.keys()).sort(
      (left, right) => left - right,
    );
    const startHour = allHours[0] ?? 0;
    const endHour = allHours[allHours.length - 1] ?? startHour;
    const rows: ServiceVolumePoint[] = [];

    for (let hour = startHour; hour <= endHour; hour += 1) {
      const existingPoint = sourceMap.get(hour);
      const row: ServiceVolumePoint = {
        time: `${String(hour).padStart(2, "0")}:00`,
      };

      chartServiceKeys.forEach((label) => {
        const rawValue = existingPoint?.[label];
        row[label] = typeof rawValue === "number" ? rawValue : 0;
      });

      rows.push(row);
    }

    return rows;
  }, [chartServiceKeys, serviceVolumeData]);

  const serviceAreaKeys = useMemo(
    () => chartServiceKeys.filter((label) => label !== "Other"),
    [chartServiceKeys],
  );

  const serviceVolumeMax = useMemo(() => {
    return normalizedServiceVolumeData.reduce((maxValue, point) => {
      const total = serviceAreaKeys.reduce((sum, label) => {
        const value = point[label];
        return sum + (typeof value === "number" ? value : 0);
      }, 0);

      return Math.max(maxValue, total);
    }, 0);
  }, [normalizedServiceVolumeData, serviceAreaKeys]);

  const revenueChartData = useMemo(
    () =>
      revenueData.map((point, index) => ({
        ...point,
        fill: index % 2 === 0 ? "#38AC57" : "#179d8b",
      })),
    [revenueData],
  );

  const currentListData = activeTab === "drivers" ? driversData : ridersData;

  const statCards = [
    {
      label: "Total Trips",
      value: kpis.totalTrips.toLocaleString(),
      change: "From Selected Period",
      icon: totalTripsIcon,
    },
    {
      label: "Total Earning",
      value: kpis.totalEarnings.toLocaleString(),
      suffix: "MAD",
      change: "From Selected Period",
      icon: revenueIcon,
    },
    {
      label: "Active Drivers",
      value: String(kpis.activeDrivers),
      change: "Currently Online",
      icon: activeDriversIcon,
    },
    {
      label: "Fleet Size",
      value: String(kpis.fleetSize),
      change: "Total Registered",
      icon: carIcon,
    },
  ];

  return (
    <div className="ra-page-wrapper">
      <style>{`
        .ra-page-wrapper {
            width: 100%;
            overflow-x: hidden;
            background-color: #f8fafc;
            min-height: 100vh;
        }

        .ra-page-container {
            display: flex;
            flex-direction: column;
            gap: 2.5rem;
            padding: 2.5rem;
            max-width: 1600px;
            margin: 0 auto;
            width: 100%;
            box-sizing: border-box;
        }
        
        .ra-page-container * {
            box-sizing: border-box;
        }

        .ra-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 1.5rem;
            margin-bottom: 0.5rem;
            width: 100%;
        }
        .ra-header-title h1 {
            font-size: 2.25rem;
            font-weight: 900;
            letter-spacing: -0.025em;
            margin: 0;
            color: var(--text-primary);
        }
        .ra-filters-group {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }
        .ra-export-row {
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
            margin-top: -1rem;
            width: 100%;
        }
        .ra-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1.5rem;
            width: 100%;
        }
        .ra-stat-value {
            font-size: 2.5rem;
            font-weight: 900;
            letter-spacing: -0.025em;
        }
        .ra-charts-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
            width: 100%;
        }
        .ra-pie-content {
            display: flex;
            align-items: center;
            gap: 2rem;
            flex: 1;
            width: 100%;
        }
        .ra-pie-chart-box {
            width: 45%; 
            height: 300px;
        }
        .ra-pie-legend {
            width: 55%; 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 1.25rem;
        }
        .ra-table-wrapper {
            background: white;
            border-radius: 24px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            width: 100%;
        }
        .ra-table-container {
            overflow-x: auto;
            width: 100%;
        }
        .ra-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 800px;
        }
        .ra-table th {
            text-align: left;
            padding: 1.25rem 1.5rem;
            font-size: 0.85rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            background-color: #f8fafc;
        }
        .ra-table td {
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid #f1f5f9;
        }
        .ra-chart-card {
          border-radius: 32px;
          padding: 2rem;
        }
        .ra-chart-title {
          font-size: 1.25rem;
          font-weight: 900;
          margin: 0;
          letter-spacing: -0.01em;
          color: #111827;
        }
        .ra-chart-subtitle {
          margin: 0.45rem 0 0 0;
          color: #64748b;
          font-size: 0.92rem;
          font-weight: 600;
        }
        .ra-chart-surface {
          height: 350px;
          margin-top: 1.5rem;
          border-radius: 24px;
          padding: 1rem 0.25rem 0 0.25rem;
          background:
            linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(255, 255, 255, 1) 100%),
            radial-gradient(circle at top left, rgba(56, 172, 87, 0.08), transparent 45%);
        }
        .ra-legend-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.85rem 1.25rem;
          margin-top: 1.35rem;
        }
        .ra-legend-item {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          font-size: 0.8rem;
          font-weight: 700;
          color: #475569;
        }
        .ra-legend-swatch {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          flex-shrink: 0;
        }

        @media (max-width: 1400px) {
            .ra-stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        @media (max-width: 992px) {
            .ra-charts-grid {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 768px) {
            .ra-page-container {
                padding: 1.5rem 1rem;
                gap: 1.5rem;
            }
            .ra-header {
                flex-direction: column;
                align-items: center;
                text-align: center;
            }
            .ra-header-title h1 {
                font-size: 1.75rem;
            }
            .ra-filters-group {
                flex-direction: column;
                width: 100%;
                gap: 0.75rem;
            }
            .ra-filters-group select {
                width: 100%;
            }
            .ra-export-row {
                flex-direction: column;
                gap: 0.75rem;
                margin-top: 0;
            }
            .ra-export-row button {
                width: 100%;
            }
            .ra-pie-chart-box {
                width: 100% !important;
                height: 240px !important;
            }
            .ra-pie-legend {
                width: 100% !important;
                grid-template-columns: 1fr 1fr !important;
                gap: 1.5rem !important;
            }
            .ra-pie-card-header {
                flex-direction: column;
                align-items: center !important;
                text-align: center;
                gap: 0.75rem;
            }
            .ra-charts-grid .card {
                padding: 1.25rem;
            }
            .ra-legend-grid {
                grid-template-columns: 1fr 1fr;
            }
        }
      `}</style>

      <div className="ra-page-container">
        {/* --- Page Header & Filters --- */}
        <div className="ra-header">
          <div className="ra-header-title">
            <h1>Reports & Analytics</h1>
            <p
              style={{
                color: "var(--text-secondary)",
                margin: "0.5rem 0 0 0",
                fontSize: "1rem",
                fontWeight: "500",
              }}
            >
              Comprehensive business insights across all regions and services
            </p>
          </div>

          <div className="ra-filters-group">
            <select
              className="filter-select"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              style={{
                borderRadius: "1.5rem",
                padding: "0.75rem 1.5rem",
                fontWeight: "700",
              }}
            >
              <option value="">Region</option>
              {filterOptions.regions.map((region) => (
                <option key={region.id} value={String(region.id)}>
                  {region.name}
                </option>
              ))}
            </select>
            <select
              className="filter-select"
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              style={{
                borderRadius: "1.5rem",
                padding: "0.75rem 1.5rem",
                fontWeight: "700",
              }}
            >
              <option value="">Service</option>
              {filterOptions.services.map((service) => (
                <option key={service.id} value={String(service.id)}>
                  {service.label}
                </option>
              ))}
            </select>
            <select
              className="filter-select"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              style={{
                borderRadius: "1.5rem",
                padding: "0.75rem 1.5rem",
                fontWeight: "700",
              }}
            >
              <option>This Month</option>
              <option>This Week</option>
              <option>Today</option>
              <option>Year To Date</option>
            </select>
          </div>
        </div>

        {/* --- Export Buttons Row --- */}
        <div className="ra-export-row">
          <button
            className="filter-btn"
            onClick={() => handleExport("PDF")}
            style={{
              fontWeight: "800",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              borderRadius: "100px",
              padding: "0.75rem 1.5rem",
            }}
          >
            <Download size={18} /> Export PDF
          </button>
          <button
            className="export-btn"
            onClick={() => handleExport("Excel")}
            style={{
              backgroundColor: "var(--primary-color)",
              fontWeight: "800",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              borderRadius: "100px",
              padding: "0.75rem 1.5rem",
            }}
          >
            <FileSpreadsheet size={18} /> Export Excel
          </button>
          <button
            className="filter-btn"
            onClick={() => handleExport("CSV")}
            style={{
              fontWeight: "800",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              borderRadius: "100px",
              padding: "0.75rem 1.5rem",
            }}
          >
            <FileText size={18} /> Export CSV
          </button>
        </div>

        {/* --- Stats Cards Grid --- */}
        <div className="ra-stats-grid">
          {statCards.map((stat) => {
            const isActive = activeStat === stat.label;
            return (
              <div
                key={stat.label}
                className="stat-card"
                onClick={() => setActiveStat(stat.label)}
                style={{
                  backgroundColor: isActive ? "var(--primary-color)" : "white",
                  color: isActive ? "white" : "inherit",
                  position: "relative",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  padding: "1.75rem",
                  borderRadius: "32px",
                  border: isActive ? "none" : "1px solid #e2e8f0",
                  boxShadow: isActive
                    ? "0 20px 25px -5px rgba(56, 172, 87, 0.2)"
                    : "none",
                }}
              >
                <div className="stat-header" style={{ marginBottom: "1.5rem" }}>
                  <div
                    className="stat-icon"
                    style={{
                      backgroundColor: isActive
                        ? "rgba(255, 255, 255, 0.2)"
                        : "rgba(56, 172, 87, 0.1)",
                      width: "56px",
                      height: "56px",
                      borderRadius: "16px",
                    }}
                  >
                    <img
                      src={stat.icon}
                      alt={stat.label}
                      style={{
                        width: "32px",
                        height: "32px",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    <span
                      className="stat-label"
                      style={{
                        color: isActive ? "white" : "#64748b",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      {stat.label}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: isActive ? "white" : "var(--primary-color)",
                        fontWeight: "800",
                        opacity: isActive ? 0.9 : 1,
                      }}
                    >
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div
                  className="ra-stat-value"
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "0.5rem",
                    color: isActive ? "white" : "#1e293b",
                  }}
                >
                  {stat.value}{" "}
                  {stat.suffix && (
                    <span
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: "600",
                        opacity: 0.8,
                      }}
                    >
                      {stat.suffix}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    position: "absolute",
                    bottom: "1.75rem",
                    right: "1.75rem",
                    backgroundColor: isActive ? "rgba(0,0,0,0.15)" : "#f8fafc",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                  }}
                >
                  <ArrowUpRight
                    size={22}
                    color={isActive ? "white" : "var(--primary-color)"}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* --- Charts Section Lower --- */}
        <div className="ra-charts-grid">
          {/* Service Volume by Hour */}
          <div className="card ra-chart-card">
            <div>
              <h3 className="ra-chart-title">Service Volume by Hour</h3>
              <p className="ra-chart-subtitle">
                Live trip volume grouped from the selected report filters
              </p>
            </div>
            <div className="ra-chart-surface">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={normalizedServiceVolumeData}>
                  <defs>
                    {serviceAreaKeys.map((label) => {
                      const color =
                        SERVICE_COLORS[label] || SERVICE_COLORS.Other;
                      return (
                        <linearGradient
                          key={label}
                          id={`service-volume-gradient-${label.replace(/\s+/g, "-")}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={color}
                            stopOpacity={0.62}
                          />
                          <stop
                            offset="95%"
                            stopColor={color}
                            stopOpacity={0.12}
                          />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid
                    strokeDasharray="5 6"
                    stroke="#d1d5db"
                    vertical={true}
                  />
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#6b7280", fontWeight: "700" }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#6b7280", fontWeight: "700" }}
                    domain={[0, Math.max(serviceVolumeMax, 1)]}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => {
                      const numericValue =
                        typeof value === "number" ? value : Number(value);
                      return [`${numericValue || 0} trips`, name];
                    }}
                    labelFormatter={(label) => `Time ${label}`}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "none",
                      boxShadow: "0 18px 40px rgba(15, 23, 42, 0.14)",
                      padding: "0.85rem 1rem",
                      backgroundColor: "rgba(255,255,255,0.96)",
                    }}
                  />
                  {serviceAreaKeys.map((label) => (
                    <Area
                      key={label}
                      type="monotone"
                      dataKey={label}
                      stroke={SERVICE_COLORS[label] || SERVICE_COLORS.Other}
                      fill={`url(#service-volume-gradient-${label.replace(/\s+/g, "-")})`}
                      strokeWidth={2.5}
                      stackId="service-volume"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      isAnimationActive={false}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="ra-legend-grid">
              {serviceAreaKeys.map((label) => (
                <div key={label} className="ra-legend-item">
                  <span
                    className="ra-legend-swatch"
                    style={{
                      backgroundColor:
                        SERVICE_COLORS[label] || SERVICE_COLORS.Other,
                    }}
                  />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Revenue by Service (MAD) */}
          <div className="card ra-chart-card">
            <div>
              <h3 className="ra-chart-title">Revenue by Service (MAD)</h3>
              <p className="ra-chart-subtitle">
                Revenue totals from the report API for the active period
              </p>
            </div>
            <div className="ra-chart-surface">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData} barCategoryGap="18%">
                  <CartesianGrid
                    strokeDasharray="5 6"
                    stroke="#d1d5db"
                    vertical={true}
                  />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#6b7280", fontWeight: "700" }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#6b7280", fontWeight: "700" }}
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    formatter={(value: any) => [
                      `${Number(value || 0).toLocaleString()} MAD`,
                      "Revenue",
                    ]}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "none",
                      boxShadow: "0 18px 40px rgba(15, 23, 42, 0.14)",
                      backgroundColor: "rgba(255,255,255,0.96)",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    radius={[8, 8, 0, 0]}
                    barSize={22}
                    isAnimationActive={false}
                  >
                    {revenueChartData.map((entry) => (
                      <Cell
                        key={`${entry.day}-${entry.revenue}`}
                        fill={entry.fill}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* --- Middle Row: Regional Performance vs Drivers/Riders --- */}
        <div className="ra-charts-grid">
          {/* Regional Performance Pie */}
          <div
            className="card"
            style={{
              display: "flex",
              flexDirection: "column",
              borderRadius: "32px",
              padding: "2rem",
            }}
          >
            <div
              className="ra-pie-card-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
              }}
            >
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "900",
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                Regional Performance
              </h3>
              <span
                style={{
                  fontSize: "0.85rem",
                  color: "var(--primary-color)",
                  cursor: "pointer",
                  fontWeight: "800",
                }}
              >
                Monthly Revenue View
              </span>
            </div>

            <div className="ra-pie-content">
              <div className="ra-pie-chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={regionalData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {regionalData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          strokeWidth={0}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="ra-pie-legend">
                {regionalData.map((item) => (
                  <div
                    key={item.name}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                      }}
                    >
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "4px",
                          backgroundColor: item.color,
                        }}
                      ></div>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: "800",
                          color: "#1e293b",
                        }}
                      >
                        {item.name.split("-")[0]}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--primary-color)",
                        marginLeft: "1.35rem",
                        fontWeight: "900",
                      }}
                    >
                      {item.revenue}{" "}
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: "#94a3b8",
                          fontWeight: "600",
                        }}
                      >
                        MAD
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Drivers / Riders List */}
          <div
            className="card"
            style={{ borderRadius: "32px", padding: "2rem" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "2rem",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  backgroundColor: "#f1f5f9",
                  borderRadius: "100px",
                  padding: "0.4rem",
                }}
              >
                <button
                  onClick={() => setActiveTab("drivers")}
                  style={{
                    padding: "0.6rem 1.75rem",
                    borderRadius: "100px",
                    border: "none",
                    backgroundColor:
                      activeTab === "drivers"
                        ? "var(--primary-color)"
                        : "transparent",
                    color: activeTab === "drivers" ? "white" : "#64748b",
                    fontWeight: "800",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    fontSize: "0.9rem",
                  }}
                >
                  Drivers
                </button>
                <button
                  onClick={() => setActiveTab("riders")}
                  style={{
                    padding: "0.6rem 1.75rem",
                    borderRadius: "100px",
                    border: "none",
                    backgroundColor:
                      activeTab === "riders"
                        ? "var(--primary-color)"
                        : "transparent",
                    color: activeTab === "riders" ? "white" : "#64748b",
                    fontWeight: "800",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    fontSize: "0.9rem",
                  }}
                >
                  Riders
                </button>
              </div>
              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    color: "var(--primary-color)",
                    fontWeight: "900",
                  }}
                >
                  Active Now
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#94a3b8",
                    fontWeight: "600",
                  }}
                >
                  {currentListData.length} Members
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                maxHeight: "350px",
                overflowY: "auto",
                paddingRight: "0.5rem",
              }}
            >
              {currentListData.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "1rem",
                    borderRadius: "20px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    gap: "1.25rem",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "translateY(-2px)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "none")
                  }
                >
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <UserAvatar
                      src={
                        item.imageUrl
                          ? resolveApiAssetUrl(item.imageUrl)
                          : undefined
                      }
                      name={item.name}
                      rating={item.rating}
                      size={52}
                      showBadge={true}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "1rem",
                          fontWeight: "900",
                          color: "#1e293b",
                        }}
                      >
                        {item.name}
                      </h4>
                      <ChevronRight size={14} color="#94a3b8" />
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#64748b",
                        marginTop: "0.2rem",
                        fontWeight: "600",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--primary-color)",
                          fontWeight: "800",
                        }}
                      >
                        {item.trips}
                      </span>{" "}
                      trips •{" "}
                      <span style={{ color: "#1e293b", fontWeight: "800" }}>
                        {item.earnings} MAD
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        fontWeight: "500",
                      }}
                    >
                      {item.region}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      backgroundColor: "white",
                      padding: "6px 12px",
                      borderRadius: "100px",
                      border: "1px solid #f1f5f9",
                    }}
                  >
                    <Star size={14} fill="#eab308" color="#eab308" />
                    <span
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: "900",
                        color: "#1e293b",
                      }}
                    >
                      {item.rating}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- Bottom Section: Regional Performance Summary --- */}
        <div className="ra-table-wrapper">
          <div
            style={{
              padding: "1.75rem 2rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #f1f5f9",
              flexWrap: "wrap",
              gap: "1.5rem",
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "900",
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                Regional Summary
              </h3>
              <p
                style={{
                  margin: "0.25rem 0 0 0",
                  fontSize: "0.85rem",
                  color: "#64748b",
                  fontWeight: "500",
                }}
              >
                Detailed breakdown of performance metrics by region
              </p>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                backgroundColor: "#f8fafc",
                padding: "0.5rem 1.25rem",
                borderRadius: "100px",
                border: "1px solid #e2e8f0",
              }}
            >
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "800",
                  color: "#1e293b",
                }}
              >
                Filter Region:
              </span>
              <select
                className="filter-select"
                style={{
                  border: "none",
                  background: "transparent",
                  padding: "0",
                  fontSize: "0.85rem",
                  fontWeight: "900",
                  color: "var(--primary-color)",
                  outline: "none",
                }}
              >
                <option>All Regions</option>
                {regionalData.map((r) => (
                  <option key={r.name}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="ra-table-container">
            <table className="ra-table">
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <th>Region</th>
                  <th>Trip Share</th>
                  <th>Revenue Status</th>
                  <th>Active Drivers</th>
                  <th>Growth</th>
                  <th>Avg. Trip Value</th>
                </tr>
              </thead>
              <tbody>
                {regionalSummary.map((row, idx) => (
                  <tr key={idx}>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                        }}
                      >
                        <div
                          style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "4px",
                            backgroundColor: row.color,
                            boxShadow: `0 0 0 4px ${row.color}15`,
                          }}
                        ></div>
                        <span
                          style={{
                            fontWeight: "800",
                            fontSize: "0.95rem",
                            color: "#1e293b",
                          }}
                        >
                          {row.region}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            height: "6px",
                            backgroundColor: "#f1f5f9",
                            borderRadius: "10px",
                            overflow: "hidden",
                            minWidth: "60px",
                          }}
                        >
                          <div
                            style={{
                              width: row.share,
                              height: "100%",
                              backgroundColor: row.color,
                            }}
                          ></div>
                        </div>
                        <span
                          style={{
                            color: "#1e293b",
                            fontSize: "0.9rem",
                            fontWeight: "800",
                          }}
                        >
                          {row.share}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "6px 14px",
                          borderRadius: "100px",
                          backgroundColor: row.revenue.includes("MAD")
                            ? "#eef7f0"
                            : "#f1f5f9",
                          color: row.revenue.includes("MAD")
                            ? "var(--primary-color)"
                            : "#64748b",
                          fontSize: "0.8rem",
                          fontWeight: "800",
                        }}
                      >
                        {row.revenue}
                      </span>
                    </td>
                    <td
                      style={{
                        color: "#1e293b",
                        fontSize: "0.95rem",
                        fontWeight: "800",
                      }}
                    >
                      {row.activeDrivers}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          color: "var(--primary-color)",
                          fontWeight: "900",
                          fontSize: "0.95rem",
                        }}
                      >
                        <ArrowUpRight size={16} />
                        {row.growth}
                      </div>
                    </td>
                    <td
                      style={{
                        color: "#1e293b",
                        fontSize: "0.95rem",
                        fontWeight: "900",
                      }}
                    >
                      {row.avgTripValue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
