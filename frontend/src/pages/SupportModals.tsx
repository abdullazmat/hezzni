import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Paperclip, Smile, MoreVertical } from "lucide-react";
import { UserAvatar } from "../components/UserAvatar";

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

interface SupportModalsProps {
  isOpen: boolean;
  onClose: () => void;
  complaint: ComplaintDetail | null;
  onUpdate: (updatedComplaint: ComplaintDetail) => void;
}

export const ComplaintDetailsModal = ({
  isOpen,
  onClose,
  complaint,
  onUpdate,
}: SupportModalsProps) => {
  const [status, setStatus] = useState(complaint?.status || "New");
  const [assignedTo, setAssignedTo] = useState(complaint?.assignedTo || "");
  const [internalNotes, setInternalNotes] = useState(
    complaint?.internalNotes || "",
  );
  const [messageInput, setMessageInput] = useState("");

  // Local state for instant feedback on messages within the modal
  const [localMessages, setLocalMessages] = useState<Message[]>(
    complaint?.messages || [],
  );
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (complaint) {
      setStatus(complaint.status);
      setAssignedTo(complaint.assignedTo || "");
      setInternalNotes(complaint.internalNotes || "");
      setLocalMessages(complaint.messages);
    }
  }, [complaint]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  if (!isOpen || !complaint) return null;

  const statusColors: Record<string, string> = {
    New: "#FEF2F2",
    Pending: "#FFF7ED",
    "In Progress": "#EFF6FF",
    "On Hold": "#F3F4F6",
    Escalated: "#FAF5FF",
    Resolved: "#eef7f0",
    Closed: "#F9FAFB",
  };

  const statusTextColors: Record<string, string> = {
    New: "#EF4444",
    Pending: "#F97316",
    "In Progress": "#3B82F6",
    "On Hold": "#6B7280",
    Escalated: "#A855F7",
    Resolved: "#38AC57",
    Closed: "#374151",
  };

  const handleUpdate = () => {
    onUpdate({
      ...complaint,
      status,
      assignedTo,
      internalNotes,
      messages: localMessages, // Sync back the chat
    });
    onClose();
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "admin",
      text: messageInput,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    };

    const updatedMessages = [...localMessages, newMessage];
    setLocalMessages(updatedMessages);
    setMessageInput("");

    // Also notify parent through update to keep stats/lists in sync
    onUpdate({
      ...complaint,
      messages: updatedMessages,
    });
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 10000,
        backdropFilter: "blur(8px)",
        padding: "20px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <style>{`
        .csm-modal-content {
            background-color: white;
            border-radius: 28px;
            width: 95%;
            max-width: 1200px;
            margin-top: 20px;
            margin-bottom: 20px;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            min-height: 500px;
            max-height: none;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            animation: csm-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes csm-slide-up {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .csm-layout {
            display: flex;
            flex: 1;
        }
        .csm-details-panel {
            flex: 1;
            padding: 2.5rem;
            border-right: 1px solid #f3f4f6;
        }
        .csm-chat-panel {
            width: 400px;
            display: flex;
            flex-direction: column;
            background-color: white;
        }
        .csm-user-info-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1.25rem 1rem;
        }
        .csm-complaint-info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 1rem;
        }
        .csm-status-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
        }
        .csm-flex-responsive {
            display: flex;
            gap: 1rem;
        }

        @media (max-width: 1280px) {
            .csm-chat-panel {
                width: 320px;
            }
        }

        @media (max-width: 1024px) {
            .csm-layout {
                flex-direction: column;
            }
            .csm-details-panel {
                border-right: none;
                border-bottom: 1px solid #f3f4f6;
                padding: 1.5rem;
            }
            .csm-chat-panel {
                width: 100%;
                height: 500px;
            }
            .csm-complaint-info-grid {
                grid-template-columns: repeat(3, 1fr);
            }
        }

        @media (max-width: 768px) {
            .csm-modal-content {
                border-radius: 20px;
            }
            .csm-user-info-container {
                flex-direction: column;
                align-items: center !important;
                text-align: center !important;
            }
            .csm-user-info-grid {
                grid-template-columns: repeat(2, 1fr);
                width: 100%;
            }
            .csm-complaint-info-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            .csm-status-grid {
                grid-template-columns: 1fr;
            }
            .csm-flex-responsive {
                flex-direction: column;
            }
            .csm-flex-responsive button {
                width: 100%;
            }
        }

        @media (max-width: 480px) {
            .csm-user-info-grid, .csm-complaint-info-grid {
                grid-template-columns: 1fr;
            }
        }
      `}</style>
      <div className="csm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="csm-layout">
          {/* Left Side: Details */}
          <div className="csm-details-panel">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1.25rem",
                marginBottom: "2rem",
              }}
            >
              <button
                onClick={onClose}
                style={{
                  border: "1px solid #e5e7eb",
                  background: "white",
                  cursor: "pointer",
                  padding: "0.6rem",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArrowLeft size={22} />
              </button>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "1.75rem",
                    fontWeight: "800",
                    color: "#111827",
                  }}
                >
                  Complaint Details - {complaint.ticketId}
                </h2>
                <p
                  style={{
                    margin: "0.25rem 0 0",
                    color: "#6B7280",
                    fontSize: "0.925rem",
                  }}
                >
                  Complete complaint information and management tools
                </p>
              </div>
            </div>

            {/* User Information Box */}
            <div style={{ marginBottom: "2.5rem" }}>
              <h3
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "800",
                  marginBottom: "1rem",
                  color: "#111827",
                }}
              >
                User Information
              </h3>
              <div
                className="csm-user-info-container"
                style={{
                  backgroundColor: "#F9FAFB",
                  borderRadius: "24px",
                  padding: "1.5rem",
                  display: "flex",
                  gap: "1.75rem",
                  alignItems: "center",
                  border: "1px solid #f3f4f6",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
                }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <UserAvatar
                    src={complaint.user.avatar}
                    name={complaint.user.name}
                    size={96}
                    rating={4.8}
                  />
                </div>

                <div className="csm-user-info-grid">
                  <div style={{ minWidth: 0 }}>
                    <label
                      style={{
                        color: "#9CA3AF",
                        fontSize: "10px",
                        display: "block",
                        fontWeight: "800",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: "4px",
                      }}
                    >
                      Full Name
                    </label>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: "700",
                        color: "#111827",
                        fontSize: "14px",
                      }}
                    >
                      {complaint.user.name}
                    </p>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label
                      style={{
                        color: "#9CA3AF",
                        fontSize: "10px",
                        display: "block",
                        fontWeight: "800",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: "4px",
                      }}
                    >
                      Phone
                    </label>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: "700",
                        color: "#111827",
                        fontSize: "14px",
                      }}
                    >
                      {complaint.user.phone}
                    </p>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label
                      style={{
                        color: "#9CA3AF",
                        fontSize: "10px",
                        display: "block",
                        fontWeight: "800",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: "4px",
                      }}
                    >
                      Account ID
                    </label>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: "700",
                        color: "#111827",
                        fontSize: "14px",
                      }}
                    >
                      {complaint.user.id}
                    </p>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label
                      style={{
                        color: "#9CA3AF",
                        fontSize: "10px",
                        display: "block",
                        fontWeight: "800",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: "4px",
                      }}
                    >
                      User Type
                    </label>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: "800",
                        color: "#38AC57",
                        textTransform: "uppercase",
                        fontSize: "12px",
                      }}
                    >
                      {complaint.user.type}
                    </p>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label
                      style={{
                        color: "#9CA3AF",
                        fontSize: "10px",
                        display: "block",
                        fontWeight: "800",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: "4px",
                      }}
                    >
                      City
                    </label>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: "700",
                        color: "#111827",
                        fontSize: "14px",
                      }}
                    >
                      {complaint.user.city}
                    </p>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label
                      style={{
                        color: "#9CA3AF",
                        fontSize: "10px",
                        display: "block",
                        fontWeight: "800",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: "4px",
                      }}
                    >
                      Email
                    </label>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: "700",
                        color: "#111827",
                        fontSize: "14px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {complaint.user.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Complaint Info */}
            <div style={{ marginBottom: "2.5rem" }}>
              <h3
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "800",
                  marginBottom: "1rem",
                  color: "#111827",
                }}
              >
                Complaint Details
              </h3>
              <div
                className="csm-complaint-info-grid"
                style={{
                  backgroundColor: "#fff",
                  border: "1px solid #f3f4f6",
                  borderRadius: "20px",
                  padding: "1.5rem",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)",
                }}
              >
                <div>
                  <label
                    style={{
                      color: "#9CA3AF",
                      fontSize: "10px",
                      fontWeight: "800",
                      textTransform: "uppercase",
                    }}
                  >
                    Ticket ID
                  </label>
                  <p
                    style={{
                      fontWeight: "800",
                      margin: "4px 0 0",
                      color: "#111827",
                      fontSize: "13px",
                    }}
                  >
                    {complaint.ticketId}
                  </p>
                </div>
                <div>
                  <label
                    style={{
                      color: "#9CA3AF",
                      fontSize: "10px",
                      fontWeight: "800",
                      textTransform: "uppercase",
                    }}
                  >
                    Trip ID
                  </label>
                  <p
                    style={{
                      fontWeight: "800",
                      margin: "4px 0 0",
                      color: "#111827",
                      fontSize: "13px",
                    }}
                  >
                    {complaint.tripId}
                  </p>
                </div>
                <div>
                  <label
                    style={{
                      color: "#9CA3AF",
                      fontSize: "10px",
                      fontWeight: "800",
                      textTransform: "uppercase",
                    }}
                  >
                    Status
                  </label>
                  <div
                    style={{
                      backgroundColor: statusColors[complaint.status],
                      color: statusTextColors[complaint.status],
                      padding: "4px 12px",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontWeight: "800",
                      display: "inline-block",
                      marginTop: "4px",
                    }}
                  >
                    {complaint.status}
                  </div>
                </div>
                <div>
                  <label
                    style={{
                      color: "#9CA3AF",
                      fontSize: "10px",
                      fontWeight: "800",
                      textTransform: "uppercase",
                    }}
                  >
                    Date & Time
                  </label>
                  <p
                    style={{
                      fontWeight: "700",
                      margin: "4px 0 0",
                      color: "#111827",
                      fontSize: "12px",
                    }}
                  >
                    {complaint.dateTime}
                  </p>
                </div>
                <div>
                  <label
                    style={{
                      color: "#9CA3AF",
                      fontSize: "10px",
                      fontWeight: "800",
                      textTransform: "uppercase",
                    }}
                  >
                    Complain
                  </label>
                  <div
                    style={{
                      fontWeight: "700",
                      margin: "4px 0 0",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "13px",
                      color: "#111827",
                    }}
                  >
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        src={categoryIcons[complaint.category] || otherIcon}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                    {complaint.category}
                  </div>
                </div>
              </div>
            </div>

            {/* Description Area */}
            <div style={{ marginBottom: "2.5rem" }}>
              <h3
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "800",
                  marginBottom: "1rem",
                  color: "#111827",
                }}
              >
                Complaint Description
              </h3>
              <div
                style={{
                  backgroundColor: "#F9FAFB",
                  borderRadius: "24px",
                  padding: "1.75rem",
                  color: "#4B5563",
                  lineHeight: "1.7",
                  fontSize: "15px",
                  border: "1px solid #f3f4f6",
                }}
              >
                {complaint.description}
              </div>
            </div>

            {/* Management Section */}
            <div>
              <h3
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "800",
                  marginBottom: "1rem",
                  color: "#111827",
                }}
              >
                Status Management
              </h3>
              <div
                className="csm-status-grid"
                style={{ marginBottom: "1.5rem" }}
              >
                <div>
                  <label
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      display: "block",
                      marginBottom: "0.75rem",
                      color: "#374151",
                    }}
                  >
                    Update Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    style={{
                      width: "100%",
                      padding: "1rem 1.25rem",
                      borderRadius: "16px",
                      border: "1px solid #e5e7eb",
                      outline: "none",
                      backgroundColor: "#fff",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    <option value="New">New</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Escalated">Escalated</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      display: "block",
                      marginBottom: "0.75rem",
                      color: "#374151",
                    }}
                  >
                    Assign Agent
                  </label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "1rem 1.25rem",
                      borderRadius: "16px",
                      border: "1px solid #e5e7eb",
                      outline: "none",
                      backgroundColor: "#fff",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    <option value="">Select Team Member</option>
                    <option value="Ali">Ali</option>
                    <option value="Ahmed">Ahmed</option>
                    <option value="Sarah">Sarah</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: "2rem" }}>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    display: "block",
                    marginBottom: "0.75rem",
                    color: "#374151",
                  }}
                >
                  Internal Admin Notes
                </label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Only admins can see these notes..."
                  style={{
                    width: "100%",
                    padding: "1.25rem",
                    borderRadius: "20px",
                    border: "1px solid #e5e7eb",
                    height: "120px",
                    resize: "none",
                    outline: "none",
                    fontSize: "14px",
                    lineHeight: "1.6",
                  }}
                />
              </div>
              <div className="csm-flex-responsive">
                <button
                  onClick={() => {}}
                  style={{
                    flex: 1,
                    padding: "1.1rem",
                    borderRadius: "16px",
                    border: "1px solid #374151",
                    background: "white",
                    fontWeight: "800",
                    cursor: "pointer",
                    fontSize: "14px",
                    transition: "all 0.2s",
                  }}
                >
                  History & Logs
                </button>
                <button
                  onClick={handleUpdate}
                  style={{
                    flex: 1.5,
                    padding: "1.1rem",
                    borderRadius: "16px",
                    border: "none",
                    background: "#38AC57",
                    color: "white",
                    fontWeight: "800",
                    cursor: "pointer",
                    fontSize: "14px",
                    boxShadow: "0 8px 16px -4px rgba(56, 172, 87, 0.3)",
                    transition: "all 0.2s",
                  }}
                >
                  Update & Close Ticket
                </button>
              </div>
            </div>
          </div>

          {/* Right Side: Chat Sidebar */}
          <div className="csm-chat-panel">
            {/* Chat Header */}
            <div
              style={{
                padding: "1.5rem 2rem",
                borderBottom: "1px solid #f3f4f6",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <div style={{ position: "relative", flexShrink: 0 }}>
                <UserAvatar
                  src={complaint.user.avatar}
                  name={complaint.user.name}
                  size={48}
                  rating={4.8}
                  showBadge={true}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    fontWeight: "800",
                    color: "#111827",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {complaint.user.name}
                </h4>
                <p
                  style={{
                    margin: 0,
                    fontSize: "11px",
                    color: "#38AC57",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {complaint.user.type}
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
                <MoreVertical size={20} color="#9CA3AF" />
              </button>
            </div>

            {/* Chat Messages */}
            <div
              style={{
                flex: 1,
                padding: "2rem",
                overflowY: "auto",
                backgroundColor: "#f9fafb",
                display: "flex",
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

              {localMessages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    alignSelf:
                      msg.sender === "user" ? "flex-start" : "flex-end",
                    maxWidth: "85%",
                  }}
                >
                  <div
                    style={{
                      backgroundColor:
                        msg.sender === "user" ? "white" : "#38AC57",
                      color: msg.sender === "user" ? "#374151" : "white",
                      padding: "1rem 1.25rem",
                      borderRadius: "18px",
                      borderBottomLeftRadius:
                        msg.sender === "user" ? 0 : "18px",
                      borderBottomRightRadius:
                        msg.sender === "admin" ? 0 : "18px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      border:
                        msg.sender === "user" ? "1px solid #f3f4f6" : "none",
                    }}
                  >
                    <p
                      style={{ margin: 0, fontSize: "14px", lineHeight: "1.5" }}
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
                      fontWeight: "600",
                    }}
                  >
                    {msg.time}
                  </span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div
              style={{ padding: "1.5rem 2rem", borderTop: "1px solid #f3f4f6" }}
            >
              <form
                onSubmit={handleSendMessage}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  backgroundColor: "#F3F4F6",
                  padding: "0.6rem 1.2rem",
                  borderRadius: "30px",
                }}
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
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type your message..."
                  style={{
                    flex: 1,
                    border: "none",
                    background: "none",
                    outline: "none",
                    padding: "0.6rem 0",
                    fontSize: "0.95rem",
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
                    width: "40px",
                    height: "40px",
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
        </div>
      </div>
    </div>
  );
};
