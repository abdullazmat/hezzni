import { useState, useRef, useEffect } from "react";
import { Search, Eye, ArrowUpRight, ChevronDown, Plus } from "lucide-react";
import {
  ApplicationReviewModal,
  AddNewDriverModal,
} from "./DriverDocumentsModals";
import { UserAvatar } from "../components/UserAvatar";
import {
  getDriverDocumentsStatsApi,
  getDriverDocumentsListApi,
  resolveApiAssetUrl,
} from "../services/api";

// Specialized Icons
import driverDocumentsIcon from "../assets/icons/Driver Documents.png";
import waitingCustomersIcon from "../assets/icons/Waiting Customers.png";
import pendingIcon from "../assets/icons/Pending.png";
import cancelledArchiveIcon from "../assets/icons/Cancelled Archive.png";

// --- Status Colors ---
const statusColors: Record<
  string,
  { bg: string; color: string; border: string }
> = {
  Verified: { bg: "#eef7f0", color: "#2d8a46", border: "#eef7f0" },
  Pending: { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb" },
  Updated: { bg: "#dbeafe", color: "#2563eb", border: "#bfdbfe" },
  Rejected: { bg: "#fee2e2", color: "#dc2626", border: "#fecaca" },
  Expired: { bg: "#fef3c7", color: "#d97706", border: "#fde68a" },
  "Under Review": { bg: "#fef9c3", color: "#a16207", border: "#fef08a" },
  Completed: { bg: "#eef7f0", color: "#2d8a46", border: "#eef7f0" },
};

interface DocRecord {
  driverId: string;
  driverName: string;
  avatar: string;
  docType: string;
  uploadDate: string;
  status: string;
  vehicleType?: string;
  driverDbId?: number;
}

// Dropdown
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
        padding: "8px 16px",
        cursor: "pointer",
        borderRadius: "8px",
        fontWeight: isActive ? "bold" : "normal",
        backgroundColor: hovered
          ? "#f3f4f6"
          : isActive
            ? "#eef7f0"
            : "transparent",
        color: isActive ? "#2d8a46" : "#374151",
        fontSize: "14px",
        transition: "0.15s",
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
  onSelect: (v: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        display: "inline-block",
        width: "100%",
        maxWidth: "max-content",
      }}
      className="dd-dropdown-wrapper"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 16px",
          borderRadius: "24px",
          border:
            activeValue !== "All" ? "1px solid #38AC57" : "1px solid #e5e7eb",
          backgroundColor: activeValue !== "All" ? "#eef7f0" : "white",
          fontSize: "14px",
          color: activeValue !== "All" ? "#2d8a46" : "#374151",
          cursor: "pointer",
          transition: "all 0.2s",
          whiteSpace: "nowrap",
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
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15)",
            zIndex: 50,
            minWidth: "180px",
            padding: "6px",
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
          {options.map((o) => (
            <DropdownItem
              key={o}
              label={o}
              isActive={activeValue === o}
              onClick={() => {
                onSelect(o);
                setIsOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const DriverDocuments = () => {
  const [activeTab, setActiveTab] = useState("Document Submissions");
  const [searchTerm, setSearchTerm] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeStat, setActiveStat] = useState("Total Applications");
  const [selectedDoc, setSelectedDoc] = useState<DocRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [banner, setBanner] = useState<{
    type: "approve" | "reject" | "success";
    msg: string;
  } | null>(null);

  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [stats, setStats] = useState({
    totalApplications: 0,
    pendingReview: 0,
    underReview: 0,
    expired: 0,
  });

  // Fetch stats from API
  useEffect(() => {
    getDriverDocumentsStatsApi()
      .then((res) => {
        if (res.ok && res.data) {
          setStats({
            totalApplications: res.data.totalApplications || 0,
            pendingReview: res.data.pendingReview || 0,
            underReview: res.data.underReview || 0,
            expired: res.data.expired || 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Fetch document list from API
  useEffect(() => {
    const statusMap: Record<string, string> = {
      Pending: "PENDING",
      "Under Review": "IN_REVIEW",
      Verified: "APPROVED",
      Rejected: "REJECTED",
      Expired: "EXPIRED",
    };
    const params: Record<string, string> = {};
    if (statusFilter !== "All" && statusMap[statusFilter])
      params.status = statusMap[statusFilter];
    if (activeTab !== "Document Submissions") params.tab = activeTab;

    getDriverDocumentsListApi(params)
      .then((res) => {
        if (res.ok && Array.isArray(res.data?.documents)) {
          setDocs(
            res.data.documents.map((document) => ({
              ...document,
              avatar: resolveApiAssetUrl(document.avatar),
            })),
          );
          return;
        }

        setDocs([]);
      })
      .catch(() => setDocs([]));
  }, [activeTab, statusFilter]);

  const totalApps = stats.totalApplications || docs.length;
  const pending =
    stats.pendingReview || docs.filter((d) => d.status === "Pending").length;
  const underReview =
    stats.underReview || docs.filter((d) => d.status === "Under Review").length;
  const expired =
    stats.expired || docs.filter((d) => d.status === "Expired").length;

  const filteredDocs = docs.filter((d) => {
    // Search filter
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      if (
        !d.driverName.toLowerCase().includes(t) &&
        !d.driverId.toLowerCase().includes(t) &&
        !d.docType.toLowerCase().includes(t)
      )
        return false;
    }

    // Stat card filter
    if (activeStat === "Pending Review" && d.status !== "Pending") return false;
    if (activeStat === "Under Review" && d.status !== "Under Review")
      return false;
    if (activeStat === "Expired" && d.status !== "Expired") return false;

    // Dropdown filters
    if (statusFilter !== "All" && d.status !== statusFilter) return false;
    if (docTypeFilter !== "All" && d.docType !== docTypeFilter) return false;

    // Tab filter
    if (activeTab === "Registration Requests") {
      if (d.status !== "Pending" && d.status !== "Under Review") return false;
    }
    if (activeTab === "Expired Documents") {
      if (d.status !== "Expired" && d.status !== "Rejected") return false;
    }
    // 'Document Submissions' shows everything (no additional filter)

    return true;
  });

  const statCards = [
    {
      key: "Total Applications",
      label: "Total Applications",
      value: String(totalApps).padStart(2, "0"),
      icon: driverDocumentsIcon,
    },
    {
      key: "Pending Review",
      label: "Pending Review",
      value: String(pending).padStart(2, "0"),
      icon: waitingCustomersIcon,
    },
    {
      key: "Under Review",
      label: "Under Review",
      value: String(underReview).padStart(2, "0"),
      icon: pendingIcon,
    },
    {
      key: "Expired",
      label: "Expired Documents",
      value: String(expired).padStart(2, "0"),
      icon: cancelledArchiveIcon,
    },
  ];

  const tabs = [
    { key: "Document Submissions", label: "Document Submissions" },
    {
      key: "Registration Requests",
      label: `Registration Requests (${pending + underReview})`,
    },
    {
      key: "Expired Documents",
      label: `Expired Documents (${expired + docs.filter((d) => d.status === "Rejected").length})`,
    },
  ];

  const docTypes = [...new Set(docs.map((d) => d.docType))];
  const allStatuses = [...new Set(docs.map((d) => d.status))];

  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: "#f9fafb",
        minHeight: "100vh",
      }}
    >
      <style>{`
                .dd-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                    margin-bottom: 32px;
                }
                .dd-flex-responsive {
                    display: flex;
                    gap: 24px;
                }
                .dd-controls-container {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                    flex-wrap: wrap;
                    margin-bottom: 24px;
                }
                .dd-table-container {
                    width: 100%;
                    overflow-x: auto;
                    border-radius: 12px;
                }
                .dd-table-header {
                    display: grid;
                    grid-template-columns: 100px 1.5fr 1.5fr 120px 120px 100px;
                    padding: 16px 24px;
                    background-color: #38AC57;
                    color: white;
                    border-radius: 12px;
                    font-weight: bold;
                    font-size: 14px;
                    margin-bottom: 16px;
                    min-width: 900px;
                }
                .dd-table-row {
                    display: grid;
                    grid-template-columns: 100px 1.5fr 1.5fr 120px 120px 100px;
                    padding: 16px 24px;
                    background-color: white;
                    border-radius: 16px;
                    align-items: center;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                    margin-bottom: 12px;
                    min-width: 900px;
                    transition: all 0.2s;
                }
                
                @media (max-width: 1024px) {
                    .dd-stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                
                @media (max-width: 768px) {
                    .dd-stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 12px;
                    }
                    .dd-flex-responsive {
                        flex-direction: column;
                        align-items: stretch;
                        text-align: center;
                    }
                    .dd-controls-container {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .dd-controls-container > div {
                        width: 100% !important;
                        max-width: none !important;
                    }
                    .dd-controls-container button {
                        width: 100%;
                        justify-content: space-between;
                    }
                    .dd-tabs-container {
                        flex-wrap: wrap;
                        border-radius: 16px !important;
                    }
                    .dd-tabs-container button {
                        min-width: 120px;
                        font-size: 12px !important;
                    }
                    .dd-dropdown-wrapper {
                        max-width: none !important;
                    }
                }
                
                @media (max-width: 480px) {
                    .dd-stats-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>

      {/* Banner */}
      {banner && (
        <div
          style={{
            backgroundColor:
              banner.type === "approve" || banner.type === "success"
                ? "#eef7f0"
                : "#fef2f2",
            border: `1px solid ${banner.type === "approve" || banner.type === "success" ? "#eef7f0" : "#fecaca"}`,
            borderRadius: "12px",
            padding: "14px 24px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            animation: "slideDown 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{
                backgroundColor:
                  banner.type === "approve" || banner.type === "success"
                    ? "#38AC57"
                    : "#dc2626",
                color: "white",
                padding: "4px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "700",
              }}
            >
              {banner.type === "approve"
                ? "✓ Approved"
                : banner.type === "success"
                  ? "✓ Success"
                  : "✗ Rejected"}
            </span>
            <span style={{ fontSize: "14px", color: "#374151" }}>
              {banner.msg}
            </span>
          </div>
          <button
            onClick={() => setBanner(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "18px",
              color: "#6b7280",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="dd-stats-grid">
        {statCards.map((stat) => {
          const isActive = activeStat === stat.key;
          return (
            <div
              key={stat.key}
              onClick={() =>
                setActiveStat(isActive ? "Total Applications" : stat.key)
              }
              style={{
                backgroundColor: isActive ? "#38AC57" : "white",
                color: isActive ? "white" : "#111827",
                padding: "24px",
                borderRadius: "24px",
                position: "relative",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: isActive
                  ? "0 10px 15px -3px rgba(56, 172, 87, 0.4)"
                  : "0 1px 3px rgba(0,0,0,0.06)",
                border: "2px solid transparent",
                transform: isActive ? "translateY(-2px)" : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                  justifyContent: "inherit",
                }}
              >
                <div style={{ padding: "0px", borderRadius: "8px" }}>
                  <img
                    src={stat.icon}
                    alt=""
                    style={{
                      width: "32px",
                      height: "32px",
                      objectFit: "contain",
                      filter: isActive ? "brightness(0) invert(1)" : "none",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontWeight: "600",
                    fontSize: "14px",
                    color: isActive ? "white" : "#6b7280",
                  }}
                >
                  {stat.label}
                </span>
              </div>
              <div style={{ fontSize: "40px", fontWeight: "bold" }}>
                {stat.value}
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: "24px",
                  right: "24px",
                  backgroundColor: isActive ? "white" : "#38AC57",
                  color: isActive ? "#38AC57" : "white",
                  borderRadius: "50%",
                  padding: "6px",
                }}
              >
                <ArrowUpRight size={16} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Title + Add Button */}
      <div
        className="dd-flex-responsive"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: 0 }}>
            Driver Documents
          </h1>
          <p
            style={{ color: "#6b7280", margin: "4px 0 0 0", fontSize: "14px" }}
          >
            Review and manage driver document submissions and registration
            requests with Moroccan documentation standards
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
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
            whiteSpace: "nowrap",
            justifyContent: "center",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#2d8a46")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#38AC57")
          }
        >
          <Plus size={18} /> Add New Drivers
        </button>
      </div>

      {/* Tabs */}
      <div
        className="dd-tabs-container"
        style={{
          display: "flex",
          backgroundColor: "#f3f4f6",
          borderRadius: "32px",
          padding: "4px",
          marginBottom: "24px",
          marginTop: "20px",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "28px",
              border: "none",
              backgroundColor:
                activeTab === tab.key ? "#38AC57" : "transparent",
              color: activeTab === tab.key ? "white" : "#6b7280",
              fontWeight: "600",
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="dd-controls-container">
        <div style={{ position: "relative", flex: 1, maxWidth: "300px" }}>
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
          label="Document Type"
          options={docTypes}
          activeValue={docTypeFilter}
          onSelect={setDocTypeFilter}
        />
        <Dropdown
          label="Status"
          options={allStatuses}
          activeValue={statusFilter}
          onSelect={setStatusFilter}
        />
      </div>

      {/* Table */}
      <div className="dd-table-container">
        <div className="dd-table-header">
          <div>Driver ID</div>
          <div>Driver Name</div>
          <div>Document Type</div>
          <div>Upload Date</div>
          <div style={{ textAlign: "center" }}>Status</div>
          <div style={{ textAlign: "center" }}>Action</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            minWidth: "900px",
          }}
        >
          {filteredDocs.length === 0 ? (
            <div
              style={{
                backgroundColor: "white",
                padding: "48px",
                borderRadius: "16px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>📄</div>
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  margin: "0 0 8px 0",
                }}
              >
                No documents found
              </h3>
              <p style={{ color: "#6b7280", margin: 0 }}>
                Try adjusting your filters
              </p>
            </div>
          ) : (
            filteredDocs.map((doc, idx) => {
              const sc = statusColors[doc.status] || statusColors["Pending"];
              return (
                <div key={idx} className="dd-table-row">
                  <div style={{ fontWeight: "600", fontSize: "14px" }}>
                    {doc.driverId}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <UserAvatar
                      src={doc.avatar}
                      name={doc.driverName}
                      size={36}
                      rating={4.8}
                      showBadge={true}
                    />
                    <div>
                      <div style={{ fontWeight: "600", fontSize: "14px" }}>
                        {doc.driverName}
                      </div>
                      <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                        Casablanca-Settat
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: "13px", color: "#374151" }}>
                    {doc.docType}
                  </div>
                  <div style={{ fontSize: "13px", color: "#6b7280" }}>
                    {doc.uploadDate}
                  </div>
                  <div style={{ textAlign: "center" }}>
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
                      {doc.status}
                    </span>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <button
                      onClick={() => setSelectedDoc(doc)}
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

      {/* Application Review Modal */}
      {selectedDoc && (
        <ApplicationReviewModal
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onApprove={() => {
            setSelectedDoc(null);
            setBanner({
              type: "approve",
              msg: "Application has been approved successfully.",
            });
            setTimeout(() => setBanner(null), 5000);
          }}
          onReject={() => {
            setSelectedDoc(null);
            setBanner({
              type: "reject",
              msg: "Application has been rejected.",
            });
            setTimeout(() => setBanner(null), 5000);
          }}
        />
      )}

      {/* Add New Driver Modal */}
      {showAddModal && (
        <AddNewDriverModal
          onClose={() => setShowAddModal(false)}
          onAdd={(newDriver) => {
            setBanner({
              type: "success",
              msg: `Driver ${newDriver.name} has been added successfully!`,
            });
            setTimeout(() => setBanner(null), 5000);
          }}
        />
      )}
    </div>
  );
};
