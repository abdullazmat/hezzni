import { useState, useRef, useEffect } from "react";
import {
  Search,
  Eye,
  ArrowLeft,
  ChevronDown,
  ArrowUpRight,
  Check,
} from "lucide-react";
import { PageLoader } from "../components/PageLoader";
import {
  getArchiveStatsApi,
  getArchiveTripsApi,
  getArchiveTripDetailApi,
  getArchiveCitiesApi,
  getArchiveServiceTypesApi,
  resolveApiAssetUrl,
  type ArchiveTripsStats,
  type ArchiveTripRow,
  type ArchiveTripDetail,
  type LiveTripsFilterOption,
  type LiveTripsServiceTypeOption,
} from "../services/api";

// Specialized Icons
import totalArchivedIcon from "../assets/icons/Total Archived.png";
import completedIcon from "../assets/icons/completed.png";
import cancelledIcon from "../assets/icons/Cancelled Archive.png";
import disputedIcon from "../assets/icons/Disputed.png";
import revenueIcon from "../assets/icons/Revenue.png";
import commissionIcon from "../assets/icons/comission.png";

// Vehicle Icons
import carIcon from "../assets/icons/car.png";
import taxiIcon from "../assets/icons/taxi.png";
import bikeIcon from "../assets/icons/bike.png";
import pickupIcon from "../assets/icons/pickup.png";
import destinationIcon from "../assets/icons/destination.png";

// Components
import { UserAvatar } from "../components/UserAvatar";

// Payment Icons
import visaIcon from "../assets/icons/visa.png";
import mastercardIcon from "../assets/icons/mastercard.png";
import cashIcon from "../assets/icons/cash.png";

type PeriodValue = "today" | "yesterday" | "last_week" | "last_month";

const EMPTY_STATS: ArchiveTripsStats = {
  totalArchived: 0,
  completed: 0,
  cancelled: 0,
  disputed: 0,
  revenue: 0,
  commission: 0,
};

const FALLBACK_STATS: ArchiveTripsStats = {
  totalArchived: 74,
  completed: 58,
  cancelled: 11,
  disputed: 5,
  revenue: 9280.5,
  commission: 15,
};

const FALLBACK_TRIPS: ArchiveTripRow[] = [
  {
    id: "ARC-4102",
    service: "Car Ride",
    rider: {
      name: "Rania T.",
      id: "R-820",
      rating: 4.8,
      img: null,
      city: "Casablanca",
    },
    driver: {
      name: "Samir B.",
      id: "D-301",
      rating: 4.9,
      img: null,
    },
    vehicle: "Car",
    time: "10 Mar 2026, 14:20",
    duration: "24 min",
    status: "Completed",
    fare: "168.00",
    paymentMethod: "visa",
    archivedAt: "2026-03-10T14:50:00.000Z",
    archiveReason: "Completed and archived",
  },
  {
    id: "ARC-4103",
    service: "Taxi",
    rider: {
      name: "Imane S.",
      id: "R-821",
      rating: 4.5,
      img: null,
      city: "Rabat",
    },
    driver: {
      name: "Mouad H.",
      id: "D-302",
      rating: 4.6,
      img: null,
    },
    vehicle: "Taxi",
    time: "11 Mar 2026, 09:10",
    duration: "13 min",
    status: "Cancelled",
    fare: "0.00",
    paymentMethod: "cash",
    archivedAt: "2026-03-11T09:35:00.000Z",
    archiveReason: "Rider cancelled after driver assignment",
  },
  {
    id: "ARC-4104",
    service: "Motorcycle",
    rider: {
      name: "Nora A.",
      id: "R-822",
      rating: 4.7,
      img: null,
      city: "Marrakech",
    },
    driver: {
      name: "Adil K.",
      id: "D-303",
      rating: 4.7,
      img: null,
    },
    vehicle: "Motorcycle",
    time: "12 Mar 2026, 18:40",
    duration: "19 min",
    status: "Disputed",
    fare: "89.00",
    paymentMethod: "mastercard",
    archivedAt: "2026-03-12T19:10:00.000Z",
    archiveReason: "Fare dispute opened by rider",
  },
];

const FALLBACK_CITIES: LiveTripsFilterOption[] = [
  { id: 1, name: "Casablanca" },
  { id: 2, name: "Rabat" },
  { id: 3, name: "Marrakech" },
];

const FALLBACK_SERVICE_TYPES: LiveTripsServiceTypeOption[] = [
  { id: 1, name: "CAR_RIDES", displayName: "Car Ride" },
  { id: 2, name: "MOTORCYCLE", displayName: "Motorcycle" },
  { id: 3, name: "TAXI", displayName: "Taxi" },
];

export const ArchiveTrips = () => {
  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [serviceFilter, setServiceFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState<PeriodValue | "All">("All");
  const [activeStat, setActiveStat] = useState<string | null>(null);

  // API Data States
  const [stats, setStats] = useState<ArchiveTripsStats>(EMPTY_STATS);
  const [trips, setTrips] = useState<ArchiveTripRow[]>([]);
  const [cities, setCities] = useState<LiveTripsFilterOption[]>([]);
  const [serviceTypes, setServiceTypes] = useState<
    LiveTripsServiceTypeOption[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [selectedTripDetail, setSelectedTripDetail] =
    useState<ArchiveTripDetail | null>(null);
  const [previewTripId, setPreviewTripId] = useState<string | null>(null);

  // Load filter options on mount
  useEffect(() => {
    let cancelled = false;
    const loadFilters = async () => {
      const [citiesRes, serviceTypesRes] = await Promise.all([
        getArchiveCitiesApi(),
        getArchiveServiceTypesApi(),
      ]);
      if (cancelled) return;
      if (citiesRes.ok) {
        setCities(citiesRes.data.length > 0 ? citiesRes.data : FALLBACK_CITIES);
      } else {
        setCities(FALLBACK_CITIES);
      }

      if (serviceTypesRes.ok) {
        setServiceTypes(
          serviceTypesRes.data.length > 0
            ? serviceTypesRes.data
            : FALLBACK_SERVICE_TYPES,
        );
      } else {
        setServiceTypes(FALLBACK_SERVICE_TYPES);
      }
    };
    void loadFilters();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load trips & stats when filters change
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      const query: Record<string, string | number | undefined> = {};
      if (periodFilter !== "All") query.period = periodFilter;
      if (cityFilter !== "All") {
        const city = cities.find((c) => c.name === cityFilter);
        if (city) query.cityId = city.id;
      }
      if (serviceFilter !== "All") {
        const st = serviceTypes.find((s) => s.displayName === serviceFilter);
        if (st) query.serviceTypeId = st.id;
      }
      if (statusFilter !== "All") {
        const statusMap: Record<string, string> = {
          Completed: "COMPLETED",
          Cancelled: "CANCELLED",
          Searching: "PENDING",
          Accepted: "ACCEPTED",
          In_progress: "IN_PROGRESS",
        };
        query.status = statusMap[statusFilter] || statusFilter;
      }
      if (searchTerm.trim()) query.search = searchTerm.trim();

      const [statsRes, tripsRes] = await Promise.all([
        getArchiveStatsApi(query as any),
        getArchiveTripsApi({ ...query, page: 1, limit: 100 } as any),
      ]);
      if (cancelled) return;

      const nextStats = statsRes.ok ? statsRes.data : EMPTY_STATS;
      const nextTrips = tripsRes.ok ? tripsRes.data.trips : [];
      const shouldUseFallback =
        nextTrips.length === 0 && isEmptyArchiveStats(nextStats);

      if (shouldUseFallback) {
        setStats(FALLBACK_STATS);
        setTrips(FALLBACK_TRIPS);
      } else {
        setStats(nextStats);
        setTrips(nextTrips);
      }

      setIsLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    periodFilter,
    cityFilter,
    serviceFilter,
    statusFilter,
    searchTerm,
    cities,
    serviceTypes,
  ]);

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return { bg: "#eef7f0", text: "#2d8a46" };
      case "cancelled":
        return { bg: "#fee2e2", text: "#dc2626" };
      case "in_progress":
      case "started":
        return { bg: "#f3e8ff", text: "#7e22ce" };
      case "arrived":
        return { bg: "#eef7f0", text: "#2d8a46" }; // Assuming green for arrived
      case "accepted":
        return { bg: "#eef7f0", text: "#2d8a46" }; // Assuming green for accepted
      case "arriving":
      case "searching":
        return { bg: "#eff6ff", text: "#1e40af" };
      default:
        return { bg: "#f3f4f6", text: "#374151" };
    }
  };

  const getPaymentIcon = (method: string) => {
    const m = (method || "").toLowerCase();
    if (m === "visa")
      return (
        <img
          src={visaIcon}
          alt="VISA"
          style={{ height: "14px", width: "auto" }}
        />
      );
    if (m === "mastercard")
      return (
        <img
          src={mastercardIcon}
          alt="Mastercard"
          style={{ height: "14px", width: "auto" }}
        />
      );
    return (
      <img
        src={cashIcon}
        alt="Cash"
        style={{ height: "14px", width: "auto" }}
      />
    );
  };

  const resolveImageUrl = (url: string | null) => {
    if (!url) return "";
    return resolveApiAssetUrl(url);
  };

  const formatTripDateTime = (value: string | null) => {
    if (!value) return "-";
    // Standardize: remove " at " which can break some JS Date parsers
    const normalized = value.replace(/\s+at\s+/i, " ");
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getVehicleIcon = (vehicleType: string) => {
    const v = (vehicleType || "").toLowerCase();
    if (v.includes("car") || v.includes("ride")) return carIcon;
    if (v.includes("taxi")) return taxiIcon;
    if (v.includes("moto") || v.includes("bike") || v.includes("motorcycle"))
      return bikeIcon;
    return carIcon;
  };

  const handlePreview = async (trip: ArchiveTripRow) => {
    setPreviewTripId(trip.id);
    const res = await getArchiveTripDetailApi(trip.id);
    setPreviewTripId(null);
    if (res.ok) {
      setSelectedTripDetail(res.data);
    } else {
      setSelectedTripDetail(buildArchiveDetailFromRow(trip));
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
                .at-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(6, 1fr);
                    gap: 1rem;
                }
                .at-filters-container {
                    display: flex;
                    gap: 1rem;
                    flex-wrap: wrap;
                }
                .at-table-container {
                    overflow-x: auto;
                    margin: 0 -1rem;
                    padding: 0 1rem;
                }
                .at-modal-card {
                    width: 900px;
                    max-width: 95%;
                    max-height: 90vh;
                    overflow-y: auto;
                    padding: 2.5rem;
                    border-radius: 1.5rem;
                    position: relative;
                    background-color: #ffffff;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    z-index: 9999;
                }
                .at-info-row {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1.5rem;
                }
                .at-flex-responsive {
                    display: flex;
                    gap: 1.5rem;
                    align-items: flex-start;
                }
                .at-info-indent {
                    padding-left: calc(64px + 1.5rem);
                }
                .at-total-field {
                    text-align: right;
                }
                .at-modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 1rem;
                }

                @media (max-width: 1400px) {
                    .at-stats-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }

                @media (max-width: 992px) {
                    .at-info-row {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 768px) {
                    .at-stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    .at-filters-container {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .at-filters-container > div {
                        width: 100% !important;
                    }
                    .at-flex-responsive {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    .at-flex-responsive > div:last-child {
                        width: 100%;
                    }
                    .at-info-indent {
                        padding-left: 0 !important;
                    }
                    .at-info-row {
                        grid-template-columns: 1fr;
                    }
                    .at-total-field {
                        text-align: left !important;
                    }
                    .at-modal-card {
                        padding: 1.5rem;
                    }
                    .at-modal-footer button {
                        width: 100%;
                    }
                    .at-payment-grid {
                        grid-template-columns: 1fr !important;
                        text-align: left !important;
                    }
                    .at-payment-grid > div {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 0.5rem 0;
                        border-bottom: 1px solid #f3f4f6;
                    }
                    .at-payment-grid > div:last-child {
                        border-bottom: none;
                    }
                }

                @media (max-width: 480px) {
                    .at-stats-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `,
        }}
      />
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: "bold",
            margin: "0 0 0.5rem 0",
          }}
        >
          Archive Trips
        </h1>
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>
          Monitor all trip types across Hezzni's transportation services
        </p>
      </div>

      {/* Stats Cards */}
      <div className="at-stats-grid">
        {(
          [
            {
              id: "total",
              label: "Total Archived",
              value: String(stats.totalArchived),
              icon: totalArchivedIcon,
            },
            {
              id: "completed",
              label: "Completed",
              value: String(stats.completed),
              icon: completedIcon,
            },
            {
              id: "cancelled",
              label: "Cancelled",
              value: String(stats.cancelled),
              icon: cancelledIcon,
            },
            {
              id: "disputed",
              label: "Disputed",
              value: String(stats.disputed),
              icon: disputedIcon,
            },
            {
              id: "revenue",
              label: "Revenue",
              value: String(stats.revenue.toFixed(2)),
              icon: revenueIcon,
              subValue: "MAD",
            },
            {
              id: "commission",
              label: "Commission",
              value: `${stats.commission}%`,
              icon: commissionIcon,
            },
          ] as const
        ).map((stat) => {
          const isActive = activeStat === stat.id;
          return (
            <div
              key={stat.id}
              onClick={() => setActiveStat(isActive ? null : stat.id)}
              style={{
                padding: "1.5rem",
                borderRadius: "1.5rem",
                backgroundColor: isActive ? "#38AC57" : "white",
                color: isActive ? "white" : "var(--text-primary)",
                position: "relative",
                boxShadow: isActive
                  ? "0 10px 15px -3px rgba(56, 172, 87, 0.4)"
                  : "0 1px 3px rgba(0,0,0,0.05)",
                cursor: "pointer",
                transition: "all 0.2s",
                transform: isActive ? "translateY(-2px)" : "none",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                height: "140px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
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
                <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>
                  {stat.label}
                </span>
              </div>
              <div>
                <div
                  style={{
                    fontSize: stat.id === "revenue" ? "2.1rem" : "2.5rem",
                    fontWeight: "bold",
                  }}
                >
                  {stat.value}
                </div>
                {"subValue" in stat && stat.subValue && (
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: isActive ? "white" : "#6b7280",
                      marginTop: "-0.2rem",
                    }}
                  >
                    {stat.subValue}
                  </div>
                )}
              </div>
              <div
                style={{
                  alignSelf: "flex-end",
                  backgroundColor: isActive ? "white" : "#38AC57",
                  borderRadius: "50%",
                  padding: "0.4rem",
                  color: isActive ? "#38AC57" : "white",
                  display: "flex",
                }}
              >
                <ArrowUpRight size={16} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="at-filters-container">
        <div style={{ position: "relative", width: "300px" }}>
          <Search
            size={18}
            color="#9ca3af"
            style={{
              position: "absolute",
              left: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
            }}
          />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "0.7rem 1rem 0.7rem 2.8rem",
              borderRadius: "2rem",
              border: "1px solid #e5e7eb",
              outline: "none",
            }}
          />
        </div>
        <Dropdown
          label="Status"
          value={statusFilter}
          options={[
            "All",
            "Completed",
            "Cancelled",
            "Searching",
            "Accepted",
            "In_progress",
          ]}
          onChange={setStatusFilter}
        />
        <Dropdown
          label="Service Type"
          value={serviceFilter}
          options={["All", ...serviceTypes.map((s) => s.displayName)]}
          onChange={setServiceFilter}
        />
        <Dropdown
          label="City"
          value={cityFilter}
          options={["All", ...cities.map((c) => c.name)]}
          onChange={setCityFilter}
        />
        <Dropdown
          label="Periods"
          value={periodFilter}
          options={["All", "today", "yesterday", "last_week", "last_month"]}
          onChange={(v) => setPeriodFilter(v as PeriodValue | "All")}
        />
      </div>

      {/* Table */}
      <div className="card at-table-container" style={{ padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                backgroundColor: "#38AC57",
                color: "white",
                textAlign: "left",
              }}
            >
              <th
                style={{
                  padding: "1rem",
                  fontWeight: "600",
                  borderRadius: "1rem 0 0 0",
                }}
              >
                Trip ID
              </th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Service</th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Rider</th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Driver</th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Vehicle</th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Time</th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Status</th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Fare</th>
              <th
                style={{
                  padding: "1rem",
                  fontWeight: "600",
                  borderRadius: "0 1rem 0 0",
                }}
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {trips.map((trip, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: "1px solid #f3f4f6",
                  backgroundColor: "white",
                }}
              >
                <td style={{ padding: "1rem", fontWeight: "600" }}>
                  {trip.id}
                </td>
                <td style={{ padding: "1rem" }}>
                  <span
                    style={{
                      backgroundColor: "#eef7f0",
                      color: "#2d8a46",
                      padding: "0.3rem 0.8rem",
                      borderRadius: "1rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    {trip.service}
                  </span>
                </td>
                <td style={{ padding: "0.75rem 1rem" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                  >
                    <UserAvatar
                      src={resolveImageUrl(trip.rider.img)}
                      name={trip.rider.name}
                      rating={trip.rider.rating}
                      size={48}
                    />
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1px",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "700",
                          fontSize: "0.95rem",
                          color: "#111827",
                        }}
                      >
                        {trip.rider.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "#9ca3af",
                          fontWeight: "500",
                        }}
                      >
                        {trip.rider.id}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "0.75rem 1rem" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                  >
                    <UserAvatar
                      src={resolveImageUrl(trip.driver.img)}
                      name={trip.driver.name}
                      rating={trip.driver.rating}
                      size={48}
                    />
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1px",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "700",
                          fontSize: "0.95rem",
                          color: "#111827",
                        }}
                      >
                        {trip.driver.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "#9ca3af",
                          fontWeight: "500",
                        }}
                      >
                        {trip.driver.id}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "1rem" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontWeight: "500",
                    }}
                  >
                    <img
                      src={getVehicleIcon(trip.vehicle)}
                      alt={trip.vehicle}
                      style={{ height: "24px", width: "auto" }}
                    />{" "}
                    {trip.vehicle}
                  </div>
                </td>
                <td style={{ padding: "1rem" }}>
                  <div style={{ fontWeight: "600" }}>{trip.time}</div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                    {trip.duration}
                  </div>
                </td>
                <td style={{ padding: "1rem" }}>
                  <span
                    style={{
                      ...getStatusStyle(trip.status),
                      padding: "0.3rem 0.8rem",
                      borderRadius: "0.3rem",
                      fontSize: "0.85rem",
                      fontWeight: "500",
                    }}
                  >
                    {trip.status}
                  </span>
                </td>
                <td style={{ padding: "1rem" }}>
                  <div style={{ fontWeight: "600" }}>{trip.fare}</div>
                  <div style={{ marginTop: "0.2rem" }}>
                    {getPaymentIcon(trip.paymentMethod)}
                  </div>
                </td>
                <td style={{ padding: "1rem" }}>
                  <button
                    onClick={() => handlePreview(trip)}
                    disabled={previewTripId === trip.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      padding: "0.4rem 0.8rem",
                      borderRadius: "2rem",
                      border: "1px solid #e5e7eb",
                      backgroundColor: "white",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      opacity: previewTripId === trip.id ? 0.6 : 1,
                    }}
                  >
                    <Eye size={14} />{" "}
                    {previewTripId === trip.id ? "..." : "Preview"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedTripDetail && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div className="at-modal-card">
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <button
                onClick={() => setSelectedTripDetail(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  color: "black",
                }}
              >
                <ArrowLeft size={24} strokeWidth={2.5} />
              </button>
              <div>
                <h2
                  style={{ fontSize: "1.4rem", fontWeight: "bold", margin: 0 }}
                >
                  Archived Trip Details - {selectedTripDetail.tripInfo.id}
                </h2>
                <p style={{ color: "#6b7280", margin: 0, fontSize: "0.85rem" }}>
                  Information about this service assignment
                </p>
              </div>
            </div>

            {/* Status Bar */}
            <div
              style={{
                backgroundColor: "white",
                padding: "1rem 1.5rem",
                borderRadius: "1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
                marginBottom: "1.5rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                border: "1px solid #f3f4f6",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    fontWeight: "500",
                  }}
                >
                  Start Time
                </div>
                <div style={{ fontWeight: "bold", fontSize: "1rem" }}>
                  {formatTripDateTime(selectedTripDetail.tripInfo.startTime)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    fontWeight: "500",
                  }}
                >
                  End Time
                </div>
                <div style={{ fontWeight: "bold", fontSize: "1rem" }}>
                  {formatTripDateTime(selectedTripDetail.tripInfo.endTime)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    fontWeight: "500",
                  }}
                >
                  Distance
                </div>
                <div style={{ fontWeight: "bold", fontSize: "1rem" }}>
                  {selectedTripDetail.tripInfo.distance || "-"}
                </div>
              </div>
              <span
                style={{
                  ...getStatusStyle(selectedTripDetail.tripInfo.status),
                  padding: "0.4rem 1rem",
                  borderRadius: "0.5rem",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                }}
              >
                {selectedTripDetail.tripInfo.status}
              </span>
            </div>

            {/* Passenger Information */}
            <div style={{ marginBottom: "1.5rem" }}>
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                  marginBottom: "0.75rem",
                }}
              >
                Passenger Information
              </h3>
              <div
                style={{
                  backgroundColor: "white",
                  padding: "1.5rem",
                  borderRadius: "1rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  border: "1px solid #f3f4f6",
                }}
              >
                <div
                  className="at-flex-responsive"
                  style={{ marginBottom: "1.5rem" }}
                >
                  <UserAvatar
                    src={resolveImageUrl(selectedTripDetail.passenger.imageUrl)}
                    name={selectedTripDetail.passenger.fullName}
                    rating={selectedTripDetail.passenger.rating ?? 0}
                    size={64}
                  />
                  <div className="at-info-row" style={{ flex: 1 }}>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                        Full Name
                      </div>
                      <div style={{ fontWeight: "bold", fontSize: "0.95rem" }}>
                        {selectedTripDetail.passenger.fullName}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                        Customer ID
                      </div>
                      <div style={{ fontWeight: "bold", fontSize: "0.95rem" }}>
                        {selectedTripDetail.passenger.customerId}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#9ca3af",
                          marginBottom: "0.2rem",
                        }}
                      >
                        Category
                      </div>
                      <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                        {selectedTripDetail.passenger.category}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#9ca3af",
                          marginBottom: "0.2rem",
                        }}
                      >
                        Gender
                      </div>
                      <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                        {selectedTripDetail.passenger.gender
                          ? `♂ ${selectedTripDetail.passenger.gender}`
                          : "-"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="at-info-row at-info-indent">
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Email
                    </div>
                    <div style={{ fontWeight: "600", fontSize: "0.9rem" }}>
                      {selectedTripDetail.passenger.email || "-"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Phone
                    </div>
                    <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                      {selectedTripDetail.passenger.phone || "-"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        marginBottom: "0.2rem",
                      }}
                    >
                      City
                    </div>
                    <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                      {selectedTripDetail.passenger.city || "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Driver Information */}
            <div style={{ marginBottom: "1.5rem" }}>
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                  marginBottom: "0.75rem",
                }}
              >
                Driver Information
              </h3>
              <div
                style={{
                  backgroundColor: "white",
                  padding: "1.5rem",
                  borderRadius: "1rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  border: "1px solid #f3f4f6",
                }}
              >
                <div
                  className="at-flex-responsive"
                  style={{ marginBottom: "1.5rem" }}
                >
                  <UserAvatar
                    src={resolveImageUrl(selectedTripDetail.driver.imageUrl)}
                    name={selectedTripDetail.driver.fullName}
                    rating={selectedTripDetail.driver.rating}
                    size={64}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: "0.5rem" }}>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                        Full Name
                      </div>
                      <div style={{ fontWeight: "bold", fontSize: "0.95rem" }}>
                        {selectedTripDetail.driver.fullName}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="at-info-row">
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Vehicle Type
                    </div>
                    <div
                      style={{
                        fontWeight: "600",
                        fontSize: "0.95rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <img
                        src={getVehicleIcon(
                          selectedTripDetail.driver.vehicleType,
                        )}
                        alt={selectedTripDetail.driver.vehicleType}
                        style={{
                          height: "24px",
                          width: "auto",
                          objectFit: "contain",
                        }}
                      />{" "}
                      {selectedTripDetail.driver.vehicleType}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Phone
                    </div>
                    <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                      {selectedTripDetail.driver.phone || "-"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Email
                    </div>
                    <div style={{ fontWeight: "600", fontSize: "0.9rem" }}>
                      {selectedTripDetail.driver.email || "-"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Driver ID
                    </div>
                    <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                      {selectedTripDetail.driver.driverId}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        marginBottom: "0.2rem",
                      }}
                    >
                      City
                    </div>
                    <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                      {selectedTripDetail.driver.city || "-"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Gender
                    </div>
                    <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                      {selectedTripDetail.driver.gender
                        ? `♂ ${selectedTripDetail.driver.gender}`
                        : "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Information */}
            <div style={{ marginBottom: "1.5rem" }}>
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                  marginBottom: "0.75rem",
                }}
              >
                Vehicle Information
              </h3>
              <div
                style={{
                  backgroundColor: "white",
                  padding: "1.5rem",
                  borderRadius: "1rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  border: "1px solid #f3f4f6",
                }}
              >
                <div className="at-info-row">
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Driver ID
                    </div>
                    <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                      {selectedTripDetail.vehicle.driverId}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Vehicle Colour
                    </div>
                    <div
                      style={{
                        fontWeight: "600",
                        fontSize: "0.95rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: (
                            selectedTripDetail.vehicle.colour || "grey"
                          ).toLowerCase(),
                          border: "1px solid #e5e7eb",
                        }}
                      ></span>{" "}
                      {selectedTripDetail.vehicle.colour || "-"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Licence Plate Num
                    </div>
                    <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                      {selectedTripDetail.vehicle.licencePlate || "-"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Year
                    </div>
                    <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                      {selectedTripDetail.vehicle.year || "-"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Join Date
                    </div>
                    <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                      {selectedTripDetail.vehicle.joinDate || "-"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Make & Mode
                    </div>
                    <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                      {selectedTripDetail.vehicle.makeModel || "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Route Information */}
            <div
              style={{
                backgroundColor: "white",
                padding: "1.5rem",
                borderRadius: "1rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                border: "1px solid #f3f4f6",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.5rem",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <img
                    src={pickupIcon}
                    alt="pickup"
                    style={{
                      width: "24px",
                      height: "24px",
                      objectFit: "contain",
                    }}
                  />
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                      Pickup
                    </div>
                    <div style={{ fontWeight: "600", fontSize: "1rem" }}>
                      {selectedTripDetail.route.pickupAddress || "-"}
                    </div>
                  </div>
                </div>

                {/* Connector */}
                <div
                  style={{
                    position: "absolute",
                    left: "11px",
                    top: "24px",
                    bottom: "24px",
                    borderLeft: "2px dashed #e5e7eb",
                    zIndex: 0,
                  }}
                ></div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <img
                    src={destinationIcon}
                    alt="destination"
                    style={{
                      width: "24px",
                      height: "24px",
                      objectFit: "contain",
                    }}
                  />
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                      Destination
                    </div>
                    <div style={{ fontWeight: "600", fontSize: "1rem" }}>
                      {selectedTripDetail.route.dropoffAddress || "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div>
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                  marginBottom: "0.75rem",
                }}
              >
                Payment Information
              </h3>
              <div
                style={{
                  backgroundColor: "white",
                  padding: "1.5rem",
                  borderRadius: "1rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  border: "1px solid #f3f4f6",
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  className="at-flex-responsive"
                  style={{ marginBottom: "1.5rem", justifyContent: "center" }}
                >
                  <UserAvatar
                    src={resolveImageUrl(selectedTripDetail.driver.imageUrl)}
                    name={selectedTripDetail.driver.fullName}
                    rating={selectedTripDetail.driver.rating}
                    size={64}
                  />
                </div>
                <div className="at-info-row at-payment-grid">
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        marginBottom: "0.2rem",
                      }}
                    >
                      TVA
                    </div>
                    <div style={{ fontWeight: "bold" }}>
                      {selectedTripDetail.payment?.tva || "-"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Service fee
                    </div>
                    <div style={{ fontWeight: "bold" }}>
                      {selectedTripDetail.payment?.serviceFee || "-"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Payment Method
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      {getPaymentIcon(
                        selectedTripDetail.payment?.method || "cash",
                      )}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Discount
                    </div>
                    <div style={{ fontWeight: "bold" }}>
                      {selectedTripDetail.payment?.discount || "-"}
                    </div>
                  </div>
                  <div className="at-total-field">
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Total Amount
                    </div>
                    <div style={{ fontWeight: "bold" }}>
                      {selectedTripDetail.payment?.totalAmount || "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Archive Information */}
            <div style={{ marginBottom: "2rem" }}>
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                  marginBottom: "0.75rem",
                }}
              >
                Archive Information
              </h3>
              <div
                style={{
                  backgroundColor: "white",
                  padding: "1.5rem",
                  borderRadius: "1rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  border: "1px solid #f3f4f6",
                }}
              >
                <div className="at-info-row">
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Archived Date:
                    </div>
                    <div style={{ fontWeight: "600" }}>
                      {selectedTripDetail.archiveInfo.archivedAt || "-"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Archive Reason:
                    </div>
                    <div style={{ fontWeight: "600" }}>
                      {selectedTripDetail.archiveInfo.reason}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer / Download */}
            <div className="at-modal-footer">
              <button
                style={{
                  backgroundColor: "#38AC57",
                  color: "white",
                  border: "none",
                  padding: "1rem 3rem",
                  borderRadius: "2rem",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  width: "100%",
                }}
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function isEmptyArchiveStats(stats: ArchiveTripsStats) {
  return (
    stats.totalArchived === 0 &&
    stats.completed === 0 &&
    stats.cancelled === 0 &&
    stats.disputed === 0 &&
    stats.revenue === 0 &&
    stats.commission === 0
  );
}

function buildArchiveDetailFromRow(trip: ArchiveTripRow): ArchiveTripDetail {
  return {
    tripInfo: {
      id: trip.id,
      startTime: trip.time,
      endTime: null,
      distance: "—",
      status: trip.status,
    },
    passenger: {
      fullName: trip.rider.name,
      customerId: trip.rider.id,
      category: trip.service,
      gender: null,
      email: null,
      phone: null,
      city: trip.rider.city,
      imageUrl: trip.rider.img,
      rating: trip.rider.rating,
    },
    driver: {
      fullName: trip.driver.name,
      driverId: trip.driver.id,
      vehicleType: trip.vehicle,
      gender: null,
      email: null,
      phone: null,
      city: null,
      imageUrl: trip.driver.img,
      rating: trip.driver.rating,
    },
    vehicle: {
      driverId: trip.driver.id,
      colour: null,
      licencePlate: null,
      makeModel: trip.vehicle,
      year: null,
      joinDate: null,
    },
    route: {
      pickupAddress: "Demo pickup location",
      dropoffAddress: "Demo dropoff location",
    },
    payment: {
      method: trip.paymentMethod,
      totalAmount: trip.fare,
      tva: null,
      serviceFee: null,
      discount: null,
    },
    archiveInfo: {
      archivedAt: trip.archivedAt,
      reason: trip.archiveReason,
    },
  };
}

// Reusable Dropdown Component
interface DropdownProps {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
}

const Dropdown = ({ label, value, options, onChange }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "0.7rem 1.5rem",
          borderRadius: "2rem",
          border: "1px solid #e5e7eb",
          backgroundColor: "white",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.9rem",
          minWidth: "120px",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: value === "All" ? "#6b7280" : "black" }}>
          {value === "All" ? label : value}
        </span>
        <ChevronDown size={14} color="#9ca3af" />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "120%",
            left: 0,
            minWidth: "100%",
            width: "max-content",
            backgroundColor: "white",
            borderRadius: "1rem",
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            padding: "0.5rem",
            zIndex: 50,
            border: "1px solid #f3f4f6",
          }}
        >
          {options.map((opt) => (
            <div
              key={opt}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              style={{
                padding: "0.5rem 1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                borderRadius: "0.5rem",
                backgroundColor: value === opt ? "#eef7f0" : "transparent",
                color: value === opt ? "#2d8a46" : "inherit",
              }}
            >
              {opt}
              {value === opt && <Check size={14} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
