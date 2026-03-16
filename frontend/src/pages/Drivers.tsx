import { useState, useRef, useEffect } from "react";
import {
  Search,
  Eye,
  ArrowLeft,
  ArrowUpRight,
  Filter,
  ChevronDown,
  Star,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { UserAvatar } from "../components/UserAvatar";
import { PageLoader } from "../components/PageLoader";

// Vehicle Icons
import carIcon from "../assets/icons/car.png";
import taxiIcon from "../assets/icons/taxi.png";
import bikeIcon from "../assets/icons/bike.png";
import pickupIcon from "../assets/icons/pickup.png";
import destinationIcon from "../assets/icons/destination.png";

import {
  ChangeCategoryModal,
  RidePreferencesModal,
  SuspendDriverModal,
  TripSummaryModal,
  AddDriverModal,
} from "./DriverModals";
import {
  getAdminDriverStatsApi,
  getAdminDriverListApi,
  activateDriverApi,
  updateDriverApi,
  getDriverEarningsApi,
  getDriverTripsApi,
  type AdminDriverStats,
  type AdminDriverTrip,
  type AdminDriverEarnings,
} from "../services/api";

// We'll mock the chart if library not installed, or use simple div bars

// --- Types ---

interface Driver {
  id: string;
  numericId: number;
  driverId: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  rating: number;
  location: string;

  vehicleType: "Motorcycle" | "Car" | "Taxi" | "Rental" | string;
  vehicleDetails: {
    brand: string;
    color: string;
    plate: string;
    model: string;
    year: string;
  };

  totalTrips: number;
  status: "Active" | "Suspended" | "Pending" | string;
  suspension?: {
    reason: string;
    until: string;
  };

  joinDate: string;
  documentStatus: "Verified" | "Pending" | "Rejected";

  city: string;
  region: string;

  stats: {
    cancelationRate: string;
    acceptanceRate: string;
    onlineTime: string;
  };
}

// --- Helper Components ---

const StatusBadge = ({ status }: { status: string }) => {
  const isSuspended = status === "Suspended";
  return (
    <span
      style={{
        backgroundColor: isSuspended ? "#fee2e2" : "#eef7f0",
        color: isSuspended ? "#ef4444" : "#2d8a46",
        padding: "0.4rem 1rem",
        borderRadius: "0.5rem",
        fontSize: "0.8rem",
        fontWeight: "600",
        display: "inline-block",
        minWidth: "90px",
        textAlign: "center",
      }}
    >
      {status}
    </span>
  );
};

const DropdownItem = ({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "0.5rem 1rem",
        cursor: "pointer",
        borderRadius: "0.5rem",
        fontWeight: isActive ? "bold" : "normal",
        backgroundColor: hovered
          ? "#f3f4f6"
          : isActive
            ? "#eef7f0"
            : "transparent",
        color: isActive ? "#2d8a46" : "#374151",
        fontSize: "0.85rem",
        transition: "background-color 0.15s",
      }}
    >
      {label}
    </div>
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div
      ref={dropdownRef}
      style={{ position: "relative", display: "inline-block", width: "100%" }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "0.6rem 1rem",
          borderRadius: "2rem",
          border:
            activeValue !== "All" ? "1px solid #38AC57" : "1px solid #e5e7eb",
          backgroundColor: activeValue !== "All" ? "#eef7f0" : "white",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.85rem",
          color: activeValue !== "All" ? "#2d8a46" : "#374151",
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "all 0.2s",
          width: "100%",
          justifyContent: "space-between",
        }}
      >
        {activeValue === "All" ? label : activeValue}
        <ChevronDown
          size={14}
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "120%",
            left: 0,
            minWidth: "180px",
            backgroundColor: "white",
            borderRadius: "1rem",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15)",
            padding: "0.5rem",
            zIndex: 50,
            border: "1px solid #e5e7eb",
          }}
        >
          <DropdownItem
            label="All"
            isActive={activeValue === "All"}
            onClick={() => {
              onSelect("All");
              setIsOpen(false);
            }}
          />
          {options.map((opt) => (
            <DropdownItem
              key={opt}
              label={opt}
              isActive={activeValue === opt}
              onClick={() => {
                onSelect(opt);
                setIsOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// --- Sub-Modals ---

function getFallbackDriverEarnings(period: string): AdminDriverEarnings {
  const labelsByPeriod: Record<string, string[]> = {
    today: ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"],
    weekly: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    monthly: ["W1", "W2", "W3", "W4"],
  };

  const valuesByPeriod: Record<string, number[]> = {
    today: [85, 120, 95, 150, 135, 110],
    weekly: [420, 510, 460, 580, 620, 540, 495],
    monthly: [1850, 2120, 1980, 2360],
  };

  const normalizedPeriod = period in labelsByPeriod ? period : "monthly";
  const values = valuesByPeriod[normalizedPeriod];

  return {
    period: normalizedPeriod,
    totalEarnings: `${values.reduce((sum, value) => sum + value, 0).toFixed(2)} MAD`,
    onlineTime:
      normalizedPeriod === "today"
        ? "8h 15m"
        : normalizedPeriod === "weekly"
          ? "42h 30m"
          : "168h 20m",
    totalTrips:
      normalizedPeriod === "today"
        ? "12"
        : normalizedPeriod === "weekly"
          ? "58"
          : "214",
    data: labelsByPeriod[normalizedPeriod].map((label, index) => ({
      label,
      value: values[index],
    })),
  };
}

function getFallbackDriverTrips(type: string): AdminDriverTrip[] {
  const trips: AdminDriverTrip[] = [
    {
      id: 7001,
      riderName: "Sara K.",
      riderAvatar: null,
      date: "16 Mar 2026, 10:35",
      status: "Completed",
      amount: "145.00 MAD",
      pickupAddress: "Maarif, Casablanca",
      dropoffAddress: "Ain Diab, Casablanca",
      distance: "8.4 km",
      duration: "18 min",
      rating: 4.8,
    },
    {
      id: 7002,
      riderName: "Hajar M.",
      riderAvatar: null,
      date: "15 Mar 2026, 15:10",
      status: "Cancelled",
      amount: "0.00 MAD",
      pickupAddress: "Agdal, Rabat",
      dropoffAddress: "Hay Riad, Rabat",
      distance: "5.0 km",
      duration: "12 min",
      rating: 0,
    },
    {
      id: 7003,
      riderName: "Omar T.",
      riderAvatar: null,
      date: "14 Mar 2026, 19:20",
      status: "Completed",
      amount: "96.00 MAD",
      pickupAddress: "Gueliz, Marrakech",
      dropoffAddress: "Medina, Marrakech",
      distance: "6.3 km",
      duration: "14 min",
      rating: 4.9,
    },
  ];

  if (type === "completed") {
    return trips.filter((trip) => trip.status === "Completed");
  }

  if (type === "cancelled") {
    return trips.filter((trip) => trip.status === "Cancelled");
  }

  return trips;
}

const EarningsModalContent = ({ driverId }: { driverId: number }) => {
  const [activePeriod, setActivePeriod] = useState("Monthly");
  const [earningsData, setEarningsData] = useState<AdminDriverEarnings | null>(
    null,
  );

  const periodMap: Record<string, string> = {
    Today: "today",
    Weekly: "weekly",
    Monthly: "monthly",
  };

  useEffect(() => {
    const fetchEarnings = async () => {
      const res = await getDriverEarningsApi(driverId, periodMap[activePeriod]);
      if (res.ok && res.data.data.length > 0) {
        setEarningsData(res.data);
        return;
      }

      setEarningsData(getFallbackDriverEarnings(periodMap[activePeriod]));
    };
    fetchEarnings();
  }, [driverId, activePeriod]);

  const bars: number[] = [];
  const labels: string[] = [];
  let highlightIdx = 0;
  let highlightVal = "0";

  if (earningsData && earningsData.data.length > 0) {
    const maxVal = Math.max(...earningsData.data.map((d) => d.value), 1);
    earningsData.data.forEach((d, i) => {
      bars.push(Math.round((d.value / maxVal) * 100));
      labels.push(d.label);
      if (d.value > (earningsData.data[highlightIdx]?.value || 0))
        highlightIdx = i;
    });
    highlightVal = earningsData.data[highlightIdx]?.value.toFixed(2) || "0";
  }

  const total = earningsData?.totalEarnings || "0.00 MAD";
  const onlineTime = earningsData?.onlineTime || "0h 0m";
  const trips = earningsData?.totalTrips || "0";

  return (
    <div className="dr-modal-inner" style={{ padding: "1rem" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Earnings</h2>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          backgroundColor: "#f3f4f6",
          borderRadius: "0.8rem",
          padding: "0.35rem",
          margin: "1.5rem 0",
          gap: "0.25rem",
        }}
      >
        {["Today", "Weekly", "Monthly"].map((period) => (
          <button
            key={period}
            onClick={() => setActivePeriod(period)}
            style={{
              flex: 1,
              padding: "0.6rem 0.4rem",
              borderRadius: "0.6rem",
              border: "none",
              backgroundColor:
                activePeriod === period ? "white" : "transparent",
              fontWeight: "700",
              fontSize: "0.85rem",
              color: activePeriod === period ? "#38AC57" : "#6b7280",
              cursor: "pointer",
              boxShadow:
                activePeriod === period ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              minWidth: "80px",
            }}
          >
            {period}
          </button>
        ))}
      </div>
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "1rem",
          padding: "1.5rem",
        }}
      >
        <div style={{ fontSize: "0.9rem", color: "#6b7280" }}>
          Total Earnings
        </div>
        <div
          style={{
            fontSize: "1.8rem",
            fontWeight: "bold",
            marginBottom: "2rem",
          }}
        >
          {total}
        </div>

        <div className="dr-chart-container">
          <div className="dr-chart-inner">
            {bars.length > 0 ? (
              bars.map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.5rem",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: `${h}%`,
                      backgroundColor:
                        i === highlightIdx ? "#38AC57" : "#bbf7d0",
                      borderRadius: "20px",
                      position: "relative",
                      transition: "height 0.4s ease",
                    }}
                  >
                    {i === highlightIdx && (
                      <div
                        style={{
                          position: "absolute",
                          top: "-35px",
                          left: "50%",
                          transform: "translateX(-50%)",
                          backgroundColor: "black",
                          color: "white",
                          padding: "0.4rem 0.6rem",
                          borderRadius: "0.5rem",
                          fontSize: "0.75rem",
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          zIndex: 10,
                          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                        }}
                      >
                        {highlightVal}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "#9ca3af",
                      fontWeight: "500",
                    }}
                  >
                    {labels[i]}
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "2rem",
                  color: "#9ca3af",
                  width: "100%",
                }}
              >
                No earnings data
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dr-edit-grid" style={{ marginTop: "1.5rem" }}>
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "1rem",
            padding: "1rem",
          }}
        >
          <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
            Online Time
          </div>
          <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>
            {onlineTime}
          </div>
        </div>
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "1rem",
            padding: "1rem",
          }}
        >
          <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
            Total Trips
          </div>
          <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>{trips}</div>
        </div>
      </div>
    </div>
  );
};

const TripsHistoryModalContent = ({
  driverId,
  onViewTripSummary,
}: {
  driverId: number;
  onViewTripSummary: (tripIndex: number) => void;
}) => {
  const [activeTab, setActiveTab] = useState("All");
  const [allTrips, setAllTrips] = useState<AdminDriverTrip[]>([]);

  const typeMap: Record<string, string> = {
    All: "all",
    Completed: "completed",
    Cancelled: "cancelled",
  };

  useEffect(() => {
    const fetchTrips = async () => {
      const res = await getDriverTripsApi(driverId, typeMap[activeTab]);
      if (res.ok && res.data.trips.length > 0) {
        setAllTrips(res.data.trips);
        return;
      }

      setAllTrips(getFallbackDriverTrips(typeMap[activeTab]));
    };
    fetchTrips();
  }, [driverId, activeTab]);

  return (
    <div style={{ padding: "1rem" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Trips History</h2>
      <p style={{ color: "#6b7280" }}>Review the trip history</p>

      <div
        className="dr-flex-responsive"
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "1rem",
          padding: "1rem",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>Start Time</div>
          <div style={{ fontWeight: "600" }}>
            {allTrips.length > 0 ? allTrips[0].date || "--" : "--"}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>End Time</div>
          <div style={{ fontWeight: "600" }}>
            {allTrips.length > 0
              ? allTrips[allTrips.length - 1].date || "--"
              : "--"}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          backgroundColor: "#f9fafb",
          borderRadius: "0.5rem",
          padding: "0.3rem",
          marginBottom: "1.5rem",
        }}
      >
        {["All", "Completed", "Cancelled"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: "0.5rem",
              borderRadius: "0.3rem",
              border: "none",
              backgroundColor: activeTab === tab ? "white" : "transparent",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow:
                activeTab === tab ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.2s",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          maxHeight: "500px",
          overflowY: "auto",
        }}
      >
        {allTrips.length === 0 && (
          <div
            style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}
          >
            No {activeTab.toLowerCase()} trips found.
          </div>
        )}
        {allTrips.map((trip, idx) => (
          <div
            key={trip.id || idx}
            onClick={() => onViewTripSummary(trip.id)}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "1rem",
              padding: "1rem",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                "0 4px 12px rgba(0,0,0,0.08)";
              (e.currentTarget as HTMLDivElement).style.borderColor = "#38AC57";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                "0 1px 2px rgba(0,0,0,0.03)";
              (e.currentTarget as HTMLDivElement).style.borderColor = "#e5e7eb";
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "1rem",
              }}
            >
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {Array(5)
                  .fill(0)
                  .map((_, j) => (
                    <Star
                      key={j}
                      size={14}
                      fill={
                        j < Math.floor(trip.rating || 0) ? "#fbbf24" : "#e5e7eb"
                      }
                      stroke="none"
                    />
                  ))}
                <span style={{ fontSize: "0.8rem", fontWeight: "bold" }}>
                  {trip.rating || 0}
                </span>
              </div>
              <span
                style={{
                  backgroundColor:
                    trip.status === "Cancelled" ? "#fee2e2" : "#38AC57",
                  color: trip.status === "Cancelled" ? "#b91c1c" : "white",
                  fontSize: "0.65rem",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "1rem",
                  fontWeight: "bold",
                }}
              >
                {trip.status}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}
              >
                <UserAvatar
                  src={trip.riderAvatar || ""}
                  name={trip.riderName}
                  rating={trip.rating || 0}
                  size={48}
                  showBadge={false}
                />
                <div>
                  <div
                    style={{
                      fontWeight: "bold",
                      fontSize: "0.9rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {trip.riderName || "Unknown Rider"}{" "}
                    <CheckCircle2 size={12} fill="#3b82f6" color="white" />
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                    {trip.date}
                  </div>
                </div>
              </div>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "1rem",
                  fontSize: "0.8rem",
                  fontWeight: "bold",
                }}
              >
                {trip.amount}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.8rem",
                position: "relative",
                paddingLeft: "4px",
              }}
            >
              {/* Vertical dashed line */}
              <div
                style={{
                  position: "absolute",
                  left: "11px",
                  top: "15px",
                  bottom: "15px",
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
                    width: "14px",
                    height: "14px",
                    objectFit: "contain",
                  }}
                />
                <div>
                  <div style={{ fontSize: "0.65rem", color: "#9ca3af" }}>
                    From
                  </div>
                  <div style={{ fontSize: "0.8rem", fontWeight: "bold" }}>
                    {trip.pickupAddress || "N/A"}
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
                    width: "14px",
                    height: "14px",
                    objectFit: "contain",
                  }}
                />
                <div>
                  <div style={{ fontSize: "0.65rem", color: "#9ca3af" }}>
                    To
                  </div>
                  <div style={{ fontSize: "0.8rem", fontWeight: "bold" }}>
                    {trip.dropoffAddress || "N/A"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
// --- Edit Driver Modal Content ---

const EditDriverModalContent = ({
  driver,
  onSave,
}: {
  driver: Driver;
  onSave: () => void;
}) => {
  const [formData, setFormData] = useState({
    name: driver.name,
    phone: driver.phone,
    email: driver.email,
    region: driver.region,
    city: driver.city,
    vehicleColor: driver.vehicleDetails.color,
    plateNumber: driver.vehicleDetails.plate,
    makeModel: driver.vehicleDetails.model,
    year: driver.vehicleDetails.year,
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await updateDriverApi(driver.numericId, {
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      location: formData.city,
    });
    setSaving(false);
    if (res.ok) {
      onSave();
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "0.75rem 1rem",
    borderRadius: "0.75rem",
    border: "1px solid #e5e7eb",
    outline: "none",
    fontSize: "0.9rem",
    fontFamily: "inherit",
    color: "#1f2937",
    backgroundColor: "#f9fafb",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.8rem",
    color: "#6b7280",
    marginBottom: "0.3rem",
    fontWeight: "600" as const,
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2
        style={{
          fontSize: "1.5rem",
          fontWeight: "bold",
          marginBottom: "0.5rem",
        }}
      >
        Edit Driver
      </h2>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
        Update driver profile information
      </p>

      <h3
        style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "1rem" }}
      >
        Personal Information
      </h3>
      <div className="dr-edit-grid" style={{ marginBottom: "1.5rem" }}>
        <div>
          <label style={labelStyle}>Full Name</label>
          <input
            style={inputStyle}
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Phone</label>
          <input
            style={inputStyle}
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input
            style={inputStyle}
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Region</label>
          <select
            style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
            value={formData.region}
            onChange={(e) => handleChange("region", e.target.value)}
          >
            <option>Casablanca-Settat</option>
            <option>Rabat-Salé</option>
            <option>Marrakech-Safi</option>
            <option>Fès-Meknès</option>
            <option>Tanger-Tétouan</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>City</label>
          <select
            style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
            value={formData.city}
            onChange={(e) => handleChange("city", e.target.value)}
          >
            <option>Anakra</option>
            <option>Casablanca</option>
            <option>Rabat</option>
            <option>Marrakech</option>
            <option>Fès</option>
          </select>
        </div>
      </div>

      <h3
        style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "1rem" }}
      >
        Vehicle Information
      </h3>
      <div className="dr-edit-grid" style={{ marginBottom: "2rem" }}>
        <div>
          <label style={labelStyle}>Vehicle Colour</label>
          <input
            style={inputStyle}
            value={formData.vehicleColor}
            onChange={(e) => handleChange("vehicleColor", e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Licence Plate Number</label>
          <input
            style={inputStyle}
            value={formData.plateNumber}
            onChange={(e) => handleChange("plateNumber", e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Make & Model</label>
          <input
            style={inputStyle}
            value={formData.makeModel}
            onChange={(e) => handleChange("makeModel", e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Year</label>
          <input
            style={inputStyle}
            value={formData.year}
            onChange={(e) => handleChange("year", e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: "100%",
          padding: "1rem",
          borderRadius: "2rem",
          border: "none",
          backgroundColor: saving ? "#9ca3af" : "#38AC57",
          color: "white",
          fontWeight: "bold",
          fontSize: "1rem",
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
};

// --- Main Page Component ---

export const Drivers = () => {
  // Data state
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminDriverStats | null>(null);

  // Top Level State
  const [activeStat, setActiveStat] = useState("Rental Company");
  const [searchTerm, setSearchTerm] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [regionFilter, setRegionFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Modal State
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [modalSubView, setModalSubView] = useState<
    "Details" | "Earnings" | "History" | "Edit"
  >("Details");

  // Sub-modal states
  const [showChangeCategoryModal, setShowChangeCategoryModal] = useState(false);
  const [showRidePreferencesModal, setShowRidePreferencesModal] =
    useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showTripSummaryModal, setShowTripSummaryModal] = useState(false);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [selectedTripIndex, setSelectedTripIndex] = useState<number | null>(
    null,
  );

  // Track if filters panel is shown
  const [showFilters, setShowFilters] = useState(true);

  const fetchDrivers = async () => {
    setLoading(true);
    const [statsRes, listRes] = await Promise.all([
      getAdminDriverStatsApi(),
      getAdminDriverListApi({ page: 1, limit: 100 }),
    ]);
    if (statsRes.ok) setStats(statsRes.data);
    if (listRes.ok) {
      const mapped: Driver[] = listRes.data.drivers.map((d: any) => ({
        id: d.idNumber,
        numericId: d.id,
        driverId: d.idNumber,
        name: d.name,
        email: d.email || "",
        phone: d.phone || "",
        avatar: d.avatar || "",
        rating: d.rating || 0,
        location: d.location || "",
        vehicleType: d.vehicleType || "Car",
        vehicleDetails: {
          brand: d.vehicleType || "",
          color: "",
          plate: "",
          model: "",
          year: "",
        },
        totalTrips: d.totalTrips || 0,
        status: d.status || "Active",
        joinDate: d.joinDate || "",
        documentStatus: d.isVerified
          ? ("Verified" as const)
          : ("Pending" as const),
        city: d.city || "",
        region: d.city || "",
        stats: {
          cancelationRate: "0%",
          acceptanceRate: "0%",
          onlineTime: "0h",
        },
      }));
      setDrivers(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  // Count of active filters
  const activeFilterCount = [
    statusFilter,
    regionFilter,
    cityFilter,
    categoryFilter,
  ].filter((f) => f !== "All").length;

  const clearAllFilters = () => {
    setStatusFilter("All");
    setRegionFilter("All");
    setCityFilter("All");
    setCategoryFilter("All");
    setSearchTerm("");
  };

  const filteredDrivers = drivers.filter((driver) => {
    // Search — match against name, ID, driverId, email, or phone
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        driver.name.toLowerCase().includes(term) ||
        driver.id.toLowerCase().includes(term) ||
        driver.driverId.toLowerCase().includes(term) ||
        driver.email.toLowerCase().includes(term) ||
        driver.phone.includes(term);
      if (!matchesSearch) return false;
    }

    // Stats Filter — vehicle type category cards
    if (activeStat === "Taxi Drivers" && driver.vehicleType !== "Taxi")
      return false;
    if (
      activeStat === "Motorcycle Drivers" &&
      driver.vehicleType !== "Motorcycle"
    )
      return false;
    if (activeStat === "Car Drivers" && driver.vehicleType !== "Car")
      return false;

    // Dropdown Filters
    if (statusFilter !== "All" && driver.status !== statusFilter) return false;
    if (regionFilter !== "All" && driver.region !== regionFilter) return false;
    if (cityFilter !== "All" && driver.city !== cityFilter) return false;
    if (
      categoryFilter !== "All" &&
      driver.vehicleDetails.brand !== categoryFilter
    )
      return false;

    return true;
  });

  if (loading) return <PageLoader label="Loading drivers..." />;

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
                .dr-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1.5rem;
                }
                .dr-controls-container {
                    display: flex;
                    gap: 1rem;
                    flex-wrap: wrap;
                    align-items: center;
                }
                .dr-table-container {
                    width: 100%;
                    overflow-x: auto;
                    border-radius: 1rem;
                    background: transparent;
                }
                .dr-table-header {
                    display: grid;
                    grid-template-columns: 1fr 2fr 2fr 1.5fr 1fr 1fr 1fr;
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
                .dr-table-row {
                    display: grid;
                    grid-template-columns: 1fr 2fr 2fr 1.5fr 1fr 1fr 1fr;
                    background-color: white;
                    padding: 1rem;
                    border-radius: 1rem;
                    align-items: center;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                    min-width: 1000px;
                }

                .dr-modal-overlay {
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
                .dr-modal-content {
                    width: 850px;
                    max-width: 100%;
                    background-color: white;
                    border-radius: 2rem;
                    padding: 0;
                    max-height: 95vh;
                    overflow-y: auto;
                    position: relative;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                }
                .dr-info-grid {
                    display: grid;
                    grid-template-columns: 1.2fr 1.8fr 1.2fr 1fr;
                    gap: 1.5rem;
                }
                .dr-vehicle-grid {
                    display: grid;
                    grid-template-columns: 1.5fr 1fr 1.2fr 1.2fr;
                    gap: 1.5rem;
                }
                .dr-footer-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: space-between;
                    align-items: center;
                }
                .dr-flex-responsive {
                    display: flex;
                    gap: 1.5rem;
                }
                .dr-edit-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }

                @media (max-width: 1024px) {
                    .dr-stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    .dr-info-grid, .dr-vehicle-grid {
                        grid-template-columns: 1fr 1fr;
                    }
                }

                @media (max-width: 768px) {
                    .dr-modal-content {
                        padding: 0;
                    }
                    .dr-modal-inner {
                        padding: 1.5rem !important;
                    }
                    .dr-controls-container {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .dr-controls-container > div {
                        width: 100% !important;
                    }
                    .dr-flex-responsive {
                        flex-direction: column;
                        align-items: flex-start;
                        text-align: left;
                    }
                    .dr-info-grid, .dr-vehicle-grid, .dr-edit-grid {
                        grid-template-columns: 1fr;
                    }
                    .dr-footer-actions {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .dr-header-actions {
                        flex-direction: column;
                        gap: 1rem;
                    }
                }

                @media (max-width: 480px) {
                    .dr-stats-grid {
                        grid-template-columns: 1fr;
                    }
                }
                .dr-chart-container {
                    width: 100%;
                    overflow-x: auto;
                    padding-bottom: 1rem;
                }
                .dr-chart-inner {
                    min-width: 500px;
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    height: 200px;
                    gap: 10px;
                }
            `}</style>

      {/* Header Area */}
      <div
        className="dr-header-actions"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.8rem",
              fontWeight: "bold",
              margin: "0 0 0.5rem 0",
            }}
          >
            Driver
          </h1>
          <p style={{ color: "#6b7280", margin: 0 }}>
            Manage driver accounts and generate IDs by vehicle type
          </p>
        </div>
        <button
          onClick={() => setShowAddDriverModal(true)}
          style={{
            backgroundColor: "#38AC57",
            color: "white",
            border: "none",
            padding: "0.8rem 1.5rem",
            borderRadius: "2rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontWeight: "600",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          <Plus size={20} /> Add New Drivers
        </button>
      </div>

      {/* Stats Cards */}
      <div className="dr-stats-grid">
        {[
          {
            label: "Taxi Drivers",
            count: String(stats?.taxiDrivers || 0).padStart(4, "0"),
            icon: taxiIcon,
            activeName: "Taxi Drivers",
          },
          {
            label: "Motorcycle Drivers",
            count: String(stats?.motorcycleDrivers || 0).padStart(4, "0"),
            icon: bikeIcon,
            activeName: "Motorcycle Drivers",
          },
          {
            label: "Car Drivers",
            count: String(stats?.carDrivers || 0).padStart(4, "0"),
            icon: carIcon,
            activeName: "Car Drivers",
          },
          {
            label: "Rental Company",
            count: String(stats?.rentalCompany || drivers.length).padStart(
              4,
              "0",
            ),
            icon: carIcon,
            activeName: "Rental Company",
          },
        ].map((stat) => {
          const isActive = activeStat === stat.activeName;
          return (
            <div
              key={stat.activeName}
              onClick={() =>
                setActiveStat(isActive ? "Rental Company" : stat.activeName)
              }
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
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <div style={{ color: isActive ? "white" : "#6b7280" }}>
                  <img
                    src={stat.icon}
                    alt=""
                    style={{
                      height: "32px",
                      width: "auto",
                      objectFit: "contain",
                      filter: isActive ? "brightness(0) invert(1)" : "none",
                    }}
                  />
                </div>
                <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>
                  {stat.label}
                </span>
              </div>
              <div style={{ fontSize: "2.5rem", fontWeight: "bold" }}>
                {stat.count}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "0.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.7rem",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  View Details
                </span>
                <div
                  style={{
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
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div className="dr-controls-container">
          <div style={{ position: "relative", width: "250px", flexShrink: 0 }}>
            <Search
              size={18}
              color="#9ca3af"
              style={{
                position: "absolute",
                left: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 1,
              }}
            />
            <input
              type="text"
              placeholder="Search drivers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "0.7rem 1rem 0.7rem 2.8rem",
                borderRadius: "2rem",
                border: "1px solid #e5e7eb",
                outline: "none",
                fontSize: "0.85rem",
                color: "#1f2937",
                backgroundColor: "white",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: "2rem",
              border:
                activeFilterCount > 0
                  ? "1px solid #38AC57"
                  : "1px solid #e5e7eb",
              backgroundColor:
                activeFilterCount > 0
                  ? "#eef7f0"
                  : showFilters
                    ? "#f3f4f6"
                    : "white",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.85rem",
              color: activeFilterCount > 0 ? "#2d8a46" : "#374151",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "all 0.2s",
            }}
          >
            <Filter size={14} /> Filters
            {activeFilterCount > 0 && (
              <span
                style={{
                  backgroundColor: "#38AC57",
                  color: "white",
                  borderRadius: "50%",
                  width: 20,
                  height: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.7rem",
                  fontWeight: "bold",
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
          {showFilters && (
            <>
              <Dropdown
                label="Status"
                options={["Active", "Suspended"]}
                activeValue={statusFilter}
                onSelect={setStatusFilter}
              />
              <Dropdown
                label="Regions"
                options={["Casablanca-Settat", "Rabat-Salé", "Marrakech-Safi"]}
                activeValue={regionFilter}
                onSelect={setRegionFilter}
              />
              <Dropdown
                label="City"
                options={["Anakra", "Casablanca", "Rabat", "Marrakech"]}
                activeValue={cityFilter}
                onSelect={setCityFilter}
              />
              <Dropdown
                label="Category"
                options={[
                  "Hezzni Standard",
                  "Hezzni Comfort",
                  "Hezzni XL",
                  "Hezzni Moto",
                  "Hezzni Taxi",
                ]}
                activeValue={categoryFilter}
                onSelect={setCategoryFilter}
              />
            </>
          )}
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "2rem",
                border: "none",
                backgroundColor: "#fee2e2",
                color: "#b91c1c",
                fontSize: "0.8rem",
                fontWeight: "600",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Clear All
            </button>
          )}
        </div>
        {activeFilterCount > 0 && (
          <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
            Showing{" "}
            <strong style={{ color: "#1f2937" }}>
              {filteredDrivers.length}
            </strong>{" "}
            of <strong style={{ color: "#1f2937" }}>{drivers.length}</strong>{" "}
            drivers
          </div>
        )}
      </div>

      {/* Table */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "0.5rem",
          }}
        >
          <h2 style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
            Driver Management Overview
          </h2>
        </div>
        <p
          style={{
            color: "#6b7280",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
          }}
        >
          Manage driver accounts and generate IDs by vehicle type
        </p>

        <div className="dr-table-container">
          {/* Header */}
          <div className="dr-table-header">
            <div>Driver ID</div>
            <div>Driver</div>
            <div>Contact</div>
            <div>Vehicle</div>
            <div style={{ textAlign: "center" }}>Total Trips</div>
            <div style={{ textAlign: "center" }}>Status</div>
            <div style={{ textAlign: "center" }}>Action</div>
          </div>

          {/* Rows */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}
          >
            {filteredDrivers.length === 0 ? (
              <div
                style={{
                  backgroundColor: "white",
                  padding: "3rem",
                  borderRadius: "1rem",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
                  🔍
                </div>
                <h3
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: "bold",
                    margin: "0 0 0.5rem 0",
                  }}
                >
                  No drivers found
                </h3>
                <p style={{ color: "#6b7280", margin: "0 0 1rem 0" }}>
                  Try adjusting your search or filter criteria
                </p>
                <button
                  onClick={clearAllFilters}
                  style={{
                    padding: "0.6rem 1.5rem",
                    borderRadius: "2rem",
                    border: "none",
                    backgroundColor: "#38AC57",
                    color: "white",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              filteredDrivers.map((driver, idx) => (
                <div key={idx} className="dr-table-row">
                  <div style={{ fontWeight: "bold", fontSize: "0.95rem" }}>
                    {driver.id}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.8rem",
                    }}
                  >
                    <UserAvatar
                      src={driver.avatar}
                      name={driver.name}
                      rating={driver.rating}
                      size={48}
                      showBadge={true}
                    />
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>
                        {driver.name}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                        {driver.location}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
                      {driver.phone}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                      {driver.email}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                    }}
                  >
                    {driver.vehicleType === "Car" ? (
                      <img
                        src={carIcon}
                        alt=""
                        style={{ height: "20px", width: "auto" }}
                      />
                    ) : driver.vehicleType === "Taxi" ? (
                      <img
                        src={taxiIcon}
                        alt=""
                        style={{ height: "20px", width: "auto" }}
                      />
                    ) : (
                      <img
                        src={bikeIcon}
                        alt=""
                        style={{ height: "20px", width: "auto" }}
                      />
                    )}
                    {driver.vehicleType}
                  </div>
                  <div
                    style={{
                      textAlign: "center",
                      fontWeight: "bold",
                      fontSize: "1rem",
                    }}
                  >
                    {driver.totalTrips}
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <StatusBadge status={driver.status} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <button
                      onClick={() => {
                        setSelectedDriver(driver);
                        setModalSubView("Details");
                      }}
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
      </div>

      {/* Main Modal */}
      {selectedDriver && (
        <div
          className="dr-modal-overlay"
          onClick={() => setSelectedDriver(null)}
        >
          <div
            className="dr-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Navigation/Header */}
            <div
              className="dr-modal-inner"
              style={{ padding: "2rem 2rem 1rem 2rem" }}
            >
              <button
                onClick={
                  modalSubView === "Details"
                    ? () => setSelectedDriver(null)
                    : () => setModalSubView("Details")
                }
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  marginBottom: "1rem",
                }}
              >
                <ArrowLeft size={24} />
              </button>

              {modalSubView === "Details" && (
                <>
                  <h2
                    style={{
                      fontSize: "1.8rem",
                      fontWeight: "bold",
                      margin: 0,
                    }}
                  >
                    Driver Details
                  </h2>
                  <p style={{ color: "#6b7280", marginTop: "0.5rem" }}>
                    Driver profile information
                  </p>

                  <h3
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: "bold",
                      marginTop: "1.5rem",
                      marginBottom: "1rem",
                    }}
                  >
                    Driver Information
                  </h3>

                  <div
                    style={{
                      border: "1px solid #f3f4f6",
                      borderRadius: "1rem",
                      padding: "1.5rem",
                    }}
                  >
                    <div className="dr-flex-responsive">
                      <div style={{ flexShrink: 0 }}>
                        <UserAvatar
                          src={selectedDriver.avatar}
                          name={selectedDriver.name}
                          rating={selectedDriver.rating}
                          size={64}
                          showBadge={true}
                        />
                      </div>
                      <div className="dr-info-grid" style={{ flex: 1 }}>
                        <div style={{ gridColumn: "span 1" }}>
                          <div
                            style={{ fontSize: "0.75rem", color: "#9ca3af" }}
                          >
                            Full Name
                          </div>
                          <div
                            style={{ fontWeight: "bold", fontSize: "0.9rem" }}
                          >
                            {selectedDriver.name}
                          </div>
                        </div>
                        <div style={{ gridColumn: "span 1" }}>
                          <div
                            style={{ fontSize: "0.75rem", color: "#9ca3af" }}
                          >
                            Region
                          </div>
                          <div
                            style={{ fontWeight: "bold", fontSize: "0.9rem" }}
                          >
                            {selectedDriver.region}
                          </div>
                        </div>
                        <div style={{ gridColumn: "span 1" }}>
                          <div
                            style={{ fontSize: "0.75rem", color: "#9ca3af" }}
                          >
                            City
                          </div>
                          <div
                            style={{ fontWeight: "bold", fontSize: "0.9rem" }}
                          >
                            {selectedDriver.city}
                          </div>
                        </div>
                        <div style={{ gridColumn: "span 1" }}>
                          <div
                            style={{ fontSize: "0.75rem", color: "#9ca3af" }}
                          >
                            Total Trips
                          </div>
                          <div
                            style={{ fontWeight: "bold", fontSize: "0.9rem" }}
                          >
                            256
                          </div>
                        </div>

                        <div style={{ gridColumn: "span 2" }}>
                          <div
                            style={{ fontSize: "0.75rem", color: "#9ca3af" }}
                          >
                            Address
                          </div>
                          <div
                            style={{ fontWeight: "bold", fontSize: "0.9rem" }}
                          >
                            783 Brant St Settat ON L7R 2J2
                          </div>
                        </div>
                        <div style={{ gridColumn: "span 1" }}>
                          <div
                            style={{ fontSize: "0.75rem", color: "#9ca3af" }}
                          >
                            Phone
                          </div>
                          <div
                            style={{ fontWeight: "bold", fontSize: "0.9rem" }}
                          >
                            {selectedDriver.phone
                              .split(" ")
                              .slice(0, 4)
                              .join(" ")}
                          </div>
                        </div>
                        <div style={{ gridColumn: "span 1" }}>
                          <div
                            style={{ fontSize: "0.75rem", color: "#9ca3af" }}
                          >
                            Current Status
                          </div>
                          <StatusBadge status={selectedDriver.status} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <h3
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: "bold",
                      marginTop: "1.5rem",
                      marginBottom: "1rem",
                    }}
                  >
                    Vehicle Information
                  </h3>
                  <div
                    style={{
                      border: "1px solid #f3f4f6",
                      borderRadius: "1rem",
                      padding: "1.5rem",
                    }}
                  >
                    <div className="dr-vehicle-grid">
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                          Driver ID
                        </div>
                        <div style={{ fontWeight: "bold" }}>
                          {selectedDriver.driverId}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                          Vehicle Colour
                        </div>
                        <div
                          style={{
                            fontWeight: "bold",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3rem",
                          }}
                        >
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              border: "1px solid #ccc",
                              backgroundColor:
                                selectedDriver.vehicleDetails.color,
                            }}
                          ></div>{" "}
                          {selectedDriver.vehicleDetails.color}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                          Licence Plate Num
                        </div>
                        <div style={{ fontWeight: "bold" }}>
                          {selectedDriver.vehicleDetails.plate}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                          Make & Mode
                        </div>
                        <div style={{ fontWeight: "bold" }}>
                          {selectedDriver.vehicleDetails.model}
                        </div>
                      </div>

                      <div style={{ gridColumn: "span 2" }}>
                        <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                          Vehicle Type
                        </div>
                        <div
                          style={{
                            fontWeight: "bold",
                            display: "flex",
                            gap: "0.3rem",
                            alignItems: "center",
                          }}
                        >
                          {selectedDriver.vehicleType === "Car" ? (
                            <img
                              src={carIcon}
                              alt=""
                              style={{ height: "32px", width: "auto" }}
                            />
                          ) : selectedDriver.vehicleType === "Taxi" ? (
                            <img
                              src={taxiIcon}
                              alt=""
                              style={{ height: "32px", width: "auto" }}
                            />
                          ) : (
                            <img
                              src={bikeIcon}
                              alt=""
                              style={{ height: "32px", width: "auto" }}
                            />
                          )}
                          {selectedDriver.vehicleDetails.brand}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                          Year
                        </div>
                        <div style={{ fontWeight: "bold" }}>
                          {selectedDriver.vehicleDetails.year}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className="dr-flex-responsive"
                    style={{
                      backgroundColor: "#eef7f0",
                      borderRadius: "1rem",
                      padding: "1.5rem",
                      marginTop: "1.5rem",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ textAlign: "inherit" }}>
                      <h3
                        style={{
                          fontSize: "1rem",
                          fontWeight: "bold",
                          margin: "0 0 0.5rem 0",
                        }}
                      >
                        Hezzni Service Category
                      </h3>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "#2d8a46",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Current Category:
                      </div>
                      <div
                        style={{
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          justifyContent: "inherit",
                        }}
                      >
                        {selectedDriver.vehicleType === "Car" ? (
                          <img
                            src={carIcon}
                            alt=""
                            style={{ height: "20px", width: "auto" }}
                          />
                        ) : selectedDriver.vehicleType === "Taxi" ? (
                          <img
                            src={taxiIcon}
                            alt=""
                            style={{ height: "20px", width: "auto" }}
                          />
                        ) : (
                          <img
                            src={bikeIcon}
                            alt=""
                            style={{ height: "20px", width: "auto" }}
                          />
                        )}
                        {selectedDriver.vehicleType === "Car"
                          ? "Car"
                          : "Hezzni Standard"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <button
                        onClick={() => {
                          if (selectedDriver.vehicleType === "Motorcycle") {
                            setShowRidePreferencesModal(true);
                          } else {
                            setShowChangeCategoryModal(true);
                          }
                        }}
                        style={{
                          backgroundColor: "white",
                          border: "1px solid #38AC57",
                          padding: "0.5rem 1rem",
                          borderRadius: "2rem",
                          fontSize: "0.7rem",
                          fontWeight: "bold",
                          cursor: "pointer",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Change Category
                      </button>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "#2d8a46",
                          maxWidth: "200px",
                        }}
                      >
                        Category determines pricing and service level for this
                        driver
                      </div>
                    </div>
                  </div>

                  <h3
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: "bold",
                      marginTop: "1.5rem",
                      marginBottom: "1rem",
                    }}
                  >
                    Account Information
                  </h3>
                  <div
                    className="dr-flex-responsive"
                    style={{
                      border: "1px solid #f3f4f6",
                      borderRadius: "1rem",
                      padding: "1.5rem",
                      gap: "4rem",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                        Join Date
                      </div>
                      <div style={{ fontWeight: "bold" }}>
                        {selectedDriver.joinDate}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                        Document Status
                      </div>
                      <div style={{ fontWeight: "bold" }}>
                        {selectedDriver.documentStatus}
                      </div>
                    </div>
                  </div>

                  {selectedDriver.status === "Suspended" && (
                    <div
                      style={{
                        backgroundColor: "#fee2e2",
                        borderRadius: "1rem",
                        padding: "1.5rem",
                        marginTop: "1.5rem",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "1rem",
                          fontWeight: "bold",
                          color: "#7f1d1d",
                          margin: "0 0 0.5rem 0",
                        }}
                      >
                        Suspension Details
                      </h3>
                      <div style={{ fontSize: "0.85rem", color: "#7f1d1d" }}>
                        <span style={{ fontWeight: "bold" }}>Reason:</span>{" "}
                        {selectedDriver.suspension?.reason}
                        <span
                          style={{ marginLeft: "1rem", fontWeight: "bold" }}
                        >
                          Suspended Until:
                        </span>{" "}
                        {selectedDriver.suspension?.until}
                      </div>
                    </div>
                  )}

                  <div
                    className="dr-edit-grid"
                    style={{ marginTop: "2rem", marginBottom: "2rem" }}
                  >
                    <div>
                      <div style={{ fontSize: "2.5rem", fontWeight: "bold" }}>
                        {selectedDriver.stats.cancelationRate}
                      </div>
                      <div style={{ fontSize: "0.9rem" }}>Cancelation Rate</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "2.5rem", fontWeight: "bold" }}>
                        {selectedDriver.stats.acceptanceRate}
                      </div>
                      <div style={{ fontSize: "0.9rem" }}>Acceptance Rate</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="dr-footer-actions">
                    <button
                      onClick={() => setModalSubView("Edit")}
                      style={{
                        flex: 1,
                        padding: "0.8rem",
                        borderRadius: "2rem",
                        border: "1px solid #e5e7eb",
                        backgroundColor: "white",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setModalSubView("Earnings")}
                      style={{
                        flex: 1,
                        padding: "0.8rem",
                        borderRadius: "2rem",
                        border: "none",
                        backgroundColor: "black",
                        color: "white",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      Earning
                    </button>
                    <button
                      onClick={() => setModalSubView("History")}
                      style={{
                        flex: 1,
                        padding: "0.8rem",
                        borderRadius: "2rem",
                        border: "none",
                        backgroundColor: "#38AC57",
                        color: "white",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      Trips history
                    </button>
                    <button
                      onClick={() => {
                        if (selectedDriver.status !== "Suspended") {
                          setShowSuspendModal(true);
                        } else {
                          activateDriverApi(selectedDriver.numericId).then(
                            (res) => {
                              if (res.ok) {
                                fetchDrivers();
                                setSelectedDriver(null);
                              }
                            },
                          );
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: "0.8rem",
                        borderRadius: "2rem",
                        border: "none",
                        backgroundColor: "#b91c1c",
                        color: "white",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      {selectedDriver.status === "Suspended"
                        ? "Unsuspend Driver"
                        : "Suspend Driver"}
                    </button>
                  </div>
                </>
              )}

              {modalSubView === "Earnings" && (
                <EarningsModalContent driverId={selectedDriver.numericId} />
              )}

              {modalSubView === "History" && (
                <TripsHistoryModalContent
                  driverId={selectedDriver.numericId}
                  onViewTripSummary={(tripIdx) => {
                    setSelectedTripIndex(tripIdx);
                    setShowTripSummaryModal(true);
                  }}
                />
              )}

              {modalSubView === "Edit" && selectedDriver && (
                <EditDriverModalContent
                  driver={selectedDriver}
                  onSave={() => setModalSubView("Details")}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modals */}
      {showChangeCategoryModal && (
        <ChangeCategoryModal
          onClose={() => setShowChangeCategoryModal(false)}
          driver={selectedDriver}
        />
      )}
      {showRidePreferencesModal && (
        <RidePreferencesModal
          onClose={() => setShowRidePreferencesModal(false)}
        />
      )}
      {showSuspendModal && selectedDriver && (
        <SuspendDriverModal
          onClose={() => setShowSuspendModal(false)}
          driver={selectedDriver}
          onSuccess={() => {
            setShowSuspendModal(false);
            setSelectedDriver(null);
            fetchDrivers();
          }}
        />
      )}
      {showTripSummaryModal && (
        <TripSummaryModal
          onClose={() => setShowTripSummaryModal(false)}
          trip={{ index: selectedTripIndex }}
        />
      )}
      {showAddDriverModal && (
        <AddDriverModal
          onClose={() => {
            setShowAddDriverModal(false);
            fetchDrivers();
          }}
        />
      )}
    </div>
  );
};
