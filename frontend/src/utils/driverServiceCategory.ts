export type DriverServiceCategory =
  | "Hezzni Comfort"
  | "Hezzni Standard"
  | "Hezzni XL"
  | "Hezzni Moto"
  | "Hezzni Taxi";

const STORAGE_KEY = "admin.driver.serviceCategory.v1";

const CAR_CATEGORIES: DriverServiceCategory[] = [
  "Hezzni Comfort",
  "Hezzni Standard",
  "Hezzni XL",
];

function isValidCategory(value: unknown): value is DriverServiceCategory {
  return (
    value === "Hezzni Comfort" ||
    value === "Hezzni Standard" ||
    value === "Hezzni XL" ||
    value === "Hezzni Moto" ||
    value === "Hezzni Taxi"
  );
}

function toStorageKey(driverId: number | string): string {
  return String(driverId);
}

export function defaultCategoryForVehicleType(
  vehicleType?: string,
): DriverServiceCategory {
  if (vehicleType === "Motorcycle") return "Hezzni Moto";
  if (vehicleType === "Taxi") return "Hezzni Taxi";
  return "Hezzni Standard";
}

export function loadDriverServiceCategoryMap(): Record<
  string,
  DriverServiceCategory
> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};

    return Object.entries(parsed).reduce<Record<string, DriverServiceCategory>>(
      (acc, [key, value]) => {
        if (isValidCategory(value)) {
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

export function getDriverServiceCategory(
  driverId: number | string | undefined,
  vehicleType?: string,
  fallback?: string,
): DriverServiceCategory {
  if (isValidCategory(fallback)) {
    return fallback;
  }

  if (driverId !== undefined && driverId !== null) {
    const stored = loadDriverServiceCategoryMap()[toStorageKey(driverId)];
    if (stored) return stored;
  }

  return defaultCategoryForVehicleType(vehicleType);
}

export function saveDriverServiceCategory(
  driverId: number | string,
  category: DriverServiceCategory,
): void {
  const current = loadDriverServiceCategoryMap();
  current[toStorageKey(driverId)] = category;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function getAvailableCategoriesForVehicleType(
  vehicleType?: string,
): DriverServiceCategory[] {
  if (vehicleType === "Motorcycle") return ["Hezzni Moto"];
  if (vehicleType === "Taxi") return ["Hezzni Taxi"];
  return CAR_CATEGORIES;
}
