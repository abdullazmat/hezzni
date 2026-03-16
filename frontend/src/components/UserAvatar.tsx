import React, { useEffect, useMemo, useState } from "react";

/**
 * Generate a deterministic numeric hash from a string.
 * Used to pick a consistent placeholder avatar per user.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Pre-defined set of placeholder avatar URLs so the UI always shows a photo. */
const PLACEHOLDER_AVATARS = [
  "https://randomuser.me/api/portraits/men/32.jpg",
  "https://randomuser.me/api/portraits/women/44.jpg",
  "https://randomuser.me/api/portraits/men/75.jpg",
  "https://randomuser.me/api/portraits/women/68.jpg",
  "https://randomuser.me/api/portraits/men/22.jpg",
  "https://randomuser.me/api/portraits/women/17.jpg",
  "https://randomuser.me/api/portraits/men/46.jpg",
  "https://randomuser.me/api/portraits/women/26.jpg",
  "https://randomuser.me/api/portraits/men/64.jpg",
  "https://randomuser.me/api/portraits/women/55.jpg",
  "https://randomuser.me/api/portraits/men/11.jpg",
  "https://randomuser.me/api/portraits/women/90.jpg",
  "https://randomuser.me/api/portraits/men/85.jpg",
  "https://randomuser.me/api/portraits/women/33.jpg",
  "https://randomuser.me/api/portraits/men/51.jpg",
  "https://randomuser.me/api/portraits/women/72.jpg",
];

// Single default avatar used for admin accounts when API does not return one.
const DEFAULT_ADMIN_AVATAR = "/default-admin-avatar.svg";

function isAdminIdentity(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return normalized === "admin" || normalized.includes("super admin");
}

interface UserAvatarProps {
  src?: string | null;
  name?: string;
  rating?: number;
  showBadge?: boolean;
  size?: number;
  className?: string;
  variant?: "default" | "verification";
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name = "",
  rating,
  showBadge = false,
  size = 48,
  className = "",
  variant = "default",
}) => {
  const [hasImageError, setHasImageError] = useState(false);
  const isVerificationVariant = variant === "verification";
  const effectiveRating =
    typeof rating === "number" && rating > 0 ? rating : 4.8;

  // Deterministic placeholder: same name always gets the same photo
  const placeholderSrc = useMemo(() => {
    if (isAdminIdentity(name)) {
      return DEFAULT_ADMIN_AVATAR;
    }

    if (name) {
      return PLACEHOLDER_AVATARS[hashString(name) % PLACEHOLDER_AVATARS.length];
    }
    return null;
  }, [name]);

  const effectiveSrc = src || placeholderSrc;
  const showFallback = !effectiveSrc || hasImageError;

  // Scaling factors
  const avatarBorderWidth = Math.max(2, Math.round(size * 0.06));
  const avatarShadow =
    size >= 56 ? "0 12px 28px rgba(15, 23, 42, 0.14)" : "0 0 0 1px #f0f0f0";
  const verificationBadgeSize = Math.max(
    14,
    Math.round(size * (isVerificationVariant ? 0.24 : 0.26)),
  );
  const verificationBadgeOffset = -Math.round(size * 0.03);
  const ratingOffset = -Math.round(size * 0.12);

  useEffect(() => {
    setHasImageError(false);
  }, [effectiveSrc]);

  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "?";

  return (
    <div
      className={`user-avatar-container ${className}`}
      style={{
        position: "relative",
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        maxWidth: `${size}px`,
        flexShrink: 0,
      }}
    >
      {/* Main Avatar Image */}
      {showFallback ? (
        <div
          aria-hidden="true"
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `${avatarBorderWidth}px solid white`,
            boxShadow: avatarShadow,
            boxSizing: "border-box",
            background: "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)",
            color: "#475569",
            fontWeight: 800,
            fontSize: `${Math.round(size * 0.3)}px`,
            letterSpacing: "-0.04em",
          }}
        >
          {initials}
        </div>
      ) : (
        <img
          src={effectiveSrc ?? undefined}
          alt={name}
          onError={() => setHasImageError(true)}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            objectFit: "cover",
            display: "block",
            border: `${avatarBorderWidth}px solid white`,
            boxShadow: avatarShadow,
            boxSizing: "border-box",
          }}
        />
      )}

      {/* Verification Badge */}
      {showBadge && (
        <div
          style={{
            position: "absolute",
            top: `${verificationBadgeOffset}px`,
            right: `${verificationBadgeOffset}px`,
            width: `${verificationBadgeSize}px`,
            height: `${verificationBadgeSize}px`,
            zIndex: 2,
            filter: "drop-shadow(0 6px 12px rgba(15, 23, 42, 0.18))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "transparent",
            borderRadius: "50%",
            padding: "0",
            border: "none",
            overflow: "visible",
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 0L15.208 2.145L19.071 1.607L20.545 5.219L24 7.2L22.861 10.929L24 14.8L20.545 16.781L19.071 20.393L15.208 19.855L12 22L8.792 19.855L4.929 20.393L3.455 16.781L0 14.8L1.139 10.929L0 7.2L3.455 5.219L4.929 1.607L8.792 2.145L12 0Z"
              fill="#111111"
            />
            <path
              d="M7 12L10.5 15.5L17 9"
              stroke="white"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* Rating Badge */}
      <div
        style={{
          position: "absolute",
          bottom: `${ratingOffset}px`,
          left: "50%",
          right: "auto",
          transform: "translateX(-50%)",
          backgroundColor: "white",
          padding: `${Math.max(3, Math.round(size * 0.05))}px ${Math.max(7, Math.round(size * 0.18))}px`,
          borderRadius: "999px",
          boxShadow: "0 10px 22px rgba(15, 23, 42, 0.16)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          fontSize: `${Math.max(10, Math.round(size * 0.24))}px`,
          fontWeight: "800",
          border: "1px solid #eef2f7",
          whiteSpace: "nowrap",
          zIndex: 2,
          boxSizing: "border-box",
          minWidth: `${Math.max(42, Math.round(size * 0.72))}px`,
        }}
      >
        <div
          style={{
            color: "#fbbf24",
            display: "flex",
            alignItems: "center",
          }}
        >
          <svg
            width={Math.max(10, Math.round(size * 0.24))}
            height={Math.max(10, Math.round(size * 0.24))}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z" />
          </svg>
        </div>
        <span style={{ color: "#111827", lineHeight: 1 }}>
          {effectiveRating.toFixed(1)}
        </span>
      </div>
    </div>
  );
};
