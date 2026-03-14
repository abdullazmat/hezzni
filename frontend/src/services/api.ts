// API Service for Ezzni Admin Dashboard
// Base URL comes from VITE_API_URL, with same-origin fallback for deployed setups.

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
export const API_BASE_URL = (
  configuredApiUrl || window.location.origin
).replace(/\/+$/, "");

if (!configuredApiUrl) {
  console.warn(
    "VITE_API_URL is not set. Falling back to window.location.origin for API requests.",
  );
}

export function resolveApiUrl(path: string): string {
  if (!path) {
    return API_BASE_URL;
  }

  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:")
  ) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function resolveApiAssetUrl(assetPath?: string | null): string {
  if (!assetPath) {
    return "";
  }

  if (
    assetPath.startsWith("http://") ||
    assetPath.startsWith("https://") ||
    assetPath.startsWith("data:")
  ) {
    return assetPath;
  }

  if (assetPath.startsWith("/uploads/")) {
    return resolveApiUrl(assetPath);
  }

  if (assetPath.startsWith("uploads/")) {
    return resolveApiUrl(assetPath);
  }

  return resolveApiUrl(`/uploads/drivers/${assetPath}`);
}

// ─── Helper ─────────────────────────────────────────────────────────────────

interface ApiResponse<T = Record<string, unknown>> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
}

async function request<T = Record<string, unknown>>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem("token");

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  // Only set application/json if body is not FormData
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(resolveApiUrl(endpoint), {
    ...options,
    headers,
  });

  // Try to parse JSON; fallback to empty object
  let data: T;
  try {
    data = await response.json();
  } catch {
    data = {} as T;
  }

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

function buildQuery(
  params?: Record<string, string | number | boolean | null | undefined>,
): string {
  if (!params) {
    return "";
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function unwrapApiPayload<T = unknown>(payload: unknown): T {
  const visited = new Set<unknown>();
  let current = payload;

  while (
    current &&
    typeof current === "object" &&
    !Array.isArray(current) &&
    "data" in current &&
    !visited.has(current)
  ) {
    visited.add(current);
    current = (current as { data: unknown }).data;
  }

  return current as T;
}

export function extractArrayPayload(
  payload: unknown,
  preferredKeys: string[] = [],
): unknown[] {
  const unwrapped = unwrapApiPayload(payload);

  if (Array.isArray(unwrapped)) {
    return unwrapped;
  }

  if (!unwrapped || typeof unwrapped !== "object") {
    return [];
  }

  const record = unwrapped as Record<string, unknown>;

  for (const key of preferredKeys) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }

  for (const value of Object.values(record)) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

// ─── Auth Endpoints ─────────────────────────────────────────────────────────

// Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role?: string;
    avatar?: string;
    avatarUrl?: string;
    status?: string;
    [key: string]: unknown;
  };
  message?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message?: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResponse {
  message?: string;
}

export interface LogoutResponse {
  message?: string;
}

// Admin User Profile Types
export interface AdminProfile {
  id: number;
  name: string;
  email: string;
  status: "Available" | "Inactive";
  avatar: string | null;
  role: string;
  language?: "EN" | "AR" | "FR";
}

export interface EmploymentDetails {
  department: string | null;
  manager: string | null;
  jobTitle: string | null;
  location: string | null;
  timezone: string | null;
  phone: string | null;
  onboardingDate: string | null;
}

export interface LoginHistoryItem {
  id: number;
  login_time: string;
  logout_time: string | null;
  ip_address: string | null;
}

export interface DashboardRegion {
  id: number;
  name: string;
}

export interface DashboardStats {
  totalTripsToday: number;
  activeDrivers: number;
  totalEarnings: number;
  dailyBonusEarned: number;
  vsYesterday: {
    totalTripsToday: number;
    activeDrivers: number;
    totalEarnings: number;
    dailyBonusEarned: number;
  };
}

export interface DashboardTripsChartPoint {
  label: string;
  CAR_RIDES: number;
  MOTORCYCLE: number;
  TAXI: number;
  TOTAL: number;
}

export interface DashboardTripsChart {
  period: "daily" | "weekly" | "monthly";
  serviceTypes: Array<"CAR_RIDES" | "MOTORCYCLE" | "TAXI">;
  data: DashboardTripsChartPoint[];
}

export interface DashboardTopRegion {
  regionId: number;
  regionName: string;
  trips: number;
  activeDrivers: number;
  growthPercent: number;
}

export interface DashboardTripsByRegionItem {
  regionName: string;
  trips: number;
  percentage: number;
}

export interface DashboardTripsByRegion {
  period: "daily" | "weekly" | "monthly";
  total: number;
  data: DashboardTripsByRegionItem[];
}

export interface DashboardTopPerformer {
  id: number;
  name: string;
  imageUrl: string | null;
  rating: number;
  city: string;
  totalTrips: number;
}

export interface LiveTripsStats {
  totalArchived: number;
  completed: number;
  cancelled: number;
  totalEarnings: number;
  commission: {
    percentage: number;
    earned: number;
  };
}

export interface LiveTripPerson {
  name: string;
  id: string;
  rating: number;
  img: string | null;
}

export interface LiveTripRow {
  id: string;
  service: string;
  rider: LiveTripPerson;
  driver: LiveTripPerson;
  vehicle: string;
  time: string;
  duration: string;
  status: string;
  fare: string;
  paymentMethod: string;
}

export interface LiveTripsList {
  trips: LiveTripRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LiveTripDetail {
  tripInfo: {
    id: string;
    startTime: string | null;
    endTime: string | null;
    distance: string | null;
    status: string;
  };
  passenger: {
    fullName: string;
    customerId: string;
    category: string;
    gender: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    imageUrl: string | null;
    rating: number | null;
  };
  driver: {
    fullName: string;
    driverId: string;
    vehicleType: string;
    gender: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    imageUrl: string | null;
    rating: number;
  };
  vehicle: {
    driverId: string;
    colour: string | null;
    licencePlate: string | null;
    makeModel: string | null;
    year: string | null;
    joinDate: string | null;
  };
  route: {
    pickupAddress: string | null;
    dropoffAddress: string | null;
  };
  payment: {
    method?: string | null;
    totalAmount?: string | null;
    tva?: string | null;
    serviceFee?: string | null;
    discount?: string | null;
  } | null;
}

export interface LiveTripsFilterOption {
  id: number;
  name: string;
}

export interface LiveTripsServiceTypeOption {
  id: number;
  name: string;
  displayName: string;
}

export interface LiveTripsRidePreferenceOption {
  id: number;
  name: string;
  preferenceKey: string;
  description: string;
  basePrice: string;
}

export interface RideAssignmentStats {
  waitingCustomers: number;
  availableDrivers: number;
  activeAssignments: number;
  completedToday: number;
}

export interface RideAssignmentPreference {
  id: number;
  name: string;
  preferenceKey: string;
  description: string;
  basePrice: string;
  passengerServiceId: number | null;
}

export interface RideAssignmentPassengerService {
  id: number;
  name: string;
  iconUrl: string | null;
}

export interface RideAssignmentCity {
  id: number;
  name: string;
}

export interface RideAssignmentCustomer {
  id: number;
  displayId: string;
  name: string;
  email: string | null;
  phone: string | null;
  imageUrl: string | null;
  rating: number;
  totalTrips: number;
  city: string | null;
}

export interface RideAssignmentWaitingCustomer {
  tripId: number;
  passengerId: number;
  displayId: string;
  name: string;
  email: string | null;
  phone: string | null;
  imageUrl: string | null;
  rating: number;
  city: string | null;
  category: string | null;
  from: string;
  to: string;
  price: string;
  distance: string;
  time: string;
  status: string;
}

export interface RideAssignmentDriver {
  id: number;
  displayId: string;
  name: string;
  email: string | null;
  phone: string | null;
  imageUrl: string | null;
  rating: number;
  trips: number;
  isOnline?: boolean;
  isAvailable?: boolean;
  city: string | null;
  gender: string | null;
  serviceType: string | null;
  vehicleType: string | null;
  joinDate?: string | null;
}

export interface RideAssignmentRecentAssignment {
  id: string;
  numericId: number;
  service: string;
  rider: {
    name: string;
    id: string;
    img: string | null;
    rating: number;
  };
  driver: {
    name: string;
    id: string;
    img: string | null;
    rating: number;
  };
  vehicle: string | null;
  city: string;
  time: string;
  duration: string;
  status: string;
  fare: string;
  paymentMethod: string;
  notes: string | null;
}

export interface RideAssignmentDetail {
  tripInfo: {
    id: string;
    startTime: string | null;
    endTime: string | null;
    distance: string | null;
    status: string;
    notes?: string | null;
    isManualAssignment?: boolean;
  };
  passenger: {
    fullName: string;
    customerId: string;
    category: string;
    gender: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    imageUrl: string | null;
    rating: number | null;
  };
  driver: {
    fullName: string;
    driverId: string;
    vehicleType: string;
    gender: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    imageUrl: string | null;
    rating: number;
  };
  vehicle: {
    driverId: string;
    colour: string | null;
    licencePlate: string | null;
    makeModel: string | null;
    year: string | null;
    joinDate: string | null;
  };
  route: {
    pickupAddress: string | null;
    dropoffAddress: string | null;
  };
  payment: {
    method?: string | null;
    totalAmount?: string | null;
    tva?: string | null;
    serviceFee?: string | null;
    discount?: string | null;
  } | null;
}

export interface CreateRideAssignmentRequest {
  passengerId: number;
  driverId: number;
  passengerServiceId?: number;
  cityId?: number;
  categoryIds?: number[];
  notes?: string;
  requestId?: number;
}

// ─── API Functions ──────────────────────────────────────────────────────────

/**
 * POST /api/admin/auth/login
 */
export async function loginApi(
  payload: LoginRequest,
): Promise<ApiResponse<LoginResponse>> {
  return request<LoginResponse>("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * POST /api/admin/auth/forgot-password
 */
export async function forgotPasswordApi(
  payload: ForgotPasswordRequest,
): Promise<ApiResponse<ForgotPasswordResponse>> {
  return request<ForgotPasswordResponse>("/api/admin/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * POST /api/admin/auth/reset-password
 */
export async function resetPasswordApi(
  payload: ResetPasswordRequest,
): Promise<ApiResponse<ResetPasswordResponse>> {
  return request<ResetPasswordResponse>("/api/admin/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * POST /api/admin/auth/change-password
 */
export async function changePasswordApi(
  payload: ChangePasswordRequest,
): Promise<ApiResponse<ChangePasswordResponse>> {
  return request<ChangePasswordResponse>("/api/admin/auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * POST /api/admin/auth/logout
 */
export async function logoutApi(): Promise<ApiResponse<LogoutResponse>> {
  return request<LogoutResponse>("/api/admin/auth/logout", {
    method: "POST",
  });
}

// ─── Admin User Endpoints ────────────────────────────────────────────────────

/**
 * GET /api/admin/user/profile
 */
export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  status: "Available" | "Inactive";
  avatar: string | null;
  department: string | null;
  job_title: string | null;
  city: string | null;
  employee_id: string | null;
  last_login: string | null;
  last_logout: string | null;
}

export interface TeamStats {
  totalMembers: number;
  active: number;
  admins: number;
  onlineToday: number;
}

export interface AddTeamMemberRequest {
  name: string;
  email: string;
  password: string;
  employeeId?: string;
  jobTitle?: string;
  role?: string;
  department?: string;
  city?: string;
  message?: string;
}

export interface UpdateTeamMemberRequest {
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  department?: string;
  jobTitle?: string;
  city?: string;
}

export async function getAdminProfileApi(): Promise<ApiResponse<AdminProfile>> {
  return request<AdminProfile>("/api/admin/user/profile", {
    method: "GET",
  });
}

/**
 * PUT /api/admin/user/profile
 * Expects FormData (name, email, role, avatar)
 */
export async function updateAdminProfileApi(
  formData: FormData,
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>("/api/admin/user/profile", {
    method: "PUT",
    body: formData,
  });
}

/**
 * PUT /api/admin/user/status
 */
export async function updateAdminStatusApi(
  status: "Available" | "Inactive",
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>("/api/admin/user/status", {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

/**
 * PUT /api/admin/user/language
 */
export async function updateAdminLanguageApi(
  language: "EN" | "AR" | "FR",
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>("/api/admin/user/language", {
    method: "PUT",
    body: JSON.stringify({ language }),
  });
}

/**
 * GET /api/admin/user/login-history
 */
export async function getLoginHistoryApi(): Promise<
  ApiResponse<LoginHistoryItem[]>
> {
  return request<LoginHistoryItem[]>("/api/admin/user/login-history", {
    method: "GET",
  });
}

/**
 * GET /api/admin/user/employment-details
 */
export async function getEmploymentDetailsApi(): Promise<
  ApiResponse<EmploymentDetails>
> {
  return request<EmploymentDetails>("/api/admin/user/employment-details", {
    method: "GET",
  });
}

/**
 * PUT /api/admin/user/employment-details
 */
export async function updateEmploymentDetailsApi(
  payload: EmploymentDetails,
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>("/api/admin/user/employment-details", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getPrivacyPolicyApi(): Promise<
  ApiResponse<{ content: string }>
> {
  return request<{ content: string }>("/api/admin/settings/privacy-policy");
}

export async function getTermsOfServiceApi(): Promise<
  ApiResponse<{ content: string }>
> {
  return request<{ content: string }>("/api/admin/settings/terms-of-service");
}

export async function getTeamMembersApi(): Promise<ApiResponse<TeamMember[]>> {
  return request<TeamMember[]>("/api/admin/team/members");
}

/**
 * GET /api/admin/team/stats
 */
export async function getTeamStatsApi(): Promise<ApiResponse<TeamStats>> {
  return request<TeamStats>("/api/admin/team/stats");
}

/**
 * POST /api/admin/team/members
 */
export async function addTeamMemberApi(
  payload: AddTeamMemberRequest,
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>("/api/admin/team/members", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * PATCH /api/admin/team/members/:id
 */
export async function updateTeamMemberApi(
  id: number,
  payload: UpdateTeamMemberRequest,
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>(`/api/admin/team/members/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/**
 * POST /api/admin/team/members/:id/delete
 */
export async function deleteTeamMemberApi(
  id: number,
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>(`/api/admin/team/members/${id}/delete`, {
    method: "POST",
  });
}

// ─── Profile Endpoints ─────────────────────────────────────────────────────

/**
 * GET /api/admin/profile
 */
export async function getProfileApi(): Promise<ApiResponse<AdminProfile>> {
  return request<AdminProfile>("/api/admin/profile");
}

/**
 * PATCH /api/admin/profile
 */
export async function updateProfileApi(
  formData: FormData,
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>("/api/admin/profile", {
    method: "PATCH",
    body: formData,
  });
}

/**
 * POST /api/admin/profile/change-password
 */
export async function profileChangePasswordApi(
  payload: ChangePasswordRequest,
): Promise<ApiResponse<ChangePasswordResponse>> {
  return request<ChangePasswordResponse>("/api/admin/profile/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * POST /api/admin/profile/logout
 */
export async function profileLogoutApi(): Promise<ApiResponse<LogoutResponse>> {
  return request<LogoutResponse>("/api/admin/profile/logout", {
    method: "POST",
  });
}

// ─── Dashboard Endpoints ───────────────────────────────────────────────────

export async function getDashboardRegionsApi(): Promise<
  ApiResponse<DashboardRegion[]>
> {
  return request<DashboardRegion[]>("/api/admin/dashboard/regions");
}

export async function getDashboardStatsApi(params?: {
  regionId?: number;
}): Promise<ApiResponse<DashboardStats>> {
  return request<DashboardStats>(
    `/api/admin/dashboard/stats${buildQuery(params)}`,
  );
}

export async function getDashboardTripsChartApi(params?: {
  period?: "daily" | "weekly" | "monthly";
  regionId?: number;
}): Promise<ApiResponse<DashboardTripsChart>> {
  return request<DashboardTripsChart>(
    `/api/admin/dashboard/trips-chart${buildQuery(params)}`,
  );
}

export async function getDashboardTopRegionsApi(params?: {
  limit?: number;
  regionId?: number;
}): Promise<ApiResponse<DashboardTopRegion[]>> {
  return request<DashboardTopRegion[]>(
    `/api/admin/dashboard/top-regions${buildQuery(params)}`,
  );
}

export async function getDashboardTripsByRegionApi(params?: {
  period?: "daily" | "weekly" | "monthly";
  regionId?: number;
}): Promise<ApiResponse<DashboardTripsByRegion>> {
  return request<DashboardTripsByRegion>(
    `/api/admin/dashboard/trips-by-region${buildQuery(params)}`,
  );
}

export async function getDashboardTopPerformersApi(params?: {
  type?: "driver" | "passenger";
  limit?: number;
  regionId?: number;
}): Promise<ApiResponse<DashboardTopPerformer[]>> {
  return request<DashboardTopPerformer[]>(
    `/api/admin/dashboard/top-performers${buildQuery(params)}`,
  );
}

export async function getLiveTripsStatsApi(params?: {
  period?: "today" | "yesterday" | "last_week" | "last_month";
  cityId?: number;
  serviceTypeId?: number;
}): Promise<ApiResponse<LiveTripsStats>> {
  return request<LiveTripsStats>(`/api/admin/trips/stats${buildQuery(params)}`);
}

export async function getLiveTripsApi(params?: {
  search?: string;
  status?:
    | "PENDING"
    | "MATCHED"
    | "ACCEPTED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED";
  cityId?: number;
  serviceTypeId?: number;
  period?: "today" | "yesterday" | "last_week" | "last_month";
  page?: number;
  limit?: number;
}): Promise<ApiResponse<LiveTripsList>> {
  return request<LiveTripsList>(`/api/admin/trips${buildQuery(params)}`);
}

export async function getLiveTripDetailApi(
  tripId: string | number,
): Promise<ApiResponse<LiveTripDetail>> {
  return request<LiveTripDetail>(`/api/admin/trips/${tripId}`);
}

export async function getLiveTripsCitiesApi(): Promise<
  ApiResponse<LiveTripsFilterOption[]>
> {
  return request<LiveTripsFilterOption[]>("/api/admin/filters/cities");
}

export async function getLiveTripsServiceTypesApi(): Promise<
  ApiResponse<LiveTripsServiceTypeOption[]>
> {
  return request<LiveTripsServiceTypeOption[]>(
    "/api/admin/filters/service-types",
  );
}

export async function getLiveTripsRidePreferencesApi(): Promise<
  ApiResponse<LiveTripsRidePreferenceOption[]>
> {
  return request<LiveTripsRidePreferenceOption[]>(
    "/api/admin/filters/ride-preferences",
  );
}

export async function getRideAssignmentStatsApi(): Promise<
  ApiResponse<RideAssignmentStats>
> {
  return request<RideAssignmentStats>("/api/admin/ride-assignment/stats");
}

export async function getRideAssignmentPreferencesApi(): Promise<
  ApiResponse<RideAssignmentPreference[]>
> {
  return request<RideAssignmentPreference[]>(
    "/api/admin/ride-assignment/preferences",
  );
}

export async function getRideAssignmentPassengerServicesApi(): Promise<
  ApiResponse<RideAssignmentPassengerService[]>
> {
  return request<RideAssignmentPassengerService[]>(
    "/api/admin/ride-assignment/passenger-services",
  );
}

export async function getRideAssignmentCitiesApi(): Promise<
  ApiResponse<RideAssignmentCity[]>
> {
  return request<RideAssignmentCity[]>("/api/admin/ride-assignment/cities");
}

export async function getRideAssignmentCustomersApi(params?: {
  search?: string;
}): Promise<ApiResponse<RideAssignmentCustomer[]>> {
  return request<RideAssignmentCustomer[]>(
    `/api/admin/ride-assignment/customers${buildQuery(params)}`,
  );
}

export async function getRideAssignmentDriversApi(params?: {
  search?: string;
  cityId?: number;
}): Promise<ApiResponse<RideAssignmentDriver[]>> {
  return request<RideAssignmentDriver[]>(
    `/api/admin/ride-assignment/drivers${buildQuery(params)}`,
  );
}

export async function getRideAssignmentWaitingCustomersApi(): Promise<
  ApiResponse<RideAssignmentWaitingCustomer[]>
> {
  return request<RideAssignmentWaitingCustomer[]>(
    "/api/admin/ride-assignment/waiting-customers",
  );
}

export async function getRideAssignmentAvailableDriversApi(): Promise<
  ApiResponse<RideAssignmentDriver[]>
> {
  return request<RideAssignmentDriver[]>(
    "/api/admin/ride-assignment/available-drivers",
  );
}

export async function createRideAssignmentApi(
  payload: CreateRideAssignmentRequest,
): Promise<ApiResponse<{ message: string; tripId: number }>> {
  return request<{ message: string; tripId: number }>(
    "/api/admin/ride-assignment/assign",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function getRideAssignmentRecentApi(): Promise<
  ApiResponse<RideAssignmentRecentAssignment[]>
> {
  return request<RideAssignmentRecentAssignment[]>(
    "/api/admin/ride-assignment/recent",
  );
}

export async function getRideAssignmentDetailApi(
  tripId: string | number,
): Promise<ApiResponse<RideAssignmentDetail>> {
  return request<RideAssignmentDetail>(`/api/admin/ride-assignment/${tripId}`);
}

export async function cancelRideAssignmentApi(
  tripId: string | number,
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>(
    `/api/admin/ride-assignment/${tripId}/cancel`,
    {
      method: "POST",
    },
  );
}

export async function createDriverApi(
  payload: any,
): Promise<ApiResponse<{ message: string; id: number }>> {
  return request<{ message: string; id: number }>("/api/drivers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getRidersApi(): Promise<ApiResponse<Passenger[]>> {
  return request<Passenger[]>("/api/riders");
}

// ─── Passenger Endpoints ───────────────────────────────────────────────────

export interface Passenger {
  id: number;
  phone: string;
  name: string;
  email: string;
  imageUrl: string | null;
  dob: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  cityId: number | null;
  isRegistered: boolean;
  createdAt: string;
}

export interface PassengerLoginResponse {
  status: string;
  message: string;
  data: {
    token: string;
    user: Passenger;
    isRegistered: boolean;
  };
  timestamp: string;
}

export interface PassengerProfileResponse {
  status: string;
  message: string;
  data: {
    user: Passenger;
  };
  timestamp: string;
}

export interface PassengerService {
  id: number;
  name: string;
  icon_url: string | null;
}

export interface RideOption {
  id: number;
  ridePreference: string;
  ridePreferenceKey: string;
  description: string;
  price: number;
}

export interface CalculateRidePriceRequest {
  pickup: {
    latitude: number;
    longitude: number;
    address: string;
  };
  dropoff: {
    latitude: number;
    longitude: number;
    address: string;
  };
  passengerServiceId: number;
  couponCode?: string;
}

export interface CalculateRidePriceResponse {
  status: string;
  message: string;
  data: {
    passengerService: PassengerService;
    distance: number;
    estimatedDuration: number;
    pickup: CalculateRidePriceRequest["pickup"];
    dropoff: CalculateRidePriceRequest["dropoff"];
    options: RideOption[];
    coupon?: {
      id: number;
      code: string;
      discountAmount: number;
    };
  };
  timestamp: string;
}

export interface City {
  id: number;
  name: string;
  status: string;
}

/**
 * POST /api/passenger/login
 */
export async function passengerLoginApi(
  phone: string,
): Promise<ApiResponse<PassengerLoginResponse>> {
  return request<PassengerLoginResponse>("/api/passenger/login", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

/**
 * POST /api/passenger/complete-registration
 */
export async function completePassengerRegistrationApi(
  formData: FormData,
): Promise<ApiResponse<PassengerProfileResponse>> {
  return request<PassengerProfileResponse>(
    "/api/passenger/complete-registration",
    {
      method: "POST",
      body: formData,
    },
  );
}

/**
 * GET /api/passenger/profile
 */
export async function getPassengerProfileApi(): Promise<
  ApiResponse<PassengerProfileResponse>
> {
  return request<PassengerProfileResponse>("/api/passenger/profile", {
    method: "GET",
  });
}

/**
 * PUT /api/passenger/profile
 */
export async function updatePassengerProfileApi(
  formData: FormData,
): Promise<ApiResponse<PassengerProfileResponse>> {
  return request<PassengerProfileResponse>("/api/passenger/profile", {
    method: "PUT",
    body: formData,
  });
}

/**
 * GET /api/passenger/services
 */
export async function getPassengerServicesApi(): Promise<
  ApiResponse<{ status: string; data: PassengerService[] }>
> {
  return request<{ status: string; data: PassengerService[] }>(
    "/api/passenger/services",
    {
      method: "GET",
    },
  );
}

/**
 * POST /api/passenger/calculate-ride-price
 */
export async function calculateRidePriceApi(
  payload: CalculateRidePriceRequest,
): Promise<ApiResponse<CalculateRidePriceResponse>> {
  return request<CalculateRidePriceResponse>(
    "/api/passenger/calculate-ride-price",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

/**
 * POST /api/coupons/seed
 */
export async function seedCouponApi(): Promise<
  ApiResponse<{ status: string; message: string; data: any }>
> {
  return request<{ status: string; message: string; data: any }>(
    "/api/coupons/seed",
    {
      method: "POST",
    },
  );
}

/**
 * GET /api/coupons/validate/:code
 */
export async function validateCouponApi(
  code: string,
  price: number,
): Promise<ApiResponse<{ status: string; message: string; data: any }>> {
  return request<{ status: string; message: string; data: any }>(
    `/api/coupons/validate/${code}?price=${price}`,
    {
      method: "GET",
    },
  );
}

/**
 * GET /api/cities
 */
export async function getCitiesApi(): Promise<
  ApiResponse<{ status: string; data: City[] }>
> {
  return request<{ status: string; data: City[] }>("/api/cities", {
    method: "GET",
  });
}

// ─── Driver Endpoints ──────────────────────────────────────────────────────

export interface DriverServiceType {
  id: number;
  name: string;
  displayName: string;
}

export interface DriverStatus {
  status: "PENDING" | "APPROVED" | "REJECTED";
  isNationalIdCompleted?: boolean;
  isDriverLicenseCompleted?: boolean;
  isProfessionalCardCompleted?: boolean;
  isVehicleRegistrationCompleted?: boolean;
  isVehicleInsuranceCompleted?: boolean;
  isVehicleDetailsCompleted?: boolean;
  isVehiclePhotosCompleted?: boolean;
  isFaceVerificationCompleted?: boolean;
  isTaxiLicenseCompleted?: boolean;
  rejectionReason?: string;
}

export interface Driver {
  id: number;
  phone: string;
  name: string;
  email: string;
  imageUrl: string | null;
  dob: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  cityId: number | null;
  isRegistered: boolean;
  serviceType: DriverServiceType | null;
  createdAt: string;
  carRideStatus?: DriverStatus;
  motorcycleStatus?: DriverStatus;
  taxiStatus?: DriverStatus;
  rentalProfile?: any;
}

export interface DriverLoginResponse {
  status: string;
  message: string;
  data: {
    token: string;
    user: Driver;
    isRegistered: boolean;
  };
  timestamp: string;
}

export interface DriverProfileResponse {
  status: string;
  message: string;
  data: {
    user: Driver;
  };
  timestamp: string;
}

/**
 * POST /api/driver/login
 */
export async function driverLoginApi(
  phone: string,
): Promise<ApiResponse<DriverLoginResponse>> {
  return request<DriverLoginResponse>("/api/driver/login", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

/**
 * POST /api/driver/complete-registration
 */
export async function completeDriverRegistrationApi(
  formData: FormData,
): Promise<ApiResponse<DriverProfileResponse>> {
  return request<DriverProfileResponse>("/api/driver/complete-registration", {
    method: "POST",
    body: formData,
  });
}

/**
 * GET /api/driver/profile
 */
export async function getDriverProfileApi(): Promise<
  ApiResponse<DriverProfileResponse>
> {
  return request<DriverProfileResponse>("/api/driver/profile", {
    method: "GET",
  });
}

/**
 * PUT /api/driver/profile
 */
export async function updateDriverProfileApi(
  formData: FormData,
): Promise<ApiResponse<DriverProfileResponse>> {
  return request<DriverProfileResponse>("/api/driver/profile", {
    method: "PUT",
    body: formData,
  });
}

/**
 * GET /api/driver/services
 */
export async function getDriverServicesApi(): Promise<
  ApiResponse<{ status: string; data: DriverServiceType[] }>
> {
  return request<{ status: string; data: DriverServiceType[] }>(
    "/api/driver/services",
    {
      method: "GET",
    },
  );
}

/**
 * POST /api/driver/select-service
 */
export async function selectDriverServiceApi(
  serviceTypeId: number,
): Promise<ApiResponse<DriverProfileResponse>> {
  return request<DriverProfileResponse>("/api/driver/select-service", {
    method: "POST",
    body: JSON.stringify({ serviceTypeId }),
  });
}

/**
 * GET /api/driver/preferences
 */
export async function getDriverPreferencesApi(): Promise<
  ApiResponse<{ status: string; data: any[] }>
> {
  return request<{ status: string; data: any[] }>("/api/driver/preferences", {
    method: "GET",
  });
}

/**
 * POST /api/driver/status/online
 */
export async function goOnlineApi(
  preferenceIds: number[],
): Promise<ApiResponse<{ status: string; message: string }>> {
  return request<{ status: string; message: string }>(
    "/api/driver/status/online",
    {
      method: "POST",
      body: JSON.stringify({ preferenceIds }),
    },
  );
}

/**
 * POST /api/driver/status/offline
 */
export async function goOfflineApi(): Promise<
  ApiResponse<{ status: string; message: string }>
> {
  return request<{ status: string; message: string }>(
    "/api/driver/status/offline",
    {
      method: "POST",
    },
  );
}

/**
 * POST /api/driver/rental/profile
 */
export async function createRentalProfileApi(
  formData: FormData,
): Promise<ApiResponse<{ status: string; message: string; data: any }>> {
  return request<{ status: string; message: string; data: any }>(
    "/api/driver/rental/profile",
    {
      method: "POST",
      body: formData,
    },
  );
}

/**
 * GET /api/driver/rental/profile
 */
export async function getRentalProfileApi(): Promise<
  ApiResponse<{ status: string; message: string; data: any }>
> {
  return request<{ status: string; message: string; data: any }>(
    "/api/driver/rental/profile",
    {
      method: "GET",
    },
  );
}
/**
 * GET /api/driver/car-rides/status
 */
export async function getCarRidesStatusApi(): Promise<
  ApiResponse<{
    status: string;
    isNationalIdCompleted: boolean;
    isDriverLicenseCompleted: boolean;
    isProfessionalCardCompleted: boolean;
    isVehicleRegistrationCompleted: boolean;
    isVehicleInsuranceCompleted: boolean;
    isVehicleDetailsCompleted: boolean;
    isVehiclePhotosCompleted: boolean;
    isFaceVerificationCompleted: boolean;
  }>
> {
  return request<any>("/api/driver/car-rides/status", { method: "GET" });
}

/**
 * POST /api/driver/car-rides/national-id
 */
export async function uploadNationalIdApi(
  formData: FormData,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/car-rides/national-id", {
    method: "POST",
    body: formData,
  });
}

/**
 * POST /api/driver/car-rides/driver-license
 */
export async function uploadDriverLicenseApi(
  formData: FormData,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/car-rides/driver-license", {
    method: "POST",
    body: formData,
  });
}

/**
 * POST /api/driver/car-rides/professional-card
 */
export async function uploadProfessionalCardApi(
  formData: FormData,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/car-rides/professional-card", {
    method: "POST",
    body: formData,
  });
}

/**
 * POST /api/driver/car-rides/vehicle-registration
 */
export async function uploadVehicleRegistrationApi(
  formData: FormData,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/car-rides/vehicle-registration", {
    method: "POST",
    body: formData,
  });
}

/**
 * POST /api/driver/car-rides/insurance
 */
export async function uploadVehicleInsuranceApi(
  formData: FormData,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/car-rides/insurance", {
    method: "POST",
    body: formData,
  });
}

/**
 * POST /api/driver/car-rides/vehicle-details
 */
export async function updateVehicleDetailsApi(
  payload: any,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/car-rides/vehicle-details", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * POST /api/driver/car-rides/vehicle-photos
 */
export async function uploadVehiclePhotosApi(
  formData: FormData,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/car-rides/vehicle-photos", {
    method: "POST",
    body: formData,
  });
}

/**
 * POST /api/driver/car-rides/face-verification
 */
export async function uploadFaceVerificationApi(
  formData: FormData,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/car-rides/face-verification", {
    method: "POST",
    body: formData,
  });
}

/**
 * GET /api/driver/motorcycle/status
 */
export async function getMotorcycleStatusApi(): Promise<
  ApiResponse<{
    status: string;
    isNationalIdCompleted: boolean;
    isDriverLicenseCompleted: boolean;
    isProfessionalCardCompleted: boolean;
    isVehicleRegistrationCompleted: boolean;
    isVehicleInsuranceCompleted: boolean;
    isVehicleDetailsCompleted: boolean;
    isVehiclePhotosCompleted: boolean;
    isFaceVerificationCompleted: boolean;
  }>
> {
  return request<any>("/api/driver/motorcycle/status", { method: "GET" });
}

/**
 * POST /api/driver/motorcycle/national-id
 */
export async function uploadMotorcycleNationalIdApi(
  formData: FormData,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/motorcycle/national-id", {
    method: "POST",
    body: formData,
  });
}

/**
 * POST /api/driver/motorcycle/driver-license
 */
export async function uploadMotorcycleDriverLicenseApi(
  formData: FormData,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/motorcycle/driver-license", {
    method: "POST",
    body: formData,
  });
}

/**
 * POST /api/driver/motorcycle/professional-card
 */
export async function uploadMotorcycleProfessionalCardApi(
  formData: FormData,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/motorcycle/professional-card", {
    method: "POST",
    body: formData,
  });
}

/**
 * POST /api/driver/motorcycle/vehicle-registration
 */
export async function uploadMotorcycleVehicleRegistrationApi(
  formData: FormData,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/motorcycle/vehicle-registration", {
    method: "POST",
    body: formData,
  });
}

/**
 * POST /api/driver/motorcycle/insurance
 */
export async function uploadMotorcycleVehicleInsuranceApi(
  formData: FormData,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/motorcycle/insurance", {
    method: "POST",
    body: formData,
  });
}

/**
 * POST /api/driver/motorcycle/vehicle-details
 */
export async function updateMotorcycleVehicleDetailsApi(
  payload: any,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/motorcycle/vehicle-details", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * POST /api/driver/motorcycle/vehicle-photos
 */
export async function uploadMotorcycleVehiclePhotosApi(
  formData: FormData,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/motorcycle/vehicle-photos", {
    method: "POST",
    body: formData,
  });
}

/**
 * POST /api/driver/motorcycle/face-verification
 */
export async function uploadMotorcycleFaceVerificationApi(
  formData: FormData,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/motorcycle/face-verification", {
    method: "POST",
    body: formData,
  });
}

// ─── Taxi Onboarding ───────────────────────────────────────────────────────

export async function getTaxiStatusApi(): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/taxi/status", { method: "GET" });
}

export async function uploadTaxiNationalIdApi(
  formData: FormData,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/taxi/national-id", {
    method: "POST",
    body: formData,
  });
}

export async function uploadTaxiDriverLicenseApi(
  formData: FormData,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/taxi/driver-license", {
    method: "POST",
    body: formData,
  });
}

export async function uploadTaxiLicenseApi(
  formData: FormData,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/taxi/taxi-license", {
    method: "POST",
    body: formData,
  });
}

export async function uploadTaxiProfessionalCardApi(
  formData: FormData,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/taxi/professional-card", {
    method: "POST",
    body: formData,
  });
}

export async function uploadTaxiVehicleRegistrationApi(
  formData: FormData,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/taxi/vehicle-registration", {
    method: "POST",
    body: formData,
  });
}

export async function uploadTaxiVehicleInsuranceApi(
  formData: FormData,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/taxi/insurance", {
    method: "POST",
    body: formData,
  });
}

export async function updateTaxiVehicleDetailsApi(
  payload: any,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/taxi/vehicle-details", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadTaxiVehiclePhotosApi(
  formData: FormData,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/taxi/vehicle-photos", {
    method: "POST",
    body: formData,
  });
}

export async function uploadTaxiFaceVerificationApi(
  formData: FormData,
): Promise<ApiResponse<any>> {
  return request<any>("/api/driver/taxi/face-verification", {
    method: "POST",
    body: formData,
  });
}

// ─── Reviews ───────────────────────────────────────────────────────────────

export interface ReviewPayload {
  rideRequestId: number;
  revieweeId: number;
  rating: number;
  comment?: string;
}

export interface ReviewItem {
  id: number;
  rideRequestId: number;
  reviewerId: number;
  reviewerType: "PASSENGER" | "DRIVER";
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface ReviewsListResponse {
  averageRating: number | null;
  totalReviews: number;
  reviews: ReviewItem[];
}

/** POST /api/reviews/driver — Passenger reviews a driver */
export async function reviewDriverApi(
  payload: ReviewPayload,
): Promise<ApiResponse<any>> {
  return request<any>("/api/reviews/driver", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** POST /api/reviews/passenger — Driver reviews a passenger */
export async function reviewPassengerApi(
  payload: ReviewPayload,
): Promise<ApiResponse<any>> {
  return request<any>("/api/reviews/passenger", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** GET /api/reviews/driver/:driverId */
export async function getDriverReviewsApi(
  driverId: number,
): Promise<ApiResponse<ReviewsListResponse>> {
  return request<ReviewsListResponse>(`/api/reviews/driver/${driverId}`);
}

/** GET /api/reviews/passenger/:passengerId */
export async function getPassengerReviewsApi(
  passengerId: number,
): Promise<ApiResponse<ReviewsListResponse>> {
  return request<ReviewsListResponse>(`/api/reviews/passenger/${passengerId}`);
}

/** GET /api/reviews/received/passenger */
export async function getReceivedPassengerReviewsApi(): Promise<
  ApiResponse<ReviewItem[]>
> {
  return request<ReviewItem[]>("/api/reviews/received/passenger");
}

/** GET /api/reviews/given/passenger */
export async function getGivenPassengerReviewsApi(): Promise<
  ApiResponse<ReviewItem[]>
> {
  return request<ReviewItem[]>("/api/reviews/given/passenger");
}

/** GET /api/reviews/received/driver */
export async function getReceivedDriverReviewsApi(): Promise<
  ApiResponse<ReviewItem[]>
> {
  return request<ReviewItem[]>("/api/reviews/received/driver");
}

/** GET /api/reviews/given/driver */
export async function getGivenDriverReviewsApi(): Promise<
  ApiResponse<ReviewItem[]>
> {
  return request<ReviewItem[]>("/api/reviews/given/driver");
}

// ─── Archive Trips ─────────────────────────────────────────────────────────

export interface ArchiveTripsStats {
  totalArchived: number;
  completed: number;
  cancelled: number;
  disputed: number;
  revenue: number;
  commission: number;
}

export interface ArchiveTripRow {
  id: string;
  service: string;
  rider: {
    name: string;
    id: string;
    rating: number;
    img: string | null;
    city: string | null;
  };
  driver: {
    name: string;
    id: string;
    rating: number;
    img: string | null;
  };
  vehicle: string;
  time: string;
  duration: string;
  status: string;
  fare: string;
  paymentMethod: string;
  archivedAt: string | null;
  archiveReason: string;
}

export interface ArchiveTripsList {
  trips: ArchiveTripRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ArchiveTripDetail {
  tripInfo: {
    id: string;
    startTime: string | null;
    endTime: string | null;
    distance: string | null;
    status: string;
  };
  passenger: {
    fullName: string;
    customerId: string;
    category: string;
    gender: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    imageUrl: string | null;
    rating: number | null;
  };
  driver: {
    fullName: string;
    driverId: string;
    vehicleType: string;
    gender: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    imageUrl: string | null;
    rating: number;
  };
  vehicle: {
    driverId: string;
    colour: string | null;
    licencePlate: string | null;
    makeModel: string | null;
    year: string | null;
    joinDate: string | null;
  };
  route: {
    pickupAddress: string | null;
    dropoffAddress: string | null;
  };
  payment: {
    method: string | null;
    totalAmount: string | null;
    tva: string | null;
    serviceFee: string | null;
    discount: string | null;
  } | null;
  archiveInfo: {
    archivedAt: string | null;
    reason: string;
  };
}

/** GET /api/admin/archive/stats */
export async function getArchiveStatsApi(params?: {
  period?: "today" | "yesterday" | "last_week" | "last_month";
  cityId?: number;
  serviceTypeId?: number;
}): Promise<ApiResponse<ArchiveTripsStats>> {
  return request<ArchiveTripsStats>(
    `/api/admin/archive/stats${buildQuery(params)}`,
  );
}

/** GET /api/admin/archive/filters/cities */
export async function getArchiveCitiesApi(): Promise<
  ApiResponse<LiveTripsFilterOption[]>
> {
  return request<LiveTripsFilterOption[]>("/api/admin/archive/filters/cities");
}

/** GET /api/admin/archive/filters/service-types */
export async function getArchiveServiceTypesApi(): Promise<
  ApiResponse<LiveTripsServiceTypeOption[]>
> {
  return request<LiveTripsServiceTypeOption[]>(
    "/api/admin/archive/filters/service-types",
  );
}

/** GET /api/admin/archive/trips */
export async function getArchiveTripsApi(params?: {
  search?: string;
  status?: string;
  cityId?: number;
  serviceTypeId?: number;
  period?: "today" | "yesterday" | "last_week" | "last_month";
  page?: number;
  limit?: number;
}): Promise<ApiResponse<ArchiveTripsList>> {
  return request<ArchiveTripsList>(
    `/api/admin/archive/trips${buildQuery(params)}`,
  );
}

/** GET /api/admin/archive/trips/:tripId */
export async function getArchiveTripDetailApi(
  tripId: string | number,
): Promise<ApiResponse<ArchiveTripDetail>> {
  return request<ArchiveTripDetail>(`/api/admin/archive/trips/${tripId}`);
}

// ─── Verification Badges ───────────────────────────────────────────────────

export interface VerificationStats {
  totalUsers: number;
  totalVerified: number;
  verifiedDrivers: number;
  verifiedPassengers: number;
}

export interface BadgeSettings {
  driver: {
    minTrips: number;
    minRating: number;
    minAcceptance: number;
  };
  passenger: {
    minTrips: number;
    minRating: number;
  };
}

export interface VerificationUser {
  id: number;
  displayId: string;
  name: string;
  avatar: string | null;
  rating: number;
  phone: string;
  email: string;
  city: string;
  totalTrips: number;
  userType: "Driver" | "Passenger";
  isVerified: boolean;
  verifiedDate: string | null;
  joinDate: string;
}

export interface BadgeProfile extends VerificationUser {
  gender: string | null;
  vehicleType?: string | null;
  vehicleInfo?: {
    licensePlate: string | null;
    makeModel: string | null;
    year: string | null;
    transmission: string | null;
    color: string | null;
  } | null;
}

/** GET /api/admin/verification/stats */
export async function getVerificationStatsApi(): Promise<
  ApiResponse<VerificationStats>
> {
  return request<VerificationStats>("/api/admin/verification/stats");
}

/** GET /api/admin/verification/settings */
export async function getVerificationSettingsApi(): Promise<
  ApiResponse<BadgeSettings>
> {
  return request<BadgeSettings>("/api/admin/verification/settings");
}

/** PATCH /api/admin/verification/settings */
export async function updateVerificationSettingsApi(
  payload: BadgeSettings,
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>("/api/admin/verification/settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** GET /api/admin/verification/filters/cities */
export async function getVerificationCitiesApi(): Promise<
  ApiResponse<LiveTripsFilterOption[]>
> {
  return request<LiveTripsFilterOption[]>(
    "/api/admin/verification/filters/cities",
  );
}

/** GET /api/admin/verification/users */
export async function getVerificationUsersApi(params?: {
  cityId?: number;
  status?: "Verified" | "Unverified";
  userType?: "Driver" | "Passenger";
  search?: string;
}): Promise<ApiResponse<VerificationUser[]>> {
  return request<VerificationUser[]>(
    `/api/admin/verification/users${buildQuery(params)}`,
  );
}

/** POST /api/admin/verification/users/:type/:id/action */
export async function manualBadgeActionApi(
  type: "Driver" | "Passenger",
  id: number,
  action: "grant" | "remove",
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>(
    `/api/admin/verification/users/${type}/${id}/action`,
    {
      method: "POST",
      body: JSON.stringify({ action }),
    },
  );
}

/** GET /api/admin/verification/users/:type/:id */
export async function getBadgeProfileApi(
  type: "Driver" | "Passenger",
  id: number,
): Promise<ApiResponse<BadgeProfile>> {
  return request<BadgeProfile>(`/api/admin/verification/users/${type}/${id}`);
}

// ─── Reservation Endpoints ─────────────────────────────────────────────────

export interface ReservationUserInfo {
  name: string;
  id: string;
  avatar: string | null;
  rating: number;
  phone: string;
  email: string;
  city: string;
  gender: "Male" | "Female";
  category?: string;
}

export interface ReservationItem {
  id: string;
  numericId: number;
  customer: ReservationUserInfo;
  driver: ReservationUserInfo;
  serviceType: string;
  vehicleType: string;
  status: string;
  fare: number;
  currency: string;
  startTime: string;
  endTime: string;
  distance: string;
  scheduleDate: string;
  scheduleTime: string;
  pickup: string;
  destination: string;
  paymentMethod: string;
  tva: string;
  serviceFee: number;
  discount: string;
  archivedDate?: string;
  archiveReason?: string;
  vehicle?: {
    driverId: string;
    colour: string | null;
    licencePlate: string | null;
    makeModel: string | null;
    year: string | null;
    joinDate: string | null;
  };
}

export interface ReservationStats {
  totalReservations: number;
  scheduled: number;
  confirmed: number;
  todaysBookings: number;
}

export interface ReservationList {
  reservations: ReservationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** GET /api/admin/reservations/stats */
export async function getReservationStatsApi(params?: {
  period?: string;
  cityId?: number;
  serviceTypeId?: number;
}): Promise<ApiResponse<ReservationStats>> {
  return request<ReservationStats>(
    `/api/admin/reservations/stats${buildQuery(params)}`,
  );
}

/** GET /api/admin/reservations/filters/cities */
export async function getReservationCitiesApi(): Promise<
  ApiResponse<LiveTripsFilterOption[]>
> {
  return request<LiveTripsFilterOption[]>(
    "/api/admin/reservations/filters/cities",
  );
}

/** GET /api/admin/reservations/filters/service-types */
export async function getReservationServiceTypesApi(): Promise<
  ApiResponse<LiveTripsServiceTypeOption[]>
> {
  return request<LiveTripsServiceTypeOption[]>(
    "/api/admin/reservations/filters/service-types",
  );
}

/** GET /api/admin/reservations/list */
export async function getReservationListApi(params?: {
  search?: string;
  status?: string;
  cityId?: number;
  serviceTypeId?: number;
  period?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<ReservationList>> {
  return request<ReservationList>(
    `/api/admin/reservations/list${buildQuery(params)}`,
  );
}

/** GET /api/admin/reservations/:id */
export async function getReservationDetailApi(
  id: string | number,
): Promise<ApiResponse<ReservationItem>> {
  return request<ReservationItem>(`/api/admin/reservations/${id}`);
}

// ─── Delivery Endpoints ────────────────────────────────────────────────────

export interface DeliveryUserInfo {
  name: string;
  id: string;
  avatar: string | null;
  rating: number;
  phone: string;
  email: string;
  city: string;
  gender: "Male" | "Female";
  category?: string;
}

export interface DeliveryItem {
  id: string;
  numericId: number;
  serviceType: string;
  rider: DeliveryUserInfo;
  driver: DeliveryUserInfo;
  vehicleType: string;
  status: string;
  fare: number;
  currency: string;
  paymentMethod: string;
  deliveryId: string;
  sendingDescription: string;
  weight: string;
  vehicleInfo: {
    brand: string;
    plate: string;
    transmission: string;
    model: string;
    color: string;
    year: string;
    joinDate: string;
  };
  pickup: string;
  destination: string;
  tva: string;
  serviceFee: number;
  discount: string;
  startTime: string;
  endTime: string;
  distance: string;
  scheduleDate: string;
  scheduleTime: string;
}

export interface DeliveryStats {
  totalDeliveries: number;
  pending: number;
  accepted: number;
  cancelled: number;
}

export interface DeliveryList {
  deliveries: DeliveryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DeliveryDriverRiderCard {
  id: string;
  name: string;
  location: string;
  trips: number;
  avatar: string | null;
  rating: number;
  type: "Driver" | "Rider";
  vehicleIcon: boolean;
}

/** GET /api/admin/delivery/stats */
export async function getDeliveryStatsApi(params?: {
  period?: string;
  cityId?: number;
}): Promise<ApiResponse<DeliveryStats>> {
  return request<DeliveryStats>(
    `/api/admin/delivery/stats${buildQuery(params)}`,
  );
}

/** GET /api/admin/delivery/list */
export async function getDeliveryListApi(params?: {
  search?: string;
  status?: string;
  serviceType?: string;
  paymentMethod?: string;
  cityId?: number;
  period?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<DeliveryList>> {
  return request<DeliveryList>(`/api/admin/delivery/list${buildQuery(params)}`);
}

/** GET /api/admin/delivery/details/:id */
export async function getDeliveryDetailApi(
  id: string | number,
): Promise<ApiResponse<DeliveryItem>> {
  return request<DeliveryItem>(`/api/admin/delivery/details/${id}`);
}

/** GET /api/admin/delivery/top-drivers */
export async function getDeliveryTopDriversApi(params?: {
  limit?: number;
}): Promise<ApiResponse<DeliveryDriverRiderCard[]>> {
  return request<DeliveryDriverRiderCard[]>(
    `/api/admin/delivery/top-drivers${buildQuery(params)}`,
  );
}

/** GET /api/admin/delivery/top-riders */
export async function getDeliveryTopRidersApi(params?: {
  limit?: number;
}): Promise<ApiResponse<DeliveryDriverRiderCard[]>> {
  return request<DeliveryDriverRiderCard[]>(
    `/api/admin/delivery/top-riders${buildQuery(params)}`,
  );
}

// ─── Admin Driver Management Endpoints ─────────────────────────────────────

export interface AdminDriverStats {
  taxiDrivers: number;
  motorcycleDrivers: number;
  carDrivers: number;
  rentalCompany: number;
  totalDrivers: number;
}

export interface AdminDriverListItem {
  id: number;
  idNumber: string;
  name: string;
  phone: string;
  email: string;
  avatar: string | null;
  rating: number;
  location: string;
  city: string;
  vehicleType: string;
  totalTrips: number;
  status: string;
  joinDate: string;
  isOnline: boolean;
  isVerified: boolean;
  serviceTypeId: number | null;
}

export interface AdminDriverListResponse {
  drivers: AdminDriverListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminDriverDetail {
  id: number;
  idNumber: string;
  name: string;
  phone: string;
  email: string;
  avatar: string | null;
  rating: number;
  location: string;
  city: string;
  region: string;
  vehicleType: string;
  serviceTypeName: string;
  totalTrips: number;
  status: string;
  joinDate: string;
  isOnline: boolean;
  isVerified: boolean;
  gender: string | null;
  dob: string | null;
  serviceTypeId: number | null;
  stats: {
    cancelationRate: string;
    acceptanceRate: string;
    totalTrips: number;
    completedTrips: number;
    cancelledTrips: number;
  };
  vehicleDetails: {
    brand: string;
    color: string;
    plate: string;
    model: string;
    year: string;
  };
}

export interface AdminDriverEarnings {
  period: string;
  totalEarnings: string;
  onlineTime: string;
  totalTrips: string;
  data: Array<{ label: string; value: number }>;
}

export interface AdminDriverTrip {
  id: number;
  riderName: string;
  riderAvatar: string | null;
  date: string;
  status: string;
  amount: string;
  pickupAddress: string;
  dropoffAddress: string;
  distance: string;
  duration: string;
  rating: number | null;
}

export interface AdminDriverPreferences {
  categories: Array<{
    id: number;
    name: string;
    displayName: string;
    isActive: boolean;
  }>;
}

/** GET /api/admin/driver/stats */
export async function getAdminDriverStatsApi(): Promise<
  ApiResponse<AdminDriverStats>
> {
  return request<AdminDriverStats>("/api/admin/driver/stats");
}

/** GET /api/admin/driver/list */
export async function getAdminDriverListApi(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  serviceTypeId?: number;
  cityId?: number;
}): Promise<ApiResponse<AdminDriverListResponse>> {
  return request<AdminDriverListResponse>(
    `/api/admin/driver/list${buildQuery(params)}`,
  );
}

/** GET /api/admin/driver/detail/:id */
export async function getAdminDriverDetailApi(
  id: number,
): Promise<ApiResponse<AdminDriverDetail>> {
  return request<AdminDriverDetail>(`/api/admin/driver/detail/${id}`);
}

/** POST /api/admin/driver/suspend/:id */
export async function suspendDriverApi(
  id: number,
  payload: { reason?: string; hours?: string },
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>(`/api/admin/driver/suspend/${id}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** POST /api/admin/driver/activate/:id */
export async function activateDriverApi(
  id: number,
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>(`/api/admin/driver/activate/${id}`, {
    method: "POST",
  });
}

/** PUT /api/admin/driver/update/:id */
export async function updateDriverApi(
  id: number,
  payload: Record<string, unknown>,
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>(`/api/admin/driver/update/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** GET /api/admin/driver/earnings/:id */
export async function getDriverEarningsApi(
  id: number,
  period: string,
): Promise<ApiResponse<AdminDriverEarnings>> {
  return request<AdminDriverEarnings>(
    `/api/admin/driver/earnings/${id}${buildQuery({ period })}`,
  );
}

/** GET /api/admin/driver/trips/:id */
export async function getDriverTripsApi(
  id: number,
  type: string,
): Promise<ApiResponse<{ trips: AdminDriverTrip[] }>> {
  return request<{ trips: AdminDriverTrip[] }>(
    `/api/admin/driver/trips/${id}${buildQuery({ type })}`,
  );
}

/** GET /api/admin/driver/preferences */
export async function getAdminDriverPreferencesApi(): Promise<
  ApiResponse<AdminDriverPreferences>
> {
  return request<AdminDriverPreferences>("/api/admin/driver/preferences");
}

/** POST /api/admin/driver/update-preferences/:id */
export async function updateDriverPreferencesApi(
  id: number,
  payload: {
    serviceTypeId: number;
    carRideStatus?: string;
    motorcycleStatus?: string;
  },
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>(
    `/api/admin/driver/update-preferences/${id}`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

// ─── Admin Rider Management Endpoints ──────────────────────────────────────

export interface AdminRiderStats {
  totalRiders: number;
  avgRating: string;
  activeNow: number;
  totalSpent: number;
}

export interface AdminRiderListItem {
  id: number;
  idNumber: string;
  name: string;
  phone: string;
  email: string;
  avatar: string | null;
  rating: number;
  location: string;
  city: string;
  totalTrips: number;
  totalSpent: number;
  status: string;
  joinDate: string;
  isVerified: boolean;
}

export interface AdminRiderListResponse {
  riders: AdminRiderListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminRiderDetail {
  id: number;
  idNumber: string;
  name: string;
  phone: string;
  email: string;
  avatar: string | null;
  rating: number;
  location: string;
  city: string;
  region: string;
  totalTrips: number;
  totalSpent: number;
  status: string;
  joinDate: string;
  isVerified: boolean;
  gender: string | null;
  dob: string | null;
}

export interface AdminRiderSpending {
  period: string;
  totalSpending: string;
  totalTrips: string;
  data: Array<{ label: string; value: number }>;
}

export interface AdminRiderTrip {
  id: number;
  driverName: string;
  driverAvatar: string | null;
  date: string;
  status: string;
  amount: string;
  pickupAddress: string;
  dropoffAddress: string;
  distance: string;
  duration: string;
  rating: number | null;
}

/** GET /api/admin/rider/stats */
export async function getAdminRiderStatsApi(): Promise<
  ApiResponse<AdminRiderStats>
> {
  return request<AdminRiderStats>("/api/admin/rider/stats");
}

/** GET /api/admin/rider/list */
export async function getAdminRiderListApi(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<ApiResponse<AdminRiderListResponse>> {
  return request<AdminRiderListResponse>(
    `/api/admin/rider/list${buildQuery(params)}`,
  );
}

/** GET /api/admin/rider/detail/:id */
export async function getAdminRiderDetailApi(
  id: number,
): Promise<ApiResponse<AdminRiderDetail>> {
  return request<AdminRiderDetail>(`/api/admin/rider/detail/${id}`);
}

/** POST /api/admin/rider/suspend/:id */
export async function suspendRiderApi(
  id: number,
  payload?: { reason?: string },
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>(`/api/admin/rider/suspend/${id}`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}

/** POST /api/admin/rider/activate/:id */
export async function activateRiderApi(
  id: number,
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>(`/api/admin/rider/activate/${id}`, {
    method: "POST",
  });
}

/** PUT /api/admin/rider/update/:id */
export async function updateRiderDetailsApi(
  id: number,
  payload: Record<string, unknown>,
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>(`/api/admin/rider/update/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** GET /api/admin/rider/spending/:id */
export async function getRiderSpendingApi(
  id: number,
  period: string,
): Promise<ApiResponse<AdminRiderSpending>> {
  return request<AdminRiderSpending>(
    `/api/admin/rider/spending/${id}${buildQuery({ period })}`,
  );
}

/** GET /api/admin/rider/trips/:id */
export async function getRiderTripsApi(
  id: number,
  type: string,
): Promise<ApiResponse<{ trips: AdminRiderTrip[] }>> {
  return request<{ trips: AdminRiderTrip[] }>(
    `/api/admin/rider/trips/${id}${buildQuery({ type })}`,
  );
}

// ─── Admin Driver Documents ─────────────────────────────────────────────────

/** GET /api/admin/driver-documents/stats */
export async function getDriverDocumentsStatsApi(): Promise<
  ApiResponse<{
    totalApplications: number;
    pendingReview: number;
    underReview: number;
    approved: number;
    rejected: number;
    expired: number;
  }>
> {
  return request(`/api/admin/driver-documents/stats`);
}

/** GET /api/admin/driver-documents/list */
export async function getDriverDocumentsListApi(params?: {
  status?: string;
  type?: string;
  tab?: string;
}): Promise<
  ApiResponse<{
    documents: Array<{
      driverId: string;
      driverName: string;
      avatar: string;
      docType: string;
      uploadDate: string;
      status: string;
      vehicleType: string;
      driverDbId: number;
    }>;
    total: number;
  }>
> {
  return request(`/api/admin/driver-documents/list${buildQuery(params)}`);
}

/** GET /api/admin/driver-documents/detail/:type/:id */
export async function getDriverDocumentDetailApi(
  type: string,
  id: number,
): Promise<ApiResponse<any>> {
  return request(
    `/api/admin/driver-documents/detail/${encodeURIComponent(type)}/${id}`,
  );
}

/** PUT /api/admin/driver-documents/update-document-status/:type/:id */
export async function updateDriverDocumentStatusApi(
  type: string,
  id: number,
  payload: { documentName: string; status: string },
): Promise<ApiResponse<{ message: string; status: string }>> {
  return request(
    `/api/admin/driver-documents/update-document-status/${encodeURIComponent(type)}/${id}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

/** PUT /api/admin/driver-documents/update-application-status/:type/:id */
export async function updateDriverApplicationStatusApi(
  type: string,
  id: number,
  payload: { status: string },
): Promise<ApiResponse<{ message: string; status: string }>> {
  return request(
    `/api/admin/driver-documents/update-application-status/${encodeURIComponent(type)}/${id}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

/** GET /api/admin/driver-documents/categories/:driverId */
export async function getDriverCategoriesApi(driverId: string): Promise<
  ApiResponse<{
    categories: Array<{ id: number; name: string; assigned: boolean }>;
  }>
> {
  return request(
    `/api/admin/driver-documents/categories/${encodeURIComponent(driverId)}`,
  );
}

/** POST /api/admin/driver-documents/assign-categories/:driverId */
export async function assignDriverCategoriesApi(
  driverId: string,
  payload: { categoryIds: number[] },
): Promise<ApiResponse<{ message: string; categoryIds: number[] }>> {
  return request(
    `/api/admin/driver-documents/assign-categories/${encodeURIComponent(driverId)}`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

// ─── Admin Rental Companies ─────────────────────────────────────────────────

/** GET /api/admin/rental-companies/stats */
export async function getRentalCompaniesStatsApi(): Promise<
  ApiResponse<{
    available: number;
    booked: number;
    underReview: number;
    rejected: number;
  }>
> {
  return request(`/api/admin/rental-companies/stats`);
}

/** GET /api/admin/rental-companies/companies */
export async function getRentalCompaniesListApi(params?: {
  tab?: string;
  search?: string;
}): Promise<ApiResponse<{ companies: any[] }>> {
  return request(`/api/admin/rental-companies/companies${buildQuery(params)}`);
}

/** GET /api/admin/rental-companies/vehicles */
export async function getRentalVehiclesListApi(params?: {
  tab?: string;
  search?: string;
}): Promise<ApiResponse<{ vehicles: any[] }>> {
  return request(`/api/admin/rental-companies/vehicles${buildQuery(params)}`);
}

/** GET /api/admin/rental-companies/vehicles/:id */
export async function getRentalVehicleDetailApi(
  id: number,
): Promise<ApiResponse<any>> {
  return request(`/api/admin/rental-companies/vehicles/${id}`);
}

/** PUT /api/admin/rental-companies/vehicles/:id/status */
export async function updateRentalVehicleStatusApi(
  id: number,
  payload: { status: string; reason?: string },
): Promise<ApiResponse<{ message: string; status: string }>> {
  return request(`/api/admin/rental-companies/vehicles/${id}/status`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ─── Admin Review Management ────────────────────────────────────────────────

/** GET /api/admin/reviews/stats */
export async function getAdminReviewStatsApi(): Promise<
  ApiResponse<{
    total: number;
    visible: number;
    highRated: number;
    lowRated: number;
  }>
> {
  return request("/api/admin/reviews/stats");
}

/** GET /api/admin/reviews */
export async function getAdminReviewsApi(params?: {
  limit?: number;
  page?: number;
  tab?: string;
  visible?: string;
  type?: string;
  rating?: number;
  search?: string;
}): Promise<
  ApiResponse<{ reviews: any[]; total: number; page: number; limit: number }>
> {
  return request(`/api/admin/reviews${buildQuery(params)}`);
}

/** GET /api/admin/reviews/:id */
export async function getAdminReviewDetailApi(
  id: string | number,
): Promise<ApiResponse<any>> {
  return request(`/api/admin/reviews/${id}`);
}

/** PUT /api/admin/reviews/:id */
export async function editAdminReviewApi(
  id: string | number,
  payload: { comment: string },
): Promise<ApiResponse<{ message: string }>> {
  return request(`/api/admin/reviews/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** DELETE /api/admin/reviews/:id */
export async function deleteAdminReviewApi(
  id: string | number,
): Promise<ApiResponse<{ message: string }>> {
  return request(`/api/admin/reviews/${id}`, { method: "DELETE" });
}

/** PATCH /api/admin/reviews/:id/toggle-visibility */
export async function toggleReviewVisibilityApi(
  id: string | number,
): Promise<ApiResponse<{ message: string; visible: boolean }>> {
  return request(`/api/admin/reviews/${id}/toggle-visibility`, {
    method: "PATCH",
  });
}

/** PATCH /api/admin/reviews/:id/toggle-flag */
export async function toggleReviewFlagApi(
  id: string | number,
): Promise<
  ApiResponse<{ message: string; isFlagged: boolean; visible: boolean }>
> {
  return request(`/api/admin/reviews/${id}/toggle-flag`, { method: "PATCH" });
}

// ─── Admin Coupons & Promotions ─────────────────────────────────────────────

/** GET /api/admin/coupons/stats */
export async function getAdminCouponStatsApi(): Promise<
  ApiResponse<{ total: number; active: number; expired: number }>
> {
  return request("/api/admin/coupons/stats");
}

/** GET /api/admin/coupons/service-options */
export async function getAdminCouponServiceOptionsApi(): Promise<
  ApiResponse<{ services: Array<{ id: number; name: string }> }>
> {
  return request("/api/admin/coupons/service-options");
}

/** GET /api/admin/coupons */
export async function getAdminCouponsApi(params?: {
  status?: string;
  search?: string;
}): Promise<ApiResponse<{ promotions: any[] }>> {
  return request(`/api/admin/coupons${buildQuery(params)}`);
}

/** POST /api/admin/coupons */
export async function createAdminCouponApi(payload: {
  promotionName: string;
  code: string;
  description?: string;
  discountType: string;
  discountValue: number;
  expiryDate?: string;
  isActive?: boolean;
  maxUsage?: number;
  minOrderAmount?: number;
  eligibleServiceIds?: number[];
}): Promise<ApiResponse<{ message: string; id: number }>> {
  return request("/api/admin/coupons", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** GET /api/admin/coupons/:id */
export async function getAdminCouponDetailApi(
  id: string | number,
): Promise<ApiResponse<any>> {
  return request(`/api/admin/coupons/${id}`);
}

/** PUT /api/admin/coupons/:id */
export async function updateAdminCouponApi(
  id: string | number,
  payload: Record<string, unknown>,
): Promise<ApiResponse<{ message: string }>> {
  return request(`/api/admin/coupons/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** DELETE /api/admin/coupons/:id */
export async function deleteAdminCouponApi(
  id: string | number,
): Promise<ApiResponse<{ message: string }>> {
  return request(`/api/admin/coupons/${id}`, { method: "DELETE" });
}

// ─── Admin Notification Center ──────────────────────────────────────────────

export interface NotificationStats {
  totalSent: number;
  toDrivers: number;
  toPassengers: number;
  systemStatus: string;
}

export interface NotificationCampaign {
  id: number;
  title: string;
  message: string;
  targetAudience: string;
  filters: Record<string, unknown> | null;
  status: string;
  scheduledAt: string | null;
  deliveryCount: number;
  readCount: number;
  createdAt: string;
}

export interface TeamNotification {
  id: number;
  title: string;
  description: string;
  targetDepartments: string[];
  category: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
}

export interface CreateCampaignRequest {
  title: string;
  message: string;
  targetAudience?: string;
  filters?: Record<string, unknown>;
  scheduledAt?: string;
}

export interface CreateTeamNotificationRequest {
  title: string;
  description: string;
  targetDepartments?: string[];
  category?: string;
  scheduledAt?: string;
}

export interface NotificationCity {
  id: number;
  name: string;
}

export interface NotificationRidePreference {
  id: number;
  name: string;
  preferenceKey: string;
  description: string;
}

/** GET /api/admin/notifications/stats */
export async function getNotificationStatsApi(): Promise<
  ApiResponse<NotificationStats>
> {
  return request<NotificationStats>("/api/admin/notifications/stats");
}

/** GET /api/admin/notifications/campaigns */
export async function getNotificationCampaignsApi(): Promise<
  ApiResponse<NotificationCampaign[]>
> {
  return request<NotificationCampaign[]>("/api/admin/notifications/campaigns");
}

/** POST /api/admin/notifications/campaigns */
export async function createNotificationCampaignApi(
  payload: CreateCampaignRequest,
): Promise<ApiResponse<{ message: string; id: number; status: string }>> {
  return request<{ message: string; id: number; status: string }>(
    "/api/admin/notifications/campaigns",
    { method: "POST", body: JSON.stringify(payload) },
  );
}

/** GET /api/admin/notifications/team */
export async function getTeamNotificationsApi(): Promise<
  ApiResponse<TeamNotification[]>
> {
  return request<TeamNotification[]>("/api/admin/notifications/team");
}

/** POST /api/admin/notifications/team */
export async function createTeamNotificationApi(
  payload: CreateTeamNotificationRequest,
): Promise<ApiResponse<{ message: string; id: number; status: string }>> {
  return request<{ message: string; id: number; status: string }>(
    "/api/admin/notifications/team",
    { method: "POST", body: JSON.stringify(payload) },
  );
}

/** GET /api/admin/notifications/calculate-reach */
export async function calculateNotificationReachApi(params: {
  audience: string;
  filters?: string;
}): Promise<ApiResponse<{ audience: string; estimatedReach: number }>> {
  return request<{ audience: string; estimatedReach: number }>(
    `/api/admin/notifications/calculate-reach${buildQuery(params)}`,
  );
}

/** GET /api/admin/notifications/filters/cities */
export async function getNotificationCitiesApi(): Promise<
  ApiResponse<NotificationCity[]>
> {
  return request<NotificationCity[]>("/api/admin/notifications/filters/cities");
}

/** GET /api/admin/notifications/filters/ride-preferences */
export async function getNotificationRidePreferencesApi(): Promise<
  ApiResponse<NotificationRidePreference[]>
> {
  return request<NotificationRidePreference[]>(
    "/api/admin/notifications/filters/ride-preferences",
  );
}

// ─── Admin Reports & Analytics ──────────────────────────────────────────────

export interface ReportKpis {
  totalTrips: number;
  totalEarnings: number;
  activeDrivers: number;
  fleetSize: number;
}

export interface ServiceVolumePoint {
  time: string;
  [serviceType: string]: string | number;
}

export interface RevenueByServicePoint {
  day: string;
  revenue: number;
}

export interface RegionalPerformanceItem {
  name: string;
  value: number;
  color: string;
  revenue: string;
}

export interface TopPerformerItem {
  id: number;
  name: string;
  region: string;
  trips: number;
  earnings: string;
  rating: number;
  status: string;
  imageUrl: string | null;
}

export interface RegionalSummaryItem {
  region: string;
  share: string;
  revenue: string;
  activeDrivers: number;
  growth: string;
  avgTripValue: string;
  color: string;
}

export interface ReportRegionOption {
  id: number;
  name: string;
}

export interface ReportServiceOption {
  id: number;
  label: string;
}

export interface ReportFilterOptions {
  regions: ReportRegionOption[];
  services: ReportServiceOption[];
}

/** GET /api/admin/reports/filters */
export async function getReportFiltersApi(): Promise<
  ApiResponse<ReportFilterOptions>
> {
  return request<ReportFilterOptions>("/api/admin/reports/filters");
}

/** GET /api/admin/reports/kpis */
export async function getReportKpisApi(params?: {
  regionId?: number;
  serviceTypeId?: number;
  period?: string;
}): Promise<ApiResponse<ReportKpis>> {
  return request<ReportKpis>(`/api/admin/reports/kpis${buildQuery(params)}`);
}

/** GET /api/admin/reports/charts/service-volume */
export async function getServiceVolumeApi(params?: {
  regionId?: number;
  serviceTypeId?: number;
  period?: string;
}): Promise<ApiResponse<ServiceVolumePoint[]>> {
  return request<ServiceVolumePoint[]>(
    `/api/admin/reports/charts/service-volume${buildQuery(params)}`,
  );
}

/** GET /api/admin/reports/charts/revenue-by-service */
export async function getRevenueByServiceApi(params?: {
  regionId?: number;
  serviceTypeId?: number;
  period?: string;
}): Promise<ApiResponse<RevenueByServicePoint[]>> {
  return request<RevenueByServicePoint[]>(
    `/api/admin/reports/charts/revenue-by-service${buildQuery(params)}`,
  );
}

/** GET /api/admin/reports/charts/regional-performance */
export async function getRegionalPerformanceApi(params?: {
  regionId?: number;
  serviceTypeId?: number;
  period?: string;
}): Promise<ApiResponse<RegionalPerformanceItem[]>> {
  return request<RegionalPerformanceItem[]>(
    `/api/admin/reports/charts/regional-performance${buildQuery(params)}`,
  );
}

/** GET /api/admin/reports/top-performers */
export async function getReportTopPerformersApi(params: {
  type: string;
  regionId?: number;
  serviceTypeId?: number;
  period?: string;
}): Promise<ApiResponse<TopPerformerItem[]>> {
  return request<TopPerformerItem[]>(
    `/api/admin/reports/top-performers${buildQuery(params)}`,
  );
}

/** GET /api/admin/reports/regional-summary */
export async function getRegionalSummaryApi(params?: {
  regionId?: number;
  serviceTypeId?: number;
  period?: string;
}): Promise<ApiResponse<RegionalSummaryItem[]>> {
  return request<RegionalSummaryItem[]>(
    `/api/admin/reports/regional-summary${buildQuery(params)}`,
  );
}

/** GET /api/admin/reports/export */
export async function exportReportApi(params: {
  format: string;
  regionId?: number;
  serviceTypeId?: number;
  period?: string;
}): Promise<ApiResponse<unknown>> {
  return request<unknown>(`/api/admin/reports/export${buildQuery(params)}`);
}

// ─── Admin Service Management ───────────────────────────────────────────────

export interface ServiceManagementKpis {
  totalServices: number;
  enabled: number;
  disabled: number;
  activeRequests: number;
}

export interface ServiceStats {
  totalRequests: number;
  activeNow: number;
  completed: number;
  cancelled: number;
}

export interface ServiceItem {
  id: number;
  name: string;
  displayName: string;
  isActive: boolean;
  priority: string;
  activeNow: number;
  totalToday: number;
  revenue: string;
  growth: string;
  responseTime: string;
  lastUpdated: string;
  rating: number;
  completionRate: string;
  activeDrivers: number;
  stats: ServiceStats;
}

export interface ServiceDetail extends ServiceItem {
  description: string;
  todayRevenue: string;
  totalRevenue: string;
  coverageAreas: string[];
  features: string[];
}

export interface ServiceRevenueChartPoint {
  day: string;
  label: string;
  revenue: number;
}

export interface ServiceRevenueChart {
  data: ServiceRevenueChartPoint[];
  total: string;
  growth: string;
}

export interface ServiceGrowthChartPoint {
  day: string;
  label: string;
  requests: number;
}

export interface ServiceGrowthChart {
  data: ServiceGrowthChartPoint[];
  total: number;
  growth: string;
}

export interface UpdateServiceRequest {
  displayName?: string;
  description?: string;
  isActive?: boolean;
  priority?: string;
  features?: string[];
  coverageAreas?: string[];
}

/** GET /api/admin/service-management/kpis */
export async function getServiceManagementKpisApi(): Promise<
  ApiResponse<ServiceManagementKpis>
> {
  return request<ServiceManagementKpis>("/api/admin/service-management/kpis");
}

/** GET /api/admin/service-management/services */
export async function getServiceManagementServicesApi(): Promise<
  ApiResponse<{ services: ServiceItem[] }>
> {
  return request<{ services: ServiceItem[] }>(
    "/api/admin/service-management/services",
  );
}

/** GET /api/admin/service-management/services/:id */
export async function getServiceManagementDetailApi(
  id: number,
): Promise<ApiResponse<ServiceDetail>> {
  return request<ServiceDetail>(`/api/admin/service-management/services/${id}`);
}

/** PUT /api/admin/service-management/services/:id */
export async function updateServiceManagementApi(
  id: number,
  payload: UpdateServiceRequest,
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>(
    `/api/admin/service-management/services/${id}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

/** PUT /api/admin/service-management/services/:id/toggle */
export async function toggleServiceManagementApi(
  id: number,
  isActive: boolean,
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>(
    `/api/admin/service-management/services/${id}/toggle`,
    { method: "PUT", body: JSON.stringify({ isActive }) },
  );
}

/** GET /api/admin/service-management/services/:id/charts/revenue */
export async function getServiceRevenueChartApi(
  id: number,
): Promise<ApiResponse<ServiceRevenueChart>> {
  return request<ServiceRevenueChart>(
    `/api/admin/service-management/services/${id}/charts/revenue`,
  );
}

/** GET /api/admin/service-management/services/:id/charts/growth */
export async function getServiceGrowthChartApi(
  id: number,
): Promise<ApiResponse<ServiceGrowthChart>> {
  return request<ServiceGrowthChart>(
    `/api/admin/service-management/services/${id}/charts/growth`,
  );
}

// ─── Admin Pricing Management ─────────────────────────────────────────────

/** GET /api/admin/pricing/matrix */
export async function getPricingMatrixApi(
  cityId: number,
): Promise<ApiResponse<any>> {
  return request<any>(`/api/admin/pricing/matrix${buildQuery({ cityId })}`);
}

/** GET /api/admin/pricing/matrix/flat */
export async function getPricingMatrixFlatApi(
  cityId: number,
): Promise<ApiResponse<any>> {
  return request<any>(
    `/api/admin/pricing/matrix/flat${buildQuery({ cityId })}`,
  );
}

/** GET /api/admin/pricing/services-for-price */
export async function getServicesForPriceApi(): Promise<ApiResponse<any>> {
  return request<any>("/api/admin/pricing/services-for-price");
}

/** PUT /api/admin/pricing/matrix/:id */
export async function updatePricingEntryApi(
  id: number,
  payload: {
    perKm?: number;
    perMinute?: number;
    baseFare?: number;
    bookingFee?: number;
    nightSurcharge?: number;
    cancellationFee?: number;
    peakHourSurcharge?: number;
    minFare?: number;
    serviceFee?: number;
    tva?: number;
    isActive?: boolean;
  },
): Promise<ApiResponse<any>> {
  return request<any>(`/api/admin/pricing/matrix/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** GET /api/admin/pricing/commissions */
export async function getCommissionsApi(): Promise<ApiResponse<any>> {
  return request<any>("/api/admin/pricing/commissions");
}

/** PUT /api/admin/pricing/commissions/:cityId */
export async function updateCommissionApi(
  cityId: number,
  payload: { commissionPercentage: number; isActive: boolean },
): Promise<ApiResponse<any>> {
  return request<any>(`/api/admin/pricing/commissions/${cityId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** GET /api/admin/pricing/global-commission */
export async function getGlobalCommissionApi(): Promise<ApiResponse<any>> {
  return request<any>("/api/admin/pricing/global-commission");
}

/** PUT /api/admin/pricing/global-commission */
export async function updateGlobalCommissionApi(payload: {
  commissionPercentage: number;
  isActive: boolean;
}): Promise<ApiResponse<any>> {
  return request<any>("/api/admin/pricing/global-commission", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** GET /api/admin/pricing/surge */
export async function getSurgePricingApi(): Promise<ApiResponse<any>> {
  return request<any>("/api/admin/pricing/surge");
}

/** PUT /api/admin/pricing/surge/:id */
export async function updateSurgeRuleApi(
  id: number,
  payload: { multiplier: number; isActive: boolean },
): Promise<ApiResponse<any>> {
  return request<any>(`/api/admin/pricing/surge/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** PUT /api/admin/pricing/surge/:id/toggle */
export async function toggleSurgeRuleApi(
  id: number,
): Promise<ApiResponse<any>> {
  return request<any>(`/api/admin/pricing/surge/${id}/toggle`, {
    method: "PUT",
  });
}

/** GET /api/admin/pricing/reservations */
export async function getReservationFeesApi(): Promise<ApiResponse<any>> {
  return request<any>("/api/admin/pricing/reservations");
}

/** PUT /api/admin/pricing/reservations/:passengerServiceId */
export async function updateReservationFeesApi(
  passengerServiceId: number,
  payload: { cityFee: number; intercityFee: number; airportFee: number },
): Promise<ApiResponse<any>> {
  return request<any>(`/api/admin/pricing/reservations/${passengerServiceId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** GET /api/admin/pricing/bonus/settings */
export async function getBonusSettingsApi(): Promise<ApiResponse<any>> {
  return request<any>("/api/admin/pricing/bonus/settings");
}

/** PUT /api/admin/pricing/bonus/settings */
export async function updateBonusSettingsApi(payload: {
  isEnabled?: boolean;
  dailyTargetRides?: number;
  perRideBonusMad?: number;
  maxDailyBonus?: number;
  peakHourMultiplier?: number;
  weekendMultiplier?: number;
  dailyResetTime?: string;
}): Promise<ApiResponse<any>> {
  return request<any>("/api/admin/pricing/bonus/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** GET /api/admin/pricing/bonus/peak-hours */
export async function getBonusPeakHoursApi(): Promise<ApiResponse<any>> {
  return request<any>("/api/admin/pricing/bonus/peak-hours");
}

/** PUT /api/admin/pricing/bonus/peak-hours/:id */
export async function updateBonusPeakHourApi(
  id: number,
  payload: {
    startTime?: string;
    endTime?: string;
    bonusMadPerRide?: number;
    isActive?: boolean;
  },
): Promise<ApiResponse<any>> {
  return request<any>(`/api/admin/pricing/bonus/peak-hours/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** GET /api/admin/pricing/bonus/rules */
export async function getBonusRulesApi(): Promise<ApiResponse<any>> {
  return request<any>("/api/admin/pricing/bonus/rules");
}

/** PUT /api/admin/pricing/bonus/rules/:id */
export async function updateBonusRuleApi(
  id: number,
  payload: {
    bonusAmount?: number;
    userType?: string;
    conditions?: string;
    isActive?: boolean;
  },
): Promise<ApiResponse<any>> {
  return request<any>(`/api/admin/pricing/bonus/rules/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** PUT /api/admin/pricing/bonus/rules/:id/toggle */
export async function toggleBonusRuleApi(
  id: number,
): Promise<ApiResponse<any>> {
  return request<any>(`/api/admin/pricing/bonus/rules/${id}/toggle`, {
    method: "PUT",
  });
}

/** GET /api/admin/pricing/cities */
export async function getPricingCitiesApi(): Promise<ApiResponse<any>> {
  return request<any>("/api/admin/pricing/cities");
}

/** GET /api/admin/pricing/regions-overview */
export async function getRegionsOverviewApi(): Promise<ApiResponse<any>> {
  return request<any>("/api/admin/pricing/regions-overview");
}

/** PUT /api/admin/pricing/regions/:regionId/services */
export async function updateRegionServiceApi(
  regionId: number,
  payload: { passengerServiceId: number; isActive: boolean },
): Promise<ApiResponse<any>> {
  return request<any>(`/api/admin/pricing/regions/${regionId}/services`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** PUT /api/admin/pricing/regions/:regionId/bulk-services */
export async function bulkUpdateRegionServicesApi(
  regionId: number,
  payload: { passengerServiceIds: number[]; isActive: boolean },
): Promise<ApiResponse<any>> {
  return request<any>(`/api/admin/pricing/regions/${regionId}/bulk-services`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** PUT /api/admin/pricing/services/:serviceId/global-availability */
export async function toggleServiceGlobalAvailabilityApi(
  serviceId: number,
  payload: { isActive: boolean },
): Promise<ApiResponse<any>> {
  return request<any>(
    `/api/admin/pricing/services/${serviceId}/global-availability`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

/** GET /api/admin/pricing/document-requirements */
export async function getDocumentRequirementsApi(): Promise<ApiResponse<any>> {
  return request<any>("/api/admin/pricing/document-requirements");
}

/** POST /api/admin/pricing/document-requirements */
export async function createDocumentRequirementApi(
  payload: Record<string, any>,
): Promise<ApiResponse<any>> {
  return request<any>("/api/admin/pricing/document-requirements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** PUT /api/admin/pricing/document-requirements/:id */
export async function updateDocumentRequirementApi(
  id: string | number,
  payload: Record<string, any>,
): Promise<ApiResponse<any>> {
  return request<any>(`/api/admin/pricing/document-requirements/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** DELETE /api/admin/pricing/document-requirements/:id */
export async function deleteDocumentRequirementApi(
  id: string | number,
): Promise<ApiResponse<any>> {
  return request<any>(`/api/admin/pricing/document-requirements/${id}`, {
    method: "DELETE",
  });
}
