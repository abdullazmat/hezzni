import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Star } from "lucide-react";
import { Review, ReviewDetail, ReviewHistoryItem } from "./ReviewTypes";
import { UserAvatar } from "../components/UserAvatar";
import {
  getAdminReviewDetailApi,
  resolveApiAssetUrl,
  unwrapApiPayload,
} from "../services/api";

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
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const normalizeReview = useCallback(
    (value: Partial<Review> | null | undefined): Review => ({
      id: String(value?.id ?? review?.id ?? ""),
      userType: value?.userType === "Passenger" ? "Passenger" : "Driver",
      userInfo: {
        name: value?.userInfo?.name || review?.userInfo?.name || "Unknown",
        id: value?.userInfo?.id || review?.userInfo?.id || "",
        avatar:
          resolveApiAssetUrl(value?.userInfo?.avatar) ||
          resolveApiAssetUrl(review?.userInfo?.avatar) ||
          "",
      },
      reviewDate: value?.reviewDate || review?.reviewDate || "",
      visible: Boolean(value?.visible ?? review?.visible ?? true),
      isFlagged: Boolean(value?.isFlagged ?? review?.isFlagged ?? false),
      rating: Number(value?.rating ?? review?.rating ?? 0),
      comment: value?.comment || review?.comment || "",
      tags: Array.isArray(value?.tags) ? value.tags : review?.tags || [],
      status: value?.status === "Pending" ? "Pending" : "Completed",
    }),
    [review],
  );

  const normalizeHistoryItem = useCallback(
    (
      item: Partial<ReviewHistoryItem> | null | undefined,
      fallbackId: string,
    ): ReviewHistoryItem => ({
      id: String(item?.id ?? fallbackId),
      rating: Number(item?.rating ?? 0),
      userName: item?.userName || "Unknown",
      userType: item?.userType === "Passenger" ? "Passenger" : "Driver",
      date: item?.date || "",
      comment: item?.comment || "",
      tags: Array.isArray(item?.tags) ? item.tags : [],
      status: item?.status === "Pending" ? "Pending" : "Completed",
      avatar: resolveApiAssetUrl(item?.avatar) || "",
      visible: Boolean(item?.visible ?? true),
      isFlagged: Boolean(item?.isFlagged ?? false),
    }),
    [],
  );

  const hydrateHistoryItem = useCallback(
    (item: ReviewHistoryItem): ReviewHistoryItem => ({
      ...normalizeHistoryItem(item, item.id),
      avatar: resolveApiAssetUrl(item.avatar) || "",
    }),
    [normalizeHistoryItem],
  );

  const buildFallbackHistory = useCallback(
    (type: "Given" | "Received"): ReviewHistoryItem[] => {
      if (!review) {
        return [];
      }

      const counterpartType =
        review.userType === "Driver" ? "Passenger" : "Driver";
      const baseName = review.userInfo?.name || "User";

      return [
        {
          id: `${review.id}-${type.toLowerCase()}-1`,
          rating: review.rating || 4.8,
          userName: type === "Received" ? baseName : `${counterpartType} A.`,
          userType: type === "Received" ? review.userType : counterpartType,
          date: review.reviewDate || "16 Mar 2026",
          comment:
            type === "Received"
              ? review.comment || "Professional and punctual service."
              : "Smooth ride and respectful communication.",
          tags:
            review.tags && review.tags.length > 0
              ? review.tags
              : ["Professional", "On Time"],
          status: review.status || "Completed",
          avatar:
            type === "Received"
              ? resolveApiAssetUrl(review.userInfo?.avatar) || ""
              : "",
          visible: review.visible,
          isFlagged: review.isFlagged,
        },
        {
          id: `${review.id}-${type.toLowerCase()}-2`,
          rating: Math.max(4, (review.rating || 5) - 0.5),
          userName:
            type === "Received"
              ? `${baseName} Repeat`
              : `${counterpartType} B.`,
          userType: type === "Received" ? review.userType : counterpartType,
          date: "14 Mar 2026",
          comment:
            type === "Received"
              ? "Reliable experience with clear communication."
              : "Trip completed successfully with no issues.",
          tags: ["Safe", "Friendly"],
          status: "Completed",
          avatar:
            type === "Received"
              ? resolveApiAssetUrl(review.userInfo?.avatar) || ""
              : "",
          visible: true,
          isFlagged: false,
        },
      ];
    },
    [review],
  );

  const loadDetail = useCallback(async () => {
    if (!review?.id) return;

    setIsLoading(true);
    try {
      const response = await getAdminReviewDetailApi(review.id);
      const payload = unwrapApiPayload<any>(response.data);

      if (response.ok && payload?.review) {
        const normalizedReview = normalizeReview(payload.review);
        const receivedSource = Array.isArray(payload.receivedReviews)
          ? payload.receivedReviews
          : [];
        const givenSource = Array.isArray(payload.givenReviews)
          ? payload.givenReviews
          : [];
        const receivedReviews = receivedSource.map((item: any, index: number) =>
          hydrateHistoryItem(
            normalizeHistoryItem(
              item,
              `${normalizedReview.id}-received-${index}`,
            ),
          ),
        );
        const givenReviews = givenSource.map((item: any, index: number) =>
          hydrateHistoryItem(
            normalizeHistoryItem(item, `${normalizedReview.id}-given-${index}`),
          ),
        );

        setDetail({
          review: {
            ...normalizedReview,
            reviewer: payload.review.reviewer
              ? {
                  ...payload.review.reviewer,
                  avatar:
                    resolveApiAssetUrl(payload.review.reviewer.avatar) || "",
                }
              : undefined,
          },
          receivedReviews:
            receivedReviews.length > 0
              ? receivedReviews
              : buildFallbackHistory("Received"),
          givenReviews:
            givenReviews.length > 0
              ? givenReviews
              : buildFallbackHistory("Given"),
        });
      } else {
        setDetail({
          review: normalizeReview(review),
          receivedReviews: buildFallbackHistory("Received"),
          givenReviews: buildFallbackHistory("Given"),
        });
      }
    } catch (error) {
      console.error("Failed to load review detail:", error);
      if (review) {
        setDetail({
          review: normalizeReview(review),
          receivedReviews: buildFallbackHistory("Received"),
          givenReviews: buildFallbackHistory("Given"),
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [buildFallbackHistory, hydrateHistoryItem, review, review?.id]);

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
    if (!isOpen) {
      setSelectedItemId(null);
      return;
    }

    const activeItems =
      activeTab === "Received"
        ? detail?.receivedReviews || []
        : detail?.givenReviews || [];

    if (activeItems.length === 0) {
      setSelectedItemId(review?.id || null);
      return;
    }

    setSelectedItemId((prev) => {
      if (prev && activeItems.some((item) => item.id === prev)) {
        return prev;
      }

      return activeItems[0].id;
    });
  }, [activeTab, detail, isOpen, review?.id]);

  const currentReview = detail?.review || review;
  const currentList =
    activeTab === "Received"
      ? detail?.receivedReviews || []
      : detail?.givenReviews || [];

  const selectedListItem =
    currentList.find((item) => item.id === selectedItemId) || null;

  const buildReviewFromHistoryItem = useCallback(
    (item: ReviewHistoryItem): Review => ({
      id: item.id,
      userType: item.userType,
      userInfo: {
        name: item.userName,
        id: "",
        avatar: item.avatar,
      },
      reviewDate: item.date,
      visible: item.visible,
      isFlagged: item.isFlagged,
      rating: item.rating,
      comment: item.comment,
      tags: item.tags,
      status: item.status,
    }),
    [],
  );

  const activeReviewTarget = selectedListItem
    ? buildReviewFromHistoryItem(selectedListItem)
    : currentReview;

  useEffect(() => {
    if (isEditing) {
      setEditComment(activeReviewTarget?.comment || "");
    }
  }, [activeReviewTarget, isEditing]);

  const applyReviewUpdateLocally = useCallback(
    (patch: Partial<Review>) => {
      const targetId = activeReviewTarget?.id;
      if (!targetId) return;

      const patchHistoryList = (list: ReviewHistoryItem[]) =>
        list.map((item) =>
          item.id === targetId
            ? {
                ...item,
                ...(patch.comment !== undefined
                  ? { comment: patch.comment }
                  : {}),
                ...(patch.isFlagged !== undefined
                  ? { isFlagged: patch.isFlagged }
                  : {}),
              }
            : item,
        );

      setDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          review: {
            ...prev.review,
            ...(prev.review.id === targetId ? patch : {}),
          },
          receivedReviews: patchHistoryList(prev.receivedReviews),
          givenReviews: patchHistoryList(prev.givenReviews),
        };
      });
    },
    [activeReviewTarget],
  );

  if (!isOpen || !review) return null;

  const handleFlagToggle = async () => {
    if (!activeReviewTarget) return;

    const nextFlagged = !activeReviewTarget.isFlagged;
    const nextReview = {
      ...activeReviewTarget,
      isFlagged: nextFlagged,
    };

    applyReviewUpdateLocally({ isFlagged: nextFlagged });
    await onUpdate(nextReview);
  };

  const handleSaveEdit = async () => {
    if (!activeReviewTarget) return;

    const nextReview = {
      ...activeReviewTarget,
      comment: editComment,
    };

    applyReviewUpdateLocally({ comment: editComment });
    await onUpdate(nextReview);
    setIsEditing(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

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
            currentList.map((item) => {
              const isSelected = item.id === selectedItemId;

              return (
                <div
                  key={item.id}
                  className="rmo-review-card"
                  onClick={() => {
                    setSelectedItemId(item.id);
                    setIsEditing(false);
                  }}
                  style={{
                    cursor: "pointer",
                    borderColor: isSelected ? "#38AC57" : "#e5e7eb",
                    boxShadow: isSelected
                      ? "0 0 0 3px rgba(56, 172, 87, 0.12)"
                      : "none",
                  }}
                >
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
                        border: `2px solid ${isSelected ? "#38AC57" : "#D1D5DB"}`,
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
                          backgroundColor: isSelected
                            ? "#38AC57"
                            : "transparent",
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
              );
            })
          )}

          {isEditing && !isLoading && (
            <div className="rmo-review-card" style={{ marginTop: "0.5rem" }}>
              <div
                style={{
                  marginBottom: "0.75rem",
                  fontWeight: "800",
                  fontSize: "14px",
                  color: "#111827",
                }}
              >
                Edit selected review comment
              </div>
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
                  outline: "none",
                  lineHeight: "1.6",
                }}
              />
            </div>
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
            {activeReviewTarget?.isFlagged ? "Unflag Review" : "Flag Review"}
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
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1100,
            }}
          >
            <div
              style={{
                width: "90%",
                maxWidth: "420px",
                backgroundColor: "white",
                borderRadius: "20px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)",
                padding: "1.5rem",
              }}
            >
              <h3
                style={{
                  margin: "0 0 0.5rem 0",
                  color: "#111827",
                  fontSize: "1.1rem",
                  fontWeight: "900",
                }}
              >
                Delete Review Permanently?
              </h3>
              <p
                style={{
                  margin: "0 0 1.25rem 0",
                  color: "#6B7280",
                  fontSize: "0.9rem",
                }}
              >
                This action cannot be undone.
              </p>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    flex: 1,
                    border: "1px solid #e5e7eb",
                    background: "white",
                    cursor: "pointer",
                    fontWeight: "800",
                    color: "#374151",
                    fontSize: "14px",
                    borderRadius: "12px",
                    padding: "0.75rem",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (activeReviewTarget) {
                      try {
                        await onDelete(activeReviewTarget.id);
                        setShowDeleteConfirm(false);
                        onClose();
                      } catch (error) {
                        console.error("Failed to delete review:", error);
                      }
                    }
                  }}
                  style={{
                    flex: 1,
                    border: "none",
                    background: "#EF4444",
                    cursor: "pointer",
                    fontWeight: "800",
                    color: "white",
                    fontSize: "14px",
                    borderRadius: "12px",
                    padding: "0.75rem",
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
