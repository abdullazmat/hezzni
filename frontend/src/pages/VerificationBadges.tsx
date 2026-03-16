import { useState, useRef, useEffect } from "react";
import {
  Search,
  Eye,
  X,
  ArrowLeft,
  Check,
  ChevronDown,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";
import { UserAvatar } from "../components/UserAvatar";
import { PageLoader } from "../components/PageLoader";
import {
  getVerificationStatsApi,
  getVerificationSettingsApi,
  updateVerificationSettingsApi,
  getVerificationCitiesApi,
  getVerificationUsersApi,
  manualBadgeActionApi,
  getBadgeProfileApi,
  resolveApiAssetUrl,
  type VerificationStats,
  type BadgeSettings,
  type VerificationUser,
  type BadgeProfile,
  type LiveTripsFilterOption,
} from "../services/api";

// Specialized Icons
import totalRidersDriversIcon from "../assets/icons/Total Riders  Drivers.png";
import totalVerifiedIcon from "../assets/icons/Total Verified.png";
import verifiedBadgeIcon from "../assets/icons/Verified Drivers-Passengers.png";

const modalLabelStyle: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "#8b95a7",
  marginBottom: "0.25rem",
  fontWeight: 500,
};

const modalValueStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "0.98rem",
  color: "#182338",
};

// --- Icons / Sub-components ---

const VerifiedBadge = () => (
  <div
    style={{
      backgroundColor: "#eef7f0",
      color: "#38AC57",
      padding: "0.4rem 1rem",
      borderRadius: "2rem",
      fontSize: "0.8rem",
      fontWeight: "600",
      textAlign: "center",
      width: "fit-content",
    }}
  >
    Verified
  </div>
);

const UnverifiedBadge = () => (
  <div
    style={{
      backgroundColor: "#fee2e2",
      color: "#ef4444",
      padding: "0.4rem 1rem",
      borderRadius: "2rem",
      fontSize: "0.8rem",
      fontWeight: "600",
      textAlign: "center",
      width: "fit-content",
    }}
  >
    Unverified
  </div>
);

const UserTypeBadge = ({ type }: { type: "Driver" | "Passenger" }) => (
  <div
    style={{
      backgroundColor: type === "Driver" ? "#eef7f0" : "#eef7f0",
      color: "#2d8a46",
      padding: "0.25rem 0.75rem",
      borderRadius: "1rem",
      fontSize: "0.75rem",
      fontWeight: "600",
      border: "1px solid #bbf7d0",
      display: "inline-block",
    }}
  >
    {type}
  </div>
);

// --- Custom Dropdown Component ---
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

// --- Main Component ---

export const VerificationBadges = () => {
  // Filter States
  const [statusFilter, setStatusFilter] = useState("All");
  const [userTypeFilter, setUserTypeFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeStat, setActiveStat] = useState<string | null>("TotalUsers");

  // Modal States
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<BadgeProfile | null>(
    null,
  );
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);

  // API Data States
  const [stats, setStats] = useState<VerificationStats>({
    totalUsers: 0,
    totalVerified: 0,
    verifiedDrivers: 0,
    verifiedPassengers: 0,
  });
  const [users, setUsers] = useState<VerificationUser[]>([]);
  const [cities, setCities] = useState<LiveTripsFilterOption[]>([]);
  const [badgeSettings, setBadgeSettings] = useState<BadgeSettings>({
    driver: { minTrips: 100, minRating: 4.5, minAcceptance: 85 },
    passenger: { minTrips: 100, minRating: 4.5 },
  });
  const [editSettings, setEditSettings] = useState<BadgeSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBadgeActionLoading, setIsBadgeActionLoading] = useState(false);

  const resolveImageUrl = (url: string | null) => {
    if (!url) return "";
    return resolveApiAssetUrl(url);
  };

  const formatModalDate = (value: string | null) => {
    if (!value || value === "—") return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getBadgeStatusCopy = (profile: BadgeProfile) =>
    profile.isVerified ? "Verified" : "Not verified";

  // Load filter options + settings on mount
  useEffect(() => {
    let cancelled = false;
    const loadFilters = async () => {
      const [citiesRes, settingsRes] = await Promise.all([
        getVerificationCitiesApi(),
        getVerificationSettingsApi(),
      ]);
      if (cancelled) return;
      if (citiesRes.ok) setCities(citiesRes.data);
      if (settingsRes.ok) setBadgeSettings(settingsRes.data);
    };
    void loadFilters();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load users & stats when filters change
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      const query: Record<string, string | number | undefined> = {};
      if (cityFilter !== "All") {
        const city = cities.find((c) => c.name === cityFilter);
        if (city) query.cityId = city.id;
      }
      if (statusFilter !== "All")
        query.status = statusFilter as "Verified" | "Unverified";
      if (userTypeFilter !== "All")
        query.userType = userTypeFilter as "Driver" | "Passenger";
      if (searchTerm.trim()) query.search = searchTerm.trim();

      const [statsRes, usersRes] = await Promise.all([
        getVerificationStatsApi(),
        getVerificationUsersApi(query as any),
      ]);
      if (cancelled) return;
      if (statsRes.ok) setStats(statsRes.data);
      if (usersRes.ok) setUsers(usersRes.data);
      setIsLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [cityFilter, statusFilter, userTypeFilter, searchTerm, cities]);

  // Handlers
  const handlePreview = async (user: VerificationUser) => {
    const key = `${user.userType}-${user.id}`;
    setPreviewUserId(key);
    const res = await getBadgeProfileApi(user.userType, user.id);
    setPreviewUserId(null);
    if (res.ok) setSelectedProfile(res.data);
  };

  const handleToggleBadge = async () => {
    if (!selectedProfile) return;
    setIsBadgeActionLoading(true);
    const action = selectedProfile.isVerified ? "remove" : "grant";
    const res = await manualBadgeActionApi(
      selectedProfile.userType,
      selectedProfile.id,
      action,
    );
    setIsBadgeActionLoading(false);
    if (res.ok) {
      // Refresh profile & list
      const profileRes = await getBadgeProfileApi(
        selectedProfile.userType,
        selectedProfile.id,
      );
      if (profileRes.ok) setSelectedProfile(profileRes.data);
      // Refresh users list
      const query: Record<string, string | number | undefined> = {};
      if (cityFilter !== "All") {
        const city = cities.find((c) => c.name === cityFilter);
        if (city) query.cityId = city.id;
      }
      if (statusFilter !== "All")
        query.status = statusFilter as "Verified" | "Unverified";
      if (userTypeFilter !== "All")
        query.userType = userTypeFilter as "Driver" | "Passenger";
      if (searchTerm.trim()) query.search = searchTerm.trim();
      const [statsRes, usersRes] = await Promise.all([
        getVerificationStatsApi(),
        getVerificationUsersApi(query as any),
      ]);
      if (statsRes.ok) setStats(statsRes.data);
      if (usersRes.ok) setUsers(usersRes.data);
    }
  };

  const handleOpenSettings = async () => {
    const res = await getVerificationSettingsApi();
    if (res.ok) {
      setBadgeSettings(res.data);
      setEditSettings(res.data);
    }
    setShowSettingsModal(true);
  };

  const handleSaveSettings = async () => {
    if (!editSettings) return;
    const res = await updateVerificationSettingsApi(editSettings);
    if (res.ok) {
      setBadgeSettings(editSettings);
      setShowSettingsModal(false);
      setEditSettings(null);
    }
  };

  const handleStatClick = (stat: string) => {
    setActiveStat(activeStat === stat ? null : stat);
  };

  // Client-side stat card filtering (applied after API filters)
  const displayedUsers = users.filter((u) => {
    if (activeStat === "TotalVerified" && !u.isVerified) return false;
    if (
      activeStat === "VerifiedDrivers" &&
      (!u.isVerified || u.userType !== "Driver")
    )
      return false;
    if (
      activeStat === "VerifiedPassengers" &&
      (!u.isVerified || u.userType !== "Passenger")
    )
      return false;
    return true;
  });

  if (isLoading) return <PageLoader />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <style>{`
                .vb-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1.5rem;
                }
                .vb-controls-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 1.5rem;
                }
                .vb-filters-group {
                    display: flex;
                    gap: 1rem;
                    flex-wrap: wrap;
                    flex: 1;
                }
                .vb-table-container {
                    width: 100%;
                    overflow-x: auto;
                    border-radius: 1rem;
                    background: white;
                }
                .vb-modal-overlay {
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
                }
                .vb-settings-modal {
                    width: 600px;
                    max-width: 95%;
                    background-color: white;
                    border-radius: 1.5rem;
                    padding: 2.5rem;
                    max-height: 90vh;
                    overflow-y: auto;
                    z-index: 9999;
                }
                .vb-preview-modal {
                  width: 760px;
                    max-width: 100%;
                    background-color: #fdfdfd;
                    border-radius: 1.5rem;
                  padding: 1.75rem;
                    max-height: 95vh;
                    overflow-y: auto;
                    position: relative;
                    z-index: 9999;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
                }
                .vb-info-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                  gap: 1rem 1.5rem;
                }
                .vb-metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                  gap: 1rem;
                }
                .vb-flex-responsive {
                    display: flex;
                  gap: 1.25rem;
                  align-items: flex-start;
                }
                .vb-detail-card {
                  background-color: white;
                  padding: 1.25rem;
                  border-radius: 1rem;
                  border: 1px solid #edf1f5;
                  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
                  margin-bottom: 1.5rem;
                }
                .vb-section-title {
                  font-size: 1rem;
                  font-weight: 800;
                  margin-bottom: 0.75rem;
                  color: #1f2937;
                }
                .vb-settings-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1rem;
                }
                .vb-settings-grid-2 {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                }
                
                @media (max-width: 1200px) {
                    .vb-stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    .vb-metrics-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }

                @media (max-width: 992px) {
                    .vb-preview-modal {
                      padding: 1.25rem;
                        max-width: 95%;
                    }
                    .vb-info-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 1.5rem;
                    }
                }

                @media (max-width: 768px) {
                    .vb-stats-grid {
                        grid-template-columns: 1fr;
                    }
                    .vb-controls-container {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .vb-filters-group {
                        flex-direction: column;
                    }
                    .vb-filters-group > div, 
                    .vb-filters-group > button,
                    .vb-filters-group input {
                        width: 100% !important;
                    }
                    .vb-flex-responsive {
                        flex-direction: column;
                        align-items: flex-start;
                        text-align: left;
                        gap: 1.5rem;
                    }
                    .vb-info-grid {
                        grid-template-columns: 1fr;
                        text-align: left;
                    }
                    .vb-metrics-grid {
                        grid-template-columns: 1fr;
                        text-align: left;
                    }
                    .vb-settings-grid, .vb-settings-grid-2 {
                        grid-template-columns: 1fr;
                    }
                    .vb-modal-footer {
                        flex-direction: column;
                    }
                    .vb-modal-footer button {
                        width: 100%;
                    }
                    .vb-status-banner {
                        flex-direction: column;
                        gap: 1.5rem;
                        text-align: left;
                        align-items: flex-start !important;
                    }
                    .vb-status-banner > div {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 0.5rem;
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
          Verification badges
        </h1>
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>
          Monitor all trip types across Hezzni's transportation services
        </p>
      </div>

      {/* Stats Cards */}
      <div className="vb-stats-grid">
        <div
          onClick={() => handleStatClick("TotalUsers")}
          style={{
            padding: "1.25rem",
            borderRadius: "1.5rem",
            backgroundColor: activeStat === "TotalUsers" ? "#38AC57" : "white",
            color: activeStat === "TotalUsers" ? "white" : "black",
            position: "relative",
            boxShadow:
              activeStat === "TotalUsers"
                ? "0 10px 15px -3px rgba(56, 172, 87, 0.4)"
                : "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "140px",
            cursor: "pointer",
            transition: "all 0.2s",
            transform:
              activeStat === "TotalUsers" ? "translateY(-2px)" : "none",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <img
              src={totalRidersDriversIcon}
              alt=""
              style={{ width: "32px", height: "32px", objectFit: "contain" }}
            />
            <span style={{ fontWeight: "600", fontSize: "0.85rem" }}>
              Total Riders / Drivers
            </span>
          </div>
          <div
            style={{
              fontSize: "2.25rem",
              fontWeight: "bold",
              marginTop: "0.5rem",
            }}
          >
            {String(stats.totalUsers).padStart(3, "0")}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: "1rem",
              right: "1rem",
              backgroundColor:
                activeStat === "TotalUsers" ? "white" : "#38AC57",
              borderRadius: "50%",
              padding: "0.4rem",
              color: activeStat === "TotalUsers" ? "#38AC57" : "white",
              display: "flex",
            }}
          >
            <ArrowUpRight size={14} />
          </div>
        </div>

        <div
          onClick={() => handleStatClick("TotalVerified")}
          style={{
            padding: "1.25rem",
            borderRadius: "1.5rem",
            backgroundColor:
              activeStat === "TotalVerified" ? "#38AC57" : "white",
            color: activeStat === "TotalVerified" ? "white" : "black",
            position: "relative",
            boxShadow:
              activeStat === "TotalVerified"
                ? "0 10px 15px -3px rgba(56, 172, 87, 0.4)"
                : "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "140px",
            cursor: "pointer",
            transition: "all 0.2s",
            transform:
              activeStat === "TotalVerified" ? "translateY(-2px)" : "none",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <img
              src={totalVerifiedIcon}
              alt=""
              style={{ width: "32px", height: "32px", objectFit: "contain" }}
            />
            <span style={{ fontWeight: "600", fontSize: "0.85rem" }}>
              Total Verified
            </span>
          </div>
          <div
            style={{
              fontSize: "2.25rem",
              fontWeight: "bold",
              marginTop: "0.5rem",
            }}
          >
            {String(stats.totalVerified).padStart(3, "0")}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: "1rem",
              right: "1rem",
              backgroundColor:
                activeStat === "TotalVerified" ? "white" : "#38AC57",
              borderRadius: "50%",
              padding: "0.4rem",
              color: activeStat === "TotalVerified" ? "#38AC57" : "white",
              display: "flex",
            }}
          >
            <ArrowUpRight size={14} />
          </div>
        </div>

        <div
          onClick={() => handleStatClick("VerifiedDrivers")}
          style={{
            padding: "1.25rem",
            borderRadius: "1.5rem",
            backgroundColor:
              activeStat === "VerifiedDrivers" ? "#38AC57" : "white",
            color: activeStat === "VerifiedDrivers" ? "white" : "black",
            position: "relative",
            boxShadow:
              activeStat === "VerifiedDrivers"
                ? "0 10px 15px -3px rgba(56, 172, 87, 0.4)"
                : "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "140px",
            cursor: "pointer",
            transition: "all 0.2s",
            transform:
              activeStat === "VerifiedDrivers" ? "translateY(-2px)" : "none",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <img
              src={verifiedBadgeIcon}
              alt=""
              style={{ width: "32px", height: "32px", objectFit: "contain" }}
            />
            <span style={{ fontWeight: "600", fontSize: "0.85rem" }}>
              Verified Drivers
            </span>
          </div>
          <div
            style={{
              fontSize: "2.25rem",
              fontWeight: "bold",
              marginTop: "0.5rem",
            }}
          >
            {String(stats.verifiedDrivers).padStart(3, "0")}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: "1rem",
              right: "1rem",
              backgroundColor:
                activeStat === "VerifiedDrivers" ? "white" : "#38AC57",
              borderRadius: "50%",
              padding: "0.4rem",
              color: activeStat === "VerifiedDrivers" ? "#38AC57" : "white",
              display: "flex",
            }}
          >
            <ArrowUpRight size={14} />
          </div>
        </div>

        <div
          onClick={() => handleStatClick("VerifiedPassengers")}
          style={{
            padding: "1.25rem",
            borderRadius: "1.5rem",
            backgroundColor:
              activeStat === "VerifiedPassengers" ? "#38AC57" : "white",
            color: activeStat === "VerifiedPassengers" ? "white" : "black",
            position: "relative",
            boxShadow:
              activeStat === "VerifiedPassengers"
                ? "0 10px 15px -3px rgba(56, 172, 87, 0.4)"
                : "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "140px",
            cursor: "pointer",
            transition: "all 0.2s",
            transform:
              activeStat === "VerifiedPassengers" ? "translateY(-2px)" : "none",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <img
              src={verifiedBadgeIcon}
              alt=""
              style={{ width: "32px", height: "32px", objectFit: "contain" }}
            />
            <span style={{ fontWeight: "600", fontSize: "0.85rem" }}>
              Verified Passengers
            </span>
          </div>
          <div
            style={{
              fontSize: "2.25rem",
              fontWeight: "bold",
              marginTop: "0.5rem",
            }}
          >
            {String(stats.verifiedPassengers).padStart(3, "0")}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: "1rem",
              right: "1rem",
              backgroundColor:
                activeStat === "VerifiedPassengers" ? "white" : "#38AC57",
              borderRadius: "50%",
              padding: "0.4rem",
              color: activeStat === "VerifiedPassengers" ? "#38AC57" : "white",
              display: "flex",
            }}
          >
            <ArrowUpRight size={14} />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="vb-controls-container">
        <div className="vb-filters-group">
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
            label="User"
            value={userTypeFilter}
            options={["All", "Driver", "Passenger"]}
            onChange={setUserTypeFilter}
          />
          <Dropdown
            label="Status"
            value={statusFilter}
            options={["All", "Verified", "Unverified"]}
            onChange={setStatusFilter}
          />
          <Dropdown
            label="City"
            value={cityFilter}
            options={["All", ...cities.map((c) => c.name)]}
            onChange={setCityFilter}
          />
        </div>

        <button
          onClick={handleOpenSettings}
          style={{
            backgroundColor: "#38AC57",
            color: "white",
            padding: "0.8rem 2rem",
            borderRadius: "2rem",
            fontSize: "0.9rem",
            fontWeight: "600",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          Setting
        </button>
      </div>

      {/* Table */}
      <div className="card vb-table-container" style={{ padding: 0 }}>
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
                User Type
              </th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Name ID</th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>Phone</th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>City</th>
              <th
                style={{
                  padding: "1rem",
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                Total Trips
              </th>
              <th style={{ padding: "1rem", fontWeight: "600" }}>
                Badge Status
              </th>
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
            {displayedUsers.map((user, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: "1px solid #f3f4f6",
                  backgroundColor: "white",
                }}
              >
                <td style={{ padding: "1rem" }}>
                  <UserTypeBadge type={user.userType} />
                </td>
                <td style={{ padding: "1rem" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.8rem",
                    }}
                  >
                    <UserAvatar
                      src={resolveImageUrl(user.avatar)}
                      name={user.name}
                      rating={user.rating}
                      showBadge={user.isVerified}
                      size={40}
                      variant="verification"
                    />
                    <div>
                      <div style={{ fontWeight: "600", fontSize: "0.9rem" }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                        {user.displayId}
                      </div>
                    </div>
                  </div>
                </td>
                <td
                  style={{
                    padding: "1rem",
                    fontWeight: "500",
                    fontSize: "0.9rem",
                  }}
                >
                  {user.phone}
                </td>
                <td style={{ padding: "1rem", fontSize: "0.9rem" }}>
                  {user.city}
                </td>
                <td
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  {user.totalTrips}
                </td>
                <td style={{ padding: "1rem" }}>
                  {user.isVerified ? <VerifiedBadge /> : <UnverifiedBadge />}
                </td>
                <td style={{ padding: "1rem" }}>
                  <button
                    onClick={() => handlePreview(user)}
                    disabled={previewUserId === `${user.userType}-${user.id}`}
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
                      opacity:
                        previewUserId === `${user.userType}-${user.id}`
                          ? 0.6
                          : 1,
                    }}
                  >
                    <Eye size={14} />{" "}
                    {previewUserId === `${user.userType}-${user.id}`
                      ? "..."
                      : "Preview"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Badge Requirements Settings Modal */}
      {showSettingsModal && (
        <div className="vb-modal-overlay">
          <div className="vb-settings-modal card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  setEditSettings(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h2
                  style={{ fontSize: "1.4rem", fontWeight: "bold", margin: 0 }}
                >
                  Badge Requirements Settings
                </h2>
                <p style={{ color: "#6b7280", margin: 0, fontSize: "0.9rem" }}>
                  Configure the criteria for granting verified badges
                </p>
              </div>
            </div>

            <div style={{ marginBottom: "2rem" }}>
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                  marginBottom: "1rem",
                }}
              >
                Driver Requirements
              </h3>
              <div className="vb-settings-grid">
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      color: "#6b7280",
                      marginBottom: "0.3rem",
                    }}
                  >
                    Minimum trips completed:
                  </label>
                  <input
                    type="number"
                    value={
                      editSettings?.driver.minTrips ??
                      badgeSettings.driver.minTrips
                    }
                    onChange={(e) =>
                      setEditSettings((prev) => ({
                        ...(prev ?? badgeSettings),
                        driver: {
                          ...(prev ?? badgeSettings).driver,
                          minTrips: Number(e.target.value),
                        },
                      }))
                    }
                    style={{
                      padding: "0.8rem",
                      backgroundColor: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      fontWeight: "600",
                      width: "100%",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      color: "#6b7280",
                      marginBottom: "0.3rem",
                    }}
                  >
                    Minimum rating:
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={
                      editSettings?.driver.minRating ??
                      badgeSettings.driver.minRating
                    }
                    onChange={(e) =>
                      setEditSettings((prev) => ({
                        ...(prev ?? badgeSettings),
                        driver: {
                          ...(prev ?? badgeSettings).driver,
                          minRating: Number(e.target.value),
                        },
                      }))
                    }
                    style={{
                      padding: "0.8rem",
                      backgroundColor: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      fontWeight: "600",
                      width: "100%",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      color: "#6b7280",
                      marginBottom: "0.3rem",
                    }}
                  >
                    Min acceptance rate (%):
                  </label>
                  <input
                    type="number"
                    value={
                      editSettings?.driver.minAcceptance ??
                      badgeSettings.driver.minAcceptance
                    }
                    onChange={(e) =>
                      setEditSettings((prev) => ({
                        ...(prev ?? badgeSettings),
                        driver: {
                          ...(prev ?? badgeSettings).driver,
                          minAcceptance: Number(e.target.value),
                        },
                      }))
                    }
                    style={{
                      padding: "0.8rem",
                      backgroundColor: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      fontWeight: "600",
                      width: "100%",
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "2.5rem" }}>
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                  marginBottom: "1rem",
                }}
              >
                Passenger Requirements
              </h3>
              <div className="vb-settings-grid-2">
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      color: "#6b7280",
                      marginBottom: "0.3rem",
                    }}
                  >
                    Minimum trips completed:
                  </label>
                  <input
                    type="number"
                    value={
                      editSettings?.passenger.minTrips ??
                      badgeSettings.passenger.minTrips
                    }
                    onChange={(e) =>
                      setEditSettings((prev) => ({
                        ...(prev ?? badgeSettings),
                        passenger: {
                          ...(prev ?? badgeSettings).passenger,
                          minTrips: Number(e.target.value),
                        },
                      }))
                    }
                    style={{
                      padding: "0.8rem",
                      backgroundColor: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      fontWeight: "600",
                      width: "100%",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      color: "#6b7280",
                      marginBottom: "0.3rem",
                    }}
                  >
                    Minimum rating:
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={
                      editSettings?.passenger.minRating ??
                      badgeSettings.passenger.minRating
                    }
                    onChange={(e) =>
                      setEditSettings((prev) => ({
                        ...(prev ?? badgeSettings),
                        passenger: {
                          ...(prev ?? badgeSettings).passenger,
                          minRating: Number(e.target.value),
                        },
                      }))
                    }
                    style={{
                      padding: "0.8rem",
                      backgroundColor: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      fontWeight: "600",
                      width: "100%",
                    }}
                  />
                </div>
              </div>
            </div>

            <div
              className="vb-modal-footer"
              style={{ display: "flex", gap: "1rem", justifyContent: "center" }}
            >
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  setEditSettings(null);
                }}
                style={{
                  padding: "0.8rem 2.5rem",
                  borderRadius: "2rem",
                  border: "1px solid #e5e7eb",
                  backgroundColor: "white",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                style={{
                  padding: "0.8rem 2.5rem",
                  borderRadius: "2rem",
                  border: "none",
                  backgroundColor: "#38AC57",
                  color: "white",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Badge Management Modal (Preview) */}
      {selectedProfile && (
        <div className="vb-modal-overlay">
          <div className="vb-preview-modal card">
            <button
              onClick={() => setSelectedProfile(null)}
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "black",
              }}
            >
              <X size={24} strokeWidth={2.5} />
            </button>

            <div style={{ marginBottom: "1.5rem" }}>
              <h2
                style={{
                  fontSize: "1.35rem",
                  fontWeight: "800",
                  margin: "0 0 0.25rem 0",
                  color: "#1f2b3f",
                }}
              >
                Badge Management - {selectedProfile.displayId}
              </h2>
              <p style={{ color: "#6b7280", margin: 0, fontSize: "0.95rem" }}>
                Review user details and manage verified badge status
              </p>
            </div>

            <h3 className="vb-section-title">
              {selectedProfile.userType} Information
            </h3>
            <div className="vb-detail-card">
              <div className="vb-flex-responsive">
                <UserAvatar
                  src={resolveImageUrl(selectedProfile.avatar)}
                  name={selectedProfile.name}
                  rating={selectedProfile.rating}
                  showBadge={selectedProfile.isVerified}
                  size={120}
                  variant="verification"
                />
                <div style={{ flex: 1 }}>
                  <div className="vb-info-grid">
                    <div>
                      <div style={modalLabelStyle}>User ID</div>
                      <div style={modalValueStyle}>
                        {selectedProfile.displayId}
                      </div>
                    </div>
                    <div>
                      <div style={modalLabelStyle}>Full Name</div>
                      <div style={modalValueStyle}>{selectedProfile.name}</div>
                    </div>
                    <div>
                      <div style={modalLabelStyle}>User Type</div>
                      <div style={modalValueStyle}>
                        {selectedProfile.userType}
                      </div>
                    </div>
                    <div>
                      <div style={modalLabelStyle}>Phone</div>
                      <div style={modalValueStyle}>{selectedProfile.phone}</div>
                    </div>
                    <div>
                      <div style={modalLabelStyle}>City</div>
                      <div style={modalValueStyle}>{selectedProfile.city}</div>
                    </div>
                    <div>
                      <div style={modalLabelStyle}>Join Date</div>
                      <div style={modalValueStyle}>
                        {formatModalDate(selectedProfile.joinDate)}
                      </div>
                    </div>
                    <div>
                      <div style={modalLabelStyle}>Email</div>
                      <div style={modalValueStyle}>{selectedProfile.email}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Info - Show only for drivers */}
            {selectedProfile.userType === "Driver" && (
              <>
                <h3 className="vb-section-title">Vehicle Information</h3>
                <div className="vb-detail-card">
                  <div className="vb-info-grid">
                    <div>
                      <div style={modalLabelStyle}>License Plate</div>
                      <div style={modalValueStyle}>
                        {selectedProfile.vehicleInfo?.licensePlate || "-"}
                      </div>
                    </div>
                    <div>
                      <div style={modalLabelStyle}>Make & Model</div>
                      <div style={modalValueStyle}>
                        {selectedProfile.vehicleInfo?.makeModel || "-"}
                      </div>
                    </div>
                    <div>
                      <div style={modalLabelStyle}>Transmission</div>
                      <div style={modalValueStyle}>
                        {selectedProfile.vehicleInfo?.transmission || "-"}
                      </div>
                    </div>
                    <div>
                      <div style={modalLabelStyle}>Year</div>
                      <div style={modalValueStyle}>
                        {selectedProfile.vehicleInfo?.year || "-"}
                      </div>
                    </div>
                    <div>
                      <div style={modalLabelStyle}>On boarding date</div>
                      <div style={modalValueStyle}>
                        {formatModalDate(selectedProfile.joinDate)}
                      </div>
                    </div>
                    <div>
                      <div style={modalLabelStyle}>Colour</div>
                      <div
                        style={{
                          ...modalValueStyle,
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
                              selectedProfile.vehicleInfo?.color || "#d1d5db"
                            ).toLowerCase(),
                            border: "1px solid #ddd",
                          }}
                        ></span>
                        {selectedProfile.vehicleInfo?.color || "-"}
                      </div>
                    </div>
                    <div>
                      <div style={modalLabelStyle}>Vehicle Type</div>
                      <div style={modalValueStyle}>
                        {selectedProfile.vehicleType || "-"}
                      </div>
                    </div>
                  </div>
                </div>

                <h3 className="vb-section-title">Performance Metrics</h3>
                <div className="vb-detail-card">
                  <div className="vb-flex-responsive">
                    <UserAvatar
                      src={resolveImageUrl(selectedProfile.avatar)}
                      name={selectedProfile.name}
                      rating={selectedProfile.rating}
                      showBadge={selectedProfile.isVerified}
                      size={88}
                      variant="verification"
                    />
                    <div className="vb-metrics-grid" style={{ flex: 1 }}>
                      <div>
                        <div style={modalLabelStyle}>Trip count</div>
                        <div style={modalValueStyle}>
                          {selectedProfile.totalTrips}+
                        </div>
                      </div>
                      <div>
                        <div style={modalLabelStyle}>Vehicle Type</div>
                        <div style={modalValueStyle}>
                          {selectedProfile.vehicleType || "-"}
                        </div>
                      </div>
                      <div>
                        <div style={modalLabelStyle}>Vehicle ID</div>
                        <div style={modalValueStyle}>
                          {selectedProfile.displayId}
                        </div>
                      </div>
                      <div>
                        <div style={modalLabelStyle}>Rating</div>
                        <div style={modalValueStyle}>
                          {selectedProfile.rating.toFixed(1)}
                        </div>
                      </div>
                      <div>
                        <div style={modalLabelStyle}>Badge Status</div>
                        <div style={modalValueStyle}>
                          {getBadgeStatusCopy(selectedProfile)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div
              className="vb-status-banner"
              style={{
                backgroundColor: "#eef7f0",
                padding: "1rem 1.25rem",
                borderRadius: "1rem",
                border: "1px solid #eef7f0",
                marginBottom: "1.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: "800",
                    margin: 0,
                    color: "#2d8a46",
                  }}
                >
                  Current Badge Status
                </h3>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginTop: "0.2rem",
                  }}
                >
                  {selectedProfile.isVerified ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: "black",
                          borderRadius: "50%",
                          width: "16px",
                          height: "16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Check size={10} color="white" strokeWidth={4} />
                      </div>
                      <span
                        style={{
                          fontWeight: "500",
                          color: "#2d8a46",
                          fontSize: "0.92rem",
                        }}
                      >
                        This user has a verified badge
                      </span>
                    </div>
                  ) : (
                    <>
                      <AlertCircle size={20} color="#9ca3af" />
                      <span
                        style={{
                          fontWeight: "500",
                          color: "#4b5563",
                          fontSize: "0.92rem",
                        }}
                      >
                        This user does not have a verified badge
                      </span>
                    </>
                  )}
                </div>
              </div>
              {selectedProfile.isVerified && selectedProfile.verifiedDate && (
                <span
                  style={{
                    fontSize: "0.88rem",
                    color: "#38AC57",
                    fontWeight: "500",
                  }}
                >
                  Verified on {formatModalDate(selectedProfile.verifiedDate)}
                </span>
              )}
            </div>

            <div
              className="vb-modal-footer"
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => setSelectedProfile(null)}
                style={{
                  padding: "0.95rem 3rem",
                  borderRadius: "2rem",
                  border: "1px solid #e5e7eb",
                  backgroundColor: "white",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontSize: "0.98rem",
                  color: "#374151",
                  minWidth: "180px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleToggleBadge}
                disabled={isBadgeActionLoading}
                style={{
                  padding: "0.95rem 2.4rem",
                  borderRadius: "2rem",
                  border: "none",
                  backgroundColor: selectedProfile.isVerified
                    ? "#ba1a1a"
                    : "#38AC57",
                  color: "white",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontSize: "0.98rem",
                  opacity: isBadgeActionLoading ? 0.6 : 1,
                  minWidth: "240px",
                }}
              >
                {isBadgeActionLoading
                  ? "..."
                  : selectedProfile.isVerified
                    ? "Remove Verified Badge"
                    : "Grant Verified Badge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
