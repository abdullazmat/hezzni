import { useState, useEffect } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Car,
  Bike,
  Download,
} from "lucide-react";
import { UserAvatar } from "../components/UserAvatar";
import {
  createDriverApi,
  getDriverDocumentDetailApi,
  updateDriverDocumentStatusApi,
  updateDriverApplicationStatusApi,
  getDriverCategoriesApi,
  assignDriverCategoriesApi,
  resolveApiAssetUrl,
} from "../services/api";

// Status badge colors
const statusColors: Record<
  string,
  { bg: string; color: string; border: string }
> = {
  Verified: { bg: "#eef7f0", color: "#2d8a46", border: "#bbf7d0" },
  Pending: { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb" },
  Updated: { bg: "#dbeafe", color: "#2563eb", border: "#bfdbfe" },
  Rejected: { bg: "#fee2e2", color: "#dc2626", border: "#fecaca" },
  Expired: { bg: "#fef3c7", color: "#d97706", border: "#fde68a" },
  "Under Review": { bg: "#fef9c3", color: "#a16207", border: "#fef08a" },
  Completed: { bg: "#eef7f0", color: "#2d8a46", border: "#bbf7d0" },
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = statusColors[status] || statusColors["Pending"];
  return (
    <span
      style={{
        backgroundColor: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        padding: "3px 10px",
        borderRadius: "6px",
        fontSize: "11px",
        fontWeight: "600",
      }}
    >
      {status}
    </span>
  );
};

// --- Responsive Styles ---
const ModalStyles = () => (
  <style>{`
        .adm-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0,0,0,0.4);
            backdrop-filter: blur(8px);
            z-index: 10000;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: 20px;
            overflow-y: auto;
        }
        .adm-modal-content {
            background-color: white;
            border-radius: 24px;
            width: 95%;
            max-width: 900px;
            margin-top: 20px;
            margin-bottom: 20px;
            position: relative;
            padding: 2.5rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            animation: adm-slide-up 0.4s ease-out;
        }
        @keyframes adm-slide-up {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .adm-info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 1.5rem;
        }
        .adm-docs-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 16px;
        }
        .adm-flex-responsive {
            display: flex;
            gap: 20px;
        }
        .adm-footer-actions {
            display: flex;
            gap: 12px;
        }

        @media (max-width: 1024px) {
            .adm-info-grid {
                grid-template-columns: repeat(3, 1fr);
            }
        }

        @media (max-width: 768px) {
            .adm-modal-content {
                padding: 1.5rem;
                margin-top: 10px;
                margin-bottom: 10px;
            }
            .adm-info-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 1rem;
            }
            .adm-docs-grid {
                grid-template-columns: 1fr;
            }
            .adm-flex-responsive {
                flex-direction: column;
                align-items: center;
                text-align: center;
            }
            .adm-footer-actions {
                flex-direction: column;
                align-items: stretch;
            }
            .adm-info-item {
                text-align: inherit;
            }
        }

        @media (max-width: 480px) {
            .adm-info-grid {
                grid-template-columns: 1fr;
            }
        }
    `}</style>
);

// ============ SELECT CATEGORY MODAL ============
export const SelectCategoryModal = ({
  onClose,
  onConfirm,
  driverId,
}: {
  onClose: () => void;
  onConfirm: (cat: string) => void;
  driverId?: string;
}) => {
  const [selected, setSelected] = useState("Hezzni Standard");
  const defaultCategories = [
    { id: "Hezzni Standard", desc: "Affordable everyday rides", icon: "Car" },
    {
      id: "Hezzni Comfort",
      desc: "Premium rides with higher fares",
      icon: "Car",
    },
    { id: "Hezzni XL", desc: "For group trips and extra space", icon: "Car" },
    { id: "Motorcycle", desc: "Affordable everyday rides", icon: "Bike" },
    { id: "Taxi", desc: "Affordable everyday rides", icon: "Car" },
    {
      id: "Hezzni Delivery",
      desc: "Deliver parcels and packages",
      icon: "Car",
    },
  ];
  const [categories, setCategories] = useState(defaultCategories);
  const [apiCategoryMap, setApiCategoryMap] = useState<Record<string, number>>(
    {},
  );

  useEffect(() => {
    if (driverId) {
      getDriverCategoriesApi(driverId)
        .then((res) => {
          if (res.ok && res.data?.categories?.length) {
            const apiCats = res.data.categories.map((c: any) => ({
              id: c.name,
              desc: c.assigned ? "Currently assigned" : "Available",
              icon:
                c.name.toLowerCase().includes("motor") ||
                c.name.toLowerCase().includes("bike")
                  ? "Bike"
                  : "Car",
            }));
            setCategories(apiCats.length ? apiCats : defaultCategories);
            const map: Record<string, number> = {};
            res.data.categories.forEach((c: any) => {
              map[c.name] = c.id;
            });
            setApiCategoryMap(map);
            const assigned = res.data.categories.find((c: any) => c.assigned);
            if (assigned) setSelected(assigned.name);
          }
        })
        .catch(() => {});
    }
  }, [driverId]);

  return (
    <div className="adm-modal-overlay">
      <ModalStyles />
      <div
        className="adm-modal-content"
        style={{ maxWidth: "500px", width: "95%" }}
      >
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <h2
          style={{
            fontSize: "22px",
            fontWeight: "bold",
            margin: "0 0 4px 0",
            textAlign: "inherit",
          }}
        >
          Driver Categories
        </h2>
        <p
          style={{
            color: "#6b7280",
            fontSize: "14px",
            margin: "0 0 24px 0",
            textAlign: "inherit",
          }}
        >
          Assign the service category for this driver application.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          {categories.map((cat) => {
            const isSelected = selected === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => setSelected(cat.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "16px",
                  borderRadius: "16px",
                  border: isSelected
                    ? "2px solid #38AC57"
                    : "2px solid #e5e7eb",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    backgroundColor: "#f3f4f6",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: "16px",
                    flexShrink: 0,
                  }}
                >
                  {cat.icon === "Bike" ? (
                    <Bike size={24} color="#374151" />
                  ) : (
                    <Car size={24} color="#374151" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold", fontSize: "15px" }}>
                    {cat.id}
                  </div>
                  <div style={{ fontSize: "13px", color: "#6b7280" }}>
                    {cat.desc}
                  </div>
                </div>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: isSelected
                      ? "5px solid #38AC57"
                      : "2px solid #d1d5db",
                    backgroundColor: "white",
                    flexShrink: 0,
                  }}
                ></div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => {
            if (driverId && apiCategoryMap[selected]) {
              assignDriverCategoriesApi(driverId, {
                categoryIds: [apiCategoryMap[selected]],
              }).catch(() => {});
            }
            onConfirm(selected);
            onClose();
          }}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "32px",
            border: "none",
            backgroundColor: "#38AC57",
            color: "white",
            fontWeight: "bold",
            fontSize: "16px",
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
          Confirm
        </button>
      </div>
    </div>
  );
};

// ============ DOCUMENT PREVIEW MODAL ============
// Generate SVG data URI for document previews
const makeDocSvg = (
  title: string,
  subtitle: string,
  color: string,
  icon: string,
  page: string,
) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="320" viewBox="0 0 520 320">
        <rect width="520" height="320" rx="12" fill="#f8fafc"/>
        <rect x="20" y="20" width="480" height="280" rx="8" fill="white" stroke="${color}" stroke-width="2"/>
        <rect x="20" y="20" width="480" height="50" rx="8" fill="${color}"/>
        <rect x="20" y="62" width="480" height="8" fill="${color}"/>
        <text x="260" y="52" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="18" font-weight="bold">${title}</text>
        <text x="260" y="100" text-anchor="middle" fill="#64748b" font-family="Arial,sans-serif" font-size="13">${subtitle}</text>
        <text x="260" y="180" text-anchor="middle" fill="${color}" font-family="Arial,sans-serif" font-size="48">${icon}</text>
        <rect x="60" y="220" width="160" height="10" rx="4" fill="#e2e8f0"/>
        <rect x="60" y="240" width="120" height="10" rx="4" fill="#e2e8f0"/>
        <rect x="300" y="220" width="160" height="10" rx="4" fill="#e2e8f0"/>
        <rect x="300" y="240" width="100" height="10" rx="4" fill="#e2e8f0"/>
        <text x="260" y="290" text-anchor="middle" fill="#94a3b8" font-family="Arial,sans-serif" font-size="11">${page}</text>
    </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const documentImages: Record<string, string[]> = {
  "National ID Card (CIN)": [
    makeDocSvg(
      "CARTE NATIONALE D'IDENTITÉ",
      "Royaume du Maroc • CIN",
      "#1e40af",
      "🪪",
      "Front Side",
    ),
    makeDocSvg(
      "CARTE NATIONALE D'IDENTITÉ",
      "Verso • Informations personnelles",
      "#1e40af",
      "🪪",
      "Back Side",
    ),
  ],
  "Driver's License": [
    makeDocSvg(
      "PERMIS DE CONDUIRE",
      "Royaume du Maroc • رخصة السياقة",
      "#2d8a46",
      "🚗",
      "Front Side",
    ),
    makeDocSvg(
      "PERMIS DE CONDUIRE",
      "Catégories • Validité",
      "#2d8a46",
      "🚗",
      "Back Side",
    ),
  ],
  "Pro Driver Card / Carte Professionnelle": [
    makeDocSvg(
      "CARTE PROFESSIONNELLE",
      "Chauffeur Professionnel • بطاقة مهنية",
      "#7c3aed",
      "🏷️",
      "Front Side",
    ),
    makeDocSvg(
      "CARTE PROFESSIONNELLE",
      "Numéro de carte • Détails",
      "#7c3aed",
      "🏷️",
      "Back Side",
    ),
  ],
  "Vehicle Photos": [
    makeDocSvg(
      "VEHICLE PHOTO",
      "Front View • Vue avant",
      "#0369a1",
      "🚘",
      "Front View",
    ),
    makeDocSvg(
      "VEHICLE PHOTO",
      "Side View • Vue latérale",
      "#0369a1",
      "🚙",
      "Side View",
    ),
    makeDocSvg(
      "VEHICLE PHOTO",
      "Rear View • Vue arrière",
      "#0369a1",
      "🚗",
      "Rear View",
    ),
  ],
  "Face Verification": [
    makeDocSvg(
      "FACE VERIFICATION",
      "Selfie Photo • التحقق من الوجه",
      "#dc2626",
      "🤳",
      "Selfie",
    ),
  ],
  "Taxi License(Taxi Drivers Only)": [
    makeDocSvg(
      "LICENCE DE TAXI",
      "Autorisation de Transport • رخصة سيارة أجرة",
      "#ca8a04",
      "🚕",
      "Front Side",
    ),
    makeDocSvg(
      "LICENCE DE TAXI",
      "Conditions & Validité",
      "#ca8a04",
      "🚕",
      "Back Side",
    ),
  ],
  "Vehicle Registration (Carte Grise)": [
    makeDocSvg(
      "CARTE GRISE",
      "Certificat d'Immatriculation • البطاقة الرمادية",
      "#0f766e",
      "📋",
      "Front Side",
    ),
    makeDocSvg(
      "CARTE GRISE",
      "Caractéristiques Techniques",
      "#0f766e",
      "📋",
      "Back Side",
    ),
  ],
  "Vehicle Detail": [
    makeDocSvg(
      "VEHICLE INSURANCE",
      "Assurance Automobile • تأمين السيارة",
      "#9333ea",
      "🛡️",
      "Insurance Document",
    ),
    makeDocSvg(
      "VEHICLE INSURANCE",
      "Policy Details • Attestation",
      "#9333ea",
      "🛡️",
      "Insurance Card",
    ),
  ],
  "Vehicle Details": [
    makeDocSvg(
      "VEHICLE DETAILS",
      "Licence Plate • لوحة الترقيم",
      "#ea580c",
      "🔢",
      "Plate Number",
    ),
    makeDocSvg(
      "VEHICLE DETAILS",
      "Make, Model & Specifications",
      "#ea580c",
      "📝",
      "Vehicle Info",
    ),
  ],
};

export const DocumentPreviewModal = ({
  docName,
  images,
  onClose,
}: {
  docName: string;
  images?: string[];
  onClose: () => void;
}) => {
  const [imgIndex, setImgIndex] = useState(0);
  const previewImages =
    images?.filter(Boolean).map((image) => resolveApiAssetUrl(image)) || [];
  const imagesToShow = previewImages.length
    ? previewImages
    : documentImages[docName] || [
        `https://picsum.photos/seed/${encodeURIComponent(docName)}/520/320`,
      ];
  const totalImages = imagesToShow.length;

  const handleDownload = () => {
    const currentImage = imagesToShow[imgIndex];
    if (!currentImage) {
      return;
    }

    const link = document.createElement("a");
    link.href = currentImage;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.download = `${docName}-${imgIndex + 1}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="adm-modal-overlay">
      <ModalStyles />
      <div
        className="adm-modal-content"
        style={{ maxWidth: "520px", width: "95%" }}
      >
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <h3
          style={{
            fontSize: "18px",
            fontWeight: "bold",
            margin: "0 0 20px 0",
            textAlign: "inherit",
          }}
        >
          {docName}
        </h3>

        <div style={{ position: "relative", marginBottom: "16px" }}>
          <img
            src={imagesToShow[imgIndex]}
            alt={docName}
            style={{
              width: "100%",
              height: "280px",
              objectFit: "cover",
              borderRadius: "16px",
              backgroundColor: "#f3f4f6",
              display: "block",
            }}
          />
          {/* Left Arrow */}
          <button
            onClick={() => setImgIndex(Math.max(0, imgIndex - 1))}
            disabled={imgIndex === 0}
            style={{
              position: "absolute",
              left: "8px",
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
              boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
              opacity: imgIndex === 0 ? 0.35 : 1,
              transition: "opacity 0.2s",
            }}
          >
            <ChevronLeft size={22} />
          </button>
          {/* Right Arrow */}
          <button
            onClick={() => setImgIndex(Math.min(totalImages - 1, imgIndex + 1))}
            disabled={imgIndex === totalImages - 1}
            style={{
              position: "absolute",
              right: "8px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "white",
              border: "none",
              cursor: imgIndex === totalImages - 1 ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
              opacity: imgIndex === totalImages - 1 ? 0.35 : 1,
              transition: "opacity 0.2s",
            }}
          >
            <ChevronRight size={22} />
          </button>
        </div>

        {/* Image indicator dots */}
        {totalImages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "6px",
              marginBottom: "20px",
            }}
          >
            {imagesToShow.map((_, i) => (
              <button
                key={i}
                onClick={() => setImgIndex(i)}
                style={{
                  width: imgIndex === i ? "20px" : "8px",
                  height: "8px",
                  borderRadius: "4px",
                  border: "none",
                  backgroundColor: imgIndex === i ? "#38AC57" : "#d1d5db",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  padding: 0,
                }}
              />
            ))}
          </div>
        )}

        {/* Page indicator text */}
        <div
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: "#9ca3af",
            marginBottom: "20px",
          }}
        >
          Page {imgIndex + 1} of {totalImages}
        </div>

        <div className="adm-footer-actions">
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "24px",
              border: "1px solid #e5e7eb",
              backgroundColor: "white",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "14px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f9fafb";
              e.currentTarget.style.borderColor = "#d1d5db";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "white";
              e.currentTarget.style.borderColor = "#e5e7eb";
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "24px",
              border: "none",
              backgroundColor: "#38AC57",
              color: "white",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#2d8a46")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#38AC57")
            }
          >
            <Download size={16} /> Download
          </button>
        </div>
      </div>
    </div>
  );
};

// ============ APPLICATION REVIEW MODAL ============
export const ApplicationReviewModal = ({
  doc,
  onClose,
  onApprove,
  onReject,
}: {
  doc: any;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) => {
  const [notes, setNotes] = useState("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showDocPreview, setShowDocPreview] = useState<{
    name: string;
    images?: string[];
  } | null>(null);
  const [mainStatus, setMainStatus] = useState(doc.status);
  const [openMainStatus, setOpenMainStatus] = useState(false);

  // Default fallback docs
  const defaultUploadedDocs = [
    {
      name: "National ID Card (CIN)",
      desc: "Government-issued identification.",
      status: "Under Review",
      date: "2025-01-10",
      images: [] as string[],
    },
    {
      name: "Driver's License",
      desc: "Valid and current driver's license.",
      status: "Pending",
      date: "2025-01-10",
      images: [] as string[],
    },
    {
      name: "Pro Driver Card / Carte Professionnelle",
      desc: "(If Applicable) Professional permit required for commercial drivers.",
      status: "Verified",
      date: "2025-01-10",
      images: [] as string[],
    },
    {
      name: "Vehicle Photos",
      desc: "Upload clear exterior photos of your vehicle.",
      status: "Updated",
      date: "2025-01-10",
      images: [] as string[],
    },
    {
      name: "Face Verification",
      desc: "Take a selfie to confirm your identity.",
      status: "Under Review",
      date: "2025-01-10",
      images: [] as string[],
    },
    {
      name: "Taxi License(Taxi Drivers Only)",
      desc: "Required only if you drive a taxi.",
      status: "Verified",
      date: "2025-01-10",
      images: [] as string[],
    },
    {
      name: "Vehicle Registration (Carte Grise)",
      desc: "Proof of vehicle ownership.",
      status: "Updated",
      date: "2025-01-10",
      images: [] as string[],
    },
    {
      name: "Vehicle Detail",
      desc: "Add current vehicle insurance details.",
      status: "Under Review",
      date: "2025-01-10",
      images: [] as string[],
    },
    {
      name: "Vehicle Details",
      desc: "Provide make, model, and plate number.",
      status: "Updated",
      date: "2025-01-10",
      images: [] as string[],
    },
  ];

  const [uploadedDocs, setUploadedDocs] = useState(defaultUploadedDocs);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [vehicleInfo, setVehicleInfo] = useState<any>(null);

  // Fetch detail from API
  useEffect(() => {
    const vehicleType = doc.vehicleType || "CAR";
    const driverId =
      doc.driverDbId || parseInt(doc.driverId.replace(/\D/g, "")) || 0;
    if (driverId) {
      getDriverDocumentDetailApi(vehicleType, driverId)
        .then((res) => {
          if (res.ok && res.data) {
            const data = res.data as any;
            if (data.driver) setDriverInfo(data.driver);
            if (data.vehicle) setVehicleInfo(data.vehicle);
            if (data.documents?.length) {
              setUploadedDocs(data.documents);
              // Update doc statuses from API
              const newStatuses: Record<string, string> = {};
              data.documents.forEach((d: any) => {
                newStatuses[d.name] = d.status;
              });
              setDocStatuses(newStatuses);
            }
            if (data.driver?.status) setMainStatus(data.driver.status);
          }
        })
        .catch(() => {});
    }
  }, [doc]);

  const [docStatuses, setDocStatuses] = useState<Record<string, string>>(
    Object.fromEntries(defaultUploadedDocs.map((d) => [d.name, d.status])),
  );
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const statusOptions = [
    "Pending",
    "Under Review",
    "Verified",
    "Updated",
    "Rejected",
  ];

  return (
    <div className="adm-modal-overlay">
      <ModalStyles />
      <div className="adm-modal-content">
        {/* Header */}
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <h2 style={{ fontSize: "22px", fontWeight: "bold", margin: 0 }}>
            Driver Application Review
          </h2>
          <StatusBadge status={mainStatus} />
        </div>
        <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 28px 0" }}>
          Review all uploaded documents and approve or reject the application
        </p>

        {/* Driver Information */}
        <h3
          style={{
            fontSize: "16px",
            fontWeight: "bold",
            margin: "0 0 16px 0",
            textAlign: "inherit",
          }}
        >
          Driver Information
        </h3>
        <div
          style={{
            border: "1px solid #f3f4f6",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "24px",
          }}
        >
          <div
            className="adm-flex-responsive"
            style={{ alignItems: "flex-start" }}
          >
            <div style={{ position: "relative", flexShrink: 0 }}>
              <UserAvatar
                src={resolveApiAssetUrl(driverInfo?.avatar || doc.avatar)}
                name={driverInfo?.name || doc.driverName}
                size={64}
                rating={4.8}
              />
            </div>
            <div
              className="adm-info-grid"
              style={{ flex: 1, textAlign: "inherit" }}
            >
              <div className="adm-info-item">
                <div
                  style={{
                    color: "#9ca3af",
                    fontSize: "11px",
                    marginBottom: "2px",
                  }}
                >
                  Full Name
                </div>
                <div style={{ fontWeight: "600" }}>
                  {driverInfo?.name || doc.driverName}
                </div>
              </div>
              <div className="adm-info-item">
                <div
                  style={{
                    color: "#9ca3af",
                    fontSize: "11px",
                    marginBottom: "2px",
                  }}
                >
                  Vehicle Type
                </div>
                <div
                  style={{
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    justifyContent: "inherit",
                  }}
                >
                  {doc.vehicleType === "MOTO"
                    ? "🏍️ Motorcycle"
                    : doc.vehicleType === "TAXI"
                      ? "🚕 Taxi"
                      : "🚗 Car"}
                </div>
              </div>
              <div className="adm-info-item">
                <div
                  style={{
                    color: "#9ca3af",
                    fontSize: "11px",
                    marginBottom: "2px",
                  }}
                >
                  Phone
                </div>
                <div style={{ fontWeight: "600" }}>
                  {driverInfo?.phone || "+212 6 12 34 56"}
                </div>
              </div>
              <div className="adm-info-item">
                <div
                  style={{
                    color: "#9ca3af",
                    fontSize: "11px",
                    marginBottom: "2px",
                  }}
                >
                  Application ID
                </div>
                <div style={{ fontWeight: "600" }}>
                  REG-{String(driverInfo?.id || "001").padStart(3, "0")}
                </div>
              </div>
              <div className="adm-info-item">
                <div
                  style={{
                    color: "#9ca3af",
                    fontSize: "11px",
                    marginBottom: "2px",
                  }}
                >
                  Email
                </div>
                <div style={{ fontWeight: "600", wordBreak: "break-all" }}>
                  {driverInfo?.email || "Ahmedhassan@gmail.com"}
                </div>
              </div>
              <div className="adm-info-item">
                <div
                  style={{
                    color: "#9ca3af",
                    fontSize: "11px",
                    marginBottom: "2px",
                  }}
                >
                  Driver ID
                </div>
                <div style={{ fontWeight: "600" }}>
                  {driverInfo?.driverId || doc.driverId}
                </div>
              </div>
              <div className="adm-info-item">
                <div
                  style={{
                    color: "#9ca3af",
                    fontSize: "11px",
                    marginBottom: "2px",
                  }}
                >
                  City
                </div>
                <div style={{ fontWeight: "600" }}>
                  {driverInfo?.city || "Casablanca"}
                </div>
              </div>
              <div className="adm-info-item">
                <div
                  style={{
                    color: "#9ca3af",
                    fontSize: "11px",
                    marginBottom: "2px",
                  }}
                >
                  Gender
                </div>
                <div style={{ fontWeight: "600" }}>
                  {driverInfo?.gender === "FEMALE" ? "♀ Female" : "♂ Male"}
                </div>
              </div>
              <div className="adm-info-item">
                <div
                  style={{
                    color: "#9ca3af",
                    fontSize: "11px",
                    marginBottom: "2px",
                  }}
                >
                  Application Date
                </div>
                <div style={{ fontWeight: "600" }}>
                  {driverInfo?.applicationDate || "10-01-2026"}
                </div>
              </div>
              <div style={{ position: "relative" }} className="adm-info-item">
                <div
                  style={{
                    color: "#9ca3af",
                    fontSize: "11px",
                    marginBottom: "2px",
                  }}
                >
                  Current Status
                </div>
                <button
                  onClick={() => setOpenMainStatus(!openMainStatus)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: `1px solid ${(statusColors[mainStatus] || statusColors["Pending"]).border}`,
                    backgroundColor: (
                      statusColors[mainStatus] || statusColors["Pending"]
                    ).bg,
                    color: (statusColors[mainStatus] || statusColors["Pending"])
                      .color,
                    fontSize: "11px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  {mainStatus} <ChevronDown size={12} />
                </button>
                {openMainStatus && (
                  <div
                    style={{
                      position: "absolute",
                      top: "110%",
                      left: 0,
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                      zIndex: 100,
                      minWidth: "130px",
                      padding: "4px",
                    }}
                  >
                    {statusOptions.map((s) => (
                      <div
                        key={s}
                        onClick={() => {
                          setMainStatus(s);
                          setOpenMainStatus(false);
                        }}
                        style={{
                          padding: "6px 10px",
                          fontSize: "12px",
                          cursor: "pointer",
                          borderRadius: "4px",
                          fontWeight: mainStatus === s ? "bold" : "normal",
                          backgroundColor:
                            mainStatus === s ? "#eef7f0" : "transparent",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "#f3f4f6")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            mainStatus === s ? "#eef7f0" : "transparent")
                        }
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Category Selection */}
        <div
          style={{
            backgroundColor: "#eef7f0",
            borderRadius: "16px",
            padding: "20px",
            textAlign: "center",
            marginBottom: "24px",
          }}
        >
          <p
            style={{
              fontWeight: "600",
              fontSize: "14px",
              marginBottom: "12px",
              margin: "0 0 12px 0",
            }}
          >
            Category Determines Pricing And Service Level For This Driver
          </p>
          {selectedCategory && (
            <p
              style={{
                fontSize: "13px",
                color: "#2d8a46",
                margin: "0 0 12px 0",
              }}
            >
              Selected: <strong>{selectedCategory}</strong>
            </p>
          )}
          <button
            onClick={() => setShowCategoryModal(true)}
            style={{
              padding: "10px 24px",
              borderRadius: "24px",
              border: "1px solid #e5e7eb",
              backgroundColor: "white",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "13px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#38AC57";
              e.currentTarget.style.backgroundColor = "#eef7f0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e5e7eb";
              e.currentTarget.style.backgroundColor = "white";
            }}
          >
            Select Category
          </button>
        </div>

        {/* Vehicle Information */}
        <h3
          style={{
            fontSize: "16px",
            fontWeight: "bold",
            margin: "0 0 16px 0",
            textAlign: "inherit",
          }}
        >
          Vehicle Information
        </h3>
        <div
          style={{
            border: "1px solid #f3f4f6",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "28px",
          }}
        >
          <div
            className="adm-info-grid"
            style={{ flex: 1, textAlign: "inherit" }}
          >
            <div className="adm-info-item">
              <div
                style={{
                  color: "#9ca3af",
                  fontSize: "11px",
                  marginBottom: "2px",
                }}
              >
                Driver ID
              </div>
              <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                {driverInfo?.driverId || "D-00045"}
              </div>
            </div>
            <div className="adm-info-item">
              <div
                style={{
                  color: "#9ca3af",
                  fontSize: "11px",
                  marginBottom: "2px",
                }}
              >
                Vehicle Colour
              </div>
              <div
                style={{
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  justifyContent: "inherit",
                }}
              >
                ⚪ {vehicleInfo?.colour || "White"}
              </div>
            </div>
            <div className="adm-info-item">
              <div
                style={{
                  color: "#9ca3af",
                  fontSize: "11px",
                  marginBottom: "2px",
                }}
              >
                Licence Plate Num
              </div>
              <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                {vehicleInfo?.licensePlate || "8 | i | 26363"}
              </div>
            </div>
            <div className="adm-info-item">
              <div
                style={{
                  color: "#9ca3af",
                  fontSize: "11px",
                  marginBottom: "2px",
                }}
              >
                Make & Model
              </div>
              <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                {vehicleInfo?.makeModel || "Dacia Logan"}
              </div>
            </div>
            <div className="adm-info-item">
              <div
                style={{
                  color: "#9ca3af",
                  fontSize: "11px",
                  marginBottom: "2px",
                }}
              >
                Year
              </div>
              <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                {vehicleInfo?.year || "2020"}
              </div>
            </div>
            <div className="adm-info-item">
              <div
                style={{
                  color: "#9ca3af",
                  fontSize: "11px",
                  marginBottom: "2px",
                }}
              >
                Join Date
              </div>
              <div style={{ fontWeight: "600" }}>
                {driverInfo?.joinDate || "2023-01-15"}
              </div>
            </div>
          </div>
        </div>

        {/* Uploaded Documents */}
        <h3
          style={{
            fontSize: "16px",
            fontWeight: "bold",
            margin: "0 0 16px 0",
            textAlign: "inherit",
          }}
        >
          Uploaded Documents
        </h3>
        <div className="adm-docs-grid" style={{ marginBottom: "28px" }}>
          {uploadedDocs.map((d) => (
            <div
              key={d.name}
              style={{
                border: "1px solid #f3f4f6",
                borderRadius: "16px",
                padding: "16px",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: "14px",
                  marginBottom: "4px",
                }}
              >
                {d.name}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginBottom: "12px",
                  minHeight: "32px",
                }}
              >
                {d.desc}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                  marginBottom: "12px",
                  flexWrap: "wrap",
                }}
              >
                {/* Status dropdown */}
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() =>
                      setOpenDropdown(openDropdown === d.name ? null : d.name)
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: `1px solid ${(statusColors[docStatuses[d.name]] || statusColors["Pending"]).border}`,
                      backgroundColor: (
                        statusColors[docStatuses[d.name]] ||
                        statusColors["Pending"]
                      ).bg,
                      color: (
                        statusColors[docStatuses[d.name]] ||
                        statusColors["Pending"]
                      ).color,
                      fontSize: "11px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    {docStatuses[d.name]} <ChevronDown size={12} />
                  </button>
                  {openDropdown === d.name && (
                    <div
                      style={{
                        position: "absolute",
                        top: "110%",
                        left: 0,
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                        zIndex: 10,
                        minWidth: "130px",
                        padding: "4px",
                      }}
                    >
                      {statusOptions.map((s) => (
                        <div
                          key={s}
                          onClick={() => {
                            setDocStatuses((prev) => ({
                              ...prev,
                              [d.name]: s,
                            }));
                            setOpenDropdown(null);
                            const vType = doc.vehicleType || "CAR";
                            const dId =
                              doc.driverDbId ||
                              parseInt(doc.driverId.replace(/\D/g, "")) ||
                              0;
                            if (dId)
                              updateDriverDocumentStatusApi(vType, dId, {
                                documentName: d.name,
                                status: s,
                              }).catch(() => {});
                          }}
                          style={{
                            padding: "6px 10px",
                            fontSize: "12px",
                            cursor: "pointer",
                            borderRadius: "4px",
                            fontWeight:
                              docStatuses[d.name] === s ? "bold" : "normal",
                            backgroundColor:
                              docStatuses[d.name] === s
                                ? "#eef7f0"
                                : "transparent",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "#f3f4f6")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              docStatuses[d.name] === s
                                ? "#eef7f0"
                                : "transparent")
                          }
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() =>
                    setShowDocPreview({
                      name: d.name,
                      images: d.images,
                    })
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "1px solid #e5e7eb",
                    backgroundColor: "white",
                    fontSize: "11px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#38AC57";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                  }}
                >
                  <Eye size={12} /> Preview
                </button>
              </div>
              <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                Updated on {d.date}
              </div>
            </div>
          ))}
        </div>

        {/* Internal Notes */}
        <h3
          style={{ fontSize: "16px", fontWeight: "bold", margin: "0 0 12px 0" }}
        >
          Internal Notes
        </h3>
        <textarea
          placeholder="Add internal notes about this application (not visible to applicant)..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{
            width: "100%",
            height: "80px",
            padding: "14px",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            backgroundColor: "#f9fafb",
            resize: "none",
            fontFamily: "inherit",
            fontSize: "13px",
            outline: "none",
            boxSizing: "border-box",
            marginBottom: "16px",
          }}
        />
        <button
          onClick={() => alert("Notes saved!")}
          style={{
            padding: "10px 24px",
            borderRadius: "24px",
            border: "1px solid #1f2937",
            backgroundColor: "white",
            fontWeight: "bold",
            fontSize: "14px",
            cursor: "pointer",
            marginBottom: "24px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f9fafb";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "white";
          }}
        >
          Save Notes
        </button>

        {/* Approve / Reject */}
        <div className="adm-footer-actions">
          <button
            onClick={() => {
              const vType = doc.vehicleType || "CAR";
              const dId =
                doc.driverDbId ||
                parseInt(doc.driverId.replace(/\D/g, "")) ||
                0;
              if (dId)
                updateDriverApplicationStatusApi(vType, dId, {
                  status: "APPROVED",
                }).catch(() => {});
              onApprove();
              onClose();
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
            Approve Application
          </button>
          <button
            onClick={() => {
              const vType = doc.vehicleType || "CAR";
              const dId =
                doc.driverDbId ||
                parseInt(doc.driverId.replace(/\D/g, "")) ||
                0;
              if (dId)
                updateDriverApplicationStatusApi(vType, dId, {
                  status: "REJECTED",
                }).catch(() => {});
              onReject();
              onClose();
            }}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: "32px",
              border: "2px solid #dc2626",
              backgroundColor: "white",
              color: "#dc2626",
              fontWeight: "bold",
              fontSize: "15px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#fef2f2";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "white";
            }}
          >
            Reject Application
          </button>
        </div>
      </div>

      {/* Sub-modals */}
      {showCategoryModal && (
        <SelectCategoryModal
          driverId={String(
            doc.driverDbId || doc.driverId?.replace(/\D/g, "") || "",
          )}
          onClose={() => setShowCategoryModal(false)}
          onConfirm={setSelectedCategory}
        />
      )}
      {showDocPreview && (
        <DocumentPreviewModal
          docName={showDocPreview.name}
          images={showDocPreview.images}
          onClose={() => setShowDocPreview(null)}
        />
      )}
    </div>
  );
};

// ============ ADD NEW DRIVER MODAL ============
export const AddNewDriverModal = ({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (driver: any) => void;
}) => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    city: "Casablanca-Settat",
    gender: "Male",
    serviceType: "Taxi",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: new Date().getFullYear().toString(),
    licensePlate: "",
    dob: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert("Full Name and Phone Number are required.");
      return;
    }

    setLoading(true);
    try {
      // Mapping UI labels to API expected values if necessary
      // The API expects: name, phone, email, dob, gender, cityId, status, serviceTypeId
      // For now, we'll send a mapping or the raw data if it fits

      const cityMapping: Record<string, number> = {
        "Casablanca-Settat": 1,
        "Rabat-Salé-Kénitra": 2,
        "Marrakesh-Safi": 3,
        "Fès-Meknès": 4,
        "Tanger-Tetouan-Al Hoceima": 5,
      };

      const serviceMapping: Record<string, number> = {
        "Hezzni Standard": 1,
        "Hezzni Comfort": 1, // Same as standard for now or maps to another
        "Hezzni XL": 1,
        Taxi: 3,
        Motorcycle: 2,
      };

      const payload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        dob: formData.dob,
        gender: formData.gender.toUpperCase(),
        cityId: cityMapping[formData.city] || null,
        serviceTypeId: serviceMapping[formData.serviceType] || 1,
        status: "pending",
      };

      const response = await createDriverApi(payload);

      if (response.ok) {
        onAdd(formData);
        onClose();
      } else {
        const errorData = response.data as any;
        alert(errorData.message || "Failed to add driver. Please try again.");
      }
    } catch (err) {
      console.error("Error adding driver:", err);
      alert("An unexpected error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const inputWrapperStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
  };

  const inputStyle: React.CSSProperties = {
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s",
    backgroundColor: "#f9fafb",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: "40px",
  };

  return (
    <div className="adm-modal-overlay">
      <ModalStyles />
      <div className="adm-modal-content" style={{ maxWidth: "800px" }}>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <h2
          style={{
            fontSize: "28px",
            fontWeight: "900",
            margin: "0 0 8px 0",
            letterSpacing: "-0.02em",
          }}
        >
          Add New Driver
        </h2>
        <p style={{ color: "#6b7280", fontSize: "15px", margin: "0 0 32px 0" }}>
          Enter personal and vehicle details to register a new driver in the
          system.
        </p>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "24px",
              marginBottom: "32px",
            }}
          >
            {/* Personal Information */}
            <div style={{ gridColumn: "1 / -1" }}>
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "800",
                  margin: "0 0 16px 0",
                  borderBottom: "1px solid #f3f4f6",
                  paddingBottom: "12px",
                  color: "#111827",
                }}
              >
                Personal Information
              </h3>
            </div>

            <div style={inputWrapperStyle}>
              <label style={labelStyle}>Full Name*</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Ahmed Hassan"
                style={inputStyle}
                required
              />
            </div>

            <div style={inputWrapperStyle}>
              <label style={labelStyle}>Phone Number*</label>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+212 600-000000"
                style={inputStyle}
                required
              />
            </div>

            <div style={inputWrapperStyle}>
              <label style={labelStyle}>Email Address</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="ahmed@example.com"
                style={inputStyle}
              />
            </div>

            <div style={inputWrapperStyle}>
              <label style={labelStyle}>Date of Birth</label>
              <input
                name="dob"
                type="date"
                value={formData.dob}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>

            <div style={inputWrapperStyle}>
              <label style={labelStyle}>City</label>
              <select
                name="city"
                value={formData.city}
                onChange={handleChange}
                style={selectStyle}
              >
                <option>Casablanca-Settat</option>
                <option>Rabat-Salé-Kénitra</option>
                <option>Marrakesh-Safi</option>
                <option>Fès-Meknès</option>
                <option>Tanger-Tetouan-Al Hoceima</option>
              </select>
            </div>

            <div style={inputWrapperStyle}>
              <label style={labelStyle}>Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                style={selectStyle}
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>

            {/* Vehicle Information */}
            <div style={{ gridColumn: "1 / -1", marginTop: "12px" }}>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  margin: "0 0 16px 0",
                  borderBottom: "1px solid #f3f4f6",
                  paddingBottom: "8px",
                }}
              >
                Vehicle Information
              </h3>
            </div>

            <div style={inputWrapperStyle}>
              <label style={labelStyle}>Service Category</label>
              <select
                name="serviceType"
                value={formData.serviceType}
                onChange={handleChange}
                style={selectStyle}
              >
                <option>Hezzni Standard</option>
                <option>Hezzni Comfort</option>
                <option>Hezzni XL</option>
                <option>Taxi</option>
                <option>Motorcycle</option>
              </select>
            </div>

            <div style={inputWrapperStyle}>
              <label style={labelStyle}>Vehicle Make</label>
              <input
                name="vehicleMake"
                value={formData.vehicleMake}
                onChange={handleChange}
                placeholder="e.g. Dacia"
                style={inputStyle}
              />
            </div>

            <div style={inputWrapperStyle}>
              <label style={labelStyle}>Vehicle Model</label>
              <input
                name="vehicleModel"
                value={formData.vehicleModel}
                onChange={handleChange}
                placeholder="e.g. Logan"
                style={inputStyle}
              />
            </div>

            <div style={inputWrapperStyle}>
              <label style={labelStyle}>Vehicle Year</label>
              <input
                name="vehicleYear"
                type="number"
                value={formData.vehicleYear}
                onChange={handleChange}
                placeholder="2020"
                style={inputStyle}
              />
            </div>

            <div style={inputWrapperStyle}>
              <label style={labelStyle}>License Plate Number</label>
              <input
                name="licensePlate"
                value={formData.licensePlate}
                onChange={handleChange}
                placeholder="12345 | A | 1"
                style={inputStyle}
              />
            </div>
          </div>

          <div className="adm-footer-actions" style={{ marginTop: "12px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "32px",
                border: "1px solid #e5e7eb",
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
              type="submit"
              disabled={loading}
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
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={(e) =>
                !loading && (e.currentTarget.style.backgroundColor = "#2d8a46")
              }
              onMouseLeave={(e) =>
                !loading && (e.currentTarget.style.backgroundColor = "#38AC57")
              }
            >
              {loading ? "Adding Driver..." : "Add Driver"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
