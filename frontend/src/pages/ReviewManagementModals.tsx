import { useState, useEffect, useCallback } from "react";
import { X, ArrowLeft, Star } from "lucide-react";
import { Review, ReviewDetail, ReviewHistoryItem } from "./ReviewTypes";
import { UserAvatar } from "../components/UserAvatar";
import { getAdminReviewDetailApi, resolveApiAssetUrl } from "../services/api";

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: Review | null;
  onUpdate: (review: Review) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const ReviewsModal = ({
  isOpen,
  onClose,
  review,
  onUpdate,
  onDelete,
}: ReviewsModalProps) => {
  const [activeTab, setActiveTab] = useState<"Given" | "Received">("Received");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editComment, setEditComment] = useState("");
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const hydrateHistoryItem = useCallback(
    (item: ReviewHistoryItem): ReviewHistoryItem => ({
      ...item,
      avatar: resolveApiAssetUrl(item.avatar) || "",
    }),
    [],
  );

  const loadDetail = useCallback(async () => {
    if (!review?.id) return;

    setIsLoading(true);
    try {
      const response = await getAdminReviewDetailApi(review.id);
      if (response.ok && response.data) {
        setDetail({
          review: {
            ...response.data.review,
            userInfo: {
              ...response.data.review.userInfo,
              avatar:
                resolveApiAssetUrl(response.data.review.userInfo?.avatar) || "",
            },
            reviewer: response.data.review.reviewer
              ? {
                  ...response.data.review.reviewer,
                  avatar:
                    resolveApiAssetUrl(response.data.review.reviewer.avatar) ||
                    "",
                }
              : undefined,
          },
          receivedReviews: (response.data.receivedReviews || []).map(
            hydrateHistoryItem,
          ),
          givenReviews: (response.data.givenReviews || []).map(
            hydrateHistoryItem,
          ),
        });
      }
    } catch (error) {
      console.error("Failed to load review detail:", error);
    } finally {
      setIsLoading(false);
    }
  }, [hydrateHistoryItem, review?.id]);

  useEffect(() => {
    if (isOpen && review?.id) {
      loadDetail();
      setActiveTab("Received");
      setShowDeleteConfirm(false);
      setIsEditing(false);
    } else {
      setDetail(null);
    }
  }, [isOpen, review?.id, loadDetail]);

  useEffect(() => {
    if (detail?.review) {
      setEditComment(detail.review.comment);
      return;
    }

    if (review) {
      setEditComment(review.comment);
    }
  }, [detail, review]);

  if (!isOpen || !review) return null;

  const currentReview = detail?.review || review;

  const handleFlagToggle = async () => {
    await onUpdate({
      ...currentReview,
      isFlagged: !currentReview.isFlagged,
    });
    await loadDetail();
  };

  const handleSaveEdit = async () => {
    await onUpdate({
      ...currentReview,
      comment: editComment,
    });
    setIsEditing(false);
    await loadDetail();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const currentList =
    activeTab === "Received"
      ? detail?.receivedReviews || []
      : detail?.givenReviews || [];

  return (
    <div
      className="rmo-overlay"
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
        padding: "20px",
        overflowY: "auto",
      }}
    >
      <style>{`
        .rmo-container {
            background-color: white;
            border-radius: 32px;
            width: 100%;
            max-width: 800px;
            margin-top: 20px;
            margin-bottom: 20px;
            position: relative;
            padding: 2.5rem;
            border: 1px solid #e5e7eb;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            display: flex;
            flex-direction: column;
        }
        .rmo-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .rmo-tabs-wrapper {
            display: flex;
            justify-content: center;
            margin-bottom: 2.5rem;
        }
        .rmo-tabs {
            background-color: #f3f4f6;
            padding: 6px;
            border-radius: 100px;
            display: flex;
            gap: 4px;
        }
        .rmo-tab-btn {
            padding: 10px 30px;
            border-radius: 100px;
            font-size: 14px;
            font-weight: 800;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
        }
        .rmo-review-card {
            border: 1px solid #e5e7eb;
            border-radius: 28px;
            padding: 1.75rem;
            background-color: #f9fafb;
            margin-bottom: 1.5rem;
        }
        .rmo-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1.25rem;
        }
        .rmo-user-meta {
            display: flex;
            gap: 1rem;
            align-items: center;
            margin-bottom: 1.25rem;
        }
        .rmo-footer-actions {
            display: flex;
            gap: 1rem;
            margin-top: 2rem;
        }
        .rmo-action-btn {
            flex: 1;
            padding: 16px;
            border-radius: 100px;
            font-weight: 800;
            font-size: 15px;
            cursor: pointer;
            transition: all 0.22s;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .rmo-tags-container {
            display: flex;
            gap: 0.75rem;
            flex-wrap: wrap;
        }

        @media (max-width: 768px) {
            .rmo-container {
                padding: 1.5rem;
                border-radius: 24px;
            }
            .rmo-tab-btn {
                padding: 10px 15px;
                flex: 1;
            }
            .rmo-tabs {
                width: 100%;
            }
            .rmo-card-header {
                flex-direction: column;
                gap: 0.5rem;
            }
            .rmo-user-meta {
                flex-direction: column;
                align-items: center;
                text-align: center;
            }
            .rmo-footer-actions {
                flex-direction: column;
            }
            .rmo-action-btn {
                width: 100%;
            }
            .rmo-tags-container {
                justify-content: center;
            }
        }
      `}</style>
      <div className="rmo-container" onClick={(e) => e.stopPropagation()}>
        <div className="rmo-header">
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "#f3f4f6",
              cursor: "pointer",
              padding: "0.6rem",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#374151",
            }}
          >
            <ArrowLeft size={22} />
          </button>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "900", margin: 0 }}>
            Review Details
          </h2>
        </div>

        <div className="rmo-tabs-wrapper">
          <div className="rmo-tabs">
            <button
              onClick={() => setActiveTab("Given")}
              className="rmo-tab-btn"
              style={{
                backgroundColor:
                  activeTab === "Given" ? "white" : "transparent",
                color: activeTab === "Given" ? "#38AC57" : "#6B7280",
                boxShadow:
                  activeTab === "Given"
                    ? "0 4px 6px -1px rgba(0,0,0,0.1)"
                    : "none",
              }}
            >
              Ratings Given
            </button>
            <button
              onClick={() => setActiveTab("Received")}
              className="rmo-tab-btn"
              style={{
                backgroundColor:
                  activeTab === "Received" ? "white" : "transparent",
                color: activeTab === "Received" ? "#38AC57" : "#6B7280",
                boxShadow:
                  activeTab === "Received"
                    ? "0 4px 6px -1px rgba(0,0,0,0.1)"
                    : "none",
              }}
            >
              Ratings Received
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {isLoading ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "#6B7280",
                fontWeight: "700",
              }}
            >
              Loading review details...
            </div>
          ) : currentList.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "#9CA3AF",
                fontWeight: "700",
              }}
            >
              No {activeTab.toLowerCase()} reviews found.
            </div>
          ) : (
            currentList.map((item, idx) => (
              <div key={idx} className="rmo-review-card">
                <div className="rmo-card-header">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={18}
                        fill={i < item.rating ? "#FBBF24" : "none"}
                        color="#FBBF24"
                      />
                    ))}
                    <span
                      style={{
                        marginLeft: "8px",
                        fontWeight: "900",
                        fontSize: "18px",
                        color: "#111827",
                      }}
                    >
                      {item.rating.toFixed(1)}
                    </span>
                  </div>
                  <div
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      border: "2px solid #38AC57",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: "#38AC57",
                      }}
                    ></div>
                  </div>
                </div>

                <div className="rmo-user-meta">
                  <UserAvatar
                    src={item.avatar}
                    name={item.userName}
                    rating={item.rating}
                    size={56}
                    showBadge={true}
                  />
                  <div style={{ flex: 1, textAlign: "inherit" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                        justifyContent: "inherit",
                      }}
                    >
                      <span style={{ fontWeight: "800", fontSize: "16px" }}>
                        {item.userName}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#38AC57",
                          backgroundColor: "#eef7f0",
                          padding: "2px 10px",
                          borderRadius: "8px",
                          fontWeight: "800",
                          textTransform: "uppercase",
                        }}
                      >
                        {item.userType}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#9CA3AF",
                        fontWeight: "600",
                      }}
                    >
                      {item.date}
                    </span>
                  </div>
                  <div
                    style={{
                      backgroundColor: "#38AC57",
                      color: "white",
                      padding: "6px 20px",
                      borderRadius: "100px",
                      fontSize: "12px",
                      fontWeight: "800",
                    }}
                  >
                    {item.status}
                  </div>
                </div>

                {isEditing && item.id === currentReview.id ? (
                  <textarea
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    placeholder="Update review comment..."
                    style={{
                      width: "100%",
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      color: "#111827",
                      borderRadius: "16px",
                      padding: "1.25rem",
                      fontSize: "14px",
                      minHeight: "120px",
                      marginBottom: "1.5rem",
                      outline: "none",
                      lineHeight: "1.6",
                    }}
                  />
                ) : (
                  <p
                    style={{
                      margin: "0 0 1.5rem 0",
                      color: "#4B5563",
                      fontSize: "14px",
                      lineHeight: "1.7",
                      fontWeight: "500",
                    }}
                  >
                    {item.comment}
                  </p>
                )}

                <div className="rmo-tags-container">
                  {item.tags.map((tag: string, tIdx: number) => (
                    <span
                      key={tIdx}
                      style={{
                        backgroundColor: "#fff",
                        color: "#38AC57",
                        border: "1px solid #38AC57",
                        padding: "6px 14px",
                        borderRadius: "10px",
                        fontSize: "12px",
                        fontWeight: "800",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rmo-footer-actions">
          <button
            onClick={handleFlagToggle}
            className="rmo-action-btn"
            style={{
              backgroundColor: "white",
              border: "2px solid #e5e7eb",
              color: "#374151",
            }}
          >
            {currentReview.isFlagged ? "Unflag Review" : "Flag Review"}
          </button>
          {isEditing ? (
            <button
              onClick={handleSaveEdit}
              className="rmo-action-btn"
              style={{
                backgroundColor: "#38AC57",
                color: "white",
              }}
            >
              Save Changes
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="rmo-action-btn"
              style={{
                backgroundColor: "#111827",
                color: "white",
              }}
            >
              Edit Review
            </button>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rmo-action-btn"
            style={{
              backgroundColor: "#EF4444",
              color: "white",
            }}
          >
            Delete Permanently
          </button>
        </div>

        {showDeleteConfirm && (
          <div
            style={{
              position: "fixed",
              bottom: "2rem",
              right: "2rem",
              backgroundColor: "white",
              padding: "1.5rem 2rem",
              borderRadius: "100px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
              border: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              zIndex: 1100,
              color: "#111827",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                backgroundColor: "#111827",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              <span style={{ fontSize: "20px", fontWeight: "bold" }}>i</span>
            </div>
            <span style={{ fontWeight: "700", fontSize: "16px" }}>
              Review has been deleted
            </span>
            <button
              onClick={() => {
                if (currentReview) {
                  onDelete(currentReview.id);
                  setShowDeleteConfirm(false);
                  onClose();
                }
              }}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                fontWeight: "800",
                color: "#38AC57",
                fontSize: "14px",
                marginLeft: "1rem",
              }}
            >
              Undo
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "#9CA3AF",
              }}
            >
              <X size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
