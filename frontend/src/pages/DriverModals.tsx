import { useState } from "react";
import { ArrowLeft, CheckCircle2, Star } from "lucide-react";
import { UserAvatar } from "../components/UserAvatar";
import pickupIcon from "../assets/icons/pickup.png";
import destinationIcon from "../assets/icons/destination.png";
import bikeIcon from "../assets/icons/bike.png";
import carIcon from "../assets/icons/car.png";
import {
  createDriverApi,
  suspendDriverApi,
  updateDriverPreferencesApi,
} from "../services/api";

// --- Types ---
// You might want to move these shared types to a common file
interface ModalProps {
  onClose: () => void;
  driver?: any; // Replace with proper Driver type
  trip?: any; // Replace with proper Trip type
  onSuccess?: () => void;
}

// --- Icons ---
// Mocking vehicle icons for the modals if not available in Lucide
const VehicleIcon = ({
  type,
  selected,
}: {
  type: string;
  selected: boolean;
}) => (
  <div
    style={{
      width: 48,
      height: 48,
      backgroundColor: "#eef7f0",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginRight: "1rem",
    }}
  >
    {type === "Motorcycle" ? (
      <img
        src={bikeIcon}
        alt="motorbike"
        style={{
          width: "32px",
          height: "auto",
          filter: selected ? "none" : "grayscale(1)",
        }}
      />
    ) : (
      <img
        src={carIcon}
        alt="car"
        style={{
          width: "32px",
          height: "auto",
          filter: selected ? "none" : "grayscale(1)",
        }}
      />
    )}
  </div>
);

// --- Change Hezzni Service Category Modal ---

export const ChangeCategoryModal = ({ onClose, driver }: ModalProps) => {
  const [selectedCategory, setSelectedCategory] = useState(
    driver?.vehicleType === "Motorcycle" ? "Motorcycle" : "Hezzni Standard",
  );
  const [saving, setSaving] = useState(false);

  const categories = [
    {
      id: "Hezzni Comfort",
      label: "Hezzni Comfort",
      desc: "Premium rides with higher fares",
      icon: "Car",
    },
    {
      id: "Hezzni Standard",
      label: "Hezzni Standard",
      desc: "Affordable everyday rides",
      icon: "Car",
    },
    {
      id: "Hezzni XL",
      label: "Hezzni XL",
      desc: "For group trips and extra space",
      icon: "Car",
    },
  ];

  const handleUpdate = async () => {
    if (!driver?.numericId) return;
    setSaving(true);
    const serviceTypeMap: Record<string, number> = {
      "Hezzni Comfort": 1,
      "Hezzni Standard": 1,
      "Hezzni XL": 1,
      Motorcycle: 2,
    };
    await updateDriverPreferencesApi(driver.numericId, {
      serviceTypeId: serviceTypeMap[selectedCategory] || 1,
      carRideStatus: selectedCategory !== "Motorcycle" ? "active" : "inactive",
      motorcycleStatus:
        selectedCategory === "Motorcycle" ? "active" : "inactive",
    });
    setSaving(false);
    onClose();
  };

  // If motorcycle, maybe show motorcycle only or mixed?
  // Screenshot 1 shows "Ride Preferences" -> "Motorcycle"
  // Screenshot 3 shows "Change Hezzni Service Category" -> Cars
  // We will render based on context or show generic list for now.

  // Assuming if driver is motorcycle, we show motorcycle category or just the list.
  // The screenshot 3 implies selectable options.

  return (
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
      }}
    >
      <div
        className="card"
        style={{
          width: "500px",
          backgroundColor: "white",
          borderRadius: "1.5rem",
          padding: "1.5rem",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              marginRight: "1rem",
            }}
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: "bold", margin: 0 }}>
              Change Hezzni Service Category
            </h2>
            <p
              style={{
                color: "#6b7280",
                fontSize: "0.85rem",
                marginTop: "0.3rem",
                lineHeight: "1.2",
              }}
            >
              Select the appropriate service category for this driver. This will
              affect pricing and service level.
            </p>
          </div>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <h3
            style={{
              fontSize: "0.9rem",
              fontWeight: "bold",
              marginBottom: "1rem",
            }}
          >
            Service Category*
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "1rem",
                    borderRadius: "1rem",
                    border: isSelected
                      ? "1px solid #38AC57"
                      : "1px solid #e5e7eb",
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  <VehicleIcon type={cat.icon} selected={isSelected} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold" }}>{cat.label}</div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      {cat.desc}
                    </div>
                  </div>
                  {isSelected && (
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        border: "4px solid #38AC57",
                        backgroundColor: "white",
                      }}
                    ></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleUpdate}
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
          {saving ? "Updating..." : "Update Category"}
        </button>
      </div>
    </div>
  );
};

// --- Ride Preferences Modal (Motorcycle specific view or similar) ---
export const RidePreferencesModal = ({ onClose }: ModalProps) => {
  // Determine content based on screenshot 1 "Ride Prefences" (sic)
  // It shows "Motorcycle" selected.

  return (
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
      }}
    >
      <div
        className="card"
        style={{
          width: "500px",
          backgroundColor: "white",
          borderRadius: "1.5rem",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              marginRight: "1rem",
            }}
          >
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>
            Ride Prefences
          </h2>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "1rem",
            borderRadius: "1rem",
            border: "1px solid #38AC57",
            marginBottom: "2rem",
          }}
        >
          <div style={{ marginRight: "1rem" }}>
            <img
              src={bikeIcon}
              alt="motorbike"
              style={{ width: "48px", height: "auto" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: "bold" }}>Motorcycle</div>
            <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
              Affordable everyday rides
            </div>
          </div>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              border: "4px solid #38AC57",
              backgroundColor: "white",
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

// --- Suspend Driver Modal ---

export const SuspendDriverModal = ({
  onClose,
  driver,
  onSuccess,
}: ModalProps) => {
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState("24 Hours");
  const [suspending, setSuspending] = useState(false);

  const handleSuspend = async () => {
    if (!driver?.numericId) return;
    setSuspending(true);
    const res = await suspendDriverApi(driver.numericId, {
      reason: reason || "Suspended by admin",
      hours,
    });
    setSuspending(false);
    if (res.ok && onSuccess) {
      onSuccess();
    } else {
      onClose();
    }
  };

  return (
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
      }}
    >
      <div
        className="card"
        style={{
          width: "500px",
          backgroundColor: "white",
          borderRadius: "1.5rem",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              marginRight: "1rem",
            }}
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: "bold", margin: 0 }}>
              Suspend Driver
            </h2>
            <p
              style={{
                color: "#6b7280",
                fontSize: "0.85rem",
                marginTop: "0.3rem",
              }}
            >
              Please provide a reason for suspending this driver account.
            </p>
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              fontWeight: "bold",
              marginBottom: "0.5rem",
            }}
          >
            Suspension Reason
          </label>
          <textarea
            placeholder="Type Here"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              width: "100%",
              height: "100px",
              padding: "1rem",
              borderRadius: "1rem",
              border: "none",
              backgroundColor: "#f9fafb",
              resize: "none",
              fontFamily: "inherit",
            }}
          />
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <label
            style={{
              display: "block",
              fontWeight: "bold",
              marginBottom: "0.5rem",
            }}
          >
            Suspension Hours
          </label>
          <div style={{ position: "relative" }}>
            <select
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              style={{
                width: "100%",
                padding: "1rem",
                borderRadius: "1rem",
                border: "none",
                backgroundColor: "#f9fafb",
                appearance: "none",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              <option>24 Hours</option>
              <option>48 Hours</option>
              <option>1 Week</option>
              <option>Indefinitely</option>
            </select>
            <div
              style={{
                position: "absolute",
                right: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            >
              ▼
            </div>
          </div>
        </div>

        <button
          onClick={handleSuspend}
          disabled={suspending}
          style={{
            width: "100%",
            padding: "1rem",
            borderRadius: "2rem",
            border: "none",
            backgroundColor: suspending ? "#9ca3af" : "#b91c1c",
            color: "white",
            fontWeight: "bold",
            fontSize: "1rem",
            cursor: suspending ? "not-allowed" : "pointer",
          }}
        >
          {suspending ? "Suspending..." : "Confirm Suspension"}
        </button>
      </div>
    </div>
  );
};

// --- Trip Summary Modal ---

export const TripSummaryModal = ({ onClose, trip }: ModalProps) => {
  // Use mock data if trip is missing some fields
  const mockTripData = {
    driverName: trip?.driverName || "Ahmed Hassan",
    date: "3 Jun, 2025 at 12:00 PM",
    tripsCount: 2847,
    rating: 4.8,
    distance: "1.3 km",
    time: "11 min",
    price: "74 MAD",
    car: {
      plate: "8 | I | 26363",
      model: "Toyota HR-V • White",
      id: "ID No C-0003",
    },
    pickup: { location: "Current Location, Marrakech", time: "7:15 PM" },
    dropoff: { location: "Current Location, Marrakech", time: "9:30 PM" },
    ratingGiven: 5.0,
    reviewGiven:
      "The ride was smooth and comfortable. The driver was polite, the car was clean, and pickup was on time. Overall, a great experience!",
    ratingReceived: 5.0,
    reviewReceived:
      "Very polite and friendly passenger. Communicated well and made the trip smooth.",
  };

  return (
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
      }}
    >
      <div
        className="card"
        style={{
          width: "600px",
          backgroundColor: "white",
          borderRadius: "1.5rem",
          padding: "0",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ padding: "1.5rem 1.5rem 0.5rem 1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              marginBottom: "1rem",
            }}
          >
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                marginRight: "1rem",
                padding: 0,
              }}
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>
                Trip Summary
              </h2>
              <p
                style={{
                  color: "#6b7280",
                  fontSize: "0.9rem",
                  marginTop: "0.3rem",
                }}
              >
                {mockTripData.date}
              </p>
            </div>
          </div>

          {/* Driver Card */}
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "1rem",
              padding: "1rem",
              display: "flex",
              alignItems: "center",
              marginBottom: "1rem",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <UserAvatar
                src={undefined}
                name={mockTripData.driverName}
                rating={mockTripData.rating}
                size={54}
                showBadge={false}
              />
              <div>
                <div
                  style={{
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {mockTripData.driverName}
                  <CheckCircle2 size={14} fill="#3b82f6" color="white" />
                </div>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  ({mockTripData.tripsCount} trips)
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "2rem" }}>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                  Distance
                </div>
                <div style={{ fontWeight: "bold" }}>
                  {mockTripData.distance}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                  Total Time
                </div>
                <div style={{ fontWeight: "bold" }}>{mockTripData.time}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                  Price
                </div>
                <div style={{ fontWeight: "bold", color: "#38AC57" }}>
                  {mockTripData.price}
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Card */}
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "1rem",
              padding: "1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div>
              <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                {mockTripData.car.plate}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                {mockTripData.car.model}
              </div>
              <div
                style={{
                  backgroundColor: "black",
                  color: "white",
                  fontSize: "0.7rem",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "1rem",
                  display: "inline-block",
                  marginTop: "0.5rem",
                }}
              >
                {mockTripData.car.id}
              </div>
            </div>
            {/* Mock Car Image */}
            <img
              src={bikeIcon}
              alt="motorbike"
              style={{ width: "80px", height: "auto", objectFit: "contain" }}
            />
          </div>

          {/* Timeline */}
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "1rem",
              padding: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
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
                  left: "8px",
                  top: "15px",
                  bottom: "15px",
                  borderLeft: "2px dashed #e5e7eb",
                  zIndex: 0,
                }}
              ></div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.8rem",
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
                  <div style={{ fontSize: "0.9rem", fontWeight: "600" }}>
                    {mockTripData.pickup.location}
                  </div>
                </div>
                <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                  {mockTripData.pickup.time}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.8rem",
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
                  <div style={{ fontSize: "0.9rem", fontWeight: "600" }}>
                    {mockTripData.dropoff.location}
                  </div>
                </div>
                <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                  {mockTripData.dropoff.time}
                </div>
              </div>
            </div>
          </div>

          {/* Rating Given */}
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "1rem",
              padding: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                fontSize: "0.8rem",
                color: "#6b7280",
                marginBottom: "0.5rem",
              }}
            >
              Rating Given
            </div>
            <div
              style={{ display: "flex", gap: "2px", marginBottom: "0.5rem" }}
            >
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <Star key={i} size={14} fill="#fbbf24" stroke="none" />
                ))}
              <span
                style={{
                  fontSize: "0.9rem",
                  fontWeight: "bold",
                  marginLeft: "0.5rem",
                }}
              >
                {mockTripData.ratingGiven}
              </span>
            </div>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#374151",
                margin: "0 0 1rem 0",
              }}
            >
              {mockTripData.reviewGiven}
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {["On time pickup", "Clean Car", "Safe Driving"].map((tag) => (
                <span
                  key={tag}
                  style={{
                    backgroundColor: "#38AC57",
                    color: "white",
                    padding: "0.3rem 0.8rem",
                    borderRadius: "0.3rem",
                    fontSize: "0.7rem",
                    fontWeight: "600",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Rating Received */}
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "1rem",
              padding: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                fontSize: "0.8rem",
                color: "#6b7280",
                marginBottom: "0.5rem",
              }}
            >
              Rating Received
            </div>
            <div
              style={{ display: "flex", gap: "2px", marginBottom: "0.5rem" }}
            >
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <Star key={i} size={14} fill="#fbbf24" stroke="none" />
                ))}
              <span
                style={{
                  fontSize: "0.9rem",
                  fontWeight: "bold",
                  marginLeft: "0.5rem",
                }}
              >
                {mockTripData.ratingReceived}
              </span>
            </div>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#374151",
                margin: "0 0 1rem 0",
              }}
            >
              {mockTripData.reviewReceived}
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {["Ready on time", "Polite & Friendly"].map((tag) => (
                <span
                  key={tag}
                  style={{
                    backgroundColor: "#38AC57",
                    color: "white",
                    padding: "0.3rem 0.8rem",
                    borderRadius: "0.3rem",
                    fontSize: "0.7rem",
                    fontWeight: "600",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "1.5rem", borderTop: "1px solid #e5e7eb" }}>
          <button
            style={{
              width: "100%",
              padding: "1rem",
              borderRadius: "2rem",
              border: "none",
              backgroundColor: "#38AC57",
              color: "white",
              fontWeight: "bold",
              fontSize: "1rem",
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            Download Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Add New Driver Modal ---

export const AddDriverModal = ({ onClose }: ModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    cityId: "",
    gender: "MALE",
    serviceTypeId: "1", // Default to Car
    status: "pending",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      alert("Name and Phone are required");
      return;
    }

    setLoading(true);
    try {
      const response = await createDriverApi({
        ...formData,
        cityId: formData.cityId ? parseInt(formData.cityId, 10) : null,
        serviceTypeId: parseInt(formData.serviceTypeId, 10),
      });

      if (response.ok) {
        alert("Driver added successfully!");
        onClose();
      } else {
        alert(response.data?.message || "Failed to add driver");
      }
    } catch (err) {
      console.error(err);
      alert("Error adding driver");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "0.8rem 1rem",
    borderRadius: "0.75rem",
    border: "1px solid #e5e7eb",
    outline: "none",
    fontSize: "0.9rem",
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.8rem",
    fontWeight: "bold",
    marginBottom: "0.4rem",
    color: "#374151",
  };

  return (
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
      }}
    >
      <div
        style={{
          width: "500px",
          backgroundColor: "white",
          borderRadius: "1.5rem",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              marginRight: "1rem",
            }}
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: "bold", margin: 0 }}>
              Add New Driver
            </h2>
            <p style={{ color: "#6b7280", fontSize: "0.8rem" }}>
              Enter background details for the new driver
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div>
            <label style={labelStyle}>Full Name*</label>
            <input
              style={inputStyle}
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g. John Doe"
            />
          </div>
          <div>
            <label style={labelStyle}>Phone Number*</label>
            <input
              style={inputStyle}
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+923001234567"
            />
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Email Address</label>
          <input
            style={inputStyle}
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="email@example.com"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div>
            <label style={labelStyle}>Gender</label>
            <select
              style={inputStyle}
              value={formData.gender}
              onChange={(e) => handleChange("gender", e.target.value)}
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>City ID</label>
            <input
              type="number"
              style={inputStyle}
              value={formData.cityId}
              onChange={(e) => handleChange("cityId", e.target.value)}
              placeholder="1"
            />
          </div>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <label style={labelStyle}>Service Type</label>
          <select
            style={inputStyle}
            value={formData.serviceTypeId}
            onChange={(e) => handleChange("serviceTypeId", e.target.value)}
          >
            <option value="1">Car Rides</option>
            <option value="2">Motorcycle</option>
            <option value="3">Taxi</option>
            <option value="4">Rental Cars</option>
          </select>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            padding: "1rem",
            borderRadius: "2rem",
            border: "none",
            backgroundColor: "#38AC57",
            color: "white",
            fontWeight: "bold",
            fontSize: "1rem",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Adding..." : "Add Driver"}
        </button>
      </div>
    </div>
  );
};
