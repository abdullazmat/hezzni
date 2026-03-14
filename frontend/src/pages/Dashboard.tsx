import { useCallback, useEffect, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ArrowUpRight } from "lucide-react";
import { PageLoader } from "../components/PageLoader";
import {
  getDashboardRegionsApi,
  getDashboardStatsApi,
  getDashboardTripsChartApi,
  getDashboardTopRegionsApi,
  getDashboardTripsByRegionApi,
  getDashboardTopPerformersApi,
  resolveApiAssetUrl,
  DashboardRegion,
  DashboardStats,
  DashboardTripsChart,
  DashboardTopRegion,
  DashboardTripsByRegion,
  DashboardTopPerformer,
} from "../services/api";
import { UserAvatar } from "../components/UserAvatar";

import totalTripsIcon from "../assets/icons/Total Trips Today.png";
import activeDriversIcon from "../assets/icons/Active Drivers.png";
import totalEarningsIcon from "../assets/icons/Total Earnings.png";
import dailyBonusIcon from "../assets/icons/Daily Bonus Earned.png";
import driversRegionIcon from "../assets/icons/drivers-region performance.png";
import increaseIcon from "../assets/icons/increase.png";

const PIE_COLORS = [
  "#38AC57",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
];

type Period = "daily" | "weekly" | "monthly";
type PerformerTab = "driver" | "passenger";

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatCurrency(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatTrend(value: number): string {
  return `${value > 0 ? "+" : ""}${value}%`;
}

function resolveImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) {
    return null;
  }

  return resolveApiAssetUrl(imageUrl);
}

export const Dashboard = ({
  onNavigate,
}: {
  onNavigate: (page: string) => void;
}) => {
  const [regions, setRegions] = useState<DashboardRegion[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState(0);
  const [tripsChartPeriod, setTripsChartPeriod] = useState<Period>("monthly");
  const [tripsByRegionPeriod, setTripsByRegionPeriod] =
    useState<Period>("monthly");
  const [activeTab, setActiveTab] = useState<PerformerTab>("driver");
  const [pendingShortcutPage, setPendingShortcutPage] = useState<string | null>(
    null,
  );
  const shortcutNavigationTimeoutRef = useRef<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tripsChart, setTripsChart] = useState<DashboardTripsChart | null>(
    null,
  );
  const [topRegions, setTopRegions] = useState<DashboardTopRegion[]>([]);
  const [tripsByRegion, setTripsByRegion] =
    useState<DashboardTripsByRegion | null>(null);
  const [topDrivers, setTopDrivers] = useState<DashboardTopPerformer[]>([]);
  const [topPassengers, setTopPassengers] = useState<DashboardTopPerformer[]>(
    [],
  );

  useEffect(() => {
    void loadRegions();
  }, []);

  useEffect(() => {
    return () => {
      if (shortcutNavigationTimeoutRef.current !== null) {
        window.clearTimeout(shortcutNavigationTimeoutRef.current);
      }
    };
  }, []);

  const handleShortcutNavigate = useCallback(
    (targetPage: string) => {
      if (shortcutNavigationTimeoutRef.current !== null) {
        window.clearTimeout(shortcutNavigationTimeoutRef.current);
      }

      setPendingShortcutPage(targetPage);
      shortcutNavigationTimeoutRef.current = window.setTimeout(() => {
        onNavigate(targetPage);
      }, 140);
    },
    [onNavigate],
  );

  const loadDashboardData = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      }

      setDashboardError("");

      try {
        const regionId = selectedRegionId || 0;
        const [
          statsResult,
          tripsChartResult,
          topRegionsResult,
          tripsByRegionResult,
          driversResult,
          passengersResult,
        ] = await Promise.allSettled([
          getDashboardStatsApi({ regionId }),
          getDashboardTripsChartApi({ period: tripsChartPeriod, regionId }),
          getDashboardTopRegionsApi({ limit: 5, regionId }),
          getDashboardTripsByRegionApi({
            period: tripsByRegionPeriod,
            regionId,
          }),
          getDashboardTopPerformersApi({ type: "driver", limit: 6, regionId }),
          getDashboardTopPerformersApi({
            type: "passenger",
            limit: 6,
            regionId,
          }),
        ]);

        const statsResponse =
          statsResult.status === "fulfilled" ? statsResult.value : null;
        const tripsChartResponse =
          tripsChartResult.status === "fulfilled"
            ? tripsChartResult.value
            : null;
        const topRegionsResponse =
          topRegionsResult.status === "fulfilled"
            ? topRegionsResult.value
            : null;
        const tripsByRegionResponse =
          tripsByRegionResult.status === "fulfilled"
            ? tripsByRegionResult.value
            : null;
        const driversResponse =
          driversResult.status === "fulfilled" ? driversResult.value : null;
        const passengersResponse =
          passengersResult.status === "fulfilled"
            ? passengersResult.value
            : null;

        if (statsResponse?.ok) {
          setStats(statsResponse.data);
        }

        if (tripsChartResponse?.ok) {
          setTripsChart(tripsChartResponse.data);
        }

        if (topRegionsResponse?.ok) {
          setTopRegions(topRegionsResponse.data);
        }

        if (tripsByRegionResponse?.ok) {
          setTripsByRegion(tripsByRegionResponse.data);
        }

        if (driversResponse?.ok) {
          setTopDrivers(driversResponse.data);
        }

        if (passengersResponse?.ok) {
          setTopPassengers(passengersResponse.data);
        }

        const hasCoreData = Boolean(
          statsResponse?.ok &&
          tripsChartResponse?.ok &&
          tripsByRegionResponse?.ok,
        );

        if (!hasCoreData && !stats && !tripsChart && !tripsByRegion) {
          setDashboardError("Unable to load dashboard data.");
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
        if (!stats && !tripsChart && !tripsByRegion) {
          setDashboardError("Unable to load dashboard data.");
        }
      } finally {
        setLoading(false);
      }
    },
    [
      selectedRegionId,
      stats,
      tripsByRegion,
      tripsChart,
      tripsByRegionPeriod,
      tripsChartPeriod,
    ],
  );

  useEffect(() => {
    void loadDashboardData(true);

    const intervalId = window.setInterval(() => {
      void loadDashboardData(false);
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadDashboardData]);

  async function loadRegions() {
    try {
      const response = await getDashboardRegionsApi();
      if (response.ok) {
        setRegions(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard regions", error);
    }
  }

  if (loading && !stats && !tripsChart && !tripsByRegion) {
    return <PageLoader label="Loading dashboard..." />;
  }

  if (dashboardError && !stats && !tripsChart && !tripsByRegion) {
    return (
      <div
        style={{
          backgroundColor: "#fff1f2",
          border: "1px solid #fecdd3",
          color: "#be123c",
          padding: "1rem 1.25rem",
          borderRadius: "1rem",
        }}
      >
        {dashboardError}
      </div>
    );
  }

  if (!stats || !tripsChart || !tripsByRegion) {
    return <PageLoader label="Loading dashboard..." />;
  }

  const pieData = tripsByRegion.data.map((entry, index) => ({
    name: entry.regionName,
    value: entry.percentage,
    color: PIE_COLORS[index % PIE_COLORS.length],
    count: `${formatNumber(entry.trips)} trips`,
  }));

  const activePerformers = activeTab === "driver" ? topDrivers : topPassengers;

  return (
    <div
      className="dashboard-container"
      style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
                @media (max-width: 1024px) {
                     .pie-legend-grid {
                         grid-template-columns: repeat(3, 1fr) !important;
                     }
                }
                @media (max-width: 768px) {
                     .pie-legend-grid {
                         grid-template-columns: repeat(2, 1fr) !important;
                     }
                }
                @media (max-width: 640px) {
                    .dashboard-header {
                        flex-direction: column;
                        align-items: flex-start !important;
                        gap: 1rem;
                    }
                    .dashboard-header select {
                        width: 100%;
                    }
                    .pie-legend-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .stat-value {
                        font-size: 2rem !important;
                    }
                    .stat-label-text {
                        font-size: 0.85rem !important;
                    }
                }
            `,
        }}
      />

      <div
        className="dashboard-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "bold", margin: 0 }}>
            Dashboard
          </h1>
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>
            Overview of your ride-sharing platform across Morocco
          </p>
        </div>
        <div>
          <select
            value={selectedRegionId}
            onChange={(event) =>
              setSelectedRegionId(Number(event.target.value))
            }
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "1rem",
              border: "none",
              backgroundColor: "#e5e7eb",
              cursor: "pointer",
              fontWeight: "500",
              color: "#4b5563",
              appearance: "none",
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%234b5563'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 1rem center",
              backgroundSize: "1rem",
              paddingRight: "3rem",
            }}
          >
            <option value={0}>All Regions</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {[
          {
            icon: totalTripsIcon,
            label: "Total Trips Today",
            value: formatNumber(stats.totalTripsToday),
            trend: formatTrend(stats.vsYesterday.totalTripsToday),
            suffix: null,
            targetPage: "live-trips",
          },
          {
            icon: activeDriversIcon,
            label: "Active Drivers",
            value: formatNumber(stats.activeDrivers),
            trend: formatTrend(stats.vsYesterday.activeDrivers),
            suffix: null,
            targetPage: "drivers",
          },
          {
            icon: totalEarningsIcon,
            label: "Total Earnings",
            value: formatCurrency(stats.totalEarnings),
            trend: formatTrend(stats.vsYesterday.totalEarnings),
            suffix: "MAD",
            targetPage: "payment",
          },
          {
            icon: dailyBonusIcon,
            label: "Daily Bonus Earned",
            value: formatCurrency(stats.dailyBonusEarned),
            trend: formatTrend(stats.vsYesterday.dailyBonusEarned),
            suffix: "MAD",
            targetPage: "payment",
          },
        ].map((card) => {
          const isPending = pendingShortcutPage === card.targetPage;

          return (
            <button
              key={card.label}
              type="button"
              onClick={() => handleShortcutNavigate(card.targetPage)}
              style={{
                backgroundColor: isPending ? "#38AC57" : "white",
                color: isPending ? "white" : "var(--text-primary)",
                padding: "1.5rem",
                borderRadius: "1.5rem",
                position: "relative",
                overflow: "hidden",
                boxShadow: isPending
                  ? "0 10px 24px rgba(56, 172, 87, 0.3)"
                  : "var(--shadow-sm)",
                border: isPending ? "2px solid #38AC57" : "1px solid #f1f5f9",
                textAlign: "left",
                cursor: "pointer",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.transform = "translateY(-2px)";
                event.currentTarget.style.boxShadow = isPending
                  ? "0 10px 24px rgba(56, 172, 87, 0.3)"
                  : "0 10px 15px -3px rgba(0,0,0,0.08)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.transform = "translateY(0)";
                event.currentTarget.style.boxShadow = isPending
                  ? "0 10px 24px rgba(56, 172, 87, 0.3)"
                  : "var(--shadow-sm)";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "0.5rem",
                }}
              >
                <img
                  src={card.icon}
                  alt={card.label}
                  style={{
                    width: "40px",
                    height: "auto",
                    filter: isPending ? "brightness(0) invert(1)" : "none",
                  }}
                />
                <span
                  className="stat-label-text"
                  style={{ fontSize: "1rem", fontWeight: "700" }}
                >
                  {card.label}
                </span>
                <span
                  style={{
                    fontSize: "0.875rem",
                    color: isPending ? "white" : "#38AC57",
                    fontWeight: "bold",
                    marginLeft: "auto",
                  }}
                >
                  {card.trend}
                </span>
              </div>
              <div
                className="stat-value"
                style={{
                  fontSize: "3rem",
                  fontWeight: "800",
                  margin: "0.5rem 0",
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.5rem",
                }}
              >
                {card.value}
                {card.suffix ? (
                  <span
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "600",
                      color: isPending ? "white" : "var(--text-secondary)",
                    }}
                  >
                    {card.suffix}
                  </span>
                ) : null}
              </div>
              <div
                style={{
                  fontSize: "0.875rem",
                  textDecoration: "underline",
                  color: isPending
                    ? "rgba(255, 255, 255, 0.9)"
                    : "var(--text-secondary)",
                  opacity: isPending ? 1 : 0.8,
                }}
              >
                Vs Yesterday
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: "1rem",
                  right: "1rem",
                  backgroundColor: isPending ? "white" : "var(--primary-color)",
                  borderRadius: "50%",
                  width: "44px",
                  height: "44px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isPending ? "var(--primary-color)" : "white",
                }}
              >
                <ArrowUpRight size={24} />
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
        <div
          className="card"
          style={{
            flex: "2 1 600px",
            borderRadius: "1.5rem",
            border: "1px solid #f1f5f9",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h3
              style={{
                fontSize: "1.5rem",
                fontWeight: "800",
                color: "#111827",
              }}
            >
              Total Trips
            </h3>
            <select
              value={tripsChartPeriod}
              onChange={(event) =>
                setTripsChartPeriod(event.target.value as Period)
              }
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.75rem",
                border: "1px solid #e5e7eb",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div style={{ height: "350px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tripsChart.data}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "1rem",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                  }}
                  formatter={(
                    value: number | string | undefined,
                    name: string | number | undefined,
                  ) => [
                    formatNumber(Number(value ?? 0)),
                    String(name ?? "").replace("_", " "),
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="CAR_RIDES"
                  stackId="1"
                  stroke="#38AC57"
                  fill="#38AC57"
                  fillOpacity={0.8}
                />
                <Area
                  type="monotone"
                  dataKey="MOTORCYCLE"
                  stackId="1"
                  stroke="#eab308"
                  fill="#eab308"
                  fillOpacity={0.45}
                />
                <Area
                  type="monotone"
                  dataKey="TAXI"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          className="card"
          style={{
            flex: "1 1 350px",
            borderRadius: "1.5rem",
            border: "1px solid #f1f5f9",
            maxHeight: "420px",
            overflowY: "auto",
          }}
        >
          <h3
            style={{
              fontSize: "1.5rem",
              fontWeight: "800",
              color: "#111827",
              marginBottom: "1.5rem",
            }}
          >
            Top Regions Performance
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {topRegions.map((region) => (
              <div
                key={region.regionId || region.regionName}
                style={{
                  padding: "1.25rem",
                  backgroundColor: "white",
                  borderRadius: "1rem",
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "700",
                      color: "#111827",
                      fontSize: "1rem",
                    }}
                  >
                    {region.regionName}
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      backgroundColor:
                        region.growthPercent < 0 ? "#fee2e2" : "#eef7f0",
                      color: region.growthPercent < 0 ? "#ef4444" : "#2d8a46",
                      padding: "0.2rem 0.6rem",
                      borderRadius: "1rem",
                      fontWeight: "bold",
                    }}
                  >
                    {formatTrend(region.growthPercent)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.875rem",
                    color: "#6b7280",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <img
                      src={increaseIcon}
                      alt="trips"
                      style={{
                        width: "16px",
                        height: "16px",
                        imageRendering: "auto",
                      }}
                    />{" "}
                    {formatNumber(region.trips)} trips
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <img
                      src={driversRegionIcon}
                      alt="drivers"
                      style={{
                        width: "16px",
                        height: "16px",
                        imageRendering: "auto",
                      }}
                    />{" "}
                    {formatNumber(region.activeDrivers)} drivers
                  </span>
                </div>
              </div>
            ))}
            {topRegions.length === 0 ? (
              <div style={{ color: "#6b7280", fontSize: "0.95rem" }}>
                No region performance data available.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
        <div
          className="card"
          style={{
            flex: "1 1 400px",
            borderRadius: "1.5rem",
            border: "1px solid #f1f5f9",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h3
              style={{
                fontSize: "1.5rem",
                fontWeight: "800",
                color: "#111827",
              }}
            >
              Total Trips Performance
            </h3>
            <select
              value={tripsByRegionPeriod}
              onChange={(event) =>
                setTripsByRegionPeriod(event.target.value as Period)
              }
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "1.5rem",
                border: "1px solid #e5e7eb",
                backgroundColor: "white",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div
            style={{
              height: "350px",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={140}
                  dataKey="value"
                  labelLine={false}
                  label={({
                    cx,
                    cy,
                    midAngle,
                    innerRadius,
                    outerRadius,
                    value,
                  }: {
                    cx?: number;
                    cy?: number;
                    midAngle?: number;
                    innerRadius?: number;
                    outerRadius?: number;
                    value?: number | string;
                  }) => {
                    if (
                      typeof cx !== "number" ||
                      typeof cy !== "number" ||
                      typeof midAngle !== "number" ||
                      typeof innerRadius !== "number" ||
                      typeof outerRadius !== "number"
                    ) {
                      return null;
                    }

                    const radius =
                      innerRadius + (outerRadius - innerRadius) * 0.75;
                    const x =
                      cx + radius * Math.cos((-midAngle * Math.PI) / 180);
                    const y =
                      cy + radius * Math.sin((-midAngle * Math.PI) / 180);

                    return (
                      <text
                        x={x}
                        y={y}
                        fill="white"
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{
                          fontWeight: "800",
                          fontSize: "14px",
                          pointerEvents: "none",
                        }}
                      >
                        {`${value ?? 0}%`}
                      </text>
                    );
                  }}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number | string | undefined) => [
                    `${Number(value ?? 0)}%`,
                    "Share",
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div
            className="pie-legend-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "1rem",
              marginTop: "1.5rem",
            }}
          >
            {pieData.map((entry) => (
              <div
                key={entry.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: entry.color,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      color: "#4b5563",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {entry.name}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#2d8a46",
                    marginLeft: "1rem",
                  }}
                >
                  {entry.count}
                </span>
              </div>
            ))}
          </div>
          {pieData.length === 0 ? (
            <div
              style={{
                color: "#6b7280",
                fontSize: "0.95rem",
                marginTop: "1rem",
              }}
            >
              No trip distribution data available.
            </div>
          ) : null}
        </div>

        <div
          className="card"
          style={{
            flex: "2 1 600px",
            borderRadius: "1.5rem",
            border: "1px solid #f1f5f9",
            maxHeight: "550px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginBottom: "1.5rem",
              backgroundColor: "#f1f5f9",
              padding: "0.4rem",
              borderRadius: "2rem",
              width: "fit-content",
            }}
          >
            <button
              onClick={() => setActiveTab("driver")}
              style={{
                backgroundColor:
                  activeTab === "driver" ? "#38AC57" : "transparent",
                color: activeTab === "driver" ? "white" : "#64748b",
                border: "none",
                padding: "0.6rem 2.5rem",
                borderRadius: "1.5rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Top Drivers
            </button>
            <button
              onClick={() => setActiveTab("passenger")}
              style={{
                backgroundColor:
                  activeTab === "passenger" ? "#38AC57" : "transparent",
                color: activeTab === "passenger" ? "white" : "#64748b",
                border: "none",
                padding: "0.6rem 2.5rem",
                borderRadius: "1.5rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Top Riders
            </button>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {activePerformers.map((performer) => (
              <div
                key={`${activeTab}-${performer.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1rem",
                  backgroundColor: "white",
                  border: "1px solid #f1f5f9",
                  borderRadius: "1.25rem",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1.25rem",
                  }}
                >
                  <div style={{ position: "relative" }}>
                    <UserAvatar
                      src={resolveImageUrl(performer.imageUrl)}
                      name={performer.name}
                      rating={Number(performer.rating)}
                      size={64}
                      showBadge={true}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: "800",
                        fontSize: "1.125rem",
                        color: "#111827",
                      }}
                    >
                      {performer.name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.875rem",
                        color: "#6b7280",
                        marginTop: "0.2rem",
                      }}
                    >
                      {performer.city} • {performer.rating.toFixed(1)} rating
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    • {formatNumber(performer.totalTrips)} Trips
                  </div>
                </div>
              </div>
            ))}
            {activePerformers.length === 0 ? (
              <div style={{ color: "#6b7280", fontSize: "0.95rem" }}>
                No top performers available.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
