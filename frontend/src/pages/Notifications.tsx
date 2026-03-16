import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Bell,
  Plus,
  Search,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from "lucide-react";

// Specialized Icons
import totalReservationsIcon from "../assets/icons/Total Reservations.png";
import toDriversIcon from "../assets/icons/To Drivers.png";
import pendingPaymentsIcon from "../assets/icons/pending payments.png";
import failedPaymentsIcon from "../assets/icons/failed payments.png";
import {
  CreateNotificationModal,
  TeamNotificationModal,
  NotificationDetailsModal,
  SystemStatusModal,
} from "./NotificationsModals";
import {
  getNotificationStatsApi,
  getNotificationCampaignsApi,
  getTeamNotificationsApi,
  type NotificationCampaign,
  type TeamNotification as TeamNotificationType,
} from "../services/api";

export interface Notification {
  id: string;
  type: "External" | "Internal";
  category: string;
  title: string;
  message: string;
  timestamp: string;
  status: "Sent" | "Scheduled" | "Failed";
  readCount: number;
  deliveryCount: number;
  target?: string;
  departments?: string[];
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just Now";
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

const FALLBACK_STATS = {
  totalSent: 2,
  toDrivers: 1,
  toPassengers: 1,
  systemStatus: "Operational",
};

const FALLBACK_EXTERNAL_NOTIFICATIONS: Notification[] = [
  {
    id: "NOT201",
    type: "External",
    category: "Safety",
    title: "Seatbelt reminder for night rides",
    message:
      "Please remind riders to fasten seatbelts before starting late-night trips.",
    timestamp: "2 hours ago",
    status: "Sent",
    readCount: 412,
    deliveryCount: 580,
    target: "Drivers",
  },
  {
    id: "NOT202",
    type: "External",
    category: "Trip",
    title: "Cashless ride week is live",
    message:
      "Passengers can now enjoy faster pickup flow with card and wallet checkout this week.",
    timestamp: "1 day ago",
    status: "Sent",
    readCount: 368,
    deliveryCount: 540,
    target: "Passengers",
  },
];

const FALLBACK_INTERNAL_NOTIFICATIONS: Notification[] = [
  {
    id: "INT101",
    type: "Internal",
    category: "Update",
    title: "Verification queue check at 6 PM",
    message:
      "Support and operations teams should clear the pending verification queue before end of shift.",
    timestamp: "3 hours ago",
    status: "Sent",
    readCount: 0,
    deliveryCount: 0,
    departments: ["Support", "Operations"],
  },
  {
    id: "INT102",
    type: "Internal",
    category: "Urgent",
    title: "Monitor login errors during peak traffic",
    message:
      "Engineering and support should watch authentication error rates during the evening demand window.",
    timestamp: "1 day ago",
    status: "Sent",
    readCount: 0,
    deliveryCount: 0,
    departments: ["Operations", "Support"],
  },
];

function isTodayNotificationTimestamp(timestamp: string) {
  return (
    timestamp.includes("Now") ||
    timestamp.includes("hour") ||
    timestamp.includes("min")
  );
}

function isYesterdayNotificationTimestamp(timestamp: string) {
  return timestamp.includes("day");
}

function isEmptyNotificationStats(stats: {
  totalSent: number;
  toDrivers: number;
  toPassengers: number;
  systemStatus: string;
}) {
  return (
    stats.totalSent === 0 &&
    stats.toDrivers === 0 &&
    stats.toPassengers === 0 &&
    (!stats.systemStatus || stats.systemStatus === "Unknown")
  );
}

export const Notifications = () => {
  const [activeTab, setActiveTab] = useState<"External" | "Internal">(
    "External",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetFilter, setTargetFilter] = useState<string | null>(null);

  // Real API state
  const [statsData, setStatsData] = useState({
    totalSent: 0,
    toDrivers: 0,
    toPassengers: 0,
    systemStatus: "Operational",
  });
  const [campaigns, setCampaigns] = useState<NotificationCampaign[]>([]);
  const [teamNotifs, setTeamNotifs] = useState<TeamNotificationType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, campaignsRes, teamRes] = await Promise.allSettled([
        getNotificationStatsApi(),
        getNotificationCampaignsApi(),
        getTeamNotificationsApi(),
      ]);

      const nextStats =
        statsRes.status === "fulfilled" && statsRes.value.ok
          ? statsRes.value.data
          : null;
      const nextCampaigns =
        campaignsRes.status === "fulfilled" && campaignsRes.value.ok
          ? campaignsRes.value.data
          : [];
      const nextTeamNotifs =
        teamRes.status === "fulfilled" && teamRes.value.ok
          ? teamRes.value.data
          : [];

      setCampaigns(nextCampaigns);
      setTeamNotifs(nextTeamNotifs);
      setStatsData(
        !nextStats ||
          (isEmptyNotificationStats(nextStats) &&
            nextCampaigns.length === 0 &&
            nextTeamNotifs.length === 0)
          ? FALLBACK_STATS
          : nextStats,
      );
    } catch (e) {
      console.error("Failed to load notifications", e);
      setStatsData(FALLBACK_STATS);
      setCampaigns([]);
      setTeamNotifs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Convert API data to the unified Notification shape used by the UI
  const allNotifications: Notification[] = useMemo(() => {
    const external: Notification[] =
      campaigns.length > 0
        ? campaigns.map((c) => ({
            id: `NOT${String(c.id).padStart(3, "0")}`,
            type: "External" as const,
            category: c.targetAudience || "External",
            title: c.title,
            message: c.message,
            timestamp: formatTimestamp(c.createdAt),
            status: (c.status as "Sent" | "Scheduled" | "Failed") || "Sent",
            readCount: c.readCount || 0,
            deliveryCount: c.deliveryCount || 0,
            target: c.targetAudience || "All",
          }))
        : FALLBACK_EXTERNAL_NOTIFICATIONS;
    const internal: Notification[] =
      teamNotifs.length > 0
        ? teamNotifs.map((t) => ({
            id: `INT${String(t.id).padStart(3, "0")}`,
            type: "Internal" as const,
            category: t.category || "System",
            title: t.title,
            message: t.description,
            timestamp: formatTimestamp(t.createdAt),
            status: (t.status as "Sent" | "Scheduled" | "Failed") || "Sent",
            readCount: 0,
            deliveryCount: 0,
            departments: t.targetDepartments || [],
          }))
        : FALLBACK_INTERNAL_NOTIFICATIONS;
    return [...external, ...internal];
  }, [campaigns, teamNotifs]);

  const filteredNotifications = useMemo(() => {
    return allNotifications.filter((n) => {
      const matchesType = n.type === activeTab;
      const matchesSearch =
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTarget =
        !targetFilter ||
        n.target === targetFilter ||
        (targetFilter === "Today" && isTodayNotificationTimestamp(n.timestamp));

      return matchesType && matchesSearch && matchesTarget;
    });
  }, [allNotifications, activeTab, searchQuery, targetFilter]);

  const externalTodayNotifications = useMemo(() => {
    const todayItems = filteredNotifications.filter((n) =>
      isTodayNotificationTimestamp(n.timestamp),
    );

    if (todayItems.length > 0) {
      return todayItems;
    }

    if (
      activeTab === "External" &&
      searchQuery.trim() === "" &&
      !targetFilter
    ) {
      return FALLBACK_EXTERNAL_NOTIFICATIONS.filter((n) =>
        isTodayNotificationTimestamp(n.timestamp),
      );
    }

    return [];
  }, [filteredNotifications, activeTab, searchQuery, targetFilter]);

  const externalYesterdayNotifications = useMemo(() => {
    const yesterdayItems = filteredNotifications.filter((n) =>
      isYesterdayNotificationTimestamp(n.timestamp),
    );

    if (yesterdayItems.length > 0) {
      return yesterdayItems;
    }

    if (
      activeTab === "External" &&
      searchQuery.trim() === "" &&
      !targetFilter
    ) {
      return FALLBACK_EXTERNAL_NOTIFICATIONS.filter((n) =>
        isYesterdayNotificationTimestamp(n.timestamp),
      );
    }

    return [];
  }, [filteredNotifications, activeTab, searchQuery, targetFilter]);

  const stats = [
    {
      label: "Total Sent Today",
      value: String(statsData.totalSent),
      desc: "Cross-platform delivery",
      icon: totalReservationsIcon,
      color: "#38AC57",
      bg: "#eef7f0",
      onClick: () => setTargetFilter(targetFilter === "Today" ? null : "Today"),
    },
    {
      label: "To Drivers",
      value: String(statsData.toDrivers),
      desc: "Driver app notifications",
      icon: toDriversIcon,
      color: "white",
      bg: "#38AC57",
      onClick: () =>
        setTargetFilter(targetFilter === "Drivers" ? null : "Drivers"),
    },
    {
      label: "To Passengers",
      value: String(statsData.toPassengers),
      desc: "Passenger app notifications",
      icon: pendingPaymentsIcon,
      color: "#38AC57",
      bg: "#eef7f0",
      onClick: () =>
        setTargetFilter(targetFilter === "Passengers" ? null : "Passengers"),
    },
    {
      label: "System Status",
      value: statsData.systemStatus === "Operational" ? "100%" : "0%",
      desc: statsData.systemStatus,
      icon: failedPaymentsIcon,
      color: "#38AC57",
      bg: "#eef7f0",
      onClick: () => setIsStatusModalOpen(true),
    },
  ];

  const getIcon = (category: string) => {
    switch (category) {
      case "Safety":
        return <ShieldCheck size={20} color="#38AC57" />;
      case "Message":
        return <CheckCircle2 size={20} color="#38AC57" />;
      case "Trip":
        return <Clock size={20} color="#38AC57" />;
      default:
        return <Bell size={20} color="#38AC57" />;
    }
  };

  const getIconBg = () => {
    return "#eef7f0";
  };

  return (
    <div
      className="main-content"
      style={{
        padding: "2rem",
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
        overflowY: "auto",
      }}
    >
      <style>{`
        .not-header-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 2.5rem;
            gap: 1.5rem;
        }
        .not-title-section h1 {
            font-size: 2rem;
            font-weight: 800;
            margin: 0 0 0.5rem 0;
            color: #111827;
        }
        .not-title-section p {
            margin: 0;
            color: #6B7280;
            font-size: 1.1rem;
        }
        .not-create-btn {
            background-color: #38AC57;
            color: white;
            border: none;
            padding: 14px 28px;
            border-radius: 18px;
            font-weight: 800;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 1rem;
            box-shadow: 0 8px 16px -4px rgba(56, 172, 87, 0.4);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            white-space: nowrap;
        }
        .not-create-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 20px -4px rgba(56, 172, 87, 0.5);
            background-color: #2e8f47;
        }
        .not-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1.5rem;
            margin-bottom: 2.5rem;
        }
        .not-stat-card {
            padding: 1.75rem;
            border-radius: 28px;
            border: 1px solid #E5E7EB;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .not-stat-card.active {
            background-color: #38AC57 !important;
            border-color: #38AC57 !important;
            transform: translateY(-4px);
            box-shadow: 0 20px 25px -5px rgba(56, 172, 87, 0.3);
        }
        .not-search-container {
            position: relative;
            margin-bottom: 2rem;
            max-width: 500px;
        }
        .not-search-input {
            width: 100%;
            padding: 14px 16px 14px 52px;
            border-radius: 20px;
            border: 1.5px solid #e5e7eb;
            font-size: 1rem;
            font-weight: 600;
            outline: none;
            background-color: white;
            transition: all 0.2s;
        }
        .not-search-input:focus {
            border-color: #38AC57;
            box-shadow: 0 0 0 4px rgba(56, 172, 87, 0.1);
        }
        .not-tabs-container {
            display: inline-flex;
            background-color: #F3F4F6;
            padding: 6px;
            border-radius: 20px;
            margin-bottom: 2.5rem;
        }
        .not-tab-btn {
            padding: 12px 36px;
            border-radius: 14px;
            border: none;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 0.95rem;
        }
        .not-tab-active {
            background-color: #38AC57;
            color: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .not-list-group {
            margin-bottom: 2rem;
        }
        .not-group-title {
            font-size: 1.1rem;
            color: #111827;
            font-weight: 900;
            margin-bottom: 1.25rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .not-card {
            background-color: white;
            padding: 1.5rem;
            border-radius: 24px;
            border: 1.5px solid #E5E7EB;
            display: flex;
            align-items: center;
            gap: 1.5rem;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-bottom: 1rem;
        }
        .not-card:hover {
            border-color: #38AC57;
            background-color: #fcfdfc;
            transform: translateX(4px);
        }
        .not-table-wrapper {
            background-color: white;
            border-radius: 24px;
            overflow: hidden;
            border: 1px solid #E5E7EB;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
            overflow-x: auto;
        }
        .not-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 800px;
        }
        .not-loading-pulse {
          position: relative;
          overflow: hidden;
          background: linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%);
          background-size: 200% 100%;
          animation: notShimmer 1.4s ease-in-out infinite;
        }
        .not-loading-card {
          background-color: white;
          padding: 1.5rem;
          border-radius: 24px;
          border: 1.5px solid #E5E7EB;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }
        .not-loading-table-row td {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #F3F4F6;
        }
        @keyframes notShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @media (max-width: 1024px) {
            .not-stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        @media (max-width: 768px) {
            .not-header-container {
                flex-direction: column;
                align-items: stretch;
                text-align: center;
            }
            .not-create-btn {
                width: 100%;
                justify-content: center;
            }
            .not-stats-grid {
                grid-template-columns: 1fr;
            }
            .not-search-container {
                max-width: 100%;
            }
            .not-tabs-container {
                width: 100%;
            }
            .not-tab-btn {
                flex: 1;
                padding: 12px 10px;
            }
            .not-card {
                flex-direction: column;
                align-items: flex-start;
                padding: 1.25rem;
            }
            .not-card-status {
                align-self: flex-end;
            }
        }
      `}</style>
      {/* Header */}
      <div className="not-header-container">
        <div className="not-title-section">
          <h1>Notification Management Center</h1>
          <p>External app notifications & internal admin team communications</p>
        </div>
        <button
          className="not-create-btn"
          onClick={() =>
            activeTab === "External"
              ? setIsCreateModalOpen(true)
              : setIsTeamModalOpen(true)
          }
        >
          <Plus size={22} strokeWidth={3} />{" "}
          {activeTab === "External"
            ? "Create Notification"
            : "Send Team Notification"}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="not-stats-grid">
        {stats.map((stat, index) => {
          const isActive =
            (stat.label === "Total Sent Today" && targetFilter === "Today") ||
            (stat.label === "To Drivers" && targetFilter === "Drivers") ||
            (stat.label === "To Passengers" && targetFilter === "Riders") ||
            (stat.label === "System Status" && isStatusModalOpen);

          return (
            <div
              key={index}
              onClick={stat.onClick}
              className={`not-stat-card ${isActive ? "active" : ""}`}
              style={{
                backgroundColor: isActive ? "#38AC57" : "#eef7f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "1.75rem",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "14px",
                    backgroundColor: isActive
                      ? "rgba(255,255,255,0.2)"
                      : "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: isActive ? "none" : "0 4px 6px rgba(0,0,0,0.05)",
                  }}
                >
                  <img
                    src={stat.icon}
                    alt={stat.label}
                    style={{
                      width: "30px",
                      height: "30px",
                      objectFit: "contain",
                    }}
                  />
                </div>
                <span
                  style={{
                    color: isActive ? "white" : "#6B7280",
                    fontWeight: "800",
                    fontSize: "0.95rem",
                  }}
                >
                  {stat.label}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "2.5rem",
                      fontWeight: "900",
                      color: isActive ? "white" : "#111827",
                      lineHeight: "1",
                    }}
                  >
                    {stat.value}
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: isActive ? "rgba(255,255,255,0.85)" : "#6B7280",
                      marginTop: "0.6rem",
                      fontWeight: "700",
                    }}
                  >
                    {stat.desc}
                  </div>
                </div>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: isActive ? "rgba(0,0,0,0.3)" : "#38AC57",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                  }}
                >
                  <ArrowUpRight size={20} color="white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="not-search-container">
        <input
          type="text"
          className="not-search-input"
          placeholder="Search by title or message..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Search
          size={22}
          color="#9CA3AF"
          style={{
            position: "absolute",
            left: "18px",
            top: "50%",
            transform: "translateY(-50%)",
          }}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="not-tabs-container">
        <button
          onClick={() => setActiveTab("External")}
          className={`not-tab-btn ${activeTab === "External" ? "not-tab-active" : ""}`}
          style={{ color: activeTab === "External" ? "white" : "#6B7280" }}
        >
          External App
        </button>
        <button
          onClick={() => setActiveTab("Internal")}
          className={`not-tab-btn ${activeTab === "Internal" ? "not-tab-active" : ""}`}
          style={{ color: activeTab === "Internal" ? "white" : "#6B7280" }}
        >
          Admin Team
        </button>
      </div>

      {/* Notifications List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {activeTab === "Internal" ? (
          <div className="not-table-wrapper">
            <table className="not-table">
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
                      padding: "1.25rem 1.5rem",
                      fontWeight: "800",
                      fontSize: "15px",
                    }}
                  >
                    Title
                  </th>
                  <th
                    style={{
                      padding: "1.25rem 1.5rem",
                      fontWeight: "800",
                      fontSize: "15px",
                      textAlign: "center",
                    }}
                  >
                    Target
                  </th>
                  <th
                    style={{
                      padding: "1.25rem 1.5rem",
                      fontWeight: "800",
                      fontSize: "15px",
                      textAlign: "center",
                    }}
                  >
                    Category
                  </th>
                  <th
                    style={{
                      padding: "1.25rem 1.5rem",
                      fontWeight: "800",
                      fontSize: "15px",
                      textAlign: "center",
                    }}
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <tr
                      key={`loading-row-${index}`}
                      className="not-loading-table-row"
                    >
                      <td>
                        <div
                          className="not-loading-pulse"
                          style={{
                            height: "18px",
                            width: "190px",
                            borderRadius: "999px",
                            marginBottom: "10px",
                          }}
                        ></div>
                        <div
                          className="not-loading-pulse"
                          style={{
                            height: "12px",
                            width: "72px",
                            borderRadius: "999px",
                          }}
                        ></div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div
                          className="not-loading-pulse"
                          style={{
                            height: "32px",
                            width: "96px",
                            borderRadius: "12px",
                            margin: "0 auto",
                          }}
                        ></div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div
                          className="not-loading-pulse"
                          style={{
                            height: "32px",
                            width: "88px",
                            borderRadius: "12px",
                            margin: "0 auto",
                          }}
                        ></div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div
                          className="not-loading-pulse"
                          style={{
                            height: "32px",
                            width: "78px",
                            borderRadius: "12px",
                            margin: "0 auto",
                          }}
                        ></div>
                      </td>
                    </tr>
                  ))
                ) : filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notif) => (
                    <tr
                      key={notif.id}
                      style={{ borderBottom: "1px solid #F3F4F6" }}
                    >
                      <td style={{ padding: "1.25rem 1.5rem" }}>
                        <div
                          style={{
                            fontWeight: "900",
                            fontSize: "16px",
                            color: "#111827",
                          }}
                        >
                          {notif.title}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#9CA3AF",
                            fontWeight: "800",
                            letterSpacing: "0.05em",
                            marginTop: "2px",
                          }}
                        >
                          {notif.id}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "1.25rem 1.5rem",
                          textAlign: "center",
                        }}
                      >
                        <span
                          style={{
                            padding: "6px 20px",
                            borderRadius: "10px",
                            fontSize: "13px",
                            fontWeight: "800",
                            backgroundColor: "#DBEAFE",
                            color: "#3B82F6",
                          }}
                        >
                          {notif.departments?.[0] || "Support"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "1.25rem 1.5rem",
                          textAlign: "center",
                        }}
                      >
                        <span
                          style={{
                            padding: "6px 20px",
                            borderRadius: "10px",
                            fontSize: "13px",
                            fontWeight: "800",
                            backgroundColor:
                              notif.category === "Update"
                                ? "#FEF9C3"
                                : notif.category === "Urgent" ||
                                    notif.category === "Alert"
                                  ? "#FEE2E2"
                                  : "#DBEAFE",
                            color:
                              notif.category === "Update"
                                ? "#854D0E"
                                : notif.category === "Urgent" ||
                                    notif.category === "Alert"
                                  ? "#EF4444"
                                  : "#3B82F6",
                          }}
                        >
                          {notif.category}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "1.25rem 1.5rem",
                          textAlign: "center",
                        }}
                      >
                        <span
                          style={{
                            padding: "6px 20px",
                            borderRadius: "10px",
                            fontSize: "13px",
                            fontWeight: "800",
                            backgroundColor:
                              notif.status === "Sent" ? "#eef7f0" : "#F3F4F6",
                            color:
                              notif.status === "Sent" ? "#38AC57" : "#374151",
                          }}
                        >
                          {notif.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: "4rem",
                        textAlign: "center",
                        color: "#9CA3AF",
                        fontWeight: "700",
                      }}
                    >
                      No admin notifications found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div className="not-list-group">
              <h2 className="not-group-title">Today</h2>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {isLoading
                  ? Array.from({ length: 2 }).map((_, index) => (
                      <div
                        key={`external-today-loading-${index}`}
                        className="not-loading-card"
                      >
                        <div
                          className="not-loading-pulse"
                          style={{
                            width: "52px",
                            height: "52px",
                            borderRadius: "16px",
                            flexShrink: 0,
                          }}
                        ></div>
                        <div
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.85rem",
                          }}
                        >
                          <div
                            className="not-loading-pulse"
                            style={{
                              width: "220px",
                              maxWidth: "70%",
                              height: "18px",
                              borderRadius: "999px",
                            }}
                          ></div>
                          <div
                            className="not-loading-pulse"
                            style={{
                              width: "100%",
                              height: "14px",
                              borderRadius: "999px",
                            }}
                          ></div>
                          <div
                            className="not-loading-pulse"
                            style={{
                              width: "82%",
                              height: "14px",
                              borderRadius: "999px",
                            }}
                          ></div>
                        </div>
                        <div
                          className="not-loading-pulse"
                          style={{
                            width: "90px",
                            height: "34px",
                            borderRadius: "999px",
                            flexShrink: 0,
                          }}
                        ></div>
                      </div>
                    ))
                  : externalTodayNotifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          setSelectedNotification(notif);
                          setIsDetailsModalOpen(true);
                        }}
                        className="not-card"
                      >
                        <div
                          style={{
                            width: "52px",
                            height: "52px",
                            borderRadius: "16px",
                            backgroundColor: getIconBg(),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            boxShadow: "0 4px 10px rgba(56, 172, 87, 0.1)",
                          }}
                        >
                          {getIcon(notif.category)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: "900",
                                fontSize: "1.15rem",
                                color: "#111827",
                              }}
                            >
                              {notif.title}
                            </span>
                            <span
                              style={{
                                color: "#38AC57",
                                fontSize: "0.85rem",
                                fontWeight: "800",
                              }}
                            >
                              {notif.timestamp}
                            </span>
                          </div>
                          <p
                            style={{
                              margin: "0.4rem 0 0 0",
                              color: "#6B7280",
                              fontSize: "1rem",
                              fontWeight: "600",
                              lineHeight: "1.5",
                            }}
                          >
                            {notif.message}
                          </p>
                        </div>
                        <div
                          className="not-card-status"
                          style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            backgroundColor: "#38AC57",
                            flexShrink: 0,
                          }}
                        ></div>
                      </div>
                    ))}
              </div>
            </div>

            <div className="not-list-group">
              <h2 className="not-group-title">Yesterday</h2>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {isLoading
                  ? Array.from({ length: 2 }).map((_, index) => (
                      <div
                        key={`external-yesterday-loading-${index}`}
                        className="not-loading-card"
                      >
                        <div
                          className="not-loading-pulse"
                          style={{
                            width: "52px",
                            height: "52px",
                            borderRadius: "16px",
                            flexShrink: 0,
                          }}
                        ></div>
                        <div
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.85rem",
                          }}
                        >
                          <div
                            className="not-loading-pulse"
                            style={{
                              width: "210px",
                              maxWidth: "68%",
                              height: "18px",
                              borderRadius: "999px",
                            }}
                          ></div>
                          <div
                            className="not-loading-pulse"
                            style={{
                              width: "100%",
                              height: "14px",
                              borderRadius: "999px",
                            }}
                          ></div>
                          <div
                            className="not-loading-pulse"
                            style={{
                              width: "76%",
                              height: "14px",
                              borderRadius: "999px",
                            }}
                          ></div>
                        </div>
                        <div
                          className="not-loading-pulse"
                          style={{
                            width: "90px",
                            height: "34px",
                            borderRadius: "999px",
                            flexShrink: 0,
                          }}
                        ></div>
                      </div>
                    ))
                  : externalYesterdayNotifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          setSelectedNotification(notif);
                          setIsDetailsModalOpen(true);
                        }}
                        className="not-card"
                      >
                        <div
                          style={{
                            width: "52px",
                            height: "52px",
                            borderRadius: "16px",
                            backgroundColor: getIconBg(),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            boxShadow: "0 4px 10px rgba(9, 10, 10, 0.05)",
                          }}
                        >
                          {getIcon(notif.category)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: "900",
                                fontSize: "1.15rem",
                                color: "#111827",
                              }}
                            >
                              {notif.title}
                            </span>
                            <span
                              style={{
                                color: "#6B7280",
                                fontSize: "0.85rem",
                                fontWeight: "800",
                              }}
                            >
                              {notif.timestamp}
                            </span>
                          </div>
                          <p
                            style={{
                              margin: "0.4rem 0 0 0",
                              color: "#6B7280",
                              fontSize: "1rem",
                              fontWeight: "600",
                              lineHeight: "1.5",
                            }}
                          >
                            {notif.message}
                          </p>
                        </div>
                        <div
                          className="not-card-status"
                          style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            backgroundColor: "#38AC57",
                            flexShrink: 0,
                          }}
                        ></div>
                      </div>
                    ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <CreateNotificationModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          loadData();
        }}
      />
      <TeamNotificationModal
        isOpen={isTeamModalOpen}
        onClose={() => {
          setIsTeamModalOpen(false);
          loadData();
        }}
      />
      <NotificationDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        notification={selectedNotification}
      />
      <SystemStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
      />
    </div>
  );
};
