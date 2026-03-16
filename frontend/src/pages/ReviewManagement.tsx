import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  Eye,
  ArrowUpRight,
  Star,
  ChevronDown,
  X,
} from "lucide-react";
import { Review } from "./ReviewTypes";
import { ReviewsModal } from "./ReviewManagementModals";
import { UserAvatar } from "../components/UserAvatar";
import {
  getAdminReviewStatsApi,
  getAdminReviewsApi,
  editAdminReviewApi,
  deleteAdminReviewApi,
  toggleReviewFlagApi,
  resolveApiAssetUrl,
} from "../services/api";

// Specialized Icons
import totalReviewsIcon from "../assets/icons/Daily Bonus Earned.png";
import visibleIcon from "../assets/icons/Verified Drivers-Passengers.png";
import highRatedIcon from "../assets/icons/Active Drivers.png";
import lowRatedIcon from "../assets/icons/active now.png";

const REVIEW_OVERRIDES_STORAGE_KEY = "adminReviewOverridesV1";
const REVIEW_DELETED_STORAGE_KEY = "adminReviewDeletedIdsV1";

const FALLBACK_REVIEWS: Review[] = [
  {
    id: "REV-1001",
    userType: "Driver",
    userInfo: {
      name: "Karim Bennani",
      id: "D-401",
      avatar: "",
    },
    reviewDate: "16 Mar 2026",
    visible: true,
    isFlagged: false,
    rating: 4.8,
    comment: "Professional driving and very punctual pickup.",
    tags: ["Professional", "On Time"],
    status: "Completed",
  },
  {
    id: "REV-1002",
    userType: "Passenger",
    userInfo: {
      name: "Sara K.",
      id: "R-1092",
      avatar: "",
    },
    reviewDate: "15 Mar 2026",
    visible: true,
    isFlagged: false,
    rating: 4.6,
    comment: "Clear communication and smooth trip experience.",
    tags: ["Friendly", "Smooth Ride"],
    status: "Completed",
  },
  {
    id: "REV-1003",
    userType: "Driver",
    userInfo: {
      name: "Nadia Fassi",
      id: "D-402",
      avatar: "",
    },
    reviewDate: "14 Mar 2026",
    visible: false,
    isFlagged: true,
    rating: 2.7,
    comment: "Trip was completed but communication could improve.",
    tags: ["Needs Review"],
    status: "Pending",
  },
  {
    id: "REV-1004",
    userType: "Passenger",
    userInfo: {
      name: "Youssef A.",
      id: "R-1138",
      avatar: "",
    },
    reviewDate: "13 Mar 2026",
    visible: true,
    isFlagged: false,
    rating: 4.9,
    comment: "Excellent rider etiquette and quick boarding.",
    tags: ["Excellent", "Respectful"],
    status: "Completed",
  },
];

type ReviewOverrideMap = Record<
  string,
  Pick<Review, "comment" | "isFlagged" | "visible" | "status">
>;

function loadReviewOverrides(): ReviewOverrideMap {
  try {
    const raw = localStorage.getItem(REVIEW_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveReviewOverrides(overrides: ReviewOverrideMap) {
  try {
    localStorage.setItem(
      REVIEW_OVERRIDES_STORAGE_KEY,
      JSON.stringify(overrides),
    );
  } catch {
    // Ignore storage failures.
  }
}

function loadDeletedReviewIds(): string[] {
  try {
    const raw = localStorage.getItem(REVIEW_DELETED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDeletedReviewIds(ids: string[]) {
  try {
    localStorage.setItem(REVIEW_DELETED_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage failures.
  }
}

function applyLocalReviewState(list: Review[]): Review[] {
  const overrides = loadReviewOverrides();
  const deleted = new Set(loadDeletedReviewIds());
  return list
    .filter((review) => !deleted.has(review.id))
    .map((review) => ({
      ...review,
      ...(overrides[review.id] || {}),
    }));
}

function computeStatsFromReviews(list: Review[]) {
  return {
    total: list.length,
    visible: list.filter((review) => review.visible).length,
    highRated: list.filter((review) => review.rating >= 4.5).length,
    lowRated: list.filter((review) => review.rating < 3.0).length,
  };
}

export const ReviewManagement = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [filterStats, setFilterStats] = useState<string>("total");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTypeTab, setActiveTypeTab] = useState<
    "All" | "Driver" | "Passenger"
  >("All");

  const [ratingFilter, setRatingFilter] = useState("Rating");
  const [typesFilter, setTypesFilter] = useState("Types");
  const [reviewsFilter, setReviewsFilter] = useState("Reviews");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, setFetchError] = useState("");

  const [stats, setStats] = useState({
    total: 0,
    visible: 0,
    highRated: 0,
    lowRated: 0,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setFetchError("");

    try {
      const [statsRes, listRes] = await Promise.all([
        getAdminReviewStatsApi(),
        getAdminReviewsApi({
          tab: activeTypeTab === "All" ? undefined : `${activeTypeTab} Reviews`,
          visible: reviewsFilter !== "Reviews" ? reviewsFilter : undefined,
          search: searchQuery || undefined,
          limit: 100,
        }),
      ]);

      const nextStats = statsRes.ok && statsRes.data ? statsRes.data : null;
      const fetchedReviews =
        listRes.ok && listRes.data?.reviews
          ? listRes.data.reviews.map((r: any) => ({
              ...r,
              userInfo: {
                ...r.userInfo,
                avatar: resolveApiAssetUrl(r.userInfo?.avatar) || "",
              },
            }))
          : [];

      const shouldUseFallback =
        fetchedReviews.length === 0 ||
        !nextStats ||
        (nextStats.total === 0 &&
          nextStats.visible === 0 &&
          nextStats.highRated === 0 &&
          nextStats.lowRated === 0);

      const baseReviews = shouldUseFallback ? FALLBACK_REVIEWS : fetchedReviews;
      const effectiveReviews = applyLocalReviewState(baseReviews);
      const effectiveStats = computeStatsFromReviews(effectiveReviews);

      setStats(effectiveStats);
      setReviews(effectiveReviews);
      setTotalReviews(effectiveReviews.length);
      setFetchError("");
    } catch (e) {
      console.error("Failed to fetch reviews:", e);
      const effectiveReviews = applyLocalReviewState(FALLBACK_REVIEWS);
      setStats(computeStatsFromReviews(effectiveReviews));
      setReviews(effectiveReviews);
      setTotalReviews(effectiveReviews.length);
      setFetchError("");
    } finally {
      setIsLoading(false);
    }
  }, [activeTypeTab, reviewsFilter, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchData();
    }, 30000);

    const handleWindowFocus = () => {
      fetchData();
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleWindowFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleWindowFocus);
    };
  }, [fetchData]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchesSearch =
        r.userInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.userInfo.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTypeTab =
        (activeTypeTab === "All" || r.userType === activeTypeTab) &&
        (typesFilter === "Types" || r.userType === typesFilter);

      const matchesRatingFilter =
        ratingFilter === "Rating" ||
        (ratingFilter === "High (4.5+)"
          ? r.rating >= 4.5
          : ratingFilter === "Medium (3.0-4.4)"
            ? r.rating >= 3.0 && r.rating < 4.5
            : ratingFilter === "Low (< 3.0)"
              ? r.rating < 3.0
              : true);

      const matchesStatusFilter =
        reviewsFilter === "Reviews" ||
        (reviewsFilter === "Visible"
          ? r.visible
          : reviewsFilter === "Flagged"
            ? r.isFlagged
            : true);

      const matchesStats =
        filterStats === "total" ||
        (filterStats === "visible" && r.visible) ||
        (filterStats === "high" && r.rating >= 4.5) ||
        (filterStats === "low" && r.rating < 3.0);

      return (
        matchesSearch &&
        matchesTypeTab &&
        matchesRatingFilter &&
        matchesStatusFilter &&
        matchesStats
      );
    });
  }, [
    reviews,
    searchQuery,
    activeTypeTab,
    ratingFilter,
    reviewsFilter,
    filterStats,
  ]);

  const handleUpdateReview = async (updated: Review) => {
    const previous = reviews.find((review) => review.id === updated.id) || null;

    const nextReviews = reviews.map((r) => (r.id === updated.id ? updated : r));
    setReviews(nextReviews);
    setStats(computeStatsFromReviews(nextReviews));
    setTotalReviews(nextReviews.length);
    setSelectedReview((prev) =>
      prev && prev.id === updated.id ? updated : prev,
    );

    const overrides = loadReviewOverrides();
    overrides[updated.id] = {
      comment: updated.comment,
      isFlagged: updated.isFlagged,
      visible: updated.visible,
      status: updated.status,
    };
    saveReviewOverrides(overrides);

    try {
      if (previous && updated.comment !== previous.comment) {
        await editAdminReviewApi(updated.id, { comment: updated.comment });
      }

      if (previous && updated.isFlagged !== previous.isFlagged) {
        await toggleReviewFlagApi(updated.id);
      }
    } catch (error) {
      console.error("Failed to sync review update:", error);
    }
  };

  const handleDeleteReview = async (id: string) => {
    const nextReviews = reviews.filter((r) => r.id !== id);
    setReviews(nextReviews);
    setStats(computeStatsFromReviews(nextReviews));
    setTotalReviews(nextReviews.length);
    setSelectedReview(null);
    setIsModalOpen(false);

    const deletedIds = Array.from(new Set([...loadDeletedReviewIds(), id]));
    saveDeletedReviewIds(deletedIds);

    const overrides = loadReviewOverrides();
    if (overrides[id]) {
      delete overrides[id];
      saveReviewOverrides(overrides);
    }

    try {
      await deleteAdminReviewApi(id);
    } catch (error) {
      console.error("Failed to sync review deletion:", error);
    }
  };

  const averageRating = useMemo(() => {
    if (reviews.length === 0) {
      return "0.0";
    }

    return (
      reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
    ).toFixed(1);
  }, [reviews]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    activeTypeTab !== "All" ||
    ratingFilter !== "Rating" ||
    typesFilter !== "Types" ||
    reviewsFilter !== "Reviews" ||
    filterStats !== "total";

  const emptyStateMessage = isLoading
    ? "Loading reviews..."
    : totalReviews === 0
      ? "No reviews have been submitted yet."
      : hasActiveFilters
        ? "No reviews found matching the current filters."
        : "No reviews available.";

  return (
    <div
      className="main-content"
      style={{
        padding: "2rem",
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
        overflowY: "auto",
      }}
    >
      <style>{`
        .rev-header-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 2rem;
            gap: 1.5rem;
        }
        .rev-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1.5rem;
            margin-bottom: 2.5rem;
        }
        .rev-stat-card {
            background-color: white;
            padding: 1.5rem;
            border-radius: 24px;
            cursor: pointer;
            border: 1px solid #e5e7eb;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
            transition: all 0.2s ease;
        }
        .rev-stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        }
        .rev-stat-card.active {
          background-color: #38AC57;
          border: none;
        }
        .rev-stat-card.active-green {
            background-color: #38AC57;
            border: none;
        }
        .rev-controls-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1.5rem;
            margin-bottom: 2rem;
            flex-wrap: wrap;
        }
        .rev-search-filter-group {
            display: flex;
            gap: 1rem;
            flex: 1;
            flex-wrap: wrap;
        }
        .rev-search-wrapper {
            position: relative;
            flex: 1;
            min-width: 280px;
        }
        .rev-search-wrapper input {
            width: 100%;
            padding: 12px 16px 12px 48px;
            border-radius: 20px;
            border: 1px solid #e5e7eb;
            outline: none;
            font-size: 14px;
            background-color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .rev-search-wrapper svg {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
        }
        .rev-filter-select-group {
            display: flex;
            gap: 0.75rem;
            flex-wrap: wrap;
        }
        .rev-select-custom {
            appearance: none;
            background-color: white;
            border: 1px solid #e5e7eb;
            color: #374151;
            padding: 10px 35px 10px 15px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .rev-tabs-container {
            display: flex;
            background-color: #f3f4f6;
            padding: 4px;
            border-radius: 14px;
            border: 1px solid #e5e7eb;
            width: fit-content;
        }
        .rev-tab-btn {
            padding: 8px 18px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 700;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
        }
        .rev-table-container {
            background-color: white;
            border-radius: 24px;
            overflow-x: auto;
            border: 1px solid #e5e7eb;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .rev-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 1000px;
        }
        .rev-table th {
            background-color: #38AC57;
            color: white;
            padding: 1.25rem 1.5rem;
            text-align: left;
            font-weight: 700;
            font-size: 14px;
        }
        .rev-table td {
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid #f3f4f6;
        }

        @media (max-width: 1024px) {
            .rev-stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        @media (max-width: 768px) {
            .rev-header-container {
                flex-direction: column;
                align-items: stretch;
                text-align: center;
            }
            .rev-header-container h1 {
                font-size: 1.5rem !important;
            }
            .rev-header-container button {
                width: 100%;
                justify-content: center;
            }
            .rev-controls-container {
                flex-direction: column;
                align-items: stretch;
            }
            .rev-search-wrapper {
                min-width: 100%;
            }
            .rev-filter-select-group {
                width: 100%;
            }
            .rev-select-custom {
                flex: 1;
                min-width: 120px;
            }
            .rev-tabs-container {
                width: 100%;
            }
            .rev-tab-btn {
                flex: 1;
                padding: 10px 5px;
            }
        }

        @media (max-width: 480px) {
            .rev-stats-grid {
                grid-template-columns: 1fr;
            }
            .rev-select-custom {
                width: 100%;
            }
            .rev-search-filter-group button {
                width: 100%;
                justify-content: center;
            }
        }
      `}</style>
      <div className="rev-header-container">
        <div>
          <h1
            style={{
              fontSize: "1.875rem",
              fontWeight: "800",
              margin: "0 0 0.5rem 0",
              color: "#111827",
            }}
          >
            Review Management
          </h1>
          <p style={{ margin: 0, color: "#6B7280", fontSize: "0.925rem" }}>
            Manage driver and rider reviews for quality control
          </p>
        </div>
        <button
          onClick={() => setShowAnalytics(true)}
          style={{
            backgroundColor: "#38AC57",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: "16px",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 8px 16px -4px rgba(56, 172, 87, 0.4)",
          }}
        >
          Review Analytics
        </button>
      </div>

      {showAnalytics && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowAnalytics(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "2.5rem",
              borderRadius: "32px",
              width: "90%",
              maxWidth: "600px",
              border: "1px solid #e5e7eb",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
              }}
            >
              <h2 style={{ margin: 0, fontWeight: "800", color: "#111827" }}>
                Review Analytics
              </h2>
              <button
                onClick={() => setShowAnalytics(false)}
                style={{
                  background: "#f3f4f6",
                  border: "none",
                  color: "#374151",
                  cursor: "pointer",
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "1.5rem",
              }}
            >
              <div
                style={{
                  backgroundColor: "#f9fafb",
                  padding: "1.5rem",
                  borderRadius: "20px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <p
                  style={{
                    margin: "0 0 0.5rem 0",
                    color: "#6B7280",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                  }}
                >
                  Average Rating
                </p>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "2.5rem",
                    fontWeight: "800",
                    color: "#111827",
                  }}
                >
                  {averageRating}{" "}
                  <Star
                    size={24}
                    fill="#FBBF24"
                    color="#FBBF24"
                    style={{ display: "inline" }}
                  />
                </h3>
              </div>
              <div
                style={{
                  backgroundColor: "#f9fafb",
                  padding: "1.5rem",
                  borderRadius: "20px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <p
                  style={{
                    margin: "0 0 0.5rem 0",
                    color: "#6B7280",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                  }}
                >
                  Growth Rate
                </p>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "2.5rem",
                    fontWeight: "800",
                    color: "#38AC57",
                  }}
                >
                  +15%
                </h3>
              </div>
            </div>
            <div
              style={{
                marginTop: "2rem",
                height: "180px",
                backgroundColor: "#f9fafb",
                borderRadius: "20px",
                border: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "flex-end",
                gap: "12px",
                padding: "1.5rem",
              }}
            >
              {[30, 60, 45, 80, 55, 90, 70, 40].map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    backgroundColor: "#38AC57",
                    height: `${h}%`,
                    borderRadius: "6px",
                  }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="rev-stats-grid">
        <div
          className={`rev-stat-card ${filterStats === "total" ? "active" : ""}`}
          onClick={() => setFilterStats("total")}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  filterStats === "total"
                    ? "rgba(255,255,255,0.2)"
                    : "transparent",
                borderRadius: "8px",
                padding: "4px",
              }}
            >
              <img
                src={totalReviewsIcon}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  filter:
                    filterStats === "total"
                      ? "brightness(0) invert(1)"
                      : "none",
                }}
              />
            </div>
            <span
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: filterStats === "total" ? "white" : "#374151",
              }}
            >
              Total Reviews
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "2.5rem",
                fontWeight: "900",
                color: filterStats === "total" ? "white" : "#111827",
              }}
            >
              {stats.total}
            </span>
            <div
              style={{
                backgroundColor:
                  filterStats === "total" ? "rgba(0,0,0,0.1)" : "#f3f4f6",
                padding: "6px",
                borderRadius: "50%",
              }}
            >
              <ArrowUpRight
                size={20}
                color={filterStats === "total" ? "white" : "#38AC57"}
              />
            </div>
          </div>
        </div>

        <div
          className={`rev-stat-card ${filterStats === "visible" ? "active-green" : ""}`}
          onClick={() => setFilterStats("visible")}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  filterStats === "visible"
                    ? "rgba(255,255,255,0.2)"
                    : "transparent",
                borderRadius: "8px",
                padding: "4px",
              }}
            >
              <img
                src={visibleIcon}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  filter:
                    filterStats === "visible"
                      ? "brightness(0) invert(1)"
                      : "none",
                }}
              />
            </div>
            <span
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: filterStats === "visible" ? "white" : "#374151",
              }}
            >
              Visible
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "2.5rem",
                fontWeight: "900",
                color: filterStats === "visible" ? "white" : "#111827",
              }}
            >
              {stats.visible}
            </span>
            <div
              style={{
                backgroundColor:
                  filterStats === "visible" ? "rgba(0,0,0,0.1)" : "#f3f4f6",
                padding: "6px",
                borderRadius: "50%",
              }}
            >
              <ArrowUpRight
                size={20}
                color={filterStats === "visible" ? "white" : "#38AC57"}
              />
            </div>
          </div>
        </div>

        <div
          className={`rev-stat-card ${filterStats === "high" ? "active" : ""}`}
          onClick={() => setFilterStats("high")}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  filterStats === "high"
                    ? "rgba(255,255,255,0.2)"
                    : "transparent",
                borderRadius: "8px",
                padding: "4px",
              }}
            >
              <img
                src={highRatedIcon}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  filter:
                    filterStats === "high" ? "brightness(0) invert(1)" : "none",
                }}
              />
            </div>
            <span
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: filterStats === "high" ? "white" : "#374151",
              }}
            >
              High Rated
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "2.5rem",
                fontWeight: "900",
                color: filterStats === "high" ? "white" : "#111827",
              }}
            >
              {stats.highRated}
            </span>
            <div
              style={{
                backgroundColor:
                  filterStats === "high" ? "rgba(0,0,0,0.1)" : "#f3f4f6",
                padding: "6px",
                borderRadius: "50%",
              }}
            >
              <ArrowUpRight
                size={20}
                color={filterStats === "high" ? "white" : "#38AC57"}
              />
            </div>
          </div>
        </div>

        <div
          className={`rev-stat-card ${filterStats === "low" ? "active" : ""}`}
          onClick={() => setFilterStats("low")}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  filterStats === "low"
                    ? "rgba(255,255,255,0.2)"
                    : "transparent",
                borderRadius: "8px",
                padding: "4px",
              }}
            >
              <img
                src={lowRatedIcon}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  filter:
                    filterStats === "low" ? "brightness(0) invert(1)" : "none",
                }}
              />
            </div>
            <span
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: filterStats === "low" ? "white" : "#374151",
              }}
            >
              Low Rated
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "2.5rem",
                fontWeight: "900",
                color: filterStats === "low" ? "white" : "#111827",
              }}
            >
              {stats.lowRated}
            </span>
            <div
              style={{
                backgroundColor:
                  filterStats === "low" ? "rgba(0,0,0,0.1)" : "#f3f4f6",
                padding: "6px",
                borderRadius: "50%",
              }}
            >
              <ArrowUpRight
                size={20}
                color={filterStats === "low" ? "white" : "#38AC57"}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rev-controls-container">
        <div className="rev-search-filter-group">
          <div className="rev-search-wrapper">
            <Search size={18} color="#9CA3AF" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="rev-filter-select-group">
            <div style={{ position: "relative" }}>
              <select
                className="rev-select-custom"
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
              >
                <option>Rating</option>
                <option>High (4.5+)</option>
                <option>Medium (3.0-4.4)</option>
                <option value="Low (< 3.0)">&lt; 3.0</option>
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
                color="#9CA3AF"
              />
            </div>

            <div style={{ position: "relative" }}>
              <select
                className="rev-select-custom"
                value={typesFilter}
                onChange={(e) => setTypesFilter(e.target.value)}
              >
                <option>Types</option>
                <option>Driver</option>
                <option>Passenger</option>
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
                color="#9CA3AF"
              />
            </div>

            <button
              style={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                color: "#374151",
                padding: "10px 20px",
                borderRadius: "12px",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontWeight: "700",
              }}
              onClick={() => {
                setSearchQuery("");
                setRatingFilter("Rating");
                setTypesFilter("Types");
                setReviewsFilter("Reviews");
                setFilterStats("total");
              }}
            >
              <Filter size={18} />
              Clear
            </button>
          </div>
        </div>

        <div className="rev-tabs-container">
          {["Driver Reviews", "All Reviews", "Passenger Reviews"].map((tab) => (
            <button
              key={tab}
              onClick={() =>
                setActiveTypeTab(
                  tab === "All Reviews" ? "All" : (tab.split(" ")[0] as any),
                )
              }
              className="rev-tab-btn"
              style={{
                backgroundColor:
                  (activeTypeTab === "All" && tab === "All Reviews") ||
                  activeTypeTab + " Reviews" === tab
                    ? "white"
                    : "transparent",
                color:
                  (activeTypeTab === "All" && tab === "All Reviews") ||
                  activeTypeTab + " Reviews" === tab
                    ? "#38AC57"
                    : "#6B7280",
                boxShadow:
                  (activeTypeTab === "All" && tab === "All Reviews") ||
                  activeTypeTab + " Reviews" === tab
                    ? "0 4px 6px -1px rgba(0,0,0,0.1)"
                    : "none",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="rev-table-container">
        <table className="rev-table">
          <thead>
            <tr>
              <th>User Type</th>
              <th>Name ID</th>
              <th>Review Date</th>
              <th>Visible</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && filteredReviews.length > 0 ? (
              filteredReviews.map((review) => (
                <tr key={review.id}>
                  <td>
                    <span
                      style={{
                        padding: "6px 16px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "800",
                        backgroundColor: "#eef7f0",
                        color: "#38AC57",
                        textTransform: "uppercase",
                      }}
                    >
                      {review.userType}
                    </span>
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <UserAvatar
                        src={review.userInfo.avatar}
                        name={review.userInfo.name}
                        rating={review.rating}
                        size={44}
                        showBadge={true}
                      />
                      <div>
                        <div
                          style={{
                            fontWeight: "800",
                            fontSize: "14px",
                            color: "#111827",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {review.userInfo.name}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#6B7280",
                            fontWeight: "600",
                          }}
                        >
                          {review.userInfo.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td
                    style={{
                      fontSize: "14px",
                      color: "#374151",
                      fontWeight: "700",
                    }}
                  >
                    {review.reviewDate}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "6px 14px",
                        borderRadius: "8px",
                        fontSize: "11px",
                        fontWeight: "800",
                        backgroundColor: review.visible ? "#f3f4f6" : "#FEF2F2",
                        color: review.visible ? "#374151" : "#EF4444",
                        textTransform: "uppercase",
                      }}
                    >
                      {review.visible ? "Visible" : "Flagged"}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      onClick={() => {
                        setSelectedReview(review);
                        setIsModalOpen(true);
                      }}
                      style={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        padding: "8px 16px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        color: "#374151",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.2s",
                      }}
                    >
                      <Eye size={14} /> View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    padding: "3rem",
                    color: "#9CA3AF",
                    fontWeight: "600",
                  }}
                >
                  {emptyStateMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ReviewsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedReview(null);
        }}
        review={selectedReview}
        onUpdate={handleUpdateReview}
        onDelete={handleDeleteReview}
      />
    </div>
  );
};
