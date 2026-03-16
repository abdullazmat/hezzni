import { useState, useRef, useEffect } from "react";
import {
  Search,
  Eye,
  Plus,
  ChevronDown,
  Filter,
  Calendar,
  Fuel,
  Settings,
  Palette,
  MoreVertical,
  ArrowLeft,
} from "lucide-react";
import {
  VehicleDetailModal,
  VehicleListing,
  AddVehicleModal,
} from "./RentalCompaniesModals";
import {
  getRentalCompaniesStatsApi,
  getRentalCompaniesListApi,
  getRentalVehiclesListApi,
  updateRentalVehicleStatusApi,
  resolveApiAssetUrl,
} from "../services/api";

// Specialized Icons
import availableIcon from "../assets/available rental companies.png";
import pendingIcon from "../assets/pending rental companies.png";
import underReviewIcon from "../assets/under review rental companies.png";
import rejectedIcon from "../assets/rejected rental companies.png";
import companyLogoAsset from "../assets/rental companies logo.jpg";

// Status colors
const statusColors: Record<
  string,
  { bg: string; color: string; border: string }
> = {
  Available: { bg: "#eef7f0", color: "#2d8a46", border: "#eef7f0" },
  Approved: { bg: "#eef7f0", color: "#2d8a46", border: "#eef7f0" },
  Pending: { bg: "#fef3c7", color: "#d97706", border: "#fde68a" },
  "Pending Review": { bg: "#fef3c7", color: "#d97706", border: "#fde68a" },
  Rejected: { bg: "#fee2e2", color: "#dc2626", border: "#fecaca" },
  Complete: { bg: "#dbeafe", color: "#2563eb", border: "#bfdbfe" },
};

// HD Car images from Unsplash
const carImages: Record<string, string> = {
  "Mercedes G Wagon":
    "https://images.unsplash.com/photo-1520031441872-265e4ff70366?w=600&h=400&fit=crop",
  "Dacia Logan":
    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&h=400&fit=crop",
  "BMW 5 Series":
    "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&h=400&fit=crop",
  "Toyota Corolla":
    "https://images.unsplash.com/photo-1621993202323-f438eec934ff?w=600&h=400&fit=crop",
};
const defaultCarImg =
  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&h=400&fit=crop";

// Company data
interface CompanyRecord {
  id?: number;
  name: string;
  email: string;
  phone: string;
  logo: string;
  location: string;
  region: string;
  fleetSize: number;
  vehicleTypes: string;
  commission: string;
  documents: string;
  status: string;
  submitted: string;
  contract: string;
}

// mockCompanies and mockVehicles removed as unused

// Dropdown
const Dropdown = ({
  label,
  options,
  activeValue,
  onSelect,
}: {
  label: string;
  options: string[];
  activeValue: string;
  onSelect: (v: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [isOpen]);
  return (
    <div
      ref={ref}
      className="rc-dropdown-wrapper"
      style={{ position: "relative", display: "inline-block" }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 16px",
          borderRadius: "24px",
          border: "1px solid #e5e7eb",
          backgroundColor: "white",
          fontSize: "14px",
          color: "#374151",
          cursor: "pointer",
          whiteSpace: "nowrap",
          width: "100%",
          justifyContent: "space-between",
        }}
      >
        {activeValue === "All" ? label : `✓ ${activeValue}`}
        <ChevronDown
          size={14}
          style={{
            transform: isOpen ? "rotate(180deg)" : "none",
            transition: "0.2s",
          }}
        />
      </button>
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "120%",
            left: 0,
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            zIndex: 50,
            minWidth: "160px",
            padding: "6px",
          }}
        >
          {["All", ...options].map((o) => (
            <div
              key={o}
              onClick={() => {
                onSelect(o);
                setIsOpen(false);
              }}
              style={{
                padding: "8px 14px",
                cursor: "pointer",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: activeValue === o ? "bold" : "normal",
                backgroundColor: activeValue === o ? "#eef7f0" : "transparent",
                color: activeValue === o ? "#2d8a46" : "#374151",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#f3f4f6")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor =
                  activeValue === o ? "#eef7f0" : "transparent")
              }
            >
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const RentalCompanies = () => {
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("All Listings");
  const [activeStat, setActiveStat] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleListing | null>(
    null,
  );
  const [selectedCompany, setSelectedCompany] = useState<CompanyRecord | null>(
    null,
  );
  const [banner, setBanner] = useState<{
    type: "approve" | "reject";
    msg: string;
  } | null>(null);

  const [vehicles, setVehicles] = useState<VehicleListing[]>([]);
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [apiStats, setApiStats] = useState<{
    available: number;
    booked: number;
    underReview: number;
    rejected: number;
  } | null>(null);

  // Fetch stats from API
  useEffect(() => {
    getRentalCompaniesStatsApi()
      .then((res) => {
        if (res.ok && res.data) {
          setApiStats(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch companies from API
  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchTerm) params.search = searchTerm;
    getRentalCompaniesListApi(params)
      .then((res) => {
        if (res.ok && Array.isArray(res.data?.companies)) {
          setCompanies(res.data.companies);
          return;
        }

        setCompanies([]);
      })
      .catch(() => setCompanies([]));
  }, [activeTab, searchTerm]);

  // Fetch vehicles from API
  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchTerm) params.search = searchTerm;
    if (activeTab !== "All Listings") params.tab = activeTab;

    getRentalVehiclesListApi(params)
      .then((res) => {
        if (res.ok && Array.isArray(res.data?.vehicles)) {
          setVehicles(res.data.vehicles);
          return;
        }

        setVehicles([]);
      })
      .catch(() => setVehicles([]));
  }, [activeTab, searchTerm]);

  const available =
    apiStats?.available ??
    vehicles.filter((v) => v.status === "Approved").length;
  const pending =
    apiStats?.underReview ??
    vehicles.filter((v) => v.status === "Pending Review").length;
  const booked = apiStats?.booked ?? 0;
  const rejected =
    apiStats?.rejected ??
    vehicles.filter((v) => v.status === "Rejected").length;

  const statCards = [
    {
      key: "Available",
      label: "Available",
      value: String(available).padStart(2, "0"),
      icon: availableIcon,
    },
    {
      key: "Approved",
      label: viewMode === "table" ? "Booked" : "Approved",
      value: String(viewMode === "table" ? booked : available).padStart(2, "0"),
      icon: pendingIcon,
    },
    {
      key: "Pending",
      label: viewMode === "table" ? "Under Review" : "Pending",
      value: String(pending).padStart(2, "0"),
      icon: underReviewIcon,
    },
    {
      key: "Rejected",
      label: "Rejected",
      value: String(rejected).padStart(2, "0"),
      icon: rejectedIcon,
    },
  ];

  const tabs = ["All Listings", "Pending", "Approved", "Rejected"];

  // Filter vehicles
  const filteredVehicles = vehicles.filter((v) => {
    if (selectedCompany && v.company !== selectedCompany.name) return false;
    if (
      searchTerm &&
      !v.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !v.company.toLowerCase().includes(searchTerm.toLowerCase())
    )
      return false;

    // Tab filters
    if (activeTab === "Pending" && v.status !== "Pending Review") return false;
    if (activeTab === "Approved" && v.status !== "Approved") return false;
    if (activeTab === "Rejected" && v.status !== "Rejected") return false;

    // Stat card filters
    if (activeStat === "Available" && v.status !== "Approved") return false; // Approved cars are available
    if (activeStat === "Approved" && v.status !== "Approved") return false;
    if (activeStat === "Pending" && v.status !== "Pending Review") return false;
    if (activeStat === "Rejected" && v.status !== "Rejected") return false;

    // Dropdown filters
    if (statusFilter !== "All") {
      if (statusFilter === "Pending" && v.status === "Pending Review")
        return true; // Handle Pending/Pending Review mismatch
      if (v.status !== statusFilter) return false;
    }
    return true;
  });

  // Filter companies
  const filteredCompanies = companies.filter((c) => {
    if (
      searchTerm &&
      !c.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !c.location.toLowerCase().includes(searchTerm.toLowerCase())
    )
      return false;

    // Tab filters
    if (activeTab === "Pending" && c.status !== "Pending") return false;
    if (
      activeTab === "Approved" &&
      c.status !== "Approved" &&
      c.status !== "Available"
    )
      return false;
    if (activeTab === "Rejected" && c.status !== "Rejected") return false;

    // Stat card filters
    if (activeStat === "Available" && c.status !== "Available") return false;
    if (activeStat === "Approved" && c.status !== "Approved") return false;
    if (activeStat === "Pending" && c.status !== "Pending") return false;
    if (activeStat === "Rejected" && c.status !== "Rejected") return false;

    // Dropdown filters
    if (statusFilter !== "All" && c.status !== statusFilter) return false;
    return true;
  });

  const handleApprove = () => {
    if (selectedVehicle) {
      const dbId = (selectedVehicle as any).dbId;
      if (dbId) {
        updateRentalVehicleStatusApi(dbId, { status: "AVAILABLE" }).catch(
          () => {},
        );
      }
      setVehicles(
        vehicles.map((v) =>
          v === selectedVehicle ? { ...v, status: "Approved" } : v,
        ),
      );
      setSelectedVehicle(null);
      setBanner({ type: "approve", msg: "This listing has been approved" });
      setTimeout(() => setBanner(null), 5000);
    }
  };

  const handleReject = () => {
    if (selectedVehicle) {
      const dbId = (selectedVehicle as any).dbId;
      if (dbId) {
        updateRentalVehicleStatusApi(dbId, {
          status: "REJECTED",
          reason: "Rejected by admin",
        }).catch(() => {});
      }
      setVehicles(
        vehicles.map((v) =>
          v === selectedVehicle ? { ...v, status: "Rejected" } : v,
        ),
      );
      setSelectedVehicle(null);
      setBanner({ type: "reject", msg: "This listing has been rejected" });
      setTimeout(() => setBanner(null), 5000);
    }
  };

  const handleAddVehicle = (
    newVehicleData: Omit<
      VehicleListing,
      "id" | "companyLogo" | "submittedDate" | "status"
    >,
  ) => {
    const newVehicle: VehicleListing = {
      ...newVehicleData,
      id: `T${Math.floor(Math.random() * 10000)}-N`,
      companyLogo: "🆕",
      submittedDate: new Date().toISOString().slice(0, 16).replace("T", " "),
      status: "Pending Review",
    };
    setVehicles([newVehicle, ...vehicles]);
    setBanner({ type: "approve", msg: "New vehicle submitted successfully" });
    setTimeout(() => setBanner(null), 5000);
  };

  const statusBadge = (status: string) => {
    const sc = statusColors[status] || statusColors["Pending"];
    return (
      <span
        style={{
          backgroundColor: sc.bg,
          color: sc.color,
          border: `1px solid ${sc.border}`,
          padding: "4px 12px",
          borderRadius: "8px",
          fontSize: "12px",
          fontWeight: "600",
        }}
      >
        {status}
      </span>
    );
  };

  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: "#f9fafb",
        minHeight: "100vh",
      }}
    >
      <style>{`
                .rc-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                    margin-bottom: 32px;
                }
                .rc-flex-responsive {
                    display: flex;
                    gap: 24px;
                }
                .rc-controls-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                    gap: 12px;
                }
                .rc-tabs-container {
                    display: flex;
                    background-color: #f3f4f6;
                    border-radius: 24px;
                    padding: 3px;
                }
                .rc-table-container {
                    width: 100%;
                    overflow-x: auto;
                    border-radius: 12px;
                }
                .rc-table-header {
                    display: grid;
                    grid-template-columns: 2fr 120px 1.2fr 100px 100px 1.2fr 100px;
                    padding: 16px 24px;
                    background-color: #38AC57;
                    color: white;
                    border-radius: 12px;
                    font-weight: bold;
                    font-size: 13px;
                    margin-bottom: 16px;
                    min-width: 1000px;
                }
                .rc-table-row {
                    display: grid;
                    grid-template-columns: 2fr 120px 1.2fr 100px 100px 1.2fr 100px;
                    padding: 16px 24px;
                    background-color: white;
                    border-radius: 16px;
                    align-items: center;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                    margin-bottom: 12px;
                    min-width: 1000px;
                    transition: all 0.2s;
                }
                .rc-grid-view {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                }
                .rc-dropdown-wrapper {
                    width: 100%;
                    max-width: max-content;
                }

                @media (max-width: 1200px) {
                    .rc-grid-view {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }

                @media (max-width: 1024px) {
                    .rc-stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    .rc-grid-view {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 768px) {
                    .rc-flex-responsive {
                        flex-direction: column;
                        align-items: stretch !important;
                        text-align: center;
                    }
                    .rc-controls-container {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .rc-controls-container > div {
                        flex-direction: column;
                        align-items: stretch !important;
                    }
                    .rc-controls-container .rc-dropdown-wrapper {
                        max-width: none;
                    }
                    .rc-controls-container button {
                        width: 100%;
                        justify-content: space-between;
                    }
                    .rc-tabs-container {
                        width: 100%;
                        flex-wrap: wrap;
                    }
                    .rc-tabs-container button {
                        flex: 1;
                        min-width: 100px;
                    }
                }

                @media (max-width: 480px) {
                    .rc-stats-grid {
                        grid-template-columns: 1fr;
                    }
                    .rc-grid-view {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
      {/* Banner */}
      {banner && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 2000,
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "14px 24px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            border: `1px solid ${banner.type === "approve" ? "#a5d6a7" : "#fecaca"}`,
            animation: "slideUp 0.3s ease",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              backgroundColor:
                banner.type === "approve" ? "#dbeafe" : "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
            }}
          >
            ℹ️
          </div>
          <span style={{ fontSize: "14px", fontWeight: "500" }}>
            {banner.msg}
          </span>
          <button
            onClick={() => setBanner(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#6b7280",
              fontSize: "16px",
              marginLeft: "8px",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div
        className="rc-flex-responsive"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: 0 }}>
            {viewMode === "table"
              ? "Rental Companies"
              : selectedCompany
                ? `${selectedCompany.name} Fleet`
                : "All Vehicles"}
          </h1>
          <p
            style={{ color: "#6b7280", margin: "4px 0 0 0", fontSize: "14px" }}
          >
            {viewMode === "table"
              ? "Manage rental company partnerships and fleet integrations"
              : `Viewing vehicle fleet ${selectedCompany ? `for ${selectedCompany.name}` : "across all companies"}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={() => {
              if (viewMode === "grid") setSelectedCompany(null);
              setViewMode(viewMode === "table" ? "grid" : "table");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "24px",
              border: "1px solid #e5e7eb",
              backgroundColor: "white",
              fontWeight: "600",
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s",
              justifyContent: "center",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "#38AC57")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "#e5e7eb")
            }
          >
            {viewMode === "grid" ? <ArrowLeft size={16} /> : null}
            {viewMode === "table" ? "View All Vehicles" : "Back to Companies"}
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "24px",
              border: "none",
              backgroundColor: "#38AC57",
              color: "white",
              fontWeight: "600",
              fontSize: "14px",
              cursor: "pointer",
              transition: "background-color 0.2s",
              justifyContent: "center",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#2d8a46")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#38AC57")
            }
          >
            <Plus size={18} /> Add Vehicle
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="rc-stats-grid">
        {statCards.map((stat) => {
          const isActive = activeStat === stat.key;
          return (
            <div
              key={stat.key}
              onClick={() => setActiveStat(isActive ? "" : stat.key)}
              style={{
                backgroundColor: isActive ? "#38AC57" : "white",
                padding: "24px",
                borderRadius: "24px",
                position: "relative",
                cursor: "pointer",
                transition: "all 0.3s",
                boxShadow: isActive
                  ? "0 8px 20px rgba(56, 172, 87, 0.15)"
                  : "0 1px 3px rgba(0,0,0,0.06)",
                border: "2px solid transparent",
                transform: isActive ? "translateY(-2px)" : "none",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  fontWeight: "600",
                  fontSize: "14px",
                  color: isActive ? "white" : "#6b7280",
                  marginBottom: "4px",
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  fontSize: "48px",
                  fontWeight: "bold",
                  color: isActive ? "white" : "#111827",
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  position: "absolute",
                  right: "16px",
                  bottom: "16px",
                  opacity: 1.0,
                  backgroundColor: isActive
                    ? "rgba(255,255,255,0.15)"
                    : "transparent",
                  borderRadius: "16px",
                  padding: isActive ? "6px" : 0,
                }}
              >
                <img
                  src={stat.icon}
                  alt=""
                  style={{
                    width: "64px",
                    height: "64px",
                    objectFit: "contain",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="rc-controls-container">
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
            <Search
              size={18}
              color="#9ca3af"
              style={{
                position: "absolute",
                left: "16px",
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
                padding: "10px 16px 10px 48px",
                borderRadius: "24px",
                border: "1px solid #e5e7eb",
                outline: "none",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>
          <Dropdown
            label="Status"
            options={[
              "Available",
              "Approved",
              "Pending",
              "Pending Review",
              "Rejected",
            ]}
            activeValue={statusFilter}
            onSelect={setStatusFilter}
          />
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "24px",
              border: "1px solid #e5e7eb",
              backgroundColor: "white",
              fontSize: "14px",
              cursor: "pointer",
              justifyContent: "center",
            }}
          >
            <Filter size={14} /> Filters
          </button>
        </div>
        <div className="rc-tabs-container">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "8px 18px",
                borderRadius: "20px",
                border: "none",
                backgroundColor: activeTab === tab ? "#1f2937" : "transparent",
                color: activeTab === tab ? "white" : "#6b7280",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ====== TABLE VIEW ====== */}
      {viewMode === "table" && (
        <div className="rc-table-container">
          <div className="rc-table-header">
            <div>Company Details</div>
            <div>Location</div>
            <div>Fleet Info</div>
            <div style={{ textAlign: "center" }}>Documents</div>
            <div style={{ textAlign: "center" }}>Status</div>
            <div style={{ textAlign: "center" }}>Submitted</div>
            <div style={{ textAlign: "center" }}>Action</div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              minWidth: "1000px",
            }}
          >
            {filteredCompanies.length === 0 ? (
              <div
                style={{
                  backgroundColor: "white",
                  padding: "48px",
                  borderRadius: "16px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "40px", marginBottom: "16px" }}>🏢</div>
                <h3 style={{ margin: "0 0 8px 0" }}>No companies found</h3>
                <p style={{ color: "#6b7280", margin: 0 }}>
                  Try adjusting your filters
                </p>
              </div>
            ) : (
              filteredCompanies.map((c, i) => {
                return (
                  <div key={i} className="rc-table-row">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={resolveApiAssetUrl(c.logo) || companyLogoAsset}
                          alt="Company Logo"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "14px" }}>
                          {c.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                          {c.email}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#9ca3af",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.phone}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: "600", fontSize: "13px" }}>
                        {c.location}
                      </div>
                      <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                        {c.region}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: "600", fontSize: "13px" }}>
                        {c.fleetSize} vehicles
                      </div>
                      <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                        {c.vehicleTypes}
                      </div>
                      <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                        {c.commission}
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      {statusBadge(c.documents)}
                    </div>
                    <div style={{ textAlign: "center" }}>
                      {statusBadge(c.status)}
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "13px", fontWeight: "600" }}>
                        {c.submitted}
                      </div>
                      <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                        Contract: {c.contract}
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <button
                        onClick={() => {
                          setSelectedCompany(c);
                          setViewMode("grid");
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 16px",
                          borderRadius: "20px",
                          border: "1px solid #e5e7eb",
                          backgroundColor: "white",
                          fontSize: "13px",
                          cursor: "pointer",
                          fontWeight: "600",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#eef7f0";
                          e.currentTarget.style.borderColor = "#38AC57";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "white";
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }}
                      >
                        <Eye size={14} /> Preview
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ====== GRID VIEW ====== */}
      {viewMode === "grid" && (
        <div className="rc-grid-view">
          {filteredVehicles.length === 0 ? (
            <div
              style={{
                gridColumn: "1/-1",
                backgroundColor: "white",
                padding: "48px",
                borderRadius: "16px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>🚗</div>
              <h3 style={{ margin: "0 0 8px 0" }}>No vehicles found</h3>
              <p style={{ color: "#6b7280", margin: 0 }}>
                Try adjusting your filters
              </p>
            </div>
          ) : (
            filteredVehicles.map((v, i) => {
              const sc = statusColors[v.status] || statusColors["Pending"];
              return (
                <div
                  key={i}
                  onClick={() => setSelectedVehicle(v)}
                  style={{
                    backgroundColor: "white",
                    borderRadius: "20px",
                    overflow: "hidden",
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    transition: "all 0.25s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 8px 25px rgba(0,0,0,0.12)";
                    e.currentTarget.style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 1px 3px rgba(0,0,0,0.06)";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  {/* Image */}
                  <div
                    style={{
                      position: "relative",
                      height: "180px",
                      backgroundColor: "#f3f4f6",
                    }}
                  >
                    <img
                      src={carImages[v.name] || defaultCarImg}
                      alt={v.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        backgroundColor: sc.bg,
                        color: sc.color,
                        border: `1px solid ${sc.border}`,
                        padding: "3px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "700",
                      }}
                    >
                      {v.status}
                    </div>
                  </div>
                  <div style={{ padding: "16px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "4px",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "16px",
                          fontWeight: "bold",
                          margin: 0,
                        }}
                      >
                        {v.name}
                      </h3>
                      <span
                        style={{
                          backgroundColor: "#38AC57",
                          color: "white",
                          padding: "3px 10px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "700",
                        }}
                      >
                        {v.price}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#9ca3af",
                        marginBottom: "12px",
                      }}
                    >
                      {v.id}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "6px",
                        marginBottom: "14px",
                        fontSize: "12px",
                        color: "#6b7280",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Calendar size={12} /> {v.year}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Settings size={12} /> {v.transmission}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Fuel size={12} /> {v.fuel}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Palette size={12} /> {v.color}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderTop: "1px solid #f3f4f6",
                        paddingTop: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            backgroundColor: "#1f2937",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "10px",
                            overflow: "hidden",
                          }}
                        >
                          {(v as any).companyLogoUrl ? (
                            <img
                              src={resolveApiAssetUrl(
                                (v as any).companyLogoUrl,
                              )}
                              alt={v.company}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            v.companyLogo
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: "600" }}>
                            {v.company}
                          </div>
                          <div style={{ fontSize: "10px", color: "#9ca3af" }}>
                            {v.carsAvailable} cars available
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px",
                        }}
                      >
                        <MoreVertical size={16} color="#9ca3af" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <VehicleDetailModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {isAddModalOpen && (
        <AddVehicleModal
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddVehicle}
        />
      )}
    </div>
  );
};
