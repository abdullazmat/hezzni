import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  Download,
  Eye,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  ArrowUpRight,
  X,
} from "lucide-react";
import { UserAvatar } from "../components/UserAvatar";
import { ComplaintDetailsModal } from "./SupportModals";

// Specialized Icons
import totalComplaintsIcon from "../assets/icons/Total Reservations.png";
import openIcon from "../assets/icons/Scheduled.png";
import inProgressIcon from "../assets/icons/Today's Bookings.png";
import resolvedIcon from "../assets/icons/successful payments.png";

// Category Icons
import rideOrDriverIcon from "../assets/icons/Ride or Driver.png";
import deliveryIcon from "../assets/icons/Delivery.png";
import paymentOrRefundIcon from "../assets/icons/Payment or Refund.png";
import rentalIcon from "../assets/icons/Rental.png";
import accountOrProfileIcon from "../assets/icons/Account or Profile.png";
import appIssueIcon from "../assets/icons/App Issue.png";
import otherIcon from "../assets/icons/Other.png";

const categoryIcons: Record<string, string> = {
  "Ride or Driver": rideOrDriverIcon,
  Delivery: deliveryIcon,
  "Payment or Refund": paymentOrRefundIcon,
  Rental: rentalIcon,
  "Account or Profile": accountOrProfileIcon,
  "App Issue": appIssueIcon,
  Other: otherIcon,
};

interface UserInfo {
  name: string;
  id: string;
  type: string;
  phone: string;
  city: string;
  email: string;
  avatar: string;
}

interface Message {
  id: string;
  sender: "user" | "admin";
  text: string;
  time: string;
}

interface ComplaintDetail {
  id: string;
  ticketId: string;
  tripId: string;
  status:
    | "Pending"
    | "In Progress"
    | "New"
    | "On Hold"
    | "Escalated"
    | "Resolved"
    | "Closed";
  dateTime: string;
  category: string;
  description: string;
  user: UserInfo;
  assignedTo?: string;
  internalNotes?: string;
  messages: Message[];
}

const MOCK_COMPLAINTS: ComplaintDetail[] = [
  {
    id: "1",
    ticketId: "COMP001",
    tripId: "T-00123",
    status: "New",
    dateTime: "2025-01-10 14:30",
    category: "Ride or Driver",
    description:
      "During my recent trip, the driver was consistently rude and made multiple inappropriate comments...",
    user: {
      name: "Sarah Mohamed El-Fassi",
      id: "R-00045",
      type: "Passenger",
      phone: "+212 6 12 34 56",
      city: "Casablanca",
      email: "sarah@email.com",
      avatar: "https://i.pravatar.cc/150?u=sarah",
    },
    assignedTo: "Unassigned",
    messages: [
      {
        id: "m1",
        sender: "user",
        text: "Hello, I have a question about my ticket COMP001.",
        time: "14:30",
      },
    ],
  },
  {
    id: "2",
    ticketId: "COMP002",
    tripId: "T-00123",
    status: "In Progress",
    dateTime: "2025-01-11 09:15",
    category: "Delivery",
    description:
      "The delivery package was damaged upon arrival and the driver refused to acknowledge it.",
    user: {
      name: "Sarah Mohamed El-Fassi",
      id: "R-00045",
      type: "driver",
      phone: "+212 6 12 34 56",
      city: "Casablanca",
      email: "sarah@email.com",
      avatar: "https://i.pravatar.cc/150?u=sarah_driver",
    },
    assignedTo: "Ali",
    messages: [
      {
        id: "m2",
        sender: "user",
        text: "Where is my delivery?",
        time: "09:45",
      },
      {
        id: "m3",
        sender: "admin",
        text: "We are looking into it.",
        time: "10:00",
      },
    ],
  },
  {
    id: "3",
    ticketId: "COMP003",
    tripId: "T-00124",
    status: "Pending",
    dateTime: "2025-01-11 10:20",
    category: "Payment or Refund",
    description: "I was overcharged for my last trip and would like a refund.",
    user: {
      name: "Sarah Mohamed El-Fassi",
      id: "R-00045",
      type: "Passenger",
      phone: "+212 6 12 34 56",
      city: "Casablanca",
      email: "sarah@email.com",
      avatar: "https://i.pravatar.cc/150?u=sarah3",
    },
    assignedTo: "Unassigned",
    messages: [],
  },
];
export const Support = () => {
  const [activeTab, setActiveTab] = useState<"Live Chat" | "Support Tickets">(
    "Support Tickets",
  );
  const [filterStats, setFilterStats] = useState<string>("all");
  const [ticketSearchQuery, setTicketSearchQuery] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");

  const [dropdownStatus, setDropdownStatus] = useState("All Status");
  const [dropdownUser, setDropdownUser] = useState("All Users");
  const [dropdownCategory, setDropdownCategory] = useState("All Categories");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] =
    useState<ComplaintDetail | null>(null);
  const [complaints, setComplaints] = useState(MOCK_COMPLAINTS);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChatId, complaints]);

  const stats = useMemo(() => {
    return {
      total: complaints.length,
      open: complaints.filter(
        (c) => c.status === "New" || c.status === "Pending",
      ).length,
      inProgress: complaints.filter((c) => c.status === "In Progress").length,
      resolved: complaints.filter(
        (c) => c.status === "Resolved" || c.status === "Closed",
      ).length,
    };
  }, [complaints]);

  const filteredTickets = useMemo(() => {
    return complaints.filter((c) => {
      const matchesStats =
        filterStats === "all" ||
        (filterStats === "open" &&
          (c.status === "New" || c.status === "Pending")) ||
        (filterStats === "in-progress" && c.status === "In Progress") ||
        (filterStats === "resolved" &&
          (c.status === "Resolved" || c.status === "Closed"));

      const matchesDropdownStatus =
        dropdownStatus === "All Status" || c.status === dropdownStatus;
      const matchesDropdownUser =
        dropdownUser === "All Users" ||
        c.user.type.toLowerCase() === dropdownUser.toLowerCase();
      const matchesDropdownCategory =
        dropdownCategory === "All Categories" ||
        c.category === dropdownCategory;

      const matchesSearch =
        c.ticketId.toLowerCase().includes(ticketSearchQuery.toLowerCase()) ||
        c.user.name.toLowerCase().includes(ticketSearchQuery.toLowerCase()) ||
        c.category.toLowerCase().includes(ticketSearchQuery.toLowerCase());

      return (
        matchesStats &&
        matchesDropdownStatus &&
        matchesDropdownUser &&
        matchesDropdownCategory &&
        matchesSearch
      );
    });
  }, [
    complaints,
    filterStats,
    ticketSearchQuery,
    dropdownStatus,
    dropdownUser,
    dropdownCategory,
  ]);

  const filteredChatSidebar = useMemo(() => {
    return complaints.filter(
      (c) =>
        c.user.name.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
        c.ticketId.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
        c.user.id.toLowerCase().includes(chatSearchQuery.toLowerCase()),
    );
  }, [complaints, chatSearchQuery]);

  const activeChat = useMemo(
    () => complaints.find((c) => c.id === selectedChatId) || null,
    [complaints, selectedChatId],
  );

  const clearFilters = () => {
    setFilterStats("all");
    setTicketSearchQuery("");
    setDropdownStatus("All Status");
    setDropdownUser("All Users");
    setDropdownCategory("All Categories");
  };

  const handleUpdateComplaint = (updated: ComplaintDetail) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c)),
    );
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedChatId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "admin",
      text: chatInput,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    };

    setComplaints((prev) =>
      prev.map((c) =>
        c.id === selectedChatId
          ? { ...c, messages: [...c.messages, newMessage] }
          : c,
      ),
    );
    setChatInput("");
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "New":
        return { backgroundColor: "#FEF2F2", color: "#EF4444" };
      case "In Progress":
        return { backgroundColor: "#EFF6FF", color: "#3B82F6" };
      case "Pending":
        return { backgroundColor: "#FFF7ED", color: "#F97316" };
      case "On Hold":
        return { backgroundColor: "#F3F4F6", color: "#6B7280" };
      case "Escalated":
        return { backgroundColor: "#FAF5FF", color: "#A855F7" };
      case "Resolved":
        return { backgroundColor: "#eef7f0", color: "#38AC57" };
      case "Closed":
        return { backgroundColor: "#F9FAFB", color: "#374151" };
      default:
        return { backgroundColor: "#F3F4F6", color: "#6B7280" };
    }
  };

  const renderTicketsTab = () => (
    <>
      <div className="cs-stats-grid">
        <div
          className={`stat-card ${filterStats === "all" ? "active" : ""}`}
          onClick={() => setFilterStats("all")}
          style={{
            cursor: "pointer",
            backgroundColor: filterStats === "all" ? "#38AC57" : "white",
            border: filterStats === "all" ? "none" : "1px solid #e5e7eb",
          }}
        >
          <div className="stat-header">
            <div className="stat-icon" style={{ padding: 0 }}>
              <img
                src={totalComplaintsIcon}
                alt=""
                style={{
                  width: "32px",
                  height: "32px",
                  objectFit: "contain",
                  filter:
                    filterStats === "all" ? "brightness(0) invert(1)" : "none",
                }}
              />
            </div>
            <span
              className="stat-label"
              style={{
                color:
                  filterStats === "all" ? "white" : "var(--text-secondary)",
              }}
            >
              Total Complaints
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              className="stat-value"
              style={{ color: filterStats === "all" ? "white" : "black" }}
            >
              0{stats.total}
            </span>
            <div
              className="stat-arrow"
              style={{
                backgroundColor: filterStats === "all" ? "black" : "#f3f4f6",
                color: filterStats === "all" ? "white" : "black",
              }}
            >
              <ArrowUpRight size={20} />
            </div>
          </div>
        </div>

        <div
          className={`stat-card ${filterStats === "open" ? "active" : ""}`}
          onClick={() => setFilterStats("open")}
          style={{
            cursor: "pointer",
            backgroundColor: filterStats === "open" ? "#38AC57" : "white",
            border: filterStats === "open" ? "none" : "1px solid #e5e7eb",
          }}
        >
          <div className="stat-header">
            <div className="stat-icon" style={{ padding: 0 }}>
              <img
                src={openIcon}
                alt=""
                style={{ width: "32px", height: "32px", objectFit: "contain" }}
              />
            </div>
            <span
              className="stat-label"
              style={{
                color:
                  filterStats === "open" ? "white" : "var(--text-secondary)",
              }}
            >
              Open
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              className="stat-value"
              style={{ color: filterStats === "open" ? "white" : "black" }}
            >
              00{stats.open}
            </span>
            <div
              className="stat-arrow"
              style={{
                backgroundColor: filterStats === "open" ? "black" : "#f3f4f6",
                color: filterStats === "open" ? "white" : "black",
              }}
            >
              <ArrowUpRight size={20} />
            </div>
          </div>
        </div>

        <div
          className={`stat-card ${filterStats === "in-progress" ? "active" : ""}`}
          onClick={() => setFilterStats("in-progress")}
          style={{
            cursor: "pointer",
            backgroundColor:
              filterStats === "in-progress" ? "#38AC57" : "white",
            border:
              filterStats === "in-progress" ? "none" : "1px solid #e5e7eb",
          }}
        >
          <div className="stat-header">
            <div className="stat-icon" style={{ padding: 0 }}>
              <img
                src={inProgressIcon}
                alt=""
                style={{
                  width: "32px",
                  height: "32px",
                  objectFit: "contain",
                  filter:
                    filterStats === "in-progress"
                      ? "brightness(0) invert(1)"
                      : "none",
                }}
              />
            </div>
            <span
              className="stat-label"
              style={{
                color:
                  filterStats === "in-progress"
                    ? "white"
                    : "var(--text-secondary)",
              }}
            >
              In Progress
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              className="stat-value"
              style={{
                color: filterStats === "in-progress" ? "white" : "black",
              }}
            >
              0{stats.inProgress}
            </span>
            <div
              className="stat-arrow"
              style={{
                backgroundColor:
                  filterStats === "in-progress" ? "black" : "#f3f4f6",
                color: filterStats === "in-progress" ? "white" : "black",
              }}
            >
              <ArrowUpRight size={20} />
            </div>
          </div>
        </div>

        <div
          className={`stat-card ${filterStats === "resolved" ? "active" : ""}`}
          onClick={() => setFilterStats("resolved")}
          style={{
            cursor: "pointer",
            backgroundColor: filterStats === "resolved" ? "#38AC57" : "white",
            border: filterStats === "resolved" ? "none" : "1px solid #e5e7eb",
          }}
        >
          <div className="stat-header">
            <div className="stat-icon" style={{ padding: 0 }}>
              <img
                src={resolvedIcon}
                alt=""
                style={{
                  width: "32px",
                  height: "32px",
                  objectFit: "contain",
                  filter:
                    filterStats === "resolved"
                      ? "brightness(0) invert(1)"
                      : "none",
                }}
              />
            </div>
            <span
              className="stat-label"
              style={{
                color:
                  filterStats === "resolved"
                    ? "white"
                    : "var(--text-secondary)",
              }}
            >
              Resolved
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              className="stat-value"
              style={{ color: filterStats === "resolved" ? "white" : "black" }}
            >
              0{stats.resolved}
            </span>
            <div
              className="stat-arrow"
              style={{
                backgroundColor:
                  filterStats === "resolved" ? "black" : "#f3f4f6",
                color: filterStats === "resolved" ? "white" : "black",
              }}
            >
              <ArrowUpRight size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="cs-filters-container">
        <div className="cs-search-wrapper">
          <Search size={20} color="#9CA3AF" />
          <input
            type="text"
            placeholder="Search by ID, Name or Category..."
            value={ticketSearchQuery}
            onChange={(e) => setTicketSearchQuery(e.target.value)}
          />
        </div>
        <div className="cs-filter-group">
          <select
            className="cs-filter-select"
            value={dropdownStatus}
            onChange={(e) => setDropdownStatus(e.target.value)}
          >
            <option>All Status</option>
            <option value="New">New</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending">Pending</option>
            <option value="On Hold">On Hold</option>
            <option value="Escalated">Escalated</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
          <select
            className="cs-filter-select"
            value={dropdownUser}
            onChange={(e) => setDropdownUser(e.target.value)}
          >
            <option>All Users</option>
            <option value="Passenger">Passenger</option>
            <option value="Driver">Driver</option>
          </select>
          <select
            className="cs-filter-select"
            value={dropdownCategory}
            onChange={(e) => setDropdownCategory(e.target.value)}
          >
            <option>All Categories</option>
            <option value="Ride or Driver">Ride or Driver</option>
            <option value="Delivery">Delivery</option>
            <option value="Payment or Refund">Payment or Refund</option>
            <option value="Rental">Rental</option>
            <option value="Account or Profile">Account or Profile</option>
            <option value="App Issue">App Issue</option>
            <option value="Other">Other</option>
          </select>
          <button
            className="filter-btn cs-filter-select"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
            onClick={clearFilters}
          >
            <X size={18} />
            Clear
          </button>
        </div>
      </div>

      <div className="cs-table-container">
        <table className="cs-table">
          <thead>
            <tr>
              <th style={{ width: "120px" }}>Ticket ID</th>
              <th>User Details</th>
              <th>Complain</th>
              <th style={{ textAlign: "center" }}>Status</th>
              <th>Date</th>
              <th>Assigned</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.length > 0 ? (
              filteredTickets.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: "bold" }}>{item.ticketId}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="relative" style={{ flexShrink: 0 }}>
                        <UserAvatar
                          src={item.user.avatar}
                          name={item.user.name}
                          size={40}
                          rating={4.8}
                          showBadge={true}
                        />
                      </div>
                      <div>
                        <div style={{ fontWeight: "700", fontSize: "13px" }}>
                          {item.user.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "#6B7280" }}>
                          {item.user.id}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#38AC57",
                            fontWeight: "bold",
                            textTransform: "uppercase",
                          }}
                        >
                          {item.user.type}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div
                      className="flex items-center gap-2"
                      style={{ fontSize: "13px" }}
                    >
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={categoryIcons[item.category] || otherIcon}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                          }}
                        />
                      </div>
                      {item.category}
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <span
                        style={{
                          ...getStatusStyle(item.status),
                          padding: "6px 12px",
                          borderRadius: "8px",
                          fontSize: "11px",
                          fontWeight: "800",
                          display: "inline-block",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.status}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: "13px", color: "#4B5563" }}>
                    {item.dateTime}
                  </td>
                  <td style={{ fontSize: "13px", color: "#4B5563" }}>
                    {item.assignedTo}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      onClick={() => {
                        setSelectedComplaint(item);
                        setIsModalOpen(true);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "6px 12px",
                        fontSize: "13px",
                        cursor: "pointer",
                        backgroundColor: "white",
                      }}
                    >
                      <Eye size={14} />
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: "center",
                    padding: "3rem",
                    color: "#9CA3AF",
                  }}
                >
                  No complaints found matching filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderLiveChatTab = () => (
    <div
      className="cs-chat-container flex gap-4"
      style={{ height: "calc(100vh - 250px)", marginTop: "1rem" }}
    >
      {/* Sidebar List */}
      <div className="cs-sidebar">
        <div style={{ padding: "1.5rem", borderBottom: "1px solid #f3f4f6" }}>
          <div
            className="cs-search-wrapper"
            style={{ minWidth: "100%", margin: 0 }}
          >
            <Search size={20} color="#9CA3AF" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filteredChatSidebar.map((complaint) => (
            <div
              key={complaint.id}
              onClick={() => setSelectedChatId(complaint.id)}
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid #f3f4f6",
                cursor: "pointer",
                backgroundColor:
                  selectedChatId === complaint.id ? "#eef7f0" : "transparent",
                display: "flex",
                gap: "1rem",
                transition: "background-color 0.2s",
              }}
            >
              <div className="relative" style={{ flexShrink: 0 }}>
                <UserAvatar
                  src={complaint.user.avatar}
                  name={complaint.user.name}
                  size={48}
                  rating={4.8}
                  showBadge={true}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="flex justify-between"
                  style={{ marginBottom: "4px" }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      fontSize: "14px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {complaint.user.name}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#9CA3AF",
                      flexShrink: 0,
                    }}
                  >
                    2m ago
                  </span>
                </div>
                <div className="flex gap-2" style={{ marginBottom: "4px" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      backgroundColor: "#EFF6FF",
                      color: "#3B82F6",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    {complaint.user.type}
                  </span>
                  <span style={{ fontSize: "10px", color: "#9CA3AF" }}>
                    {complaint.user.id}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p
                    style={{
                      margin: 0,
                      fontSize: "12px",
                      color: "#6B7280",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {complaint.messages.length > 0
                      ? complaint.messages[complaint.messages.length - 1].text
                      : "Start a conversation"}
                  </p>
                  {complaint.status === "New" && (
                    <div
                      style={{
                        backgroundColor: "#38AC57",
                        color: "white",
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "10px",
                        fontWeight: "bold",
                        flexShrink: 0,
                        marginLeft: "8px",
                      }}
                    >
                      1
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat View */}
      <div className="cs-chat-view">
        {activeChat ? (
          <div className="flex h-full" style={{ flexDirection: "column" }}>
            {/* Chat Header */}
            <div
              className="flex items-center gap-3"
              style={{
                padding: "1rem 1.5rem",
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              <UserAvatar
                src={activeChat.user.avatar}
                name={activeChat.user.name}
                size={40}
                rating={4.8}
                showBadge={true}
              />
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap-2">
                  <h4
                    style={{ margin: 0, fontSize: "15px", fontWeight: "bold" }}
                  >
                    {activeChat.user.name}
                  </h4>
                </div>
                <p style={{ margin: 0, fontSize: "11px", color: "#6B7280" }}>
                  {activeChat.user.type}
                </p>
              </div>
              <button
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  padding: "0.5rem",
                }}
              >
                <MoreVertical size={18} color="#9CA3AF" />
              </button>
            </div>

            {/* Messages Area */}
            <div
              className="flex"
              style={{
                flex: 1,
                padding: "1.5rem",
                overflowY: "auto",
                backgroundColor: "#f9fafb",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <div
                style={{
                  alignSelf: "center",
                  backgroundColor: "white",
                  padding: "6px 16px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  color: "#9CA3AF",
                  border: "1px solid #e5e7eb",
                  fontWeight: "600",
                }}
              >
                Today
              </div>

              {activeChat.messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    alignSelf:
                      msg.sender === "user" ? "flex-start" : "flex-end",
                    maxWidth: "75%",
                  }}
                >
                  <div
                    style={{
                      backgroundColor:
                        msg.sender === "user" ? "white" : "#38AC57",
                      color: msg.sender === "user" ? "#374151" : "white",
                      padding: "1rem",
                      borderRadius: "16px",
                      borderBottomLeftRadius:
                        msg.sender === "user" ? 0 : "16px",
                      borderBottomRightRadius:
                        msg.sender === "admin" ? 0 : "16px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      border:
                        msg.sender === "user" ? "1px solid #f3f4f6" : "none",
                    }}
                  >
                    <p
                      style={{ margin: 0, fontSize: "14px", lineHeight: "1.6" }}
                    >
                      {msg.text}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#9CA3AF",
                      marginTop: "6px",
                      textAlign: msg.sender === "user" ? "left" : "right",
                      display: "block",
                    }}
                  >
                    {msg.time}
                  </span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div style={{ padding: "1.25rem", borderTop: "1px solid #f3f4f6" }}>
              <form
                className="flex items-center gap-2"
                style={{
                  backgroundColor: "#F3F4F6",
                  padding: "0.5rem 1rem",
                  borderRadius: "30px",
                }}
                onSubmit={handleSendChatMessage}
              >
                <button
                  type="button"
                  style={{
                    border: "none",
                    background: "none",
                    color: "#9CA3AF",
                    cursor: "pointer",
                    padding: "0.4rem",
                  }}
                >
                  <Paperclip size={20} />
                </button>
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  style={{
                    flex: 1,
                    border: "none",
                    background: "none",
                    outline: "none",
                    padding: "0.6rem 0",
                    fontSize: "14px",
                  }}
                />
                <button
                  type="button"
                  style={{
                    border: "none",
                    background: "none",
                    color: "#9CA3AF",
                    cursor: "pointer",
                    padding: "0.4rem",
                  }}
                >
                  <Smile size={20} />
                </button>
                <button
                  type="submit"
                  style={{
                    border: "none",
                    background: "#38AC57",
                    color: "white",
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 4px 6px -1px rgba(56, 172, 87, 0.3)",
                    flexShrink: 0,
                  }}
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div
            className="flex h-full items-center justify-center p-8 text-center"
            style={{ flexDirection: "column", color: "#9CA3AF" }}
          >
            <div
              style={{
                backgroundColor: "#f9fafb",
                padding: "3.5rem",
                borderRadius: "50%",
                marginBottom: "2rem",
                border: "1px solid #f3f4f6",
              }}
            >
              <MessageSquare
                size={80}
                strokeWidth={1}
                style={{ color: "#38AC57", opacity: 0.6 }}
              />
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: "1.75rem",
                fontWeight: "800",
                color: "#374151",
              }}
            >
              No Conversation Selected
            </h3>
            <p
              style={{
                margin: "1rem 0 0",
                color: "#6B7280",
                maxWidth: "340px",
                lineHeight: "1.6",
              }}
            >
              Select a user from the conversation list on the left to start
              exchanging messages.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="main-content"
      style={{
        padding: "2rem",
        backgroundColor: "#f8fafc",
        height: "100%",
        overflowY: "auto",
      }}
    >
      <style>{`
        .cs-header-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 2rem;
            gap: 1.5rem;
        }
        .cs-header-info {
            display: flex;
            gap: 1rem;
            align-items: center;
        }
        .cs-header-badges {
            display: flex;
            gap: 0.75rem;
        }
        .cs-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .cs-filters-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
            margin-bottom: 24px;
        }
        .cs-search-wrapper {
            position: relative;
            flex: 1;
            min-width: 300px;
        }
        .cs-search-wrapper svg {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            z-index: 1;
        }
        .cs-search-wrapper input {
            width: 100%;
            padding: 12px 16px 12px 48px;
            border-radius: 14px;
            border: 1px solid #e5e7eb;
            outline: none;
            font-size: 14px;
            transition: all 0.2s ease;
            background-color: white;
        }
        .cs-search-wrapper input:focus {
            border-color: #38AC57;
            box-shadow: 0 0 0 4px rgba(56, 172, 87, 0.1);
        }
        .cs-sidebar {
            width: 380px;
            background-color: white;
            border-radius: 24px;
            border: 1px solid #e5e7eb;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .cs-tabs-container {
            display: flex;
            gap: 0.5rem;
            background-color: #f3f4f6;
            padding: 6px;
            border-radius: 14px;
            width: fit-content;
            margin-bottom: 2rem;
        }
        .cs-table-container {
            width: 100%;
            overflow-x: auto;
            border-radius: 12px;
            background-color: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .cs-table-container::-webkit-scrollbar {
            height: 8px;
        }
        .cs-table-container::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
        }
        .cs-table-container::-webkit-scrollbar-thumb {
            background: #d1d5db;
            border-radius: 10px;
        }
        .cs-table-container::-webkit-scrollbar-thumb:hover {
            background: #9ca3af;
        }
        .cs-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 1000px;
        }
        .cs-table th {
            background-color: #38AC57;
            color: white;
            padding: 16px;
            text-align: left;
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .cs-table td {
            padding: 16px;
            border-bottom: 1px solid #f3f4f6;
            background-color: white;
        }
        .cs-table tr:last-child td {
            border-bottom: none;
        }
        .cs-table tr:hover td {
            background-color: #f9fafb;
        }
        .cs-table th:first-child {
            border-top-left-radius: 12px;
        }
        .cs-table th:last-child {
            border-top-right-radius: 12px;
        }
        .cs-filter-group {
            display: flex;
            gap: 0.75rem;
            flex-wrap: wrap;
        }
        .cs-filter-select {
            padding: 10px 16px;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            background-color: white;
            font-size: 13px;
            font-weight: 600;
            outline: none;
            transition: all 0.2s ease;
            cursor: pointer;
            min-width: 140px;
        }
        .cs-filter-select:focus {
            border-color: #38AC57;
            box-shadow: 0 0 0 4px rgba(56, 172, 87, 0.1);
        }
        .filter-btn:hover {
            background-color: #f9fafb !important;
            border-color: #d1d5db !important;
        }

        @media (max-width: 1024px) {
            .cs-stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            .cs-sidebar {
                width: 300px;
            }
        }

        @media (max-width: 768px) {
            .cs-header-container {
                flex-direction: column;
                align-items: stretch;
            }
            .cs-header-info {
                flex-direction: column;
                align-items: stretch;
                gap: 1rem;
            }
            .cs-header-badges {
                flex-direction: column;
            }
            .cs-header-badges > div {
                width: 100%;
                justify-content: center;
            }
            .cs-header-info button {
                width: 100%;
                justify-content: center;
            }
            .cs-tabs-container {
                width: 100%;
                flex-wrap: wrap;
            }
            .cs-tabs-container button {
                flex: 1;
                justify-content: center;
            }
            .cs-chat-container {
                flex-direction: column !important;
                height: auto !important;
            }
            .cs-sidebar {
                width: 100% !important;
                height: 400px;
            }
            .cs-chat-view {
                height: 600px;
            }
        }

        @media (max-width: 480px) {
            .cs-stats-grid {
                grid-template-columns: 1fr;
            }
        }
      `}</style>
      <div className="cs-header-container">
        <div>
          <h1
            style={{
              fontSize: "1.875rem",
              fontWeight: "800",
              margin: "0 0 0.5rem 0",
              color: "#111827",
            }}
          >
            Complaints & Support
          </h1>
          <p style={{ margin: 0, color: "#6B7280", fontSize: "0.925rem" }}>
            Manage customer complaints and support tickets from drivers and
            passengers
          </p>
        </div>
        <div className="cs-header-info">
          <div className="cs-header-badges">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                backgroundColor: "#eef7f0",
                borderRadius: "14px",
                fontSize: "13px",
                color: "#38AC57",
                border: "1px solid #eef7f0",
                fontWeight: "700",
              }}
            >
              <span>{stats.total >= 3 ? 3 : stats.total} Unread Messages</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                backgroundColor: "#FFF7ED",
                borderRadius: "14px",
                fontSize: "13px",
                color: "#F97316",
                border: "1px solid #FFEDD5",
                fontWeight: "700",
              }}
            >
              <span>{stats.open} Open Tickets</span>
            </div>
          </div>
          <button
            className="export-btn"
            style={{
              padding: "12px 24px",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              borderRadius: "14px",
            }}
          >
            <Download size={20} />
            Export Report
          </button>
        </div>
      </div>

      <div className="cs-tabs-container">
        <button
          onClick={() => setActiveTab("Live Chat")}
          className={`tab-btn ${activeTab === "Live Chat" ? "active" : "inactive"}`}
          style={{ display: "flex", alignItems: "center", gap: "10px" }}
        >
          Live Chat
          <span
            style={{
              fontSize: "11px",
              backgroundColor: activeTab === "Live Chat" ? "white" : "#38AC57",
              color: activeTab === "Live Chat" ? "#38AC57" : "white",
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "800",
            }}
          >
            3
          </span>
        </button>
        <button
          onClick={() => setActiveTab("Support Tickets")}
          className={`tab-btn ${activeTab === "Support Tickets" ? "active" : "inactive"}`}
        >
          Support Tickets
        </button>
      </div>

      {activeTab === "Support Tickets"
        ? renderTicketsTab()
        : renderLiveChatTab()}

      <ComplaintDetailsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedComplaint(null);
        }}
        complaint={selectedComplaint}
        onUpdate={handleUpdateComplaint}
      />
    </div>
  );
};
