import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getRentalVehicleDetailApi, resolveApiAssetUrl } from "../services/api";

// Car image sets - real HD car images
const carImageSets: Record<string, string[]> = {
  "Mercedes G Wagon": [
    "https://images.unsplash.com/photo-1520031441872-265e4ff70366?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&h=500&fit=crop",
  ],
  "Dacia Logan": [
    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&h=500&fit=crop",
  ],
  "BMW 5 Series": [
    "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&h=500&fit=crop",
  ],
  "Toyota Corolla": [
    "https://images.unsplash.com/photo-1621993202323-f438eec934ff?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800&h=500&fit=crop",
  ],
};

const defaultImages = [
  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&h=500&fit=crop",
];

export interface VehicleListing {
  id: string;
  dbId?: number;
  name: string;
  price: string;
  year: string;
  transmission: string;
  fuel: string;
  color: string;
  status: "Approved" | "Pending Review" | "Rejected";
  company: string;
  companyLogo: string;
  companyLogoUrl?: string;
  companyEmail?: string;
  companyPhone?: string;
  carsAvailable: number;
  licensePlate: string;
  seats: number;
  submittedDate: string;
  description: string;
  imageUrls?: string[];
}

// --- Responsive Styles ---
const ModalStyles = () => (
  <style>{`
        .rcm-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0,0,0,0.4);
            backdrop-filter: blur(4px);
            z-index: 1000;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: 20px;
            overflow-y: auto;
        }
        .rcm-modal-content {
            background-color: white;
            border-radius: 24px;
            width: 100%;
            max-width: 680px;
            margin-top: 20px;
            margin-bottom: 20px;
            position: relative;
            padding: 32px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        .rcm-info-grid-5 {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 16px;
        }
        .rcm-info-grid-4 {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
        }
        .rcm-info-grid-3 {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
        }
        .rcm-info-grid-2 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
        }
        .rcm-flex-responsive {
            display: flex;
            gap: 12px;
        }
        .rcm-footer-actions {
            display: flex;
            gap: 12px;
        }

        @media (max-width: 768px) {
            .rcm-modal-content {
                padding: 20px;
                margin-top: 10px;
                margin-bottom: 10px;
            }
            .rcm-info-grid-5, .rcm-info-grid-4, .rcm-info-grid-3, .rcm-info-grid-2 {
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
            }
            .rcm-flex-responsive, .rcm-footer-actions {
                flex-direction: column;
                align-items: stretch;
            }
            .rcm-info-item {
                text-align: inherit;
            }
        }

        @media (max-width: 480px) {
            .rcm-info-grid-5, .rcm-info-grid-4, .rcm-info-grid-3, .rcm-info-grid-2 {
                grid-template-columns: 1fr;
            }
        }
    `}</style>
);

export const VehicleDetailModal = ({
  vehicle,
  onClose,
  onApprove,
  onReject,
}: {
  vehicle: VehicleListing;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) => {
  const [imgIndex, setImgIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [vehicleData, setVehicleData] = useState(vehicle);
  const [editData, setEditData] = useState({
    name: vehicle.name,
    price: vehicle.price,
    year: vehicle.year,
    transmission: vehicle.transmission,
    fuel: vehicle.fuel,
    color: vehicle.color,
    seats: vehicle.seats,
    description: vehicle.description,
  });
  useEffect(() => {
    setVehicleData(vehicle);
    setEditData({
      name: vehicle.name,
      price: vehicle.price,
      year: vehicle.year,
      transmission: vehicle.transmission,
      fuel: vehicle.fuel,
      color: vehicle.color,
      seats: vehicle.seats,
      description: vehicle.description,
    });

    if (vehicle.dbId) {
      getRentalVehicleDetailApi(vehicle.dbId)
        .then((res) => {
          if (res.ok && res.data) {
            setVehicleData(res.data as VehicleListing);
            setEditData({
              name: res.data.name,
              price: res.data.price,
              year: res.data.year,
              transmission: res.data.transmission,
              fuel: res.data.fuel,
              color: res.data.color,
              seats: res.data.seats,
              description: res.data.description,
            });
          }
        })
        .catch(() => {});
    }
  }, [vehicle]);

  const images = vehicleData.imageUrls?.length
    ? vehicleData.imageUrls.map((image) => resolveApiAssetUrl(image))
    : carImageSets[vehicleData.name] || defaultImages;
  const total = images.length;

  return (
    <div className="rcm-modal-overlay" onClick={onClose}>
      <ModalStyles />
      <div className="rcm-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "none",
            backgroundColor: "#f3f4f6",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            color: "#374151",
            transition: "all 0.2s",
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#e5e7eb";
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#f3f4f6";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div
          style={{
            marginBottom: "20px",
            paddingRight: "40px",
            textAlign: "inherit",
          }}
        >
          <h2
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              margin: "0 0 4px 0",
              textAlign: "inherit",
            }}
          >
            {isEditing ? (
              <input
                value={editData.name}
                onChange={(e) =>
                  setEditData({ ...editData, name: e.target.value })
                }
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  border: "1px solid #38AC57",
                  borderRadius: "8px",
                  padding: "4px 8px",
                  width: "100%",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            ) : (
              vehicleData.name
            )}
          </h2>
          <p
            style={{
              color: "#6b7280",
              fontSize: "14px",
              margin: 0,
              textAlign: "inherit",
            }}
          >
            Review rental listing details and approve or reject
          </p>
        </div>

        {/* Image Carousel */}
        <div
          style={{
            position: "relative",
            marginBottom: "24px",
            borderRadius: "16px",
            overflow: "hidden",
            backgroundColor: "#f3f4f6",
          }}
        >
          <img
            src={images[imgIndex]}
            alt={vehicleData.name}
            style={{
              width: "100%",
              height: "auto",
              minHeight: "200px",
              maxHeight: "320px",
              objectFit: "cover",
              display: "block",
            }}
          />
          <button
            onClick={() => setImgIndex(Math.max(0, imgIndex - 1))}
            disabled={imgIndex === 0}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "white",
              border: "none",
              cursor: imgIndex === 0 ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
              opacity: imgIndex === 0 ? 0.4 : 1,
              transition: "opacity 0.2s",
            }}
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={() => setImgIndex(Math.min(total - 1, imgIndex + 1))}
            disabled={imgIndex === total - 1}
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "white",
              border: "none",
              cursor: imgIndex === total - 1 ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
              opacity: imgIndex === total - 1 ? 0.4 : 1,
              transition: "opacity 0.2s",
            }}
          >
            <ChevronRight size={24} />
          </button>
          <div
            style={{
              position: "absolute",
              bottom: "12px",
              left: "12px",
              backgroundColor: "rgba(0,0,0,0.6)",
              color: "white",
              padding: "4px 12px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            {imgIndex + 1}/{total}
          </div>
        </div>

        {/* Vehicle Information */}
        <h3
          style={{
            fontSize: "18px",
            fontWeight: "bold",
            margin: "0 0 16px 0",
            textAlign: "inherit",
          }}
        >
          Vehicle Information
        </h3>
        <div
          style={{
            border: `1px solid ${isEditing ? "#38AC57" : "#f3f4f6"}`,
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "24px",
            transition: "border-color 0.2s",
            textAlign: "inherit",
          }}
        >
          <div className="rcm-info-grid-5" style={{ marginBottom: "16px" }}>
            <div className="rcm-info-item">
              <div
                style={{
                  color: "#9ca3af",
                  fontSize: "11px",
                  marginBottom: "4px",
                }}
              >
                License Plate:
              </div>
              <div style={{ fontWeight: "bold", fontSize: "15px" }}>
                {vehicleData.licensePlate}
              </div>
            </div>
            <div className="rcm-info-item">
              <div
                style={{
                  color: "#9ca3af",
                  fontSize: "11px",
                  marginBottom: "4px",
                }}
              >
                Make & Model:
              </div>
              <div style={{ fontWeight: "bold", fontSize: "15px" }}>
                {isEditing ? editData.name : vehicleData.name}
              </div>
            </div>
            <div className="rcm-info-item">
              <div
                style={{
                  color: "#9ca3af",
                  fontSize: "11px",
                  marginBottom: "4px",
                }}
              >
                Colour:
              </div>
              {isEditing ? (
                <input
                  value={editData.color}
                  onChange={(e) =>
                    setEditData({ ...editData, color: e.target.value })
                  }
                  style={{
                    fontWeight: "600",
                    fontSize: "14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    padding: "4px 6px",
                    width: "100%",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <div
                  style={{
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    justifyContent: "inherit",
                  }}
                >
                  ⚪ {vehicleData.color}
                </div>
              )}
            </div>
            <div className="rcm-info-item">
              <div
                style={{
                  color: "#9ca3af",
                  fontSize: "11px",
                  marginBottom: "4px",
                }}
              >
                Year:
              </div>
              {isEditing ? (
                <input
                  value={editData.year}
                  onChange={(e) =>
                    setEditData({ ...editData, year: e.target.value })
                  }
                  style={{
                    fontWeight: "bold",
                    fontSize: "15px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    padding: "4px 6px",
                    width: "100%",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <div style={{ fontWeight: "bold", fontSize: "15px" }}>
                  {vehicleData.year}
                </div>
              )}
            </div>
            <div className="rcm-info-item">
              <div
                style={{
                  color: "#9ca3af",
                  fontSize: "11px",
                  marginBottom: "4px",
                }}
              >
                Transmission:
              </div>
              {isEditing ? (
                <select
                  value={editData.transmission}
                  onChange={(e) =>
                    setEditData({ ...editData, transmission: e.target.value })
                  }
                  style={{
                    fontWeight: "bold",
                    fontSize: "14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    padding: "4px 6px",
                    width: "100%",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option>Automatic</option>
                  <option>Manual</option>
                </select>
              ) : (
                <div style={{ fontWeight: "bold", fontSize: "15px" }}>
                  {vehicleData.transmission}
                </div>
              )}
            </div>
          </div>
          <div className="rcm-info-grid-4">
            <div className="rcm-info-item">
              <div
                style={{
                  color: "#9ca3af",
                  fontSize: "11px",
                  marginBottom: "4px",
                }}
              >
                Fuel Type:
              </div>
              {isEditing ? (
                <select
                  value={editData.fuel}
                  onChange={(e) =>
                    setEditData({ ...editData, fuel: e.target.value })
                  }
                  style={{
                    fontWeight: "bold",
                    fontSize: "14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    padding: "4px 6px",
                    width: "100%",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option>Petrol</option>
                  <option>Diesel</option>
                  <option>Gas</option>
                  <option>Electric</option>
                  <option>Hybrid</option>
                </select>
              ) : (
                <div style={{ fontWeight: "bold", fontSize: "15px" }}>
                  {vehicleData.fuel}
                </div>
              )}
            </div>
            <div className="rcm-info-item">
              <div
                style={{
                  color: "#9ca3af",
                  fontSize: "11px",
                  marginBottom: "4px",
                }}
              >
                Number of Seats:
              </div>
              {isEditing ? (
                <input
                  type="number"
                  value={editData.seats}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      seats: parseInt(e.target.value) || 0,
                    })
                  }
                  style={{
                    fontWeight: "bold",
                    fontSize: "15px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    padding: "4px 6px",
                    width: "100%",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <div style={{ fontWeight: "bold", fontSize: "15px" }}>
                  {vehicleData.seats}
                </div>
              )}
            </div>
            <div className="rcm-info-item">
              <div
                style={{
                  color: "#9ca3af",
                  fontSize: "11px",
                  marginBottom: "4px",
                }}
              >
                Pricing:
              </div>
              <div style={{ fontWeight: "bold", fontSize: "15px" }}>
                Daily Rate:{" "}
                <span style={{ color: "#38AC57" }}>{vehicleData.price}</span>
              </div>
            </div>
            <div className="rcm-info-item">
              <div
                style={{
                  color: "#9ca3af",
                  fontSize: "11px",
                  marginBottom: "4px",
                }}
              >
                Submitted Date:
              </div>
              <div style={{ fontWeight: "600", fontSize: "14px" }}>
                {vehicleData.submittedDate}
              </div>
            </div>
          </div>
        </div>

        <h4
          style={{
            fontSize: "14px",
            fontWeight: "600",
            margin: "0 0 8px 0",
            color: "#374151",
            textAlign: "inherit",
          }}
        >
          Company Information
        </h4>
        <div
          style={{
            border: "1px solid #f3f4f6",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "20px",
            display: "grid",
            gap: "8px",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: "700" }}>
            {vehicleData.company}
          </div>
          {vehicleData.companyEmail ? (
            <div style={{ fontSize: "13px", color: "#6b7280" }}>
              {vehicleData.companyEmail}
            </div>
          ) : null}
          {vehicleData.companyPhone ? (
            <div style={{ fontSize: "13px", color: "#6b7280" }}>
              {vehicleData.companyPhone}
            </div>
          ) : null}
        </div>

        {/* Description */}
        <h4
          style={{
            fontSize: "14px",
            fontWeight: "600",
            margin: "0 0 8px 0",
            color: "#374151",
            textAlign: "inherit",
          }}
        >
          Description
        </h4>
        <div
          style={{
            backgroundColor: "#eef7f0",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "28px",
            border: "1px solid #eef7f0",
            textAlign: "inherit",
          }}
        >
          {isEditing ? (
            <textarea
              value={editData.description}
              onChange={(e) =>
                setEditData({ ...editData, description: e.target.value })
              }
              style={{
                width: "100%",
                height: "80px",
                fontSize: "13px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                padding: "10px",
                fontFamily: "inherit",
                resize: "none",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          ) : (
            <p
              style={{
                fontSize: "13px",
                color: "#374151",
                margin: 0,
                lineHeight: "1.6",
              }}
            >
              {vehicleData.description}
            </p>
          )}
        </div>

        {/* Actions */}
        {isEditing ? (
          <div className="rcm-footer-actions">
            <button
              onClick={() => setIsEditing(false)}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "32px",
                border: "2px solid #e5e7eb",
                backgroundColor: "white",
                fontWeight: "bold",
                fontSize: "15px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#f9fafb")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "white")
              }
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                alert("Changes saved successfully!");
              }}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "32px",
                border: "none",
                backgroundColor: "#38AC57",
                color: "white",
                fontWeight: "bold",
                fontSize: "15px",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#2d8a46")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#38AC57")
              }
            >
              Save Changes
            </button>
          </div>
        ) : (
          <div className="rcm-footer-actions">
            <button
              onClick={() => setIsEditing(true)}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "32px",
                border: "2px solid #1f2937",
                backgroundColor: "white",
                fontWeight: "bold",
                fontSize: "15px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f9fafb";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.transform = "none";
              }}
            >
              Edit
            </button>
            <button
              onClick={onReject}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "32px",
                border: "none",
                backgroundColor: "#dc2626",
                color: "white",
                fontWeight: "bold",
                fontSize: "15px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#b91c1c";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#dc2626";
                e.currentTarget.style.transform = "none";
              }}
            >
              Reject
            </button>
            <button
              onClick={onApprove}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "32px",
                border: "none",
                backgroundColor: "#38AC57",
                color: "white",
                fontWeight: "bold",
                fontSize: "15px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#2d8a46";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#38AC57";
                e.currentTarget.style.transform = "none";
              }}
            >
              Approve List
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const AddVehicleModal = ({
  onClose,
  onAdd,
  initialCompany,
  lockCompany = false,
}: {
  onClose: () => void;
  onAdd: (
    vehicle: Omit<
      VehicleListing,
      "id" | "companyLogo" | "submittedDate" | "status"
    >,
  ) => void;
  initialCompany?: string;
  lockCompany?: boolean;
}) => {
  const [formData, setFormData] = useState({
    name: "Mercedes G Wagon",
    price: "300 MAD/day",
    year: "2025",
    transmission: "Automatic",
    fuel: "Petrol",
    color: "Black",
    company: initialCompany || "New Rental Co",
    carsAvailable: 1,
    licensePlate: "",
    seats: 5,
    description: "",
  });

  const handleSubmit = () => {
    if (!formData.licensePlate) {
      alert("Please enter a license plate number");
      return;
    }
    onAdd(formData);
    onClose();
  };

  useEffect(() => {
    if (initialCompany) {
      setFormData((prev) => ({ ...prev, company: initialCompany }));
    }
  }, [initialCompany]);

  return (
    <div className="rcm-modal-overlay" onClick={onClose}>
      <ModalStyles />
      <div
        className="rcm-modal-content"
        style={{ maxWidth: "600px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "none",
            backgroundColor: "#f3f4f6",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            color: "#374151",
            transition: "all 0.2s",
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#e5e7eb";
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#f3f4f6";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          ✕
        </button>

        <h2
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          Add New Vehicle
        </h2>

        <div style={{ display: "grid", gap: "16px" }}>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              Vehicle Model
            </label>
            <select
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid #d1d5db",
                outline: "none",
              }}
            >
              {Object.keys(carImageSets).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="rcm-info-grid-2">
            <div className="rcm-info-item">
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                License Plate
              </label>
              <input
                type="text"
                value={formData.licensePlate}
                onChange={(e) =>
                  setFormData({ ...formData, licensePlate: e.target.value })
                }
                placeholder="12345-A-6"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid #d1d5db",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div className="rcm-info-item">
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                Company Name
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
                readOnly={lockCompany}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid #d1d5db",
                  outline: "none",
                  backgroundColor: lockCompany ? "#f9fafb" : "white",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div className="rcm-info-grid-3">
            <div className="rcm-info-item">
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                Price
              </label>
              <input
                type="text"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                placeholder="300 MAD/day"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid #d1d5db",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div className="rcm-info-item">
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                Year
              </label>
              <input
                type="text"
                value={formData.year}
                onChange={(e) =>
                  setFormData({ ...formData, year: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid #d1d5db",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div className="rcm-info-item">
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                Color
              </label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid #d1d5db",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div className="rcm-info-grid-3">
            <div className="rcm-info-item">
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                Transmission
              </label>
              <select
                value={formData.transmission}
                onChange={(e) =>
                  setFormData({ ...formData, transmission: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid #d1d5db",
                  outline: "none",
                }}
              >
                <option>Automatic</option>
                <option>Manual</option>
              </select>
            </div>
            <div className="rcm-info-item">
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                Fuel
              </label>
              <select
                value={formData.fuel}
                onChange={(e) =>
                  setFormData({ ...formData, fuel: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid #d1d5db",
                  outline: "none",
                }}
              >
                <option>Petrol</option>
                <option>Diesel</option>
                <option>Gas</option>
                <option>Electric</option>
                <option>Hybrid</option>
              </select>
            </div>
            <div className="rcm-info-item">
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                Seats
              </label>
              <input
                type="number"
                value={formData.seats}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    seats: parseInt(e.target.value) || 0,
                  })
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid #d1d5db",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              style={{
                width: "100%",
                height: "80px",
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid #d1d5db",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          <button
            onClick={handleSubmit}
            style={{
              width: "100%",
              padding: "16px",
              backgroundColor: "#38AC57",
              color: "white",
              fontWeight: "bold",
              fontSize: "16px",
              borderRadius: "32px",
              border: "none",
              marginTop: "16px",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#2d8a46")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#38AC57")
            }
          >
            Add Vehicle
          </button>
        </div>
      </div>
    </div>
  );
};
