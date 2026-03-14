import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Eye,
  ArrowLeft,
  ArrowUpRight,
  Filter,
  ChevronDown,
} from "lucide-react";
import { UserAvatar } from "../components/UserAvatar";
import {
  getDeliveryStatsApi,
  getDeliveryListApi,
  getDeliveryDetailApi,
  getDeliveryTopDriversApi,
  getDeliveryTopRidersApi,
  getReservationCitiesApi,
  getReservationServiceTypesApi,
  type DeliveryItem,
  type DeliveryStats,
  type DeliveryDriverRiderCard,
  type LiveTripsFilterOption,
  type LiveTripsServiceTypeOption,
} from "../services/api";

// Icons
import totalDeliveriesIcon from "../assets/icons/Total Deliveries.png";
import pendingIcon from "../assets/icons/Pending.png";
import acceptedIcon from "../assets/icons/completed.png";
import cancelledIcon from "../assets/icons/cancelled.png";

// UI Specific Icons
import carIcon from "../assets/icons/car.png";
import visaIcon from "../assets/icons/visa.png";
import mastercardIcon from "../assets/icons/mastercard.png";
import cashIcon from "../assets/icons/cash.png";
import taxiIcon from "../assets/icons/taxi.png";
import pickupIcon from "../assets/icons/pickup.png";
import destinationIcon from "../assets/icons/destination.png";

// --- Types ---

type Delivery = DeliveryItem;
type DriverRiderCard = DeliveryDriverRiderCard;

// --- Helper Components ---

const StatusBadge = ({ status }: { status: string }) => {
  let bg = "#e5e7eb";
  let color = "#374151";

  switch (status) {
    case "Scheduled":
      bg = "#dbeafe";
      color = "#1d4ed8";
      break;
    case "Accepted":
      bg = "#ccfbf1";
      color = "#0f766e";
      break;
    case "Pending":
      bg = "#fef3c7";
      color = "#b45309";
      break;
    case "Arriving":
      bg = "#e0f2fe";
      color = "#0369a1";
      break;
    case "Arrived":
      bg = "#eef7f0";
      color = "#38AC57";
      break;
    case "Started":
      bg = "#ede9fe";
      color = "#7e22ce";
      break;
    case "In_progress":
      bg = "#f3e8ff";
      color = "#6d28d9";
      break;
    case "Completed":
      bg = "#eef7f0";
      color = "#38AC57";
      break;
    case "Cancelled":
      bg = "#fee2e2";
      color = "#b91c1c";
      break;
  }

  return (
    <span
      style={{
        backgroundColor: bg,
        color: color,
        padding: "0.4rem 1rem",
        borderRadius: "0.5rem",
        fontSize: "0.75rem",
        fontWeight: "600",
        display: "inline-block",
        minWidth: "80px",
        textAlign: "center",
      }}
    >
      {status}
    </span>
  );
};

const Dropdown = ({
  label,
  options,
  activeValue,
  onSelect,
}: {
  label: string;
  options: string[];
  activeValue: string;
  onSelect: (val: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "0.6rem 1rem",
          borderRadius: "2rem",
          border: "1px solid #e5e7eb",
          backgroundColor:
            activeValue !== "All" && activeValue !== label
              ? "#eef7f0"
              : "white",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.85rem",
          color:
            activeValue !== "All" && activeValue !== label
              ? "#2d8a46"
              : "#374151",
          cursor: "pointer",
          width: "100%",
          justifyContent: "space-between",
        }}
      >
        {activeValue === "All" ? label : activeValue}
        <ChevronDown size={14} />
      </button>
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "120%",
            left: 0,
            minWidth: "150px",
            backgroundColor: "white",
            borderRadius: "1rem",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            padding: "0.5rem",
            zIndex: 50,
            border: "1px solid #f3f4f6",
          }}
        >
          <div
            onClick={() => {
              onSelect("All");
              setIsOpen(false);
            }}
            style={{
              padding: "0.5rem 1rem",
              cursor: "pointer",
              borderRadius: "0.5rem",
              fontWeight: activeValue === "All" ? "bold" : "normal",
            }}
            className="hover:bg-gray-50"
          >
            All
          </div>
          {options.length > 0 ? (
            options.map((opt) => (
              <div
                key={opt}
                onClick={() => {
                  onSelect(opt);
                  setIsOpen(false);
                }}
                style={{
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                  borderRadius: "0.5rem",
                  fontWeight: activeValue === opt ? "bold" : "normal",
                }}
                className="hover:bg-gray-50"
              >
                {opt}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: "0.5rem",
                color: "#9ca3af",
                fontSize: "0.8rem",
              }}
            >
              No options
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const normalizeDelivery = (delivery: Partial<Delivery>): Delivery => ({
  ...delivery,
  id: delivery.id || "—",
  numericId: Number(delivery.numericId ?? 0),
  serviceType: delivery.serviceType || "—",
  rider: {
    name: delivery.rider?.name || "Unknown",
    id: delivery.rider?.id || "—",
    avatar: delivery.rider?.avatar || null,
    rating: Number(delivery.rider?.rating ?? 0),
    phone: delivery.rider?.phone || "",
    email: delivery.rider?.email || "",
    city: delivery.rider?.city || "—",
    gender: delivery.rider?.gender || "Male",
    category: delivery.rider?.category || "",
  },
  driver: {
    name: delivery.driver?.name || "Unknown",
    id: delivery.driver?.id || "—",
    avatar: delivery.driver?.avatar || null,
    rating: Number(delivery.driver?.rating ?? 0),
    phone: delivery.driver?.phone || "",
    email: delivery.driver?.email || "",
    city: delivery.driver?.city || "—",
    gender: delivery.driver?.gender || "Male",
  },
  vehicleType: delivery.vehicleType || "Delivery",
  status: delivery.status || "Pending",
  fare: Number(delivery.fare ?? 0),
  currency: delivery.currency || "MAD",
  paymentMethod: delivery.paymentMethod || "Cash",
  deliveryId: delivery.deliveryId || "—",
  sendingDescription: delivery.sendingDescription || "—",
  weight: delivery.weight || "—",
  vehicleInfo: {
    brand: delivery.vehicleInfo?.brand || "—",
    plate: delivery.vehicleInfo?.plate || "—",
    transmission: delivery.vehicleInfo?.transmission || "—",
    model: delivery.vehicleInfo?.model || "—",
    color: delivery.vehicleInfo?.color || "—",
    year: delivery.vehicleInfo?.year || "—",
    joinDate: delivery.vehicleInfo?.joinDate || "—",
  },
  pickup: delivery.pickup || "—",
  destination: delivery.destination || "—",
  tva: delivery.tva || "1%",
  serviceFee: Number(delivery.serviceFee ?? 0),
  discount: delivery.discount || "0%",
  startTime: delivery.startTime || "—",
  endTime: delivery.endTime || "—",
  distance: delivery.distance || "—",
  scheduleDate: delivery.scheduleDate || "—",
  scheduleTime: delivery.scheduleTime || "—",
});

// --- Main Page Component ---

export const DeliveryServices = () => {
  const [activeStat, setActiveStat] = useState<string | null>(
    "Total Deliveries",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<"Drivers" | "Riders">("Drivers");

  // Filters State
  const [statusFilter, setStatusFilter] = useState("All");
  const [serviceFilter, setServiceFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("All");

  // API data
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [stats, setStats] = useState<DeliveryStats>({
    totalDeliveries: 0,
    pending: 0,
    accepted: 0,
    cancelled: 0,
  });
  const [topDrivers, setTopDrivers] = useState<DriverRiderCard[]>([]);
  const [topRiders, setTopRiders] = useState<DriverRiderCard[]>([]);
  const [cities, setCities] = useState<LiveTripsFilterOption[]>([]);
  const [serviceTypes, setServiceTypes] = useState<
    LiveTripsServiceTypeOption[]
  >([]);
  const [loading, setLoading] = useState(false);

  // Build status mapping for API calls
  const getStatusParam = useCallback(() => {
    if (statusFilter !== "All") {
      const statusMap: Record<string, string> = {
        Pending: "PENDING",
        Accepted: "ACCEPTED",
        Scheduled: "PENDING",
        Cancelled: "CANCELLED",
      };
      return statusMap[statusFilter] || undefined;
    }
    if (activeStat === "Pending") return "PENDING";
    if (activeStat === "Accepted") return "ACCEPTED";
    if (activeStat === "Cancelled") return "CANCELLED";
    return undefined;
  }, [statusFilter, activeStat]);

  const getPeriodParam = useCallback(() => {
    if (periodFilter === "Today") return "today";
    if (periodFilter === "This Week") return "last_week";
    return undefined;
  }, [periodFilter]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      const res = await getDeliveryStatsApi();
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

  // Fetch deliveries list
  useEffect(() => {
    const fetchList = async () => {
      setLoading(true);
      try {
        const cityId =
          cityFilter !== "All"
            ? cities.find((c) => c.name === cityFilter)?.id
            : undefined;
        const serviceType =
          serviceFilter !== "All"
            ? serviceTypes.find(
                (s) =>
                  s.displayName === serviceFilter || s.name === serviceFilter,
              )?.name
            : undefined;

        const res = await getDeliveryListApi({
          search: searchTerm || undefined,
          status: getStatusParam(),
          serviceType,
          paymentMethod: methodFilter !== "All" ? methodFilter : undefined,
          cityId,
          period: getPeriodParam(),
          limit: 50,
        });
        if (res.ok) {
          setDeliveries(res.data.deliveries);
        } else {
          setDeliveries([]);
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
    methodFilter,
    periodFilter,
    cityFilter,
    activeStat,
    cities,
    serviceTypes,
    getStatusParam,
    getPeriodParam,
  ]);

  // Fetch top drivers/riders
  useEffect(() => {
    const fetchPeople = async () => {
      const [driversRes, ridersRes] = await Promise.all([
        getDeliveryTopDriversApi({ limit: 12 }),
        getDeliveryTopRidersApi({ limit: 12 }),
      ]);
      if (driversRes.ok) setTopDrivers(driversRes.data);
      if (ridersRes.ok) setTopRiders(ridersRes.data);
    };
    fetchPeople();
  }, []);

  // Handle preview click - fetch full detail
  const handlePreview = async (item: Delivery) => {
    try {
      const numericId = String(item.numericId || item.id.replace(/\D/g, ""));
      const res = await getDeliveryDetailApi(numericId);
      if (res.ok) {
        setSelectedDelivery(normalizeDelivery(res.data));
      } else {
        setSelectedDelivery(normalizeDelivery(item));
      }
    } catch {
      setSelectedDelivery(normalizeDelivery(item));
    }
  };

  const filteredDeliveries = deliveries;

  const filteredDriverRiders = viewMode === "Drivers" ? topDrivers : topRiders;

  const uniqueCities = ["All", ...cities.map((c) => c.name)];
  const uniqueServices = [
    "All",
    ...serviceTypes.map((s) => s.displayName || s.name),
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
        paddingBottom: "4rem",
      }}
    >
      <style>{`
                .ds-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1.5rem;
                }
                .ds-controls-container {
                    display: flex;
                    gap: 1rem;
                    flex-wrap: wrap;
                    align-items: center;
                }
                .ds-table-container {
                    width: 100%;
                    overflow-x: auto;
                    border-radius: 1rem;
                    background: transparent;
                }
                .ds-table-header {
                    display: grid;
                    grid-template-columns: 0.8fr 1fr 2fr 2fr 1fr 1fr 1fr 1fr;
                    background-color: #38AC57;
                    color: white;
                    padding: 1rem;
                    border-radius: 1rem;
                    align-items: center;
                    font-weight: bold;
                    font-size: 0.9rem;
                    margin-bottom: 1rem;
                    min-width: 1000px;
                }
                .ds-table-row {
                    display: grid;
                    grid-template-columns: 0.8fr 1fr 2fr 2fr 1fr 1fr 1fr 1fr;
                    background-color: white;
                    padding: 1rem;
                    border-radius: 1rem;
                    align-items: center;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                    min-width: 1000px;
                }
                .ds-people-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1rem;
                }
                .ds-modal-overlay {
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
                .ds-modal-content {
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
                .ds-info-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1.5rem 1rem;
                }
                .ds-vehicle-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1.5rem 1rem;
                }
                .ds-payment-grid {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    text-align: left;
                }
                .ds-summary-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 1rem;
                }
                .ds-flex-responsive {
                    display: flex;
                    gap: 2rem;
                    align-items: flex-start;
                }
                .ds-loading-row {
                  display: grid;
                  grid-template-columns: 0.8fr 1fr 2fr 2fr 1fr 1fr 1fr 1fr;
                  gap: 1rem;
                  align-items: center;
                  padding: 1rem;
                  border-radius: 1rem;
                  background: linear-gradient(90deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%);
                  background-size: 200% 100%;
                  animation: dsShimmer 1.4s ease-in-out infinite;
                  min-width: 1000px;
                }
                .ds-loading-block {
                  height: 14px;
                  border-radius: 999px;
                  background: rgba(148, 163, 184, 0.18);
                }
                .ds-empty-state {
                  padding: 2.5rem 1.5rem;
                  text-align: center;
                  color: #64748b;
                  background: white;
                  border-radius: 1rem;
                }
                @keyframes dsShimmer {
                  0% { background-position: 200% 0; }
                  100% { background-position: -200% 0; }
                }

                @media (max-width: 1024px) {
                    .ds-stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    .ds-people-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 768px) {
                    .ds-modal-content {
                        padding: 1.5rem;
                    }
                    .ds-controls-container {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .ds-controls-container > div {
                        width: 100% !important;
                    }
                    .ds-people-grid {
                        grid-template-columns: 1fr;
                    }
                    .ds-flex-responsive {
                        flex-direction: column;
                        text-align: left;
                        align-items: flex-start;
                    }
                    .ds-info-grid, .ds-vehicle-grid, .ds-summary-grid {
                        grid-template-columns: 1fr;
                        text-align: left;
                        gap: 1rem;
                    }
                    .ds-payment-grid {
                        flex-direction: column;
                        align-items: stretch;
                        text-align: left;
                        gap: 1rem;
                    }
                    .ds-payment-grid > div {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding-bottom: 0.5rem;
                        border-bottom: 1px solid #f3f4f6;
                    }
                }

                @media (max-width: 480px) {
                    .ds-stats-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: "1.8rem",
            fontWeight: "bold",
            margin: "0 0 0.5rem 0",
          }}
        >
          Delivery Service
        </h1>
        <p style={{ color: "#6b7280", margin: 0 }}>
          Monitor all trip types across Hezzni's transportation services
        </p>
      </div>

      {/* Stats Cards */}
      <div className="ds-stats-grid">
        {[
          {
            label: "Total Deliveries",
            count: String(stats.totalDeliveries).padStart(3, "0"),
            icon: totalDeliveriesIcon,
            activeName: "Total Deliveries",
          },
          {
            label: "Pending",
            count: String(stats.pending).padStart(3, "0"),
            icon: pendingIcon,
            activeName: "Pending",
          },
          {
            label: "Accepted",
            count: String(stats.accepted).padStart(3, "0"),
            icon: acceptedIcon,
            activeName: "Accepted",
          },
          {
            label: "Cancelled",
            count: String(stats.cancelled).padStart(3, "0"),
            icon: cancelledIcon,
            activeName: "Cancelled",
          },
        ].map((stat) => {
          const isActive = activeStat === stat.activeName;
          return (
            <div
              key={stat.activeName}
              onClick={() => setActiveStat(stat.activeName)}
              style={{
                padding: "1.5rem",
                borderRadius: "1.5rem",
                backgroundColor: isActive ? "#38AC57" : "white",
                color: isActive ? "white" : "black",
                position: "relative",
                boxShadow: isActive
                  ? "0 10px 15px -3px rgba(56, 172, 87, 0.4)"
                  : "0 1px 3px rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                height: "140px",
                cursor: "pointer",
                transition: "all 0.2s",
                transform: isActive ? "translateY(-2px)" : "none",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}
              >
                <img
                  src={stat.icon}
                  alt=""
                  style={{
                    width: "28px",
                    height: "28px",
                    objectFit: "contain",
                  }}
                />
                <span style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                  {stat.label}
                </span>
              </div>
              <div style={{ fontSize: "2.5rem", fontWeight: "bold" }}>
                {stat.count}
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: "1rem",
                  right: "1rem",
                  backgroundColor: isActive ? "white" : "#38AC57",
                  borderRadius: "50%",
                  padding: "0.4rem",
                  color: isActive ? "#38AC57" : "white",
                  display: "flex",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                <ArrowUpRight size={16} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="ds-controls-container">
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
          options={["Pending", "Accepted", "Scheduled", "Cancelled"]}
          activeValue={statusFilter}
          onSelect={setStatusFilter}
        />
        <Dropdown
          label="Service Type"
          options={uniqueServices.filter((s) => s !== "All")}
          activeValue={serviceFilter}
          onSelect={setServiceFilter}
        />
        <Dropdown
          label="Method"
          options={["Cash", "Visa", "Mastercard"]}
          activeValue={methodFilter}
          onSelect={setMethodFilter}
        />
        <Dropdown
          label="Periods"
          options={["Today", "This Week"]}
          activeValue={periodFilter}
          onSelect={setPeriodFilter}
        />
        <Dropdown
          label="City"
          options={uniqueCities.filter((c) => c !== "All")}
          activeValue={cityFilter}
          onSelect={setCityFilter}
        />
        <button
          onClick={() => {
            setStatusFilter("All");
            setServiceFilter("All");
            setMethodFilter("All");
            setPeriodFilter("All");
            setCityFilter("All");
            setSearchTerm("");
          }}
          style={{
            padding: "0.7rem 1rem",
            borderRadius: "2rem",
            border: "none",
            backgroundColor: "#f3f4f6",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            cursor: "pointer",
            fontSize: "0.9rem",
            color: "#374151",
          }}
        >
          <Filter size={16} /> Filters
        </button>
      </div>

      {/* Table */}
      <div className="ds-table-container">
        {/* Header Row */}
        <div className="ds-table-header">
          <div>Trip ID</div>
          <div>Service</div>
          <div>Rider</div>
          <div>Driver</div>
          <div>Vehicle</div>
          <div>Status</div>
          <div>Fare</div>
          <div style={{ textAlign: "center" }}>Action</div>
        </div>

        {/* Rows */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}
        >
          {loading ? (
            Array.from({ length: 5 }).map((_, idx) => (
              <div key={`loading-${idx}`} className="ds-loading-row">
                <div className="ds-loading-block" />
                <div className="ds-loading-block" />
                <div className="ds-loading-block" />
                <div className="ds-loading-block" />
                <div className="ds-loading-block" />
                <div className="ds-loading-block" />
                <div className="ds-loading-block" />
                <div className="ds-loading-block" />
              </div>
            ))
          ) : filteredDeliveries.length === 0 ? (
            <div className="ds-empty-state">
              No deliveries match the current filters.
            </div>
          ) : (
            filteredDeliveries.map((item, idx) => (
              <div key={idx} className="ds-table-row">
                <div style={{ fontWeight: "600" }}>{item.id}</div>
                <div>
                  <span
                    style={{
                      backgroundColor: "#eef7f0",
                      color: "#2d8a46",
                      padding: "0.2rem 0.6rem",
                      borderRadius: "1rem",
                      fontSize: "0.7rem",
                      fontWeight: "600",
                    }}
                  >
                    {item.serviceType}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.8rem",
                  }}
                >
                  <UserAvatar
                    src={item.rider.avatar}
                    name={item.rider.name}
                    rating={item.rider.rating}
                    size={36}
                  />
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: "600" }}>
                      {item.rider.name}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                      {item.rider.id}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.8rem",
                  }}
                >
                  <UserAvatar
                    src={item.driver.avatar}
                    name={item.driver.name}
                    rating={item.driver.rating}
                    size={36}
                  />
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: "600" }}>
                      {item.driver.name}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                      {item.driver.id}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.8rem",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                  }}
                >
                  <img
                    src={carIcon}
                    alt=""
                    style={{
                      width: "32px",
                      height: "22px",
                      objectFit: "contain",
                    }}
                  />{" "}
                  {item.vehicleType}
                </div>
                <div>
                  <StatusBadge status={item.status} />
                </div>
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>
                    {item.fare.toFixed(2)} {item.currency}
                  </div>
                  <div
                    style={{
                      marginTop: "4px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {item.paymentMethod === "Visa" && (
                      <img
                        src={visaIcon}
                        alt="Visa"
                        style={{ height: "10px", objectFit: "contain" }}
                      />
                    )}
                    {item.paymentMethod === "Mastercard" && (
                      <img
                        src={mastercardIcon}
                        alt="Mastercard"
                        style={{ height: "14px", objectFit: "contain" }}
                      />
                    )}
                    {item.paymentMethod === "Cash" && (
                      <img
                        src={cashIcon}
                        alt="Cash"
                        style={{ height: "14px", objectFit: "contain" }}
                      />
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <button
                    onClick={() => handlePreview(item)}
                    style={{
                      background: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "2rem",
                      padding: "0.4rem 0.8rem",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      fontSize: "0.8rem",
                    }}
                  >
                    <Eye size={14} /> Preview
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Drivers/Riders Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "1rem",
        }}
      >
        <div
          style={{
            backgroundColor: "#e5e7eb",
            padding: "0.3rem",
            borderRadius: "2rem",
            display: "flex",
          }}
        >
          <button
            onClick={() => setViewMode("Drivers")}
            style={{
              padding: "0.5rem 1.5rem",
              borderRadius: "1.5rem",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.9rem",
              backgroundColor:
                viewMode === "Drivers" ? "#38AC57" : "transparent",
              color: viewMode === "Drivers" ? "white" : "#6b7280",
            }}
          >
            Drivers
          </button>
          <button
            onClick={() => setViewMode("Riders")}
            style={{
              padding: "0.5rem 1.5rem",
              borderRadius: "1.5rem",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.9rem",
              backgroundColor:
                viewMode === "Riders" ? "#38AC57" : "transparent",
              color: viewMode === "Riders" ? "white" : "#6b7280",
            }}
          >
            Rider
          </button>
        </div>
        <a
          href="#"
          style={{
            color: "#38AC57",
            fontWeight: "600",
            textDecoration: "underline",
            fontSize: "0.9rem",
          }}
        >
          View All
        </a>
      </div>

      {/* Driver/Rider Cards Grid */}
      <div className="ds-people-grid">
        {filteredDriverRiders.map((person, idx) => (
          <div
            key={idx}
            className="card"
            style={{
              padding: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <UserAvatar
              src={person.avatar}
              name={person.name}
              rating={person.rating}
              size={50}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "0.95rem" }}>
                    {person.name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                    {person.id} • {person.location}
                  </div>
                </div>
                <div style={{ fontSize: "0.75rem", fontWeight: "600" }}>
                  • {person.trips} Trips
                </div>
              </div>
            </div>
            {person.vehicleIcon && (
              <img
                src={carIcon}
                alt=""
                style={{ width: "28px", height: "18px", objectFit: "contain" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedDelivery && (
        <div
          className="ds-modal-overlay"
          onClick={() => setSelectedDelivery(null)}
        >
          <div
            className="ds-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ marginBottom: "1.5rem" }}>
              <button
                onClick={() => setSelectedDelivery(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <ArrowLeft size={24} />
              </button>
              <h2
                style={{
                  fontSize: "1.4rem",
                  fontWeight: "bold",
                  margin: "0.5rem 0 0 0",
                }}
              >
                Delivery Details - {selectedDelivery.deliveryId}
              </h2>
              <p style={{ color: "#6b7280", margin: 0, fontSize: "0.9rem" }}>
                Complete delivery information based on Hezzni mobile app
              </p>
            </div>

            {/* Customer Info */}
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: "800",
                marginBottom: "1.25rem",
                color: "#1e293b",
              }}
            >
              Customer Information
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
              <div className="ds-flex-responsive">
                <UserAvatar
                  src={selectedDelivery.rider.avatar}
                  name={selectedDelivery.rider.name}
                  rating={selectedDelivery.rider.rating}
                  size={72}
                />
                <div className="ds-info-grid">
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
                      {selectedDelivery.rider.name}
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
                      {selectedDelivery.rider.id}
                    </div>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
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
                        src={carIcon}
                        alt=""
                        style={{
                          width: "38px",
                          height: "38px",
                          objectFit: "contain",
                        }}
                      />{" "}
                      {selectedDelivery.rider.category || "Hezzni Standard"}
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
                      Email
                    </div>
                    <div style={{ fontWeight: "700", fontSize: "1rem" }}>
                      {selectedDelivery.rider.email}
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
                      Phone
                    </div>
                    <div style={{ fontWeight: "700", fontSize: "1rem" }}>
                      {selectedDelivery.rider.phone}
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
                    <div
                      style={{
                        fontWeight: "700",
                        fontSize: "1rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {selectedDelivery.rider.city}{" "}
                      <ChevronDown size={14} color="#94a3b8" />
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
                        {selectedDelivery.rider.gender === "Female" ? "♀" : "♂"}
                      </span>{" "}
                      {selectedDelivery.rider.gender}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Driver Info */}
            <h3
              style={{
                fontSize: "1.25rem",
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
              <div className="ds-flex-responsive">
                <UserAvatar
                  src={selectedDelivery.driver.avatar}
                  name={selectedDelivery.driver.name}
                  rating={selectedDelivery.driver.rating}
                  size={72}
                />
                <div className="ds-info-grid">
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        fontWeight: "500",
                        marginBottom: "0.4rem",
                      }}
                    >
                      Name
                    </div>
                    <div style={{ fontWeight: "700", fontSize: "1rem" }}>
                      {selectedDelivery.driver.name}
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
                  <div>
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
                      {selectedDelivery.driver.phone}
                    </div>
                  </div>
                  <div></div>

                  <div>
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
                      {selectedDelivery.driver.email}
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
                      {selectedDelivery.driver.id}
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
                    <div
                      style={{
                        fontWeight: "700",
                        fontSize: "1rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {selectedDelivery.driver.city}
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
                        {selectedDelivery.driver.gender === "Female"
                          ? "♀"
                          : "♂"}
                      </span>{" "}
                      {selectedDelivery.driver.gender}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* What are you sending */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div
                style={{
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                }}
              >
                What are you sending?
              </div>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                  padding: "1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#374151",
                }}
              >
                <span>{selectedDelivery.sendingDescription}</span>
                <span style={{ color: "#9ca3af" }}>
                  Weight: {selectedDelivery.weight}
                </span>
              </div>
            </div>

            {/* Vehicle Info */}
            <h3
              style={{
                fontSize: "1.25rem",
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
                padding: "1.5rem",
                marginBottom: "2rem",
                backgroundColor: "white",
              }}
            >
              <div className="ds-vehicle-grid">
                <div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#94a3b8",
                      fontWeight: "500",
                      marginBottom: "0.4rem",
                    }}
                  >
                    Vehicle
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
                      src={carIcon}
                      alt=""
                      style={{
                        width: "45px",
                        height: "45px",
                        objectFit: "contain",
                      }}
                    />{" "}
                    {selectedDelivery.vehicleInfo.brand}
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
                    License Plate
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "1rem" }}>
                    {selectedDelivery.vehicleInfo.plate}
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
                    Transmission
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "1rem" }}>
                    {selectedDelivery.vehicleInfo.transmission}
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
                    Make & Model
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "1rem" }}>
                    {selectedDelivery.vehicleInfo.model}
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
                    On boarding date
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "1rem" }}>
                    {selectedDelivery.vehicleInfo.joinDate || "—"}
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
                    Colour
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      fontWeight: "700",
                      fontSize: "1rem",
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        border: "1px solid #e5e7eb",
                        backgroundColor: "white",
                      }}
                    ></div>
                    {selectedDelivery.vehicleInfo.color}
                  </div>
                </div>
                <div></div>
                <div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#94a3b8",
                      fontWeight: "500",
                      marginBottom: "0.4rem",
                    }}
                  >
                    Year
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "1rem" }}>
                    {selectedDelivery.vehicleInfo.year}
                  </div>
                </div>
              </div>
            </div>

            {/* Route Details */}
            <h3
              style={{
                fontSize: "1.1rem",
                fontWeight: "bold",
                marginBottom: "1rem",
              }}
            >
              Route Details
            </h3>
            <div
              style={{
                border: "1px solid #f3f4f6",
                borderRadius: "1rem",
                padding: "1rem",
                marginBottom: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                position: "relative",
              }}
            >
              {/* Vertical dashed line */}
              <div
                style={{
                  position: "absolute",
                  left: "19px",
                  top: "25px",
                  bottom: "25px",
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
                  src={pickupIcon}
                  alt="pickup"
                  style={{
                    width: "18px",
                    height: "18px",
                    objectFit: "contain",
                  }}
                />
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                    Pickup
                  </div>
                  <div style={{ fontWeight: "600" }}>
                    {selectedDelivery.pickup}
                  </div>
                </div>
              </div>

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
                    width: "18px",
                    height: "18px",
                    objectFit: "contain",
                  }}
                />
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                    Destination
                  </div>
                  <div style={{ fontWeight: "600" }}>
                    {selectedDelivery.destination}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <h3
              style={{
                fontSize: "1.1rem",
                fontWeight: "bold",
                marginBottom: "1rem",
              }}
            >
              Payment Information
            </h3>
            <div
              style={{
                border: "1px solid #f3f4f6",
                borderRadius: "1rem",
                padding: "1.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  marginBottom: "1rem",
                }}
              >
                <UserAvatar
                  src={selectedDelivery.rider.avatar}
                  name={selectedDelivery.rider.name}
                  rating={selectedDelivery.rider.rating}
                  size={56}
                />
              </div>

              <div className="ds-payment-grid">
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                    TVA
                  </div>
                  <div style={{ fontWeight: "600" }}>
                    {selectedDelivery.tva}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                    Service fee
                  </div>
                  <div style={{ fontWeight: "600" }}>
                    {Number(selectedDelivery.serviceFee ?? 0).toFixed(2)} MAD
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                    Payment Method
                  </div>
                  <div
                    style={{
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      gap: "0.2rem",
                      marginTop: "4px",
                    }}
                  >
                    {selectedDelivery.paymentMethod === "Visa" && (
                      <img
                        src={visaIcon}
                        alt="Visa"
                        style={{ height: "12px", objectFit: "contain" }}
                      />
                    )}
                    {selectedDelivery.paymentMethod === "Mastercard" && (
                      <img
                        src={mastercardIcon}
                        alt="Mastercard"
                        style={{ height: "16px", objectFit: "contain" }}
                      />
                    )}
                    {selectedDelivery.paymentMethod === "Cash" && (
                      <img
                        src={cashIcon}
                        alt="Cash"
                        style={{ height: "16px", objectFit: "contain" }}
                      />
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                    Discount
                  </div>
                  <div style={{ fontWeight: "600" }}>
                    {selectedDelivery.discount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                    Total Amount
                  </div>
                  <div style={{ fontWeight: "900", fontSize: "1.1rem" }}>
                    {Number(selectedDelivery.fare ?? 0).toFixed(2)}{" "}
                    <span style={{ fontSize: "0.7rem", fontWeight: "normal" }}>
                      MAD
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trip Summary */}
            <h3
              style={{
                fontSize: "1.1rem",
                fontWeight: "bold",
                marginBottom: "1rem",
              }}
            >
              Trip Summary
            </h3>
            <div
              className="ds-summary-grid"
              style={{
                border: "1px solid #f3f4f6",
                borderRadius: "1rem",
                padding: "1rem",
              }}
            >
              <div>
                <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                  Start Time
                </div>
                <div style={{ fontWeight: "600", fontSize: "0.85rem" }}>
                  {selectedDelivery.startTime}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                  End Time
                </div>
                <div style={{ fontWeight: "600", fontSize: "0.85rem" }}>
                  {selectedDelivery.endTime}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                  Distance
                </div>
                <div style={{ fontWeight: "600", fontSize: "0.85rem" }}>
                  {selectedDelivery.distance}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                  Schedule Date
                </div>
                <div style={{ fontWeight: "600", fontSize: "0.85rem" }}>
                  {selectedDelivery.scheduleDate}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                  Schedule Time
                </div>
                <div style={{ fontWeight: "600", fontSize: "0.85rem" }}>
                  {selectedDelivery.scheduleTime}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
