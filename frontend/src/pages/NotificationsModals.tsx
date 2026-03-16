import { useState, useEffect } from "react";
import { ArrowLeft, Bell, ChevronDown, Users } from "lucide-react";
import { Notification } from "./Notifications";
import {
  createNotificationCampaignApi,
  createTeamNotificationApi,
  calculateNotificationReachApi,
  getNotificationCitiesApi,
  getNotificationRidePreferencesApi,
} from "../services/api";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NotificationCreationModalProps extends ModalProps {
  onCreated?: (notification: Notification) => void;
}

const FALLBACK_CITIES = [
  { id: 1, name: "Casablanca" },
  { id: 2, name: "Rabat" },
  { id: 3, name: "Marrakech" },
];

const FALLBACK_RIDE_PREFERENCES = [
  { id: 1, name: "Economy" },
  { id: 2, name: "Comfort" },
  { id: 3, name: "Delivery" },
];

const FALLBACK_REACH_BY_AUDIENCE: Record<string, number> = {
  Drivers: 580,
  Passengers: 540,
};

const ModalStyles = () => (
  <style>{`
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.4);
            display: flex;
            align-items: center; /* Centered vertically */
            justify-content: center;
            z-index: 1100;
            backdrop-filter: blur(8px);
            padding: 20px;
            overflow-Y: auto;
        }
        .nom-container {
            background-color: white;
            border-radius: 32px;
            width: 100%;
            max-width: 650px;
            position: relative;
            padding: 3rem;
            color: #111827;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            display: flex;
            flex-direction: column;
            animation: modalAppear 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes modalAppear {
            from { opacity: 0; transform: translateY(20px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .nom-back-btn {
            border: none;
            background: #f3f4f6;
            cursor: pointer;
            padding: 10px;
            border-radius: 12px;
            margin-bottom: 1.5rem;
            width: fit-content;
            transition: all 0.2s;
        }
        .nom-back-btn:hover {
            background: #e5e7eb;
            transform: translateX(-2px);
        }
        .nom-step-nav {
            display: flex;
            background-color: #F3F4F6;
            border-radius: 16px;
            padding: 5px;
            margin-bottom: 2.5rem;
        }
        .nom-step-btn {
            flex: 1;
            padding: 12px;
            border-radius: 12px;
            border: none;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 0.95rem;
        }
        .nom-step-btn.active {
            background-color: #38AC57;
            color: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .nom-preview-card {
            background-color: #F9FAFB;
            border-radius: 20px;
            padding: 1.5rem;
            border: 1px solid #E5E7EB;
            margin-top: 2rem;
        }
        .nom-reach-card {
            background-color: #F9FAFB;
            border-radius: 20px;
            padding: 1.5rem;
            border: 1px solid #E5E7EB;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 1rem;
        }
        .nom-grid-3 {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.75rem;
        }
        .nom-footer {
            display: flex;
            gap: 1rem;
            margin-top: 2.5rem;
        }
        .nom-btn {
            flex: 1;
            padding: 16px;
            border-radius: 100px;
            font-weight: 800;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }
        .nom-btn-outline {
            background: white;
            border: 1.5px solid #E5E7EB;
            color: #374151;
        }
        .nom-btn-primary {
            background: #38AC57;
            border: none;
            color: white;
            box-shadow: 0 8px 16px -4px rgba(56, 172, 87, 0.3);
        }
        .nom-btn-primary:hover {
            background: #2e8f47;
            transform: translateY(-2px);
            box-shadow: 0 12px 20px -4px rgba(56, 172, 87, 0.4);
        }
        .nom-detail-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
            margin-top: 1.5rem;
        }
        .nom-chip {
            padding: 6px 16px;
            border-radius: 100px;
            font-size: 0.85rem;
            font-weight: 800;
            display: inline-flex;
            align-items: center;
        }

        @media (max-width: 768px) {
            .nom-container {
                padding: 1.5rem;
                border-radius: 24px;
            }
            .nom-grid-3 {
                grid-template-columns: 1fr 1fr;
            }
            .nom-footer {
                flex-direction: column;
            }
            .nom-btn {
                width: 100%;
            }
            .nom-reach-card {
                flex-direction: column;
                gap: 1.25rem;
                align-items: flex-start;
            }
            .nom-detail-grid {
                grid-template-columns: 1fr;
            }
        }
    `}</style>
);

export const CreateNotificationModal = ({
  isOpen,
  onClose,
  onCreated,
}: NotificationCreationModalProps) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    target: "Drivers",
    status: "All Drivers",
    vehicle: "All Vehicle",
    city: "All City",
  });
  const [estimatedReach, setEstimatedReach] = useState(0);
  const [cities, setCities] = useState<{ id: number; name: string }[]>([]);
  const [ridePrefs, setRidePrefs] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const [citiesRes, prefsRes] = await Promise.allSettled([
        getNotificationCitiesApi(),
        getNotificationRidePreferencesApi(),
      ]);

      const nextCities =
        citiesRes.status === "fulfilled" && citiesRes.value.ok
          ? citiesRes.value.data
          : [];
      const nextRidePrefs =
        prefsRes.status === "fulfilled" && prefsRes.value.ok
          ? prefsRes.value.data
          : [];

      setCities(nextCities.length > 0 ? nextCities : FALLBACK_CITIES);
      setRidePrefs(
        nextRidePrefs.length > 0 ? nextRidePrefs : FALLBACK_RIDE_PREFERENCES,
      );
    })();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || step !== 2) return;
    (async () => {
      try {
        const res = await calculateNotificationReachApi({
          audience: formData.target,
        });
        if (res.ok && typeof res.data.estimatedReach === "number") {
          setEstimatedReach(res.data.estimatedReach);
          return;
        }
      } catch (e) {
        console.error("Failed to calculate notification reach", e);
      }

      setEstimatedReach(FALLBACK_REACH_BY_AUDIENCE[formData.target] ?? 500);
    })();
  }, [isOpen, step, formData.target]);

  const handleSend = async () => {
    setSending(true);
    let createdId = `NOT${Date.now()}`;
    let createdStatus: Notification["status"] = "Sent";

    try {
      const filters: Record<string, unknown> = {};
      if (formData.city !== "All City" && formData.city !== "All Cities") {
        const city = cities.find((c) => c.name === formData.city);
        if (city) filters.cityIds = [city.id];
      }
      if (
        formData.vehicle !== "All Vehicle" &&
        formData.vehicle !== "All Vehicles"
      ) {
        filters.vehicleTypes = [formData.vehicle];
      }
      if (
        formData.status !== "All Drivers" &&
        formData.status !== "All Status"
      ) {
        filters.status = formData.status;
      }

      const response = await createNotificationCampaignApi({
        title: formData.title,
        message: formData.message,
        targetAudience:
          formData.target === "Passengers" ? "Passengers" : "Drivers",
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      });

      if (response.ok && response.data?.id) {
        createdId = `NOT${String(response.data.id).padStart(3, "0")}`;
      }

      if (response.ok && response.data?.status) {
        createdStatus = response.data.status as Notification["status"];
      }
    } catch (e) {
      console.error("Failed to create campaign", e);
    } finally {
      onCreated?.({
        id: createdId,
        type: "External",
        category: formData.target === "Passengers" ? "Passenger" : "Driver",
        title: formData.title || "New notification",
        message: formData.message,
        timestamp: "Just Now",
        status: createdStatus,
        readCount: 0,
        deliveryCount: estimatedReach,
        target: formData.target,
        createdAt: new Date().toISOString(),
        isViewed: false,
      });
      setSending(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <ModalStyles />
      <div className="nom-container" onClick={(e) => e.stopPropagation()}>
        <button className="nom-back-btn" onClick={onClose}>
          <ArrowLeft size={22} />
        </button>

        <h2
          style={{
            fontSize: "1.75rem",
            fontWeight: "900",
            margin: "0 0 0.25rem 0",
          }}
        >
          Create New Notification
        </h2>
        <p
          style={{
            margin: "0 0 2rem 0",
            color: "#6B7280",
            fontSize: "1rem",
            fontWeight: "600",
          }}
        >
          Send targeted notifications to drivers and passengers
        </p>

        <div className="nom-step-nav">
          <button
            onClick={() => setStep(1)}
            className={`nom-step-btn ${step === 1 ? "active" : ""}`}
          >
            Content
          </button>
          <button
            onClick={() => setStep(2)}
            className={`nom-step-btn ${step === 2 ? "active" : ""}`}
          >
            Audience
          </button>
        </div>

        {step === 1 ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <label
                style={{
                  fontWeight: "800",
                  color: "#111827",
                  fontSize: "0.95rem",
                }}
              >
                Notification Title
              </label>
              <input
                type="text"
                placeholder="Enter notification title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                style={{
                  padding: "14px 18px",
                  borderRadius: "14px",
                  border: "1.5px solid #E5E7EB",
                  outline: "none",
                  fontSize: "1rem",
                  fontWeight: "600",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <label
                style={{
                  fontWeight: "800",
                  color: "#111827",
                  fontSize: "0.95rem",
                }}
              >
                Message
              </label>
              <textarea
                placeholder="Enter your message"
                rows={4}
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                style={{
                  padding: "14px 18px",
                  borderRadius: "14px",
                  border: "1.5px solid #E5E7EB",
                  outline: "none",
                  resize: "none",
                  fontSize: "1rem",
                  fontWeight: "600",
                }}
              />
            </div>

            <div className="nom-preview-card">
              <p
                style={{
                  margin: "0 0 1.25rem 0",
                  fontWeight: "800",
                  color: "#374151",
                  fontSize: "0.9rem",
                }}
              >
                Mobile App Preview
              </p>
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "16px",
                  padding: "1.25rem",
                  display: "flex",
                  gap: "1.25rem",
                  border: "1.5px solid #E5E7EB",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    backgroundColor: "#38AC57",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Bell color="white" size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: "900", fontSize: "1rem" }}>
                      {formData.title || "Notification Title"}
                    </span>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "#9CA3AF",
                        fontWeight: "700",
                      }}
                    >
                      Just Now
                    </span>
                  </div>
                  <p
                    style={{
                      margin: "0.4rem 0 0 0",
                      fontSize: "0.9rem",
                      color: "#6B7280",
                      fontWeight: "600",
                      lineHeight: "1.4",
                    }}
                  >
                    {formData.message ||
                      "Your notification message will appear here..."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <label style={{ fontWeight: "800", fontSize: "1rem" }}>
                User Type
              </label>
              <div style={{ position: "relative" }}>
                <select
                  style={{
                    width: "100%",
                    padding: "14px 18px",
                    borderRadius: "14px",
                    border: "1.5px solid #E5E7EB",
                    appearance: "none",
                    outline: "none",
                    fontWeight: "700",
                    fontSize: "1rem",
                    backgroundColor: "white",
                  }}
                  value={formData.target}
                  onChange={(e) =>
                    setFormData({ ...formData, target: e.target.value })
                  }
                >
                  <option>Drivers</option>
                  <option>Passengers</option>
                </select>
                <ChevronDown
                  size={20}
                  style={{
                    position: "absolute",
                    right: "18px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                    color: "#6B7280",
                  }}
                />
              </div>
            </div>

            <p
              style={{
                margin: "0.5rem 0 0 0",
                fontWeight: "900",
                color: "#111827",
                fontSize: "1.1rem",
              }}
            >
              Targeting Filters
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1.25rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                }}
              >
                <label
                  style={{
                    fontWeight: "700",
                    color: "#374151",
                    fontSize: "0.9rem",
                  }}
                >
                  Status
                </label>
                <div style={{ position: "relative" }}>
                  <select
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "12px",
                      border: "1.5px solid #E5E7EB",
                      appearance: "none",
                      outline: "none",
                      fontWeight: "700",
                      backgroundColor: "white",
                    }}
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                  >
                    <option>All Status</option>
                    <option>Active</option>
                    <option>Offline</option>
                  </select>
                  <ChevronDown
                    size={18}
                    style={{
                      position: "absolute",
                      right: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                      color: "#6B7280",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                }}
              >
                <label
                  style={{
                    fontWeight: "700",
                    color: "#374151",
                    fontSize: "0.9rem",
                  }}
                >
                  Vehicle Category
                </label>
                <div style={{ position: "relative" }}>
                  <select
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "12px",
                      border: "1.5px solid #E5E7EB",
                      appearance: "none",
                      outline: "none",
                      fontWeight: "700",
                      backgroundColor: "white",
                    }}
                    value={formData.vehicle}
                    onChange={(e) =>
                      setFormData({ ...formData, vehicle: e.target.value })
                    }
                  >
                    <option>All Vehicles</option>
                    {ridePrefs.map((p) => (
                      <option key={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown
                    size={18}
                    style={{
                      position: "absolute",
                      right: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                      color: "#6B7280",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                }}
              >
                <label
                  style={{
                    fontWeight: "700",
                    color: "#374151",
                    fontSize: "0.9rem",
                  }}
                >
                  Operating City
                </label>
                <div style={{ position: "relative" }}>
                  <select
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "12px",
                      border: "1.5px solid #E5E7EB",
                      appearance: "none",
                      outline: "none",
                      fontWeight: "700",
                      backgroundColor: "white",
                    }}
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                  >
                    <option>All Cities</option>
                    {cities.map((c) => (
                      <option key={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown
                    size={18}
                    style={{
                      position: "absolute",
                      right: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                      color: "#6B7280",
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="nom-reach-card">
              <div
                style={{
                  display: "flex",
                  gap: "1.25rem",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "16px",
                    backgroundColor: "#38AC57",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 16px rgba(56, 172, 87, 0.2)",
                  }}
                >
                  <Users color="white" size={28} />
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: "900",
                      fontSize: "1.25rem",
                    }}
                  >
                    Estimated Reach
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.9rem",
                      color: "#6B7280",
                      fontWeight: "600",
                    }}
                  >
                    Potential delivery count
                  </p>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "2.5rem",
                    fontWeight: "900",
                    color: "#38AC57",
                    lineHeight: 1,
                  }}
                >
                  {estimatedReach.toLocaleString()}
                </p>
                <p
                  style={{
                    margin: "0.2rem 0 0 0",
                    fontSize: "0.95rem",
                    color: "#6B7280",
                    fontWeight: "800",
                  }}
                >
                  Total Users
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="nom-footer">
          {step === 1 ? (
            <button className="nom-btn nom-btn-outline" onClick={onClose}>
              Cancel
            </button>
          ) : (
            <button
              className="nom-btn nom-btn-outline"
              onClick={() => setStep(1)}
            >
              Back to Content
            </button>
          )}
          <button
            className="nom-btn nom-btn-primary"
            onClick={() => (step === 1 ? setStep(2) : handleSend())}
            disabled={sending}
          >
            {step === 1
              ? "Configure Audience"
              : sending
                ? "Sending..."
                : "Send Notification Now"}
          </button>
        </div>
      </div>
    </div>
  );
};

export const TeamNotificationModal = ({
  isOpen,
  onClose,
  onCreated,
}: NotificationCreationModalProps) => {
  const [sendOption, setSendOption] = useState<"Now" | "Schedule">("Now");
  const departments = [
    "Car Ride",
    "Operations",
    "Support",
    "Marketing",
    "Legal",
    "Sales",
  ];
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    category: "Announcement",
  });
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [scheduleDate] = useState("");

  const toggleDept = (dept: string) => {
    setSelectedDepts((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept],
    );
  };

  const handleSend = async () => {
    setSending(true);
    let createdId = `INT${Date.now()}`;
    let createdStatus: Notification["status"] = "Sent";

    try {
      const response = await createTeamNotificationApi({
        title: formData.title,
        description: formData.message,
        targetDepartments: selectedDepts.length > 0 ? selectedDepts : undefined,
        category: formData.category,
        scheduledAt:
          sendOption === "Schedule" && scheduleDate
            ? new Date(scheduleDate).toISOString()
            : undefined,
      });

      if (response.ok && response.data?.id) {
        createdId = `INT${String(response.data.id).padStart(3, "0")}`;
      }

      if (response.ok && response.data?.status) {
        createdStatus = response.data.status as Notification["status"];
      }
    } catch (e) {
      console.error("Failed to send team notification", e);
    } finally {
      onCreated?.({
        id: createdId,
        type: "Internal",
        category: formData.category,
        title: formData.title || "Team notification",
        message: formData.message,
        timestamp: "Just Now",
        status: createdStatus,
        readCount: 0,
        deliveryCount: selectedDepts.length,
        departments: selectedDepts,
        createdAt: new Date().toISOString(),
        isViewed: false,
      });
      setSending(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <ModalStyles />
      <div className="nom-container" onClick={(e) => e.stopPropagation()}>
        <button className="nom-back-btn" onClick={onClose}>
          <ArrowLeft size={22} />
        </button>

        <h2
          style={{
            fontSize: "1.75rem",
            fontWeight: "900",
            margin: "0 0 0.25rem 0",
          }}
        >
          Send Team Notification
        </h2>
        <p
          style={{
            margin: "0 0 2rem 0",
            color: "#6B7280",
            fontSize: "1rem",
            fontWeight: "600",
          }}
        >
          Internal notifications for admin panel team members
        </p>

        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            <label style={{ fontWeight: "800", fontSize: "0.95rem" }}>
              Notification Title
            </label>
            <input
              type="text"
              placeholder="Enter notification title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              style={{
                padding: "14px 18px",
                borderRadius: "14px",
                border: "1.5px solid #E5E7EB",
                outline: "none",
                fontSize: "1rem",
                fontWeight: "600",
              }}
            />
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            <label style={{ fontWeight: "800", fontSize: "0.95rem" }}>
              Message Content
            </label>
            <textarea
              placeholder="Enter your message"
              rows={4}
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              style={{
                padding: "14px 18px",
                borderRadius: "14px",
                border: "1.5px solid #E5E7EB",
                outline: "none",
                resize: "none",
                fontSize: "1rem",
                fontWeight: "600",
              }}
            />
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            <label style={{ fontWeight: "800", fontSize: "0.95rem" }}>
              Target Departments
            </label>
            <div className="nom-grid-3">
              {departments.map((dept) => (
                <label
                  key={dept}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    cursor: "pointer",
                    backgroundColor: "#F9FAFB",
                    padding: "12px",
                    borderRadius: "12px",
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedDepts.includes(dept)}
                    onChange={() => toggleDept(dept)}
                    style={{
                      accentColor: "#38AC57",
                      width: "18px",
                      height: "18px",
                    }}
                  />
                  {dept}
                </label>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1.25rem",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              <label style={{ fontWeight: "800", fontSize: "0.95rem" }}>
                Category
              </label>
              <div style={{ position: "relative" }}>
                <select
                  style={{
                    width: "100%",
                    padding: "14px 18px",
                    borderRadius: "14px",
                    border: "1.5px solid #E5E7EB",
                    appearance: "none",
                    outline: "none",
                    fontWeight: "700",
                    backgroundColor: "white",
                  }}
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                >
                  <option>Announcement</option>
                  <option>Urgent</option>
                  <option>Update</option>
                </select>
                <ChevronDown
                  size={20}
                  style={{
                    position: "absolute",
                    right: "18px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              <label style={{ fontWeight: "800", fontSize: "0.95rem" }}>
                Send Timing
              </label>
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  backgroundColor: "#F3F4F6",
                  padding: "4px",
                  borderRadius: "30px",
                }}
              >
                <button
                  onClick={() => setSendOption("Now")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "26px",
                    backgroundColor:
                      sendOption === "Now" ? "black" : "transparent",
                    color: sendOption === "Now" ? "white" : "#6B7280",
                    border: "none",
                    fontWeight: "800",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                  }}
                >
                  Now
                </button>
                <button
                  onClick={() => setSendOption("Schedule")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "26px",
                    backgroundColor:
                      sendOption === "Schedule" ? "black" : "transparent",
                    color: sendOption === "Schedule" ? "white" : "#6B7280",
                    border: "none",
                    fontWeight: "800",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                  }}
                >
                  Schedule
                </button>
              </div>
            </div>
          </div>

          <div className="nom-preview-card">
            <p
              style={{
                margin: "0 0 1.25rem 0",
                fontWeight: "800",
                color: "#374151",
                fontSize: "0.9rem",
              }}
            >
              Dashboard Preview
            </p>
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "16px",
                padding: "1.25rem",
                display: "flex",
                gap: "1.25rem",
                border: "1.5px solid #E5E7EB",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "#38AC57",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Bell color="white" size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: "900", fontSize: "1rem" }}>
                    {formData.title || "Notification Title"}
                  </span>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "#9CA3AF",
                      fontWeight: "700",
                    }}
                  >
                    Just Now
                  </span>
                </div>
                <p
                  style={{
                    margin: "0.4rem 0 0 0",
                    fontSize: "0.9rem",
                    color: "#6B7280",
                    fontWeight: "600",
                  }}
                >
                  {formData.message || "The team will see this message..."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="nom-footer">
          <button className="nom-btn nom-btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="nom-btn nom-btn-primary"
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? "Sending..." : "Deploy Notification"}
          </button>
        </div>
      </div>
    </div>
  );
};

export const NotificationDetailsModal = ({
  isOpen,
  onClose,
  notification,
  onUpdate,
  onDelete,
}: ModalProps & {
  notification: Notification | null;
  onUpdate: (notification: Notification) => void;
  onDelete: (id: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMessage, setDraftMessage] = useState("");

  useEffect(() => {
    if (!isOpen || !notification) {
      setIsEditing(false);
      setShowDeleteConfirm(false);
      setDraftTitle("");
      setDraftMessage("");
      return;
    }

    setDraftTitle(notification.title);
    setDraftMessage(notification.message);
    setIsEditing(false);
    setShowDeleteConfirm(false);
  }, [isOpen, notification]);

  if (!isOpen || !notification) return null;

  const handleSave = () => {
    onUpdate({
      ...notification,
      title: draftTitle.trim() || notification.title,
      message: draftMessage.trim() || notification.message,
    });
    setIsEditing(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <ModalStyles />
      <div
        className="nom-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "600px" }}
      >
        <button className="nom-back-btn" onClick={onClose}>
          <ArrowLeft size={22} />
        </button>

        <h2
          style={{
            fontSize: "1.75rem",
            fontWeight: "900",
            margin: "0 0 1.5rem 0",
          }}
        >
          Notification Insight
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div>
            {isEditing ? (
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                style={{
                  width: "100%",
                  borderRadius: "16px",
                  border: "1.5px solid #E5E7EB",
                  padding: "1rem 1.1rem",
                  fontSize: "1.1rem",
                  fontWeight: "800",
                  color: "#111827",
                  outline: "none",
                  marginBottom: "1rem",
                }}
              />
            ) : (
              <h3
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "900",
                  margin: "0 0 1rem 0",
                  color: "#111827",
                }}
              >
                {notification.title}
              </h3>
            )}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <span
                className="nom-chip"
                style={{ backgroundColor: "#DBEAFE", color: "#3B82F6" }}
              >
                {notification.category}
              </span>
              <span
                className="nom-chip"
                style={{ backgroundColor: "#eef7f0", color: "#38AC57" }}
              >
                {notification.status}
              </span>
            </div>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <label
              style={{
                fontWeight: "800",
                color: "#111827",
                fontSize: "0.95rem",
                opacity: 0.6,
              }}
            >
              Full Message Content
            </label>
            <div
              style={{
                padding: isEditing ? 0 : "1.5rem",
                borderRadius: "24px",
                border: "1.5px solid #E5E7EB",
                backgroundColor: "white",
                color: "#374151",
                fontSize: "1.1rem",
                lineHeight: "1.6",
                fontWeight: "600",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
              }}
            >
              {isEditing ? (
                <textarea
                  value={draftMessage}
                  onChange={(e) => setDraftMessage(e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: "180px",
                    border: "none",
                    resize: "vertical",
                    borderRadius: "24px",
                    padding: "1.5rem",
                    fontSize: "1rem",
                    lineHeight: "1.6",
                    color: "#374151",
                    outline: "none",
                    fontWeight: "600",
                  }}
                />
              ) : (
                notification.message
              )}
            </div>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <label
              style={{
                fontWeight: "800",
                color: "#111827",
                fontSize: "0.95rem",
                opacity: 0.6,
              }}
            >
              Recipient Segment
            </label>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {(
                notification.departments || [notification.target || "All Users"]
              ).map((dept: any) => (
                <span
                  key={dept}
                  className="nom-chip"
                  style={{
                    backgroundColor: "white",
                    color: "#0EA5E9",
                    border: "1.5px solid #BAE6FD",
                    padding: "10px 20px",
                  }}
                >
                  {dept}
                </span>
              ))}
            </div>
          </div>

          <div className="nom-detail-grid">
            <div
              style={{
                textAlign: "center",
                padding: "2rem",
                borderRadius: "24px",
                backgroundColor: "white",
                border: "1.5px solid #eef7f0",
                boxShadow: "0 4px 12px rgba(56, 172, 87, 0.05)",
              }}
            >
              <p
                style={{
                  fontSize: "3rem",
                  fontWeight: "900",
                  margin: 0,
                  color: "#111827",
                  lineHeight: 1,
                }}
              >
                {notification.deliveryCount}
              </p>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#6B7280",
                  margin: "0.75rem 0 0 0",
                  fontWeight: "900",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Delivered
              </p>
            </div>
            <div
              style={{
                textAlign: "center",
                padding: "2rem",
                borderRadius: "24px",
                backgroundColor: "white",
                border: "1.5px solid #eef7f0",
                boxShadow: "0 4px 12px rgba(56, 172, 87, 0.05)",
              }}
            >
              <p
                style={{
                  fontSize: "3rem",
                  fontWeight: "900",
                  margin: 0,
                  color: "#111827",
                  lineHeight: 1,
                }}
              >
                {notification.readCount}
              </p>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#6B7280",
                  margin: "0.75rem 0 0 0",
                  fontWeight: "900",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Estimated Views
              </p>
            </div>
          </div>
        </div>

        <div className="nom-footer" style={{ marginTop: "3rem" }}>
          <button
            className="nom-btn nom-btn-outline"
            onClick={() => setShowDeleteConfirm(true)}
            style={{ color: "#EF4444", borderColor: "#FECACA" }}
          >
            Delete Notification
          </button>
          {isEditing ? (
            <button className="nom-btn nom-btn-primary" onClick={handleSave}>
              Save Changes
            </button>
          ) : (
            <button
              className="nom-btn nom-btn-primary"
              onClick={() => setIsEditing(true)}
            >
              Edit Notification
            </button>
          )}
        </div>

        <button
          className="nom-btn nom-btn-outline"
          style={{ marginTop: "1rem", width: "100%" }}
          onClick={onClose}
        >
          Close
        </button>

        {showDeleteConfirm && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1200,
              padding: "20px",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "420px",
                backgroundColor: "white",
                borderRadius: "24px",
                padding: "1.5rem",
                border: "1px solid #E5E7EB",
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 0.5rem 0",
                  fontSize: "1.1rem",
                  fontWeight: "900",
                  color: "#111827",
                }}
              >
                Delete this notification?
              </h3>
              <p
                style={{
                  margin: "0 0 1.25rem 0",
                  color: "#6B7280",
                  fontSize: "0.95rem",
                  fontWeight: "600",
                }}
              >
                This change will persist after reload.
              </p>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  className="nom-btn nom-btn-outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="nom-btn"
                  onClick={() => onDelete(notification.id)}
                  style={{
                    backgroundColor: "#EF4444",
                    border: "none",
                    color: "white",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const SystemStatusModal = ({ isOpen, onClose }: ModalProps) => {
  if (!isOpen) return null;

  const services = [
    {
      name: "Push Notification Service",
      status: "Operational",
      latency: "45ms",
    },
    { name: "Driver App API", status: "Operational", latency: "120ms" },
    { name: "Passenger App API", status: "Operational", latency: "115ms" },
    { name: "Database Engine", status: "Operational", latency: "12ms" },
    { name: "Admin Dashboard", status: "Operational", latency: "85ms" },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <ModalStyles />
      <div
        className="nom-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "600px" }}
      >
        <button className="nom-back-btn" onClick={onClose}>
          <ArrowLeft size={22} />
        </button>

        <h2
          style={{
            fontSize: "1.75rem",
            fontWeight: "900",
            margin: "0 0 0.5rem 0",
          }}
        >
          System Health Center
        </h2>
        <p
          style={{
            margin: "0 0 2rem 0",
            color: "#6B7280",
            fontSize: "1rem",
            fontWeight: "600",
          }}
        >
          Real-time health monitoring of notification services
        </p>

        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          <div
            style={{
              backgroundColor: "#eef7f0",
              border: "1.5px solid #BBF7D0",
              borderRadius: "20px",
              padding: "1.75rem",
              display: "flex",
              alignItems: "center",
              gap: "1.25rem",
              marginBottom: "0.5rem",
            }}
          >
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                backgroundColor: "#38AC57",
                boxShadow: "0 0 0 5px rgba(16, 185, 129, 0.2)",
              }}
            ></div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontWeight: "900",
                  color: "#065F46",
                  fontSize: "1.25rem",
                }}
              >
                All Services Optimal
              </p>
              <p
                style={{
                  margin: "0.2rem 0 0 0",
                  fontSize: "0.9rem",
                  color: "#059669",
                  fontWeight: "800",
                }}
              >
                Active monitoring enabled • Refreshed just now
              </p>
            </div>
          </div>

          {services.map((service, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1.25rem 1.5rem",
                borderRadius: "18px",
                border: "1.5px solid #E5E7EB",
                backgroundColor: "white",
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.2rem",
                }}
              >
                <span
                  style={{
                    fontWeight: "900",
                    color: "#111827",
                    fontSize: "1.05rem",
                  }}
                >
                  {service.name}
                </span>
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "#9CA3AF",
                    fontWeight: "800",
                  }}
                >
                  Ping Latency:{" "}
                  <span style={{ color: "#6B7280" }}>{service.latency}</span>
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  backgroundColor: "#fcfdfc",
                  padding: "6px 14px",
                  borderRadius: "10px",
                  border: "1px solid #eef7f0",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#38AC57",
                  }}
                ></div>
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "900",
                    color: "#38AC57",
                    textTransform: "uppercase",
                  }}
                >
                  {service.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        <button
          className="nom-btn nom-btn-primary"
          onClick={onClose}
          style={{ marginTop: "2.5rem" }}
        >
          Exit Health Monitor
        </button>
      </div>
    </div>
  );
};
