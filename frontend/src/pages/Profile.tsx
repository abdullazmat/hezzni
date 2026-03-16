import { useState, useEffect, useRef } from "react";
import {
  Camera,
  LogOut,
  Eye,
  EyeOff,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import { UserAvatar } from "../components/UserAvatar";
import { PageLoader } from "../components/PageLoader";
import {
  AdminProfile,
  EmploymentDetails,
  getProfileApi,
  getEmploymentDetailsApi,
  getPrivacyPolicyApi,
  getTeamMembersApi,
  getTermsOfServiceApi,
  TeamMember,
  updateAdminLanguageApi,
  updateProfileApi,
  updateAdminStatusApi,
  updateEmploymentDetailsApi,
  profileChangePasswordApi,
  resolveApiUrl,
} from "../services/api";

export const Profile = ({ onLogout }: { onLogout?: () => void }) => {
  const [activeTab, setActiveTab] = useState("edit-profile");
  const [profile, setProfile] = useState<AdminProfile | null>(() => {
    const savedUser = localStorage.getItem("user");
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!profile);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await getProfileApi();
      if (response.ok) {
        setProfile(response.data);
        localStorage.setItem("user", JSON.stringify(response.data));
        window.dispatchEvent(new Event("userUpdated"));
      }
    } catch (err) {
      console.error("Failed to fetch profile", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusSelect = async (newStatus: "Available" | "Inactive") => {
    if (!profile || statusLoading || newStatus === profile.status) {
      setShowStatusDropdown(false);
      return;
    }

    setStatusLoading(true);
    setShowStatusDropdown(false);
    try {
      const response = await updateAdminStatusApi(newStatus);
      if (response.ok) {
        const updatedProfile = { ...profile, status: newStatus };
        setProfile(updatedProfile);
        localStorage.setItem("user", JSON.stringify(updatedProfile));
        window.dispatchEvent(new Event("userUpdated"));
      }
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    const formData = new FormData();
    formData.append("avatar", file);
    formData.append("name", profile.name);
    formData.append("email", profile.email);
    formData.append("role", profile.role);

    try {
      const response = await updateProfileApi(formData);
      if (response.ok) {
        // Refresh profile to get new avatar URL and update localStorage
        await fetchData();
        window.dispatchEvent(new Event("userUpdated"));
      }
    } catch (err) {
      console.error("Failed to update avatar", err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <style>{`
          @keyframes shimmer {
            0% { background-position: -600px 0; }
            100% { background-position: 600px 0; }
          }
          @keyframes spin-ring {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .skeleton {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%);
            background-size: 600px 100%;
            animation: shimmer 1.4s ease infinite;
            border-radius: 0.75rem;
          }
        `}</style>
        {/* Cover skeleton */}
        <div
          className="skeleton"
          style={{ height: "200px", borderRadius: "1rem" }}
        ></div>
        {/* Avatar + name skeleton */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "2rem",
            padding: "0 2rem",
            marginTop: "-5rem",
          }}
        >
          <div
            className="skeleton"
            style={{
              width: "160px",
              height: "160px",
              borderRadius: "50%",
              flexShrink: 0,
              border: "4px solid white",
            }}
          ></div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              paddingBottom: "0.5rem",
              flex: 1,
            }}
          >
            <div
              className="skeleton"
              style={{ height: "2.5rem", width: "220px" }}
            ></div>
            <div
              className="skeleton"
              style={{ height: "2rem", width: "130px", borderRadius: "2rem" }}
            ></div>
          </div>
        </div>
        {/* Tabs skeleton */}
        <div style={{ padding: "0 2rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {[130, 170, 155, 120, 130, 150].map((w, i) => (
              <div
                key={i}
                className="skeleton"
                style={{
                  height: "2.75rem",
                  width: `${w}px`,
                  borderRadius: "2rem",
                }}
              ></div>
            ))}
          </div>
        </div>
        {/* Form skeleton */}
        <div
          style={{
            padding: "0 2rem",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.75rem 2.5rem",
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div
                className="skeleton"
                style={{
                  height: "0.9rem",
                  width: "100px",
                  marginBottom: "0.6rem",
                }}
              ></div>
              <div className="skeleton" style={{ height: "3rem" }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const avatarUrl = profile?.avatar
    ? resolveApiUrl(`/uploads/avatars/${profile.avatar}`)
    : undefined;

  const tabs = [
    { id: "login-history", label: "Login History" },
    { id: "language-timezone", label: "Language & Timezone" },
    { id: "change-password", label: "Change Password" },
    { id: "edit-profile", label: "Edit Profile" },
    { id: "privacy-policy", label: "Privacy Policy" },
    { id: "terms-of-service", label: "Terms of Service" },
  ];

  return (
    <div
      className="profile-page-container"
      style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media (max-width: 1024px) {
           .profile-header-content {
             flex-direction: column !important;
             align-items: center !important;
             text-align: center;
             margin-top: 0 !important;
             padding-top: 2rem !important;
             gap: 1.5rem !important;
           }
           .profile-info-main {
             flex-direction: column !important;
             gap: 1.5rem !important;
             margin-top: -5rem !important;
           }
           .profile-name-status {
             margin-top: 0 !important;
             text-align: center;
           }
           .logout-btn-wrapper {
             margin-top: 1rem !important;
             width: 100%;
             display: flex;
             justify-content: center;
             padding-bottom: 2rem !important;
           }
           .profile-tabs-wrapper {
             padding: 0 1rem !important;
           }
           .profile-content-wrapper {
             padding: 0 1rem 2rem 1rem !important;
           }
        }
        @media (max-width: 640px) {
           .profile-img-header {
             width: 44px !important;
             height: 44px !important;
           }
           .profile-name-status h1 {
             font-size: 1.75rem !important;
           }
           .profile-tabs-container {
             border-radius: 1.5rem !important;
             padding: 0.35rem !important;
           }
           .profile-tabs-container button {
             padding: 0.6rem 1.25rem !important;
             font-size: 0.85rem !important;
           }
           .edit-profile-grid {
             grid-template-columns: 1fr !important;
             gap: 1.25rem !important;
           }
           .location-timezone-flex {
             flex-direction: column !important;
           }
           .location-input-wrapper, .timezone-input-wrapper {
             flex: 1 !important;
             width: 100% !important;
             min-width: 0 !important;
           }
           .profile-header-outer {
             padding: 0 1rem !important;
           }
           .profile-cover {
             height: 150px !important;
           }
        }
      `,
        }}
      />

      {/* Header Profile Section */}
      <div
        className="card"
        style={{
          padding: 0,
          overflow: "visible",
          position: "relative",
          border: "none",
          boxShadow: "none",
          backgroundColor: "transparent",
        }}
      >
        {/* Cover Image */}
        <div
          className="profile-cover"
          style={{
            height: "200px",
            backgroundColor: "#38AC57",
            width: "100%",
            borderRadius: "1rem",
          }}
        ></div>

        <div
          className="profile-header-outer"
          style={{ padding: "0 2rem", position: "relative" }}
        >
          <div
            className="profile-header-content"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "-4rem",
            }}
          >
            <div
              className="profile-info-main"
              style={{ display: "flex", alignItems: "center", gap: "2rem" }}
            >
              {/* Profile Image with Camera Icon */}
              <div
                style={{ position: "relative", cursor: "pointer" }}
                onClick={handleAvatarClick}
              >
                <UserAvatar
                  src={avatarUrl}
                  name={profile?.name}
                  size={160}
                  showBadge={false}
                  className="profile-img"
                />
                <style>{`
                            .profile-img {
                                border: 4px solid white !important;
                                border-radius: 50%;
                                overflow: visible !important;
                            }
                            .profile-img img {
                                border: none !important;
                            }
                        `}</style>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                  accept="image/*"
                />
                <button
                  onClick={handleAvatarClick}
                  style={{
                    position: "absolute",
                    bottom: "10px",
                    right: "10px",
                    backgroundColor: "white",
                    borderRadius: "50%",
                    padding: "0.6rem",
                    border: "1px solid #e5e7eb",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                >
                  <Camera size={20} />
                </button>
              </div>

              {/* Name and Status */}
              <div
                className="profile-name-status"
                style={{
                  marginTop: "5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                }}
              >
                <h1
                  style={{
                    fontSize: "2.5rem",
                    fontWeight: "900",
                    margin: 0,
                    color: "#111827",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {profile?.name || "Admin User"}
                </h1>
                <div style={{ position: "relative" }} ref={statusDropdownRef}>
                  <div
                    onClick={() =>
                      !statusLoading &&
                      setShowStatusDropdown(!showStatusDropdown)
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      backgroundColor:
                        (profile?.status || "Available") === "Available"
                          ? "#eef7f0"
                          : "#fef2f2",
                      padding: "0.5rem 1.25rem",
                      borderRadius: "2rem",
                      width: "fit-content",
                      cursor: statusLoading ? "not-allowed" : "pointer",
                      border: "1px solid transparent",
                      margin: "0",
                      opacity: statusLoading ? 0.7 : 1,
                      transition: "all 0.2s",
                      userSelect: "none",
                    }}
                  >
                    <span
                      style={{
                        height: "12px",
                        width: "12px",
                        backgroundColor:
                          (profile?.status || "Available") === "Available"
                            ? "#38AC57"
                            : "#dc2626",
                        borderRadius: "50%",
                        boxShadow: `0 0 0 4px ${(profile?.status || "Available") === "Available" ? "rgba(56, 172, 87, 0.1)" : "rgba(220, 38, 38, 0.1)"}`,
                      }}
                    ></span>
                    <span
                      style={{
                        color: "#4b5563",
                        fontSize: "1.1rem",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                      }}
                    >
                      {profile?.status || "Available"}
                      <ChevronDown
                        size={18}
                        style={{
                          color: "#64748b",
                          transition: "transform 0.2s",
                          transform: showStatusDropdown
                            ? "rotate(180deg)"
                            : "rotate(0)",
                        }}
                      />
                    </span>
                  </div>

                  {/* Status Dropdown */}
                  {showStatusDropdown && (
                    <div
                      style={{
                        position: "absolute",
                        top: "110%",
                        left: 0,
                        width: "180px",
                        backgroundColor: "white",
                        borderRadius: "1rem",
                        padding: "0.5rem",
                        boxShadow:
                          "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                        zIndex: 100,
                        border: "1px solid #f1f5f9",
                      }}
                    >
                      {[
                        { id: "Available" as const, color: "#38AC57" },
                        { id: "Inactive" as const, color: "#dc2626" },
                      ].map((statusOption) => (
                        <button
                          key={statusOption.id}
                          onClick={() => handleStatusSelect(statusOption.id)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            padding: "0.75rem 1rem",
                            borderRadius: "0.75rem",
                            border: "none",
                            backgroundColor:
                              profile?.status === statusOption.id
                                ? "#f8fafc"
                                : "transparent",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            textAlign: "left",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "#f1f5f9")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              profile?.status === statusOption.id
                                ? "#f8fafc"
                                : "transparent")
                          }
                        >
                          <span
                            style={{
                              height: "10px",
                              width: "10px",
                              backgroundColor: statusOption.color,
                              borderRadius: "50%",
                            }}
                          ></span>
                          <span
                            style={{
                              fontWeight: "700",
                              fontSize: "0.95rem",
                              color:
                                profile?.status === statusOption.id
                                  ? "#111827"
                                  : "#64748b",
                            }}
                          >
                            {statusOption.id}
                          </span>
                          {profile?.status === statusOption.id && (
                            <div
                              style={{
                                marginLeft: "auto",
                                color: "#38AC57",
                                fontWeight: "900",
                                fontSize: "0.8rem",
                              }}
                            >
                              ✓
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="logout-btn-wrapper" style={{ marginTop: "4rem" }}>
              <button
                onClick={onLogout}
                className="profile-logout-btn"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.7rem 1.8rem",
                  borderRadius: "2.5rem",
                  border: "1px solid #e5e7eb",
                  backgroundColor: "white",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontSize: "1rem",
                  color: "#374151",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#38AC57",
                    color: "white",
                    borderRadius: "50%",
                    padding: "5px",
                    display: "flex",
                  }}
                >
                  <LogOut size={16} strokeWidth={3} />
                </div>
                Log Out
              </button>
              <style>{`
                        .profile-logout-btn:hover {
                            background-color: #f9fafb !important;
                            border-color: #d1d5db !important;
                        }
                    `}</style>
            </div>
          </div>
        </div>
      </div>

      <hr
        style={{
          border: "none",
          borderTop: "1px solid #e5e7eb",
          margin: "0 2rem",
        }}
      />

      {/* Tabs Container */}
      <div className="profile-tabs-wrapper" style={{ padding: "0 2rem" }}>
        <div
          className="profile-tabs-container card"
          style={{
            display: "flex",
            gap: "0.25rem",
            padding: "0.4rem",
            overflowX: "auto",
            borderRadius: "3rem",
            backgroundColor: "white",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
            border: "1px solid #f1f5f9",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? "#38AC57" : "transparent",
                color: activeTab === tab.id ? "white" : "#64748b",
                border: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "2.5rem",
                cursor: "pointer",
                fontWeight: "700",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
                fontSize: "0.925rem",
                flexShrink: 0,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <style>{`
            .profile-tabs-container::-webkit-scrollbar {
                display: none;
            }
          `}</style>
      </div>

      {/* Tab Content */}
      <div
        className="profile-content-wrapper"
        style={{ padding: "0 2rem 2rem 2rem" }}
      >
        {activeTab === "edit-profile" && (
          <EditProfileForm
            initialProfile={profile}
            onUpdate={() => fetchData()}
          />
        )}
        {activeTab === "change-password" && <ChangePasswordForm />}
        {activeTab === "login-history" && <TeamManagement />}
        {activeTab === "language-timezone" && (
          <LanguageTimezone
            initialLanguage={profile?.language}
            onUpdate={fetchData}
          />
        )}
        {activeTab === "privacy-policy" && <PolicyContent type="privacy" />}
        {activeTab === "terms-of-service" && <PolicyContent type="terms" />}
      </div>
    </div>
  );
};

const EditProfileForm = ({
  initialProfile,
  onUpdate,
}: {
  initialProfile: AdminProfile | null;
  onUpdate: () => void;
}) => {
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [empDetails, setEmpDetails] = useState<EmploymentDetails | null>(null);
  const [empLoading, setEmpLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: initialProfile?.name || "",
    email: initialProfile?.email || "",
    role: initialProfile?.role || "Admin",
  });

  useEffect(() => {
    fetchEmploymentDetails();
  }, []);

  const fetchEmploymentDetails = async () => {
    setEmpLoading(true);
    try {
      const response = await getEmploymentDetailsApi();
      if (response.ok) {
        setEmpDetails(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch employment details", err);
    } finally {
      setEmpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Update basic profile
      const profileFormData = new FormData();
      profileFormData.append("name", formData.name);
      profileFormData.append("email", formData.email);
      profileFormData.append("role", formData.role);

      const pResponse = await updateProfileApi(profileFormData);

      // Update employment details
      if (empDetails) {
        await updateEmploymentDetailsApi(empDetails);
      }

      if (pResponse.ok) {
        // Update local storage with new profile info
        const updatedUser = { ...initialProfile, ...formData };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        window.dispatchEvent(new Event("userUpdated"));

        setShowToast(true);
        onUpdate();
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err) {
      console.error("Failed to update profile", err);
    } finally {
      setLoading(false);
    }
  };

  if (empLoading) {
    return (
      <div style={{ paddingTop: "2rem" }}>
        <style>{`
                    @keyframes shimmer {
                        0% { background-position: -600px 0; }
                        100% { background-position: 600px 0; }
                    }
                    .skeleton { background: linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 37%,#f0f0f0 63%); background-size:600px 100%; animation:shimmer 1.4s ease infinite; border-radius:0.75rem; }
                `}</style>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.75rem 2.5rem",
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div
                className="skeleton"
                style={{
                  height: "0.9rem",
                  width: "110px",
                  marginBottom: "0.6rem",
                }}
              ></div>
              <div className="skeleton" style={{ height: "2.9rem" }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ position: "relative", paddingTop: "1.5rem" }}
    >
      <style>{`
                .ep-input:focus {
                    border-color: #38AC57 !important;
                    background-color: white !important;
                }
            `}</style>

      <div
        className="edit-profile-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.75rem 2.5rem",
        }}
      >
        {/* Full Name */}
        <div>
          <label
            style={{
              display: "block",
              fontWeight: "700",
              marginBottom: "0.6rem",
              fontSize: "0.9rem",
              color: "#111827",
            }}
          >
            Full Name
          </label>
          <input
            className="ep-input"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={inputStyle}
          />
        </div>

        {/* Department */}
        <div>
          <label
            style={{
              display: "block",
              fontWeight: "700",
              marginBottom: "0.6rem",
              fontSize: "0.9rem",
              color: "#111827",
            }}
          >
            Department
          </label>
          <input
            className="ep-input"
            type="text"
            value={empDetails?.department || ""}
            onChange={(e) =>
              setEmpDetails(
                empDetails
                  ? { ...empDetails, department: e.target.value }
                  : null,
              )
            }
            style={inputStyle}
          />
        </div>

        {/* Direct Manager */}
        <div>
          <label
            style={{
              display: "block",
              fontWeight: "700",
              marginBottom: "0.6rem",
              fontSize: "0.9rem",
              color: "#111827",
            }}
          >
            Direct Manager
          </label>
          <input
            className="ep-input"
            type="text"
            value={empDetails?.manager || ""}
            onChange={(e) =>
              setEmpDetails(
                empDetails ? { ...empDetails, manager: e.target.value } : null,
              )
            }
            style={inputStyle}
          />
        </div>

        {/* Employee ID */}
        <div>
          <label
            style={{
              display: "block",
              fontWeight: "700",
              marginBottom: "0.6rem",
              fontSize: "0.9rem",
              color: "#111827",
            }}
          >
            Employee ID
          </label>
          <input
            type="text"
            value={`ID-${initialProfile?.id || "01"}`}
            readOnly
            style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }}
          />
        </div>

        {/* Job Title */}
        <div>
          <label
            style={{
              display: "block",
              fontWeight: "700",
              marginBottom: "0.6rem",
              fontSize: "0.9rem",
              color: "#111827",
            }}
          >
            Job Title
          </label>
          <input
            className="ep-input"
            type="text"
            value={empDetails?.jobTitle || ""}
            onChange={(e) =>
              setEmpDetails(
                empDetails ? { ...empDetails, jobTitle: e.target.value } : null,
              )
            }
            style={inputStyle}
          />
        </div>

        {/* Email */}
        <div>
          <label
            style={{
              display: "block",
              fontWeight: "700",
              marginBottom: "0.6rem",
              fontSize: "0.9rem",
              color: "#111827",
            }}
          >
            Email
          </label>
          <input
            className="ep-input"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            style={inputStyle}
          />
        </div>

        {/* Location & Time Zone — left column, contains two sub-inputs */}
        <div>
          <label
            style={{
              display: "block",
              fontWeight: "700",
              marginBottom: "0.6rem",
              fontSize: "0.9rem",
              color: "#111827",
            }}
          >
            Location &amp; Time Zone
          </label>
          <div
            className="location-timezone-flex"
            style={{ display: "flex", gap: "0.75rem" }}
          >
            <div
              className="location-input-wrapper"
              style={{ flex: "1.5", minWidth: 0 }}
            >
              <input
                className="ep-input location-ip"
                type="text"
                placeholder="Location"
                value={empDetails?.location || ""}
                onChange={(e) =>
                  setEmpDetails(
                    empDetails
                      ? { ...empDetails, location: e.target.value }
                      : null,
                  )
                }
                style={{ ...inputStyle, width: "100%" }}
              />
            </div>
            <div
              className="timezone-input-wrapper"
              style={{ flex: "1", minWidth: 0 }}
            >
              <TimezoneSelect
                value={empDetails?.timezone || ""}
                onChange={(val) =>
                  setEmpDetails(
                    empDetails ? { ...empDetails, timezone: val } : null,
                  )
                }
              />
            </div>
          </div>
        </div>

        {/* Phone No — right column */}
        <div>
          <label
            style={{
              display: "block",
              fontWeight: "700",
              marginBottom: "0.6rem",
              fontSize: "0.9rem",
              color: "#111827",
            }}
          >
            Phone No
          </label>
          <PhoneInput
            value={empDetails?.phone || ""}
            onChange={(val) =>
              setEmpDetails(empDetails ? { ...empDetails, phone: val } : null)
            }
          />
        </div>

        {/* Onboarding Date — left column only */}
        <div>
          <label
            style={{
              display: "block",
              fontWeight: "700",
              marginBottom: "0.6rem",
              fontSize: "0.9rem",
              color: "#111827",
            }}
          >
            On Boarding Date
          </label>
          <input
            className="ep-input"
            type="date"
            value={
              empDetails?.onboardingDate
                ? new Date(empDetails.onboardingDate)
                    .toISOString()
                    .split("T")[0]
                : ""
            }
            onChange={(e) =>
              setEmpDetails(
                empDetails
                  ? { ...empDetails, onboardingDate: e.target.value }
                  : null,
              )
            }
            style={inputStyle}
          />
        </div>
      </div>

      {/* Submit button */}
      <div style={{ marginTop: "2rem" }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: "#38AC57",
            color: "white",
            border: "none",
            padding: "0.85rem 2.5rem",
            borderRadius: "2.5rem",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "700",
            fontSize: "1rem",
            opacity: loading ? 0.7 : 1,
            transition: "all 0.2s",
            boxShadow: "0 4px 12px rgba(56, 172, 87, 0.25)",
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = "#2e8a46";
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = "#38AC57";
          }}
        >
          {loading ? "Updating..." : "Edit Profile"}
        </button>
      </div>

      {/* Success Toast */}
      {showToast && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            backgroundColor: "#38AC57",
            color: "white",
            padding: "1rem 2rem",
            borderRadius: "1rem",
            boxShadow: "0 10px 25px rgba(56,172,87,0.3)",
            fontWeight: "700",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <CheckCircle size={20} />
          Profile updated successfully!
        </div>
      )}
    </form>
  );
};

const ChangePasswordForm = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorType, setErrorType] = useState<"none" | "incorrect" | "mismatch">(
    "none",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorType("none");
    setErrorMessage("");

    // Client-side validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorType("mismatch");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const result = await profileChangePasswordApi({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (!result.ok) {
        const msg = result.data?.message || "Failed to change password.";
        // Check if server says current password is wrong
        if (
          result.status === 401 ||
          msg.toLowerCase().includes("current") ||
          msg.toLowerCase().includes("incorrect")
        ) {
          setErrorType("incorrect");
        } else {
          setErrorMessage(msg);
        }
        return;
      }

      // Success
      setShowSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: "600px",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        position: "relative",
      }}
    >
      {errorMessage && (
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "0.75rem",
            padding: "1rem",
            color: "#dc2626",
            fontSize: "0.875rem",
            fontWeight: "500",
          }}
        >
          {errorMessage}
        </div>
      )}

      <div style={{ marginBottom: "0.5rem" }}>
        <h3
          style={{
            margin: "0 0 0.75rem 0",
            fontSize: "1rem",
            fontWeight: "800",
            color: "#111827",
          }}
        >
          Current Password
        </h3>
        <div style={{ position: "relative" }}>
          <input
            type={showCurrent ? "text" : "password"}
            placeholder="Enter Your Current Password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              errorType === "incorrect" && setErrorType("none");
            }}
            style={{
              ...inputStyle,
              borderRadius: "1rem",
              border:
                errorType === "incorrect"
                  ? "1px solid #ef4444"
                  : "1px solid #e5e7eb",
              backgroundColor: "white",
              padding: "1.25rem",
            }}
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            style={{
              position: "absolute",
              right: "1.25rem",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <Eye size={20} color="#94a3b8" />
          </button>
        </div>
        {errorType === "incorrect" && (
          <div
            style={{
              color: "#ef4444",
              fontSize: "0.85rem",
              marginTop: "0.5rem",
              fontWeight: "600",
            }}
          >
            Current password is incorrect. Please try again
          </div>
        )}
      </div>

      <div>
        <h3
          style={{
            margin: "0 0 0.75rem 0",
            fontSize: "1rem",
            fontWeight: "800",
            color: "#111827",
          }}
        >
          New Password
        </h3>
        <div style={{ position: "relative" }}>
          <input
            type={showNew ? "text" : "password"}
            placeholder="Enter Your New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{
              ...inputStyle,
              borderRadius: "1rem",
              border: "1px solid #111827",
              backgroundColor: "white",
              padding: "1.25rem",
            }}
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            style={{
              position: "absolute",
              right: "1.25rem",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            {showNew ? (
              <Eye size={20} color="#94a3b8" />
            ) : (
              <EyeOff size={20} color="#94a3b8" />
            )}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <h3
          style={{
            margin: "0 0 0.75rem 0",
            fontSize: "1rem",
            fontWeight: "800",
            color: "#111827",
          }}
        >
          Confirm Password
        </h3>
        <div style={{ position: "relative" }}>
          <input
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm Your New Password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              errorType === "mismatch" && setErrorType("none");
            }}
            style={{
              ...inputStyle,
              borderRadius: "1rem",
              border:
                errorType === "mismatch"
                  ? "1px solid #ef4444"
                  : "1px solid #e5e7eb",
              backgroundColor: "white",
              padding: "1.25rem",
            }}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            style={{
              position: "absolute",
              right: "1.25rem",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            {showConfirm ? (
              <Eye size={20} color="#94a3b8" />
            ) : (
              <EyeOff size={20} color="#94a3b8" />
            )}
          </button>
        </div>
        {errorType === "mismatch" && (
          <div
            style={{
              color: "#ef4444",
              fontSize: "0.85rem",
              marginTop: "0.5rem",
              fontWeight: "600",
            }}
          >
            New passwords do not match
          </div>
        )}
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button
          type="submit"
          disabled={isLoading}
          style={{
            backgroundColor: "#38AC57",
            color: "white",
            border: "none",
            padding: "1rem 2.5rem",
            borderRadius: "2.5rem",
            cursor: isLoading ? "not-allowed" : "pointer",
            fontWeight: "700",
            fontSize: "1rem",
            opacity: isLoading ? 0.7 : 1,
            transition: "all 0.2s",
            width: "fit-content",
            minWidth: "200px",
          }}
        >
          {isLoading ? "Updating..." : "Update Password"}
        </button>
      </div>

      {/* Success Toast */}
      {showSuccess && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            backgroundColor: "white",
            color: "#374151",
            padding: "1rem 2rem",
            borderRadius: "3rem",
            boxShadow:
              "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            display: "flex",
            alignItems: "center",
            gap: "0.8rem",
            border: "1px solid #e5e7eb",
            zIndex: 1000,
            animation: "slideIn 0.3s ease-out",
          }}
        >
          <div
            style={{
              backgroundColor: "black",
              borderRadius: "50%",
              padding: "2px",
              display: "flex",
            }}
          >
            <CheckCircle size={16} color="white" />
          </div>
          <span style={{ fontWeight: "500" }}>
            Password changed successfully
          </span>
        </div>
      )}
    </form>
  );
};

const TeamManagement = () => {
  const [teamData, setTeamData] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const response = await getTeamMembersApi();
        if (response.ok) {
          setTeamData(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch team members", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, []);

  if (loading) return <PageLoader label="Loading team members..." />;

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>
          Team Management
        </h3>
        <p
          style={{
            margin: "0.2rem 0 0 0",
            color: "#64748b",
            fontSize: "0.9rem",
          }}
        >
          View and manage your team members
        </p>
      </div>

      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: "0 0.8rem",
            minWidth: "800px",
          }}
        >
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
                  padding: "1.25rem",
                  borderTopLeftRadius: "1rem",
                  borderBottomLeftRadius: "1rem",
                  fontWeight: "800",
                  fontSize: "0.9rem",
                }}
              >
                ID
              </th>
              <th
                style={{
                  padding: "1.25rem",
                  fontWeight: "800",
                  fontSize: "0.9rem",
                }}
              >
                Member
              </th>
              <th
                style={{
                  padding: "1.25rem",
                  fontWeight: "800",
                  fontSize: "0.9rem",
                }}
              >
                Role
              </th>
              <th
                style={{
                  padding: "1.25rem",
                  fontWeight: "800",
                  fontSize: "0.9rem",
                }}
              >
                Status
              </th>
              <th
                style={{
                  padding: "1.25rem",
                  fontWeight: "800",
                  fontSize: "0.9rem",
                }}
              >
                Last Login
              </th>
              <th
                style={{
                  padding: "1.25rem",
                  borderTopRightRadius: "1rem",
                  borderBottomRightRadius: "1rem",
                  fontWeight: "800",
                  fontSize: "0.9rem",
                }}
              >
                Last Logout
              </th>
            </tr>
          </thead>
          <tbody>
            {teamData.map((row) => (
              <tr
                key={row.id}
                style={{
                  backgroundColor: "white",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                }}
              >
                <td
                  style={{
                    padding: "1.25rem",
                    borderTopLeftRadius: "1rem",
                    borderBottomLeftRadius: "1rem",
                    fontWeight: "800",
                    fontSize: "0.85rem",
                    color: "#64748b",
                  }}
                >
                  #{row.id}
                </td>
                <td style={{ padding: "1.25rem" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.8rem",
                    }}
                  >
                    <UserAvatar
                      src={
                        row.avatar
                          ? resolveApiUrl(`/uploads/avatars/${row.avatar}`)
                          : undefined
                      }
                      name={row.name}
                      size={40}
                      showBadge={true}
                    />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span
                        style={{
                          fontWeight: "800",
                          fontSize: "0.95rem",
                          color: "#111827",
                        }}
                      >
                        {row.name}
                      </span>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "#64748b",
                          fontWeight: "500",
                        }}
                      >
                        {row.email}
                      </span>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "1.25rem" }}>
                  <span
                    style={{
                      backgroundColor: "#eef7f0",
                      color: "#38AC57",
                      padding: "0.4rem 1rem",
                      borderRadius: "2rem",
                      fontSize: "0.8rem",
                      fontWeight: "800",
                      textTransform: "uppercase",
                    }}
                  >
                    {row.role}
                  </span>
                </td>
                <td style={{ padding: "1.25rem" }}>
                  <span
                    style={{
                      backgroundColor:
                        row.status === "Available" ? "#eef7f0" : "#fef2f2",
                      color: row.status === "Available" ? "#38AC57" : "#dc2626",
                      padding: "0.4rem 1rem",
                      borderRadius: "2rem",
                      fontSize: "0.8rem",
                      fontWeight: "800",
                      textTransform: "uppercase",
                    }}
                  >
                    {row.status}
                  </span>
                </td>
                <td style={{ padding: "1.25rem" }}>
                  {row.last_login ? (
                    <div
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: "700",
                        color: "#374151",
                      }}
                    >
                      <div>{new Date(row.last_login).toLocaleDateString()}</div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#64748b",
                          fontWeight: "500",
                        }}
                      >
                        {new Date(row.last_login).toLocaleTimeString()}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
                      Never
                    </span>
                  )}
                </td>
                <td
                  style={{
                    padding: "1.25rem",
                    borderTopRightRadius: "1rem",
                    borderBottomRightRadius: "1rem",
                  }}
                >
                  {row.last_logout ? (
                    <div
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: "700",
                        color: "#374151",
                      }}
                    >
                      <div>
                        {new Date(row.last_logout).toLocaleDateString()}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#64748b",
                          fontWeight: "500",
                        }}
                      >
                        {new Date(row.last_logout).toLocaleTimeString()}
                      </div>
                    </div>
                  ) : row.last_login ? (
                    <span
                      style={{
                        color: "#38AC57",
                        fontWeight: "800",
                        fontSize: "0.875rem",
                      }}
                    >
                      Active Now
                    </span>
                  ) : (
                    <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
                      N/A
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PolicyContent = ({ type }: { type: "privacy" | "terms" }) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicy = async () => {
      setLoading(true);
      try {
        const response =
          type === "privacy"
            ? await getPrivacyPolicyApi()
            : await getTermsOfServiceApi();
        if (response.ok) {
          setContent((response.data as any).content);
        }
      } catch (err) {
        console.error(`Failed to fetch ${type}`, err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, [type]);

  if (loading)
    return (
      <PageLoader
        label={`Loading ${type === "privacy" ? "Privacy Policy" : "Terms of Service"}...`}
      />
    );

  return (
    <div
      className="card"
      style={{
        padding: "2rem",
        lineHeight: "1.7",
        backgroundColor: "white",
        borderRadius: "1.5rem",
        border: "1px solid #f1f5f9",
      }}
    >
      <h2
        style={{
          marginBottom: "1.5rem",
          color: "#111827",
          fontWeight: "800",
          fontSize: "1.5rem",
        }}
      >
        {type === "privacy" ? "Privacy Policy" : "Terms of Service"}
      </h2>
      <div
        style={{ whiteSpace: "pre-wrap", color: "#4b5563", fontSize: "1rem" }}
      >
        {content || `No ${type} content available.`}
      </div>
    </div>
  );
};

const LanguageTimezone = ({
  initialLanguage,
  onUpdate,
}: {
  initialLanguage?: "EN" | "AR" | "FR";
  onUpdate: () => void;
}) => {
  const [selectedLang, setSelectedLang] = useState(initialLanguage || "EN");
  const [loading, setLoading] = useState(false);

  const languages = [
    { code: "EN", name: "English", region: "English (US)" },
    { code: "AR", name: "Arabic", region: "Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©" },
    { code: "FR", name: "French", region: "FranÃ§ais" },
  ];

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await updateAdminLanguageApi(selectedLang);
      if (response.ok) {
        onUpdate();
      }
    } catch (err) {
      console.error("Failed to update language", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{}}>
      <h3
        style={{ marginBottom: "1.5rem", fontSize: "1.1rem", color: "#374151" }}
      >
        Available Languages
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {languages.map((lang) => (
          <label
            key={lang.code}
            className="language-card"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1.25rem 1.5rem",
              border: `1px solid ${selectedLang === lang.code ? "#38AC57" : "#e5e7eb"}`,
              borderRadius: "1rem",
              cursor: "pointer",
              backgroundColor: selectedLang === lang.code ? "#eef7f0" : "white",
              transition: "all 0.25s ease",
              boxShadow:
                selectedLang === lang.code
                  ? "0 4px 6px -1px rgba(56, 172, 87, 0.1)"
                  : "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1.5rem",
                flex: 1,
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  backgroundColor:
                    selectedLang === lang.code ? "white" : "#f3f4f6",
                  borderRadius: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "800",
                  color: selectedLang === lang.code ? "#38AC57" : "#64748b",
                  fontSize: "1.1rem",
                  border:
                    selectedLang === lang.code ? "1px solid #dcfce7" : "none",
                }}
              >
                {lang.code}
              </div>
              <div>
                <div
                  style={{
                    fontWeight: "800",
                    color: "#111827",
                    marginBottom: "0.25rem",
                    fontSize: "1.05rem",
                  }}
                >
                  {lang.name}
                </div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "#64748b",
                    fontWeight: "500",
                  }}
                >
                  {lang.region}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {selectedLang === lang.code && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#166534",
                    backgroundColor: "white",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "2rem",
                    fontWeight: "700",
                    border: "1px solid #dcfce7",
                    textTransform: "uppercase",
                  }}
                >
                  current
                </span>
              )}
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  border: `2px solid ${selectedLang === lang.code ? "#38AC57" : "#d1d5db"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "white",
                }}
              >
                {selectedLang === lang.code && (
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: "#38AC57",
                    }}
                  ></div>
                )}
              </div>
              <input
                type="radio"
                name="language"
                checked={selectedLang === lang.code}
                onChange={() => setSelectedLang(lang.code as any)}
                style={{ display: "none" }}
              />
            </div>
          </label>
        ))}
      </div>
      <style>{`
                @media (max-width: 480px) {
                    .language-card {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 1.25rem !important;
                    }
                    .language-card > div:last-child {
                        width: 100%;
                        justify-content: space-between !important;
                        padding-top: 1rem;
                        border-top: 1px solid #f1f5f9;
                    }
                }
            `}</style>
      <div style={{ marginTop: "2rem" }}>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            backgroundColor: "#38AC57",
            color: "white",
            border: "none",
            padding: "0.8rem 2rem",
            borderRadius: "2rem",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "600",
            fontSize: "1rem",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

const PhoneInput = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) => {
  const [selectedCountry, setSelectedCountry] = useState({
    code: "+212",
    flag: "🇲🇦",
    name: "Morocco",
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const countries = [
    { code: "+212", flag: "🇲🇦", name: "Morocco" },
    { code: "+1", flag: "🇺🇸", name: "USA" },
    { code: "+33", flag: "🇫🇷", name: "France" },
    { code: "+44", flag: "🇬🇧", name: "UK" },
    { code: "+971", flag: "🇦🇪", name: "UAE" },
    { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
    { code: "+20", flag: "🇪🇬", name: "Egypt" },
    { code: "+91", flag: "🇮🇳", name: "India" },
    { code: "+49", flag: "🇩🇪", name: "Germany" },
    { code: "+34", flag: "🇪🇸", name: "Spain" },
    { code: "+39", flag: "🇮🇹", name: "Italy" },
    { code: "+81", flag: "🇯🇵", name: "Japan" },
    { code: "+86", flag: "🇨🇳", name: "China" },
    { code: "+55", flag: "🇧🇷", name: "Brazil" },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          border: "1px solid #e5e7eb",
          borderRadius: "0.75rem",
          backgroundColor: "#f9fafb",
          overflow: "hidden",
          transition: "all 0.2s ease",
          boxShadow: showDropdown ? "0 0 0 2px rgba(56, 172, 87, 0.1)" : "none",
          borderColor: showDropdown ? "#38AC57" : "#e5e7eb",
        }}
      >
        <div
          onClick={() => setShowDropdown(!showDropdown)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0 1rem",
            height: "3rem",
            cursor: "pointer",
            borderRight: "1px solid #e5e7eb",
            backgroundColor: showDropdown ? "white" : "transparent",
            transition: "background-color 0.2s",
          }}
        >
          <span style={{ fontSize: "1.4rem" }}>{selectedCountry.flag}</span>
          <span
            style={{ fontSize: "0.9rem", fontWeight: "600", color: "#111827" }}
          >
            {selectedCountry.code}
          </span>
          <ChevronDown
            size={14}
            color="#6b7280"
            style={{
              transform: showDropdown ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}
          />
        </div>
        <input
          type="text"
          placeholder="Enter phone number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => {
            e.currentTarget.parentElement!.style.borderColor = "#38AC57";
            e.currentTarget.parentElement!.style.backgroundColor = "white";
            e.currentTarget.parentElement!.style.boxShadow =
              "0 0 0 2px rgba(56, 172, 87, 0.1)";
          }}
          onBlur={(e) => {
            if (!showDropdown) {
              e.currentTarget.parentElement!.style.borderColor = "#e5e7eb";
              e.currentTarget.parentElement!.style.backgroundColor = "#f9fafb";
              e.currentTarget.parentElement!.style.boxShadow = "none";
            }
          }}
          style={{
            flex: 1,
            border: "none",
            backgroundColor: "transparent",
            padding: "0 1rem",
            height: "3rem",
            fontSize: "0.9rem",
            color: "#111827",
            outline: "none",
            width: "100%",
          }}
        />
      </div>

      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            width: "240px",
            backgroundColor: "white",
            borderRadius: "1rem",
            boxShadow:
              "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
            border: "1px solid #f1f5f9",
            zIndex: 1000,
            maxHeight: "300px",
            overflowY: "auto",
            padding: "0.5rem",
          }}
        >
          {countries.map((c) => (
            <div
              key={c.code}
              onClick={() => {
                setSelectedCountry(c);
                setShowDropdown(false);
              }}
              style={{
                padding: "0.8rem 1rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.8rem",
                borderRadius: "0.5rem",
                transition: "all 0.15s ease",
                backgroundColor:
                  selectedCountry.code === c.code ? "#eef7f0" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (selectedCountry.code !== c.code) {
                  e.currentTarget.style.backgroundColor = "#f8fafc";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCountry.code !== c.code) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <span style={{ fontSize: "1.4rem" }}>{c.flag}</span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "bold",
                    color: "#111827",
                  }}
                >
                  {c.name}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  {c.code}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TimezoneSelect = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) => {
  const [show, setShow] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const timezones = [
    "(GMT-12:00) International Date Line West",
    "(GMT-11:00) Midway Island, Samoa",
    "(GMT-10:00) Hawaii",
    "(GMT-09:00) Alaska",
    "(GMT-08:00) Pacific Time",
    "(GMT-07:00) Mountain Time",
    "(GMT-06:00) Central Time",
    "(GMT-05:00) Eastern Time",
    "(GMT-04:00) Atlantic Time",
    "(GMT-03:00) Brasilia",
    "(GMT+00:00) UTC / Greenwich Mean Time",
    "(GMT+01:00) Paris, Casablanca, Berlin",
    "(GMT+02:00) Cairo, Johannesburg",
    "(GMT+03:00) Moscow, Nairobi, Riyadh",
    "(GMT+04:00) Abu Dhabi, Muscat",
    "(GMT+05:30) Mumbai, New Delhi",
    "(GMT+08:00) Beijing, Perth, Singapore",
    "(GMT+09:00) Tokyo, Seoul",
    "(GMT+10:00) Sydney, Melbourne",
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <div
        onClick={() => setShow(!show)}
        style={{
          ...inputStyle,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: show ? "white" : "#f9fafb",
          borderColor: show ? "#38AC57" : "#e5e7eb",
          boxShadow: show ? "0 0 0 2px rgba(56, 172, 87, 0.1)" : "none",
          transition: "all 0.2s ease",
        }}
      >
        <span
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontSize: "0.9rem",
            color: value ? "#111827" : "#6b7280",
          }}
        >
          {value || "Select Timezone"}
        </span>
        <ChevronDown
          size={14}
          color="#6b7280"
          style={{
            transform: show ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        />
      </div>
      {show && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            width: "100%",
            minWidth: "300px",
            backgroundColor: "white",
            borderRadius: "1rem",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
            border: "1px solid #f1f5f9",
            zIndex: 1000,
            maxHeight: "250px",
            overflowY: "auto",
            padding: "0.5rem",
          }}
        >
          {timezones.map((tz) => (
            <div
              key={tz}
              onClick={() => {
                onChange(tz);
                setShow(false);
              }}
              style={{
                padding: "0.8rem 1rem",
                cursor: "pointer",
                fontSize: "0.875rem",
                borderRadius: "0.5rem",
                transition: "all 0.15s ease",
                backgroundColor: value === tz ? "#eef7f0" : "transparent",
                color: value === tz ? "#38AC57" : "#374151",
                fontWeight: value === tz ? "600" : "normal",
              }}
              onMouseEnter={(e) => {
                if (value !== tz) {
                  e.currentTarget.style.backgroundColor = "#f8fafc";
                }
              }}
              onMouseLeave={(e) => {
                if (value !== tz) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              {tz}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const inputStyle = {
  width: "100%",
  padding: "0.9rem 1.1rem",
  borderRadius: "0.75rem",
  border: "1.5px solid #e5e7eb",
  backgroundColor: "#f9fafb",
  color: "#374151",
  fontSize: "0.95rem",
  outline: "none",
  boxSizing: "border-box" as const,
  transition: "border-color 0.2s",
};
