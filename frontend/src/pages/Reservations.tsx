import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search,
  Eye,
  ArrowLeft,
  ChevronDown,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { UserAvatar } from "../components/UserAvatar";
import {
  getReservationStatsApi,
  getReservationCitiesApi,
  getReservationServiceTypesApi,
  getReservationListApi,
  getReservationDetailApi,
  type ReservationItem,
  type ReservationStats,
  type LiveTripsFilterOption,
  type LiveTripsServiceTypeOption,
} from "../services/api";

// Specialized Icons
import totalReservationsIcon from "../assets/icons/Total Reservations.png";
import scheduledIcon from "../assets/icons/Scheduled.png";
import confirmedIcon from "../assets/icons/Confirmed.png";
import todaysBookingsIcon from "../assets/icons/Today's Bookings.png";
import bikeIcon from "../assets/icons/bike.png";
import carIcon from "../assets/icons/car.png";
import pickupIcon from "../assets/icons/pickup.png";
import destinationIcon from "../assets/icons/destination.png";
import taxiIcon from "../assets/icons/taxi.png";

// --- Types ---

type Reservation = ReservationItem;

// --- Icons & Helpers ---

const StatusBadge = ({ status }: { status: string }) => {
  let bg = "#e5e7eb";
  let color = "#374151";

  switch (status) {
    case "Scheduled":
      bg = "#dbeafe";
      color = "#1d4ed8";
      break; // Blue
    case "Accepted":
      bg = "#cffafe";
      color = "#0e7490";
      break; // Cyan
    case "Pending":
      bg = "#fef3c7";
      color = "#b45309";
      break; // Yellow
    case "Arriving":
      bg = "#e0f2fe";
      color = "#0369a1";
      break; // Light Blue
    case "Arrived":
      bg = "#eef7f0";
      color = "#38AC57";
      break; // Green
    case "Started":
      bg = "#f3e8ff";
      color = "#7e22ce";
      break; // Purple
    case "In_progress":
      bg = "#ede9fe";
      color = "#6d28d9";
      break; // Violet
    case "Completed":
      bg = "#eef7f0";
      color = "#38AC57";
      break; // Green
    case "Missed":
      bg = "#fee2e2";
      color = "#b91c1c";
      break; // Red
  }

  return (
    <span
      style={{
        backgroundColor: bg,
        color: color,
        padding: "0.25rem 0.75rem",
        borderRadius: "0.5rem",
        fontSize: "0.75rem",
        fontWeight: "600",
      }}
    >
      {status}
    </span>
  );
};

const ServiceBadge = ({ service }: { service: string }) => {
  let bg = "#f3f4f6";
  let color = "#374151";

  // Simple color logic based on screenshots
  if (service === "Airport") {
    bg = "#eef7f0";
    color = "#2d8a46";
  } else if (service === "Car Ride") {
    bg = "#eef7f0";
    color = "#2d8a46";
  } else if (service === "City to City") {
    bg = "#eef7f0";
    color = "#2d8a46";
  } else if (service === "Delivery" || service === "Deliverya") {
    bg = "#eef7f0";
    color = "#2d8a46";
  }

  return (
    <span
      style={{
        backgroundColor: bg,
        color: color,
        padding: "0.25rem 0.75rem",
        borderRadius: "0.5rem",
        fontSize: "0.75rem",
        fontWeight: "600",
      }}
    >
      {service}
    </span>
  );
};

// Reuse Dropdown
const Dropdown = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ position: "relative" }} ref={ref}>
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
          width: "100%",
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
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
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
              className="hover:bg-gray-50"
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

const getVehicleIcon = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes("motorcycle") || t.includes("bike"))
    return (
      <img
        src={bikeIcon}
        alt=""
        style={{ width: "24px", height: "24px", objectFit: "contain" }}
      />
    );
  if (t.includes("taxi"))
    return (
      <img
        src={taxiIcon}
        alt=""
        style={{ width: "24px", height: "24px", objectFit: "contain" }}
      />
    );
  return (
    <img
      src={carIcon}
      alt=""
      style={{ width: "24px", height: "24px", objectFit: "contain" }}
    />
  );
};

const normalizeReservation = (
  reservation: Partial<Reservation>,
): Reservation => ({
  ...reservation,
  id: reservation.id || "—",
  numericId: Number(reservation.numericId ?? 0),
  customer: {
    name: reservation.customer?.name || "Unknown",
    id: reservation.customer?.id || "—",
    avatar: reservation.customer?.avatar || null,
    rating: Number(reservation.customer?.rating ?? 0),
    phone: reservation.customer?.phone || "",
    email: reservation.customer?.email || "",
    city: reservation.customer?.city || "—",
    gender: reservation.customer?.gender || "Male",
    category: reservation.customer?.category || "",
  },
  driver: {
    name: reservation.driver?.name || "Unknown",
    id: reservation.driver?.id || "—",
    avatar: reservation.driver?.avatar || null,
    rating: Number(reservation.driver?.rating ?? 0),
    phone: reservation.driver?.phone || "",
    email: reservation.driver?.email || "",
    city: reservation.driver?.city || "—",
    gender: reservation.driver?.gender || "Male",
  },
  serviceType: reservation.serviceType || "—",
  vehicleType: reservation.vehicleType || "Car Ride",
  status: reservation.status || "Pending",
  fare: Number(reservation.fare ?? 0),
  currency: reservation.currency || "MAD",
  startTime: reservation.startTime || "—",
  endTime: reservation.endTime || "—",
  distance: reservation.distance || "—",
  scheduleDate: reservation.scheduleDate || "—",
  scheduleTime: reservation.scheduleTime || "—",
  pickup: reservation.pickup || "—",
  destination: reservation.destination || "—",
  paymentMethod: reservation.paymentMethod || "Cash",
  tva: reservation.tva || "1%",
  serviceFee: Number(reservation.serviceFee ?? 0),
  discount: reservation.discount || "0%",
  archivedDate: reservation.archivedDate || "",
  archiveReason: reservation.archiveReason || "",
  vehicle: {
    driverId: reservation.vehicle?.driverId || reservation.driver?.id || "—",
    colour: reservation.vehicle?.colour || "White",
    licencePlate: reservation.vehicle?.licencePlate || "—",
    makeModel: reservation.vehicle?.makeModel || "—",
    year: reservation.vehicle?.year || "—",
    joinDate: reservation.vehicle?.joinDate || "—",
  },
});

// --- Main Component ---

export const Reservations = () => {
  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [serviceFilter, setServiceFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("All");

  const [activeStat, setActiveStat] = useState<string | null>(null); // 'Total', 'Scheduled', 'Confirmed', 'Today'
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);

  // API data
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<ReservationStats>({
    totalReservations: 0,
    scheduled: 0,
    confirmed: 0,
    todaysBookings: 0,
  });
  const [cities, setCities] = useState<LiveTripsFilterOption[]>([]);
  const [serviceTypes, setServiceTypes] = useState<
    LiveTripsServiceTypeOption[]
  >([]);
  const [loading, setLoading] = useState(false);

  // Build status mapping for API calls
  const getStatusParam = useCallback(() => {
    if (statusFilter !== "All") {
      const statusMap: Record<string, string> = {
        Scheduled: "PENDING,MATCHED",
        Accepted: "ACCEPTED",
        Pending: "PENDING",
        Arriving: "MATCHED",
        Arrived: "MATCHED",
        Started: "IN_PROGRESS",
        In_progress: "IN_PROGRESS",
        Completed: "COMPLETED",
        Missed: "CANCELLED",
      };
      return statusMap[statusFilter] || undefined;
    }
    if (activeStat === "Scheduled") return "PENDING,MATCHED";
    if (activeStat === "Confirmed") return "ACCEPTED,COMPLETED";
    if (activeStat === "Today") return undefined;
    return undefined;
  }, [statusFilter, activeStat]);

  const getPeriodParam = useCallback(() => {
    if (activeStat === "Today") return "today";
    if (dateFilter === "Today") return "today";
    if (dateFilter === "Tomorrow") return undefined;
    if (dateFilter === "This Week") return "last_week";
    return undefined;
  }, [dateFilter, activeStat]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      const res = await getReservationStatsApi();
      if (res.ok) setStats(res.data);
    };
    fetchStats();
  }, []);

  // Fetch filter options
  useEffect(() => {
    const fetchFilters = async () => {
      const [citiesRes, serviceTypesRes] = await Promise.all([
        getReservationCitiesApi(),
        getReservationServiceTypesApi(),
      ]);
      if (citiesRes.ok) setCities(citiesRes.data);
      if (serviceTypesRes.ok) setServiceTypes(serviceTypesRes.data);
    };
    fetchFilters();
  }, []);

  // Fetch reservations list
  useEffect(() => {
    const fetchList = async () => {
      setLoading(true);
      try {
        const cityId =
          cityFilter !== "All"
            ? cities.find((c) => c.name === cityFilter)?.id
            : undefined;
        const serviceTypeId =
          serviceFilter !== "All"
            ? serviceTypes.find(
                (s) =>
                  s.displayName === serviceFilter || s.name === serviceFilter,
              )?.id
            : undefined;

        const res = await getReservationListApi({
          search: searchTerm || undefined,
          status: getStatusParam(),
          cityId,
          serviceTypeId,
          period: getPeriodParam(),
          limit: 50,
        });
        if (res.ok) {
          setReservations(res.data.reservations);
        } else {
          setReservations([]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, [
    searchTerm,
    statusFilter,
    serviceFilter,
    dateFilter,
    cityFilter,
    activeStat,
    cities,
    serviceTypes,
    getStatusParam,
    getPeriodParam,
  ]);

  // Handle preview click - fetch full detail
  const handlePreview = async (r: Reservation) => {
    try {
      const numericId = String(r.numericId || r.id.replace(/\D/g, ""));
      const res = await getReservationDetailApi(numericId);
      if (res.ok) {
        setSelectedReservation(normalizeReservation(res.data));
      } else {
        setSelectedReservation(normalizeReservation(r));
      }
    } catch {
      setSelectedReservation(normalizeReservation(r));
    }
  };

  const uniqueCities = ["All", ...cities.map((c) => c.name)];
  const uniqueServices = [
    "All",
    ...serviceTypes.map((s) => s.displayName || s.name),
  ];
  const uniqueStatuses = [
    "All",
    "Scheduled",
    "Accepted",
    "Pending",
    "Arriving",
    "Arrived",
    "Started",
    "In_progress",
    "Completed",
    "Missed",
  ];

  const filteredReservations = reservations;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <style>{`
                .res-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1.5rem;
                }
                .res-controls-container {
                    display: flex;
                    gap: 1rem;
                    flex-wrap: wrap;
                    align-items: center;
                }
                .res-table-container {
                    width: 100%;
                    overflow-x: auto;
                    border-radius: 1rem;
                    background: white;
                }
                .res-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0,0,0,0.5);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                    backdrop-filter: blur(4px);
                }
                .res-modal-content {
                    width: 900px;
                    max-width: 100%;
                    background-color: white;
                    border-radius: 2rem;
                    padding: 2.5rem;
                    max-height: 95vh;
                    overflow-y: auto;
                    position: relative;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                }
                .res-info-bar {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr) auto;
                    gap: 1rem;
                    padding: 1.25rem;
                    background-color: #f9fafb;
                    border: 1px solid #f3f4f6;
                    border-radius: 1.25rem;
                    align-items: flex-start;
                }
                .res-info-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1.5rem 0.5rem;
                }
                .res-vehicle-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 2rem 1rem;
                }
                .res-payment-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 1rem;
                    text-align: center;
                }
                .res-archive-grid {
                    display: grid;
                    grid-template-columns: 1fr 2fr;
                    gap: 2rem;
                }
                .res-flex-responsive {
                    display: flex;
                    gap: 2rem;
                    align-items: flex-start;
                }
                .res-footer {
                    display: flex;
                    justify-content: flex-end;
                }
                .res-loading-shell {
                  display: flex;
                  flex-direction: column;
                  gap: 0.75rem;
                  padding: 1rem;
                  background: white;
                }
                .res-loading-row {
                  display: grid;
                  grid-template-columns: 1.1fr 1.6fr 1.6fr 1.1fr 1.1fr 1fr 0.9fr 0.8fr;
                  gap: 1rem;
                  align-items: center;
                  padding: 1rem;
                  border-radius: 1rem;
                  background: linear-gradient(90deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%);
                  background-size: 200% 100%;
                  animation: resShimmer 1.4s ease-in-out infinite;
                }
                .res-loading-block {
                  height: 14px;
                  border-radius: 999px;
                  background: rgba(148, 163, 184, 0.18);
                }
                .res-empty-state {
                  padding: 2.5rem 1.5rem;
                  text-align: center;
                  color: #64748b;
                  background: white;
                }
                @keyframes resShimmer {
                  0% { background-position: 200% 0; }
                  100% { background-position: -200% 0; }
                }

                @media (max-width: 1024px) {
                    .res-stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    .res-info-bar {
                        grid-template-columns: repeat(3, 1fr);
                    }
                    .res-info-bar > div:last-child {
                        grid-column: span 3;
                        justify-content: center !important;
                        margin-top: 1rem;
                    }
                }

                @media (max-width: 768px) {
                    .res-modal-content {
                        padding: 1.5rem;
                    }
                    .res-controls-container {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .res-controls-container > div {
                        width: 100% !important;
                    }
                    .res-flex-responsive {
                        flex-direction: column;
                        text-align: left;
                        align-items: flex-start;
                    }
                    .res-info-grid, .res-vehicle-grid, .res-payment-grid, .res-archive-grid {
                        grid-template-columns: 1fr;
                        text-align: left;
                        gap: 1rem;
                    }
                    .res-info-bar {
                        grid-template-columns: 1fr;
                    }
                    .res-info-bar > div:last-child {
                        grid-column: span 1;
                    }
                    .res-payment-grid {
                        text-align: left;
                    }
                    .res-payment-grid > div {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding-bottom: 0.5rem;
                        border-bottom: 1px solid #f3f4f6;
                    }
                    .res-footer button {
                        width: 100%;
                    }
                    .res-route-exchange {
                        display: none !important;
                    }
                    .res-info-bar {
                        align-items: flex-start !important;
                    }
                }

                @media (max-width: 480px) {
                    .res-stats-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: "bold",
            margin: "0 0 0.5rem 0",
          }}
        >
          Reservations
        </h1>
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>
          Manage pre-scheduled rides and bookings
        </p>
      </div>

      {/* Stats Cards */}
      <div className="res-stats-grid">
        <div
          onClick={() => setActiveStat(null)}
          style={{
            padding: "1.5rem",
            borderRadius: "1.5rem",
            backgroundColor: activeStat === null ? "#38AC57" : "white",
            color: activeStat === null ? "white" : "black",
            position: "relative",
            boxShadow:
              activeStat === null
                ? "0 10px 15px -3px rgba(56, 172, 87, 0.4)"
                : "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "140px",
            cursor: "pointer",
            transition: "all 0.2s",
            transform: activeStat === null ? "translateY(-2px)" : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <img
              src={totalReservationsIcon}
              alt=""
              style={{ width: "40px", height: "40px", objectFit: "contain" }}
            />
            <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>
              Total Reservations
            </span>
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: "bold" }}>
            {String(stats.totalReservations).padStart(3, "0")}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: "1rem",
              right: "1rem",
              backgroundColor: activeStat === null ? "white" : "#38AC57",
              borderRadius: "50%",
              padding: "0.4rem",
              color: activeStat === null ? "#38AC57" : "white",
              display: "flex",
            }}
          >
            <ArrowUpRight size={16} />
          </div>
        </div>

        <div
          onClick={() => setActiveStat("Scheduled")}
          style={{
            padding: "1.5rem",
            borderRadius: "1.5rem",
            backgroundColor: activeStat === "Scheduled" ? "#38AC57" : "white",
            color: activeStat === "Scheduled" ? "white" : "black",
            position: "relative",
            boxShadow:
              activeStat === "Scheduled"
                ? "0 10px 15px -3px rgba(56, 172, 87, 0.4)"
                : "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "140px",
            cursor: "pointer",
            transition: "all 0.2s",
            transform: activeStat === "Scheduled" ? "translateY(-2px)" : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <img
              src={scheduledIcon}
              alt=""
              style={{ width: "40px", height: "40px", objectFit: "contain" }}
            />
            <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>
              Scheduled
            </span>
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: "bold" }}>
            {String(stats.scheduled).padStart(3, "0")}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: "1rem",
              right: "1rem",
              backgroundColor: activeStat === "Scheduled" ? "white" : "#111827",
              borderRadius: "50%",
              padding: "0.4rem",
              color: activeStat === "Scheduled" ? "#38AC57" : "white",
              display: "flex",
            }}
          >
            <ArrowUpRight size={16} />
          </div>
        </div>

        <div
          onClick={() => setActiveStat("Confirmed")}
          style={{
            padding: "1.5rem",
            borderRadius: "1.5rem",
            backgroundColor: activeStat === "Confirmed" ? "#38AC57" : "white",
            color: activeStat === "Confirmed" ? "white" : "black",
            position: "relative",
            boxShadow:
              activeStat === "Confirmed"
                ? "0 10px 15px -3px rgba(56, 172, 87, 0.4)"
                : "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "140px",
            cursor: "pointer",
            transition: "all 0.2s",
            transform: activeStat === "Confirmed" ? "translateY(-2px)" : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <img
              src={confirmedIcon}
              alt=""
              style={{ width: "40px", height: "40px", objectFit: "contain" }}
            />
            <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>
              Confirmed
            </span>
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: "bold" }}>
            {String(stats.confirmed).padStart(3, "0")}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: "1rem",
              right: "1rem",
              backgroundColor: activeStat === "Confirmed" ? "white" : "#38AC57",
              borderRadius: "50%",
              padding: "0.4rem",
              color: activeStat === "Confirmed" ? "#38AC57" : "white",
              display: "flex",
            }}
          >
            <ArrowUpRight size={16} />
          </div>
        </div>

        <div
          onClick={() => setActiveStat("Today")}
          style={{
            padding: "1.5rem",
            borderRadius: "1.5rem",
            backgroundColor: activeStat === "Today" ? "#38AC57" : "white",
            color: activeStat === "Today" ? "white" : "black",
            position: "relative",
            boxShadow:
              activeStat === "Today"
                ? "0 10px 15px -3px rgba(56, 172, 87, 0.4)"
                : "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "140px",
            cursor: "pointer",
            transition: "all 0.2s",
            transform: activeStat === "Today" ? "translateY(-2px)" : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <img
              src={todaysBookingsIcon}
              alt=""
              style={{ width: "40px", height: "40px", objectFit: "contain" }}
            />
            <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>
              Today's Bookings
            </span>
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: "bold" }}>
            {String(stats.todaysBookings).padStart(3, "0")}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: "1rem",
              right: "1rem",
              backgroundColor: activeStat === "Today" ? "white" : "#38AC57",
              borderRadius: "50%",
              padding: "0.4rem",
              color: activeStat === "Today" ? "#38AC57" : "white",
              display: "flex",
            }}
          >
            <ArrowUpRight size={16} />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="res-controls-container">
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
          options={uniqueStatuses}
          onChange={setStatusFilter}
        />
        <Dropdown
          label="Services"
          value={serviceFilter}
          options={uniqueServices}
          onChange={setServiceFilter}
        />
        <Dropdown
          label="Dates"
          value={dateFilter}
          options={["All", "Today", "Tomorrow", "This Week"]}
          onChange={setDateFilter}
        />
        <Dropdown
          label="City"
          value={cityFilter}
          options={uniqueCities}
          onChange={setCityFilter}
        />
      </div>

      {/* Table */}
      <div className="card res-table-container" style={{ padding: 0 }}>
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
                Reservation ID
              </th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Customer</th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Driver</th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Service</th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Vehicle</th>
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
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`loading-${idx}`}>
                  <td
                    colSpan={8}
                    style={{ padding: idx === 0 ? "1rem" : "0 1rem 1rem" }}
                  >
                    <div className="res-loading-row">
                      <div className="res-loading-block" />
                      <div className="res-loading-block" />
                      <div className="res-loading-block" />
                      <div className="res-loading-block" />
                      <div className="res-loading-block" />
                      <div className="res-loading-block" />
                      <div className="res-loading-block" />
                      <div className="res-loading-block" />
                    </div>
                  </td>
                </tr>
              ))
            ) : filteredReservations.length === 0 ? (
              <tr>
                <td colSpan={8} className="res-empty-state">
                  No reservations match the current filters.
                </td>
              </tr>
            ) : (
              filteredReservations.map((r, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    backgroundColor: "white",
                  }}
                >
                  <td style={{ padding: "1rem", fontWeight: "500" }}>{r.id}</td>
                  <td style={{ padding: "1rem" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <UserAvatar
                        src={r.customer.avatar}
                        name={r.customer.name}
                        rating={r.customer.rating}
                        size={32}
                      />
                      <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: "600" }}>
                          {r.customer.name}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                          {r.customer.id}
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
                      }}
                    >
                      <UserAvatar
                        src={r.driver.avatar}
                        name={r.driver.name}
                        rating={r.driver.rating}
                        size={32}
                      />
                      <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: "600" }}>
                          {r.driver.name}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                          {r.driver.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <ServiceBadge service={r.serviceType} />
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {getVehicleIcon(r.vehicleType)}
                      {r.vehicleType}
                    </div>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <StatusBadge status={r.status} />
                  </td>
                  <td style={{ padding: "1rem", fontWeight: "bold" }}>
                    {r.fare.toFixed(2)}{" "}
                    <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                      {r.currency}
                    </span>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <button
                      onClick={() => handlePreview(r)}
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
                      }}
                    >
                      <Eye size={14} /> Preview
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selectedReservation && (
        <div
          className="res-modal-overlay"
          onClick={() => setSelectedReservation(null)}
        >
          <div
            className="res-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                marginBottom: "2rem",
                display: "flex",
                alignItems: "center",
                gap: "1.25rem",
              }}
            >
              <button
                onClick={() => setSelectedReservation(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.4rem",
                  borderRadius: "1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                }}
              >
                <ArrowLeft size={24} color="#1e293b" />
              </button>
              <div>
                <h2
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: "800",
                    margin: 0,
                    color: "var(--text-primary)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Reservation Details
                </h2>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    margin: 0,
                    fontSize: "0.95rem",
                    fontWeight: "500",
                  }}
                >
                  Information about this Reservation
                </p>
              </div>
            </div>

            {/* Top Info Bar */}
            <div className="res-info-bar" style={{ marginBottom: "2.5rem" }}>
              <div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#94a3b8",
                    fontWeight: "600",
                    marginBottom: "0.25rem",
                  }}
                >
                  Start Time
                </div>
                <div
                  style={{
                    fontWeight: "700",
                    fontSize: "1rem",
                    color: "#1e293b",
                  }}
                >
                  {selectedReservation.startTime}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#94a3b8",
                    fontWeight: "600",
                    marginBottom: "0.25rem",
                  }}
                >
                  End Time
                </div>
                <div
                  style={{
                    fontWeight: "700",
                    fontSize: "1rem",
                    color: "#1e293b",
                  }}
                >
                  {selectedReservation.endTime}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#94a3b8",
                    fontWeight: "600",
                    marginBottom: "0.25rem",
                  }}
                >
                  Distance
                </div>
                <div
                  style={{
                    fontWeight: "700",
                    fontSize: "1rem",
                    color: "#1e293b",
                  }}
                >
                  {selectedReservation.distance}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#94a3b8",
                    fontWeight: "600",
                    marginBottom: "0.25rem",
                  }}
                >
                  Schedule Date
                </div>
                <div
                  style={{
                    fontWeight: "700",
                    fontSize: "1rem",
                    color: "#1e293b",
                  }}
                >
                  {selectedReservation.scheduleDate}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#94a3b8",
                    fontWeight: "600",
                    marginBottom: "0.25rem",
                  }}
                >
                  Schedule Time
                </div>
                <div
                  style={{
                    fontWeight: "700",
                    fontSize: "1rem",
                    color: "#1e293b",
                  }}
                >
                  {selectedReservation.scheduleTime}
                </div>
              </div>
              <div className="res-footer">
                <StatusBadge status={selectedReservation.status} />
              </div>
            </div>

            {/* Passenger Info */}
            <h3
              style={{
                fontSize: "1.3rem",
                fontWeight: "800",
                marginBottom: "1.25rem",
                color: "#1e293b",
              }}
            >
              Passenger Information
            </h3>
            <div
              style={{
                border: "1px solid #f3f4f6",
                borderRadius: "1.5rem",
                padding: "1.5rem",
                marginBottom: "2rem",
                backgroundColor: "white",
              }}
            >
              <div className="res-flex-responsive">
                <UserAvatar
                  src={selectedReservation.customer.avatar}
                  name={selectedReservation.customer.name}
                  rating={selectedReservation.customer.rating}
                  size={72}
                />
                <div className="res-info-grid">
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        fontWeight: "500",
                        marginBottom: "0.4rem",
                      }}
                    >
                      Full Name
                    </div>
                    <div style={{ fontWeight: "700", fontSize: "1rem" }}>
                      {selectedReservation.customer.name}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        fontWeight: "500",
                        marginBottom: "0.4rem",
                      }}
                    >
                      Customer ID
                    </div>
                    <div style={{ fontWeight: "700", fontSize: "1rem" }}>
                      {selectedReservation.customer.id}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        fontWeight: "500",
                        marginBottom: "0.4rem",
                      }}
                    >
                      Category
                    </div>
                    <div style={{ fontWeight: "700", fontSize: "1rem" }}>
                      {selectedReservation.customer.category || "Taxi"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        fontWeight: "500",
                        marginBottom: "0.4rem",
                      }}
                    >
                      Gender
                    </div>
                    <div
                      style={{
                        fontWeight: "700",
                        fontSize: "1rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span style={{ fontSize: "1.2rem" }}>
                        {selectedReservation.customer.gender === "Female"
                          ? "♀"
                          : "♂"}
                      </span>{" "}
                      {selectedReservation.customer.gender}
                    </div>
                  </div>

                  <div style={{ gridColumn: "span 1" }}>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        fontWeight: "500",
                        marginBottom: "0.4rem",
                      }}
                    >
                      Email
                    </div>
                    <div style={{ fontWeight: "700", fontSize: "1rem" }}>
                      {selectedReservation.customer.email}
                    </div>
                  </div>
                  <div style={{ gridColumn: "span 1" }}>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        fontWeight: "500",
                        marginBottom: "0.4rem",
                      }}
                    >
                      Phone
                    </div>
                    <div style={{ fontWeight: "700", fontSize: "1rem" }}>
                      {selectedReservation.customer.phone}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        fontWeight: "500",
                        marginBottom: "0.4rem",
                      }}
                    >
                      City
                    </div>
                    <div style={{ fontWeight: "700", fontSize: "1rem" }}>
                      {selectedReservation.customer.city}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Driver Info */}
            <h3
              style={{
                fontSize: "1.3rem",
                fontWeight: "800",
                marginBottom: "1.25rem",
                color: "#1e293b",
              }}
            >
              Driver Information
            </h3>
            <div
              style={{
                border: "1px solid #f3f4f6",
                borderRadius: "1.5rem",
                padding: "1.5rem",
                marginBottom: "2rem",
                backgroundColor: "white",
              }}
            >
              <div className="res-flex-responsive">
                <UserAvatar
                  src={selectedReservation.driver.avatar}
                  name={selectedReservation.driver.name}
                  rating={selectedReservation.driver.rating}
                  size={72}
                />
                <div className="res-info-grid">
                  <div style={{ gridColumn: "span 1" }}>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        fontWeight: "500",
                        marginBottom: "0.4rem",
                      }}
                    >
                      Full Name
                    </div>
                    <div style={{ fontWeight: "700", fontSize: "1rem" }}>
                      {selectedReservation.driver.name}
                    </div>
                  </div>
                  <div style={{ gridColumn: "span 1" }}>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        fontWeight: "500",
                        marginBottom: "0.4rem",
                      }}
                    >
                      Vehicle Type
                    </div>
                    <div
                      style={{
                        fontWeight: "700",
                        fontSize: "1rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <img
                        src={taxiIcon}
                        alt=""
                        style={{
                          width: "38px",
                          height: "38px",
                          objectFit: "contain",
                        }}
                      />{" "}
                      Taxi
                    </div>
                  </div>
                  <div style={{ gridColumn: "span 1" }}>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        fontWeight: "500",
                        marginBottom: "0.4rem",
                      }}
                    >
                      Phone
                    </div>
                    <div style={{ fontWeight: "700", fontSize: "1rem" }}>
                      {selectedReservation.driver.phone}
                    </div>
                  </div>

                  <div style={{ gridColumn: "span 1" }}>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        fontWeight: "500",
                        marginBottom: "0.4rem",
                      }}
                    >
                      Email
                    </div>
                    <div style={{ fontWeight: "700", fontSize: "1rem" }}>
                      {selectedReservation.driver.email}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        fontWeight: "500",
                        marginBottom: "0.4rem",
                      }}
                    >
                      Driver ID
                    </div>
                    <div style={{ fontWeight: "700", fontSize: "1rem" }}>
                      {selectedReservation.driver.id}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        fontWeight: "500",
                        marginBottom: "0.4rem",
                      }}
                    >
                      City
                    </div>
                    <div style={{ fontWeight: "700", fontSize: "1rem" }}>
                      {selectedReservation.driver.city}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        fontWeight: "500",
                        marginBottom: "0.4rem",
                      }}
                    >
                      Gender
                    </div>
                    <div
                      style={{
                        fontWeight: "700",
                        fontSize: "1rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span style={{ fontSize: "1.2rem" }}>
                        {selectedReservation.driver.gender === "Female"
                          ? "♀"
                          : "♂"}
                      </span>{" "}
                      {selectedReservation.driver.gender}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Info */}
            <h3
              style={{
                fontSize: "1.3rem",
                fontWeight: "800",
                marginBottom: "1.25rem",
                color: "#1e293b",
              }}
            >
              Vehicle Information
            </h3>
            <div
              style={{
                border: "1px solid #f3f4f6",
                borderRadius: "1.5rem",
                padding: "2rem",
                marginBottom: "2.5rem",
                backgroundColor: "white",
              }}
            >
              <div className="res-vehicle-grid">
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#94a3b8",
                      fontWeight: "500",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Driver ID
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "1.05rem" }}>
                    {selectedReservation.vehicle?.driverId ||
                      selectedReservation.driver.id}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#94a3b8",
                      fontWeight: "500",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Vehicle Colour
                  </div>
                  <div
                    style={{
                      fontWeight: "700",
                      fontSize: "1.05rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        background: "white",
                        borderRadius: "50%",
                        border: "1px solid #e2e8f0",
                      }}
                    ></div>{" "}
                    {selectedReservation.vehicle?.colour || "White"}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#94a3b8",
                      fontWeight: "500",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Licence Plate Num
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "1.05rem" }}>
                    {selectedReservation.vehicle?.licencePlate || "—"}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#94a3b8",
                      fontWeight: "500",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Make & Mode
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "1.05rem" }}>
                    {selectedReservation.vehicle?.makeModel || "—"}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#94a3b8",
                      fontWeight: "500",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Year
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "1.05rem" }}>
                    {selectedReservation.vehicle?.year || "—"}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#94a3b8",
                      fontWeight: "500",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Join Date
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "1.05rem" }}>
                    {selectedReservation.vehicle?.joinDate || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Route Cards */}
            <div
              style={{
                position: "relative",
                marginBottom: "2.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <div
                style={{
                  backgroundColor: "white",
                  border: "1px solid #f3f4f6",
                  borderRadius: "1.5rem",
                  padding: "1.5rem 2rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1.5rem",
                }}
              >
                <img
                  src={pickupIcon}
                  alt="pickup"
                  style={{
                    width: "36px",
                    height: "36px",
                    objectFit: "contain",
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#94a3b8",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Pickup
                  </div>
                  <div
                    style={{
                      fontWeight: "700",
                      fontSize: "1.1rem",
                      color: "#1e293b",
                    }}
                  >
                    {selectedReservation.pickup}
                  </div>
                </div>
              </div>

              <div
                className="res-route-exchange"
                style={{
                  position: "absolute",
                  right: "40px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 1,
                  backgroundColor: "white",
                  border: "1px solid #f3f4f6",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              >
                <div
                  style={{
                    color: "#ef4444",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    lineHeight: "0.6",
                  }}
                >
                  <span style={{ fontSize: "14px", fontWeight: "bold" }}>
                    ↑
                  </span>
                  <span style={{ fontSize: "14px", fontWeight: "bold" }}>
                    ↓
                  </span>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "white",
                  border: "1px solid #f3f4f6",
                  borderRadius: "1.5rem",
                  padding: "1.5rem 2rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1.5rem",
                }}
              >
                <img
                  src={destinationIcon}
                  alt="destination"
                  style={{
                    width: "36px",
                    height: "36px",
                    objectFit: "contain",
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#94a3b8",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Destination
                  </div>
                  <div
                    style={{
                      fontWeight: "700",
                      fontSize: "1.1rem",
                      color: "#1e293b",
                    }}
                  >
                    {selectedReservation.destination}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <h3
              style={{
                fontSize: "1.3rem",
                fontWeight: "800",
                marginBottom: "1.25rem",
                color: "#1e293b",
              }}
            >
              Payment Information
            </h3>
            <div
              style={{
                border: "1px solid #f3f4f6",
                borderRadius: "1.5rem",
                padding: "2rem",
                marginBottom: "2.5rem",
                backgroundColor: "white",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "2rem",
                }}
              >
                <UserAvatar
                  src={selectedReservation.customer.avatar}
                  name={selectedReservation.customer.name}
                  rating={selectedReservation.customer.rating}
                  size={84}
                />
              </div>

              <div className="res-payment-grid">
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#94a3b8",
                      fontWeight: "600",
                      marginBottom: "0.5rem",
                    }}
                  >
                    TVA
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "1.1rem" }}>
                    {selectedReservation.tva}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#94a3b8",
                      fontWeight: "600",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Service fee
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "1.1rem" }}>
                    {Number(selectedReservation.serviceFee ?? 0).toFixed(2)} MAD
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#94a3b8",
                      fontWeight: "600",
                      marginBottom: "0.5rem",
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
                    <div style={{ display: "flex" }}>
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          backgroundColor: "#ea580c",
                          borderRadius: "50%",
                          opacity: 0.9,
                        }}
                      ></div>
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          backgroundColor: "#fbbf24",
                          borderRadius: "50%",
                          marginLeft: -8,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#94a3b8",
                      fontWeight: "600",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Discount
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "1.1rem" }}>
                    {selectedReservation.discount}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#94a3b8",
                      fontWeight: "600",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Total Amount
                  </div>
                  <div
                    style={{
                      fontWeight: "900",
                      fontSize: "1.4rem",
                      color: "#1e293b",
                    }}
                  >
                    {Number(selectedReservation.fare ?? 0).toFixed(2)}{" "}
                    <span style={{ fontSize: "0.8rem" }}>
                      {selectedReservation.currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Archive Information */}
            <h3
              style={{
                fontSize: "1.3rem",
                fontWeight: "800",
                marginBottom: "1.25rem",
                color: "#1e293b",
              }}
            >
              Archive Information
            </h3>
            <div
              style={{
                border: "1px solid #f3f4f6",
                borderRadius: "1.5rem",
                padding: "2rem",
                marginBottom: "3rem",
                backgroundColor: "white",
              }}
            >
              <div className="res-archive-grid">
                <div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "#94a3b8",
                      fontWeight: "600",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Archived Date:
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "1.1rem" }}>
                    {selectedReservation.archivedDate || "—"}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "#94a3b8",
                      fontWeight: "600",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Archive Reason:
                  </div>
                  <div
                    style={{
                      fontWeight: "700",
                      fontSize: "1.1rem",
                      lineHeight: "1.4",
                    }}
                  >
                    {selectedReservation.archiveReason || "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="res-footer">
              <button
                style={{
                  padding: "1rem 3.5rem",
                  borderRadius: "1.25rem",
                  backgroundColor: "#38AC57",
                  color: "white",
                  border: "none",
                  fontWeight: "800",
                  fontSize: "1.1rem",
                  cursor: "pointer",
                  boxShadow: "0 10px 15px -3px rgba(56, 172, 87, 0.3)",
                  transition: "all 0.2s",
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
