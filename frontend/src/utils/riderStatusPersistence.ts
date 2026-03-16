export type PersistedRiderStatus = "Active" | "Suspended";

const STORAGE_KEY = "admin.rider.status.v1";

function isValidStatus(value: unknown): value is PersistedRiderStatus {
  return value === "Active" || value === "Suspended";
}

function toStorageKey(riderId: number | string): string {
  return String(riderId);
}

export function normalizeRiderStatus(rawStatus?: string): PersistedRiderStatus {
  const status = String(rawStatus || "").toLowerCase();
  if (status === "active") return "Active";
  if (status === "suspended" || status === "blocked" || status === "inactive") {
    return "Suspended";
  }
  return "Active";
}

export function loadRiderStatusMap(): Record<string, PersistedRiderStatus> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};

    return Object.entries(parsed).reduce<Record<string, PersistedRiderStatus>>(
      (acc, [key, value]) => {
        if (isValidStatus(value)) {
          acc[key] = value;
        }
        return acc;
      },
      {},
    );
  } catch {
    return {};
  }
}

export function getRiderStatus(
  riderId: number | string | undefined,
  apiStatus?: string,
): PersistedRiderStatus {
  if (riderId !== undefined && riderId !== null) {
    const stored = loadRiderStatusMap()[toStorageKey(riderId)];
    if (stored) return stored;
  }

  return normalizeRiderStatus(apiStatus);
}

export function saveRiderStatus(
  riderId: number | string,
  status: PersistedRiderStatus,
): void {
  const current = loadRiderStatusMap();
  current[toStorageKey(riderId)] = status;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}
