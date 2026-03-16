import { Menu, Bell, Check, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { UserAvatar } from "./UserAvatar";
import { resolveApiAssetUrl } from "../services/api";

// Import custom icons
import bellIcon from "../assets/icons/notification-bell.png";

const HEADER_NOTIFICATIONS = [
  {
    id: 1,
    title: "New Driver Registration",
    time: "2 mins ago",
    unread: true,
  },
  {
    id: 2,
    title: "Platform Update Successful",
    time: "1 hour ago",
    unread: false,
  },
  {
    id: 3,
    title: "Weekly Reports Ready",
    time: "5 hours ago",
    unread: false,
  },
];

export const Header = ({
  onLogout,
  onToggleSidebar,
  onNavigate,
}: {
  onLogout: () => void;
  onToggleSidebar: () => void;
  onNavigate: (page: string) => void;
}) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser
      ? JSON.parse(savedUser)
      : { name: "Admin", email: "admin@ezzni.com" };
  });

  useEffect(() => {
    const handleUpdate = () => {
      const savedUser = localStorage.getItem("user");
      if (savedUser) setUser(JSON.parse(savedUser));
    };
    window.addEventListener("userUpdated", handleUpdate);
    window.addEventListener("storage", handleUpdate); // Also sync across tabs
    return () => {
      window.removeEventListener("userUpdated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    {
      id: number;
      name: string;
      type: string;
      phone: string;
      code: string;
      img: string;
      rating: string;
    }[]
  >([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const resolvedHeaderAvatarSrc = (() => {
    if (!user) {
      return undefined;
    }

    if (typeof user.avatarUrl === "string" && user.avatarUrl.trim()) {
      return resolveApiAssetUrl(user.avatarUrl.trim());
    }

    if (typeof user.avatar === "string" && user.avatar.trim()) {
      const rawAvatar = user.avatar.trim();
      if (
        rawAvatar.startsWith("http://") ||
        rawAvatar.startsWith("https://") ||
        rawAvatar.startsWith("data:") ||
        rawAvatar.startsWith("/uploads/") ||
        rawAvatar.startsWith("uploads/")
      ) {
        return resolveApiAssetUrl(rawAvatar);
      }

      return resolveApiAssetUrl(`/uploads/avatars/${rawAvatar}`);
    }

    return undefined;
  })();

  const dummyData = [
    {
      id: 1,
      name: "Ahmed Hassan",
      type: "Customer",
      phone: "+212 6 12 34 56",
      code: "R-00045",
      img: "https://i.pravatar.cc/150?u=1",
      rating: "4.8",
    },
    {
      id: 2,
      name: "Ali Raza",
      type: "Driver",
      phone: "+212 6 12 34 56",
      code: "C-00001",
      img: "https://i.pravatar.cc/150?u=2",
      rating: "4.8",
    },
    {
      id: 3,
      name: "Ayaan Khan",
      type: "Customer",
      phone: "+212 6 12 34 56",
      code: "R-00045",
      img: "https://i.pravatar.cc/150?u=3",
      rating: "4.8",
    },
    {
      id: 4,
      name: "Asad Mahmood",
      type: "Customer",
      phone: "+212 6 12 34 56",
      code: "R-00045",
      img: "https://i.pravatar.cc/150?u=4",
      rating: "4.8",
    },
    {
      id: 5,
      name: "Amir Farooq",
      type: "Driver",
      phone: "+212 6 12 34 56",
      code: "C-00001",
      img: "https://i.pravatar.cc/150?u=5",
      rating: "4.8",
    },
  ];

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim()) {
      const filtered = dummyData.filter(
        (item) =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.phone.includes(query) ||
          item.code.toLowerCase().includes(query.toLowerCase()),
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  };

  return (
    <header
      className="header-container"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2rem",
        gap: "1rem",
        position: "relative",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media (max-width: 1024px) {
          .header-container {
            flex-direction: column-reverse;
            align-items: stretch !important;
            gap: 1.25rem !important;
          }
          .header-actions {
            justify-content: space-between;
            width: 100%;
            gap: 0.5rem !important;
          }
          .search-wrapper {
            margin-right: 0 !important;
            max-width: 100% !important;
          }
          .menu-toggle {
            display: flex !important;
            padding: 8px !important;
          }
          .notification-dropdown {
            position: fixed !important;
            top: 70px !important;
            left: 5% !important;
            right: 5% !important;
            width: 90% !important;
            max-width: 400px !important;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
          }
          .notification-item-content {
             flex: 1;
             min-width: 0;
          }
        }
        @media (max-width: 640px) {
          .user-info {
            display: none !important;
          }
          .profile-img-header {
            width: 44px !important;
            height: 44px !important;
          }
          .search-wrapper input {
            padding-right: 6rem !important;
            font-size: 0.9rem !important;
            padding-top: 1rem !important;
            padding-bottom: 1rem !important;
          }
          .search-wrapper button {
            padding: 0 1.25rem !important;
            font-size: 0.85rem !important;
          }
          .header-actions {
            gap: 0.35rem !important;
          }
        }
      `,
        }}
      />
      {/* Search Bar */}
      <div
        className="search-wrapper"
        style={{ flex: 1, maxWidth: "750px", marginRight: "2rem" }}
      >
        <div style={{ position: "relative", width: "100%" }}>
          <input
            type="text"
            placeholder="Type here"
            value={searchQuery}
            onChange={handleSearch}
            style={{
              width: "100%",
              padding: "1.2rem 1.5rem",
              borderRadius: "3rem",
              border: "1px solid #e5e7eb",
              backgroundColor: "white",
              outline: "none",
              paddingRight: "8rem",
              fontSize: "1rem",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
            }}
          />
          <button
            style={{
              position: "absolute",
              right: "8px",
              top: "8px",
              bottom: "8px",
              backgroundColor: "var(--primary-color)",
              color: "white",
              padding: "0 2.5rem",
              borderRadius: "2.5rem",
              border: "none",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "1rem",
            }}
          >
            Search
          </button>

          {/* Search Results Dropdown */}
          {searchQuery && (
            <div
              style={{
                position: "absolute",
                top: "120%",
                left: 0,
                right: 0,
                backgroundColor: "white",
                borderRadius: "1rem",
                boxShadow:
                  "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                zIndex: 50,
                padding: "0.5rem",
                border: "1px solid #f1f5f9",
              }}
            >
              {searchResults.length > 0 ? (
                searchResults.map((result, idx) => (
                  <div
                    key={result.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1.25rem",
                      padding: "1rem 0.75rem",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      borderBottom:
                        idx === searchResults.length - 1
                          ? "none"
                          : "1px solid #f1f5f9",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f8fafc")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <div style={{ position: "relative" }}>
                      <img
                        src={result.img}
                        alt={result.name}
                        style={{
                          width: "56px",
                          height: "56px",
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                      {/* Black Checkmark Badge */}
                      <div
                        style={{
                          position: "absolute",
                          top: "2px",
                          right: "-2px",
                          width: "18px",
                          height: "18px",
                          backgroundColor: "black",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                          color: "white",
                          border: "2px solid white",
                        }}
                      >
                        <Check size={10} strokeWidth={4} />
                      </div>
                      {/* Rating Badge */}
                      <div
                        style={{
                          position: "absolute",
                          bottom: "-4px",
                          left: "50%",
                          transform: "translateX(-50%)",
                          backgroundColor: "white",
                          borderRadius: "1rem",
                          padding: "1px 8px",
                          fontSize: "10px",
                          fontWeight: "800",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          whiteSpace: "nowrap",
                          display: "flex",
                          alignItems: "center",
                          gap: "2px",
                        }}
                      >
                        <span style={{ color: "#fbbf24" }}>★</span>{" "}
                        {result.rating}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: "800",
                            fontSize: "1.1rem",
                            color: "#111827",
                          }}
                        >
                          {result.name}
                        </div>
                        <span
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: "600",
                            color: "#38AC57",
                          }}
                        >
                          {result.type}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "1rem",
                          color: "#111827",
                          marginTop: "0.2rem",
                          fontWeight: "800",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        {result.phone}
                        <span
                          style={{
                            color: "#38AC57",
                            fontSize: "0.8rem",
                            fontWeight: "500",
                          }}
                        >
                          {result.code}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: "1.5rem",
                    textAlign: "center",
                    color: "#9ca3af",
                    fontWeight: "500",
                  }}
                >
                  No results found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Side Actions */}
      <div
        className="header-actions"
        style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}
      >
        <button
          onClick={onToggleSidebar}
          className="menu-toggle"
          style={{
            background: "white",
            border: "1px solid #f1f5f9",
            cursor: "pointer",
            display: "none",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px",
            borderRadius: "1rem",
            boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
          }}
        >
          <Menu size={24} color="var(--primary-color)" />
        </button>

        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            alignItems: "center",
            flex: 1,
            justifyContent: "flex-end",
          }}
        >
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.5rem",
              }}
            >
              <img
                src={bellIcon}
                alt="Notifications"
                style={{ width: "28px", height: "28px", objectFit: "contain" }}
              />
              <span
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: "#38AC57",
                  border: "2px solid white",
                }}
              ></span>
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div
                className="notification-dropdown"
                style={{
                  position: "absolute",
                  top: "calc(100% + 12px)",
                  right: 0,
                  width: "340px",
                  maxWidth: "calc(100vw - 32px)",
                  backgroundColor: "white",
                  borderRadius: "1.25rem",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                  zIndex: 1200,
                  border: "1px solid #f1f5f9",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "1.25rem",
                    borderBottom: "1px solid #f1f5f9",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontWeight: "800", color: "#111827" }}>
                    Notifications
                  </div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--primary-color)",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    Mark all as read
                  </span>
                </div>
                <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                  {HEADER_NOTIFICATIONS.map((notif) => (
                    <div
                      key={notif.id}
                      style={{
                        padding: "1rem 1.25rem",
                        borderBottom: "1px solid #f8fafc",
                        backgroundColor: notif.unread
                          ? "#eef7f0"
                          : "transparent",
                        display: "flex",
                        gap: "1rem",
                        alignItems: "start",
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          backgroundColor: notif.unread ? "#38AC57" : "#f1f5f9",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {notif.unread ? (
                          <Bell size={18} color="white" />
                        ) : (
                          <Check size={18} color="#94a3b8" />
                        )}
                      </div>
                      <div className="notification-item-content">
                        <div
                          style={{
                            fontSize: "0.875rem",
                            fontWeight: "700",
                            color: "#111827",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {notif.title}
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#64748b",
                            marginTop: "0.25rem",
                          }}
                        >
                          {notif.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      onNavigate("notifications");
                    }}
                    style={{
                      border: "none",
                      background: "none",
                      color: "#64748b",
                      fontSize: "0.875rem",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              height: "32px",
              width: "1px",
              backgroundColor: "#e2e8f0",
              margin: "0 0.25rem",
            }}
          ></div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              cursor: "pointer",
              padding: "6px 16px 6px 8px",
              borderRadius: "3rem",
              border: "1.5px solid #38AC57",
              backgroundColor: "white",
              transition: "all 0.2s",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
            }}
            onClick={() => onNavigate("profile")}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#f0fff4")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "white")
            }
          >
            <UserAvatar
              src={resolvedHeaderAvatarSrc}
              name={user.name}
              size={44}
              showBadge={false}
              className="profile-img-header"
            />
            <div
              style={{
                fontWeight: "800",
                fontSize: "1.05rem",
                color: "#111827",
                whiteSpace: "nowrap",
              }}
            >
              {user.name}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onLogout();
            }}
            style={{
              background: "white",
              border: "1.5px solid #ef4444",
              padding: "10px",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ef4444",
              transition: "all 0.2s",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
            }}
            title="Log Out"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#fef2f2";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "white";
            }}
          >
            <LogOut size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </header>
  );
};
