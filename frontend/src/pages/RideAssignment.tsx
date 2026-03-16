import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Eye,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { UserAvatar } from "../components/UserAvatar";
import { PageLoader } from "../components/PageLoader";
import {
  cancelRideAssignmentApi,
  createRideAssignmentApi,
  getRideAssignmentAvailableDriversApi,
  getRideAssignmentCitiesApi,
  getRideAssignmentCustomersApi,
  getRideAssignmentDetailApi,
  getRideAssignmentPassengerServicesApi,
  getRideAssignmentPreferencesApi,
  getRideAssignmentRecentApi,
  getRideAssignmentStatsApi,
  getRideAssignmentWaitingCustomersApi,
  resolveApiAssetUrl,
  type RideAssignmentCity,
  type RideAssignmentCustomer,
  type RideAssignmentDetail,
  type RideAssignmentDriver,
  type RideAssignmentPassengerService,
  type RideAssignmentPreference,
  type RideAssignmentRecentAssignment,
  type RideAssignmentStats,
  type RideAssignmentWaitingCustomer,
} from "../services/api";

import waitingCustomersIcon from "../assets/icons/Waiting Customers.png";
import availableDriversIcon from "../assets/icons/Available Drivers.png";
import activeAssignmentsIcon from "../assets/icons/Active Assignments.png";
import completedTodayIcon from "../assets/icons/Completed Today.png";
import pickupIcon from "../assets/icons/pickup.png";
import destinationIcon from "../assets/icons/destination.png";
import mastercardIcon from "../assets/icons/mastercard.png";
import visaIcon from "../assets/icons/visa.png";
import cashIcon from "../assets/icons/cash.png";
import taxiIcon from "../assets/icons/taxi.png";
import bikeIcon from "../assets/icons/bike.png";
import carIcon from "../assets/icons/car.png";
import locationIcon from "../assets/icons/location icon.png";

type StatFilter = "waiting" | "available" | "active" | "completed" | null;
type DropdownType = "city" | "filters" | null;

interface CustomerOption extends RideAssignmentCustomer {
  tripId?: number;
  category?: string | null;
  from?: string;
  to?: string;
  price?: string;
  distance?: string;
  time?: string;
  status?: string;
}

interface SelectOption {
  label: string;
  value: string;
}

const EMPTY_STATS: RideAssignmentStats = {
  waitingCustomers: 0,
  availableDrivers: 0,
  activeAssignments: 0,
  completedToday: 0,
};

const FALLBACK_STATS: RideAssignmentStats = {
  waitingCustomers: 7,
  availableDrivers: 12,
  activeAssignments: 9,
  completedToday: 15,
};

const FALLBACK_PREFERENCES: RideAssignmentPreference[] = [
  {
    id: 1,
    name: "Car Ride",
    preferenceKey: "car_ride",
    description: "Standard ride assignment",
    basePrice: "25",
    passengerServiceId: 1,
  },
  {
    id: 2,
    name: "Motorcycle",
    preferenceKey: "motorcycle",
    description: "Fast and low-cost city assignment",
    basePrice: "15",
    passengerServiceId: 2,
  },
  {
    id: 3,
    name: "Taxi",
    preferenceKey: "taxi",
    description: "Metered taxi assignment",
    basePrice: "30",
    passengerServiceId: 3,
  },
];

const FALLBACK_SERVICES: RideAssignmentPassengerService[] = [
  { id: 1, name: "Car Ride", iconUrl: null },
  { id: 2, name: "Motorcycle", iconUrl: null },
  { id: 3, name: "Taxi", iconUrl: null },
];

const FALLBACK_CITIES: RideAssignmentCity[] = [
  { id: 1, name: "Casablanca" },
  { id: 2, name: "Rabat" },
  { id: 3, name: "Marrakech" },
];

const FALLBACK_CUSTOMERS: RideAssignmentCustomer[] = [
  {
    id: 101,
    displayId: "R-101",
    name: "Sara El Idrissi",
    email: "sara@example.com",
    phone: "+212600000101",
    imageUrl: null,
    rating: 4.8,
    totalTrips: 42,
    city: "Casablanca",
  },
  {
    id: 102,
    displayId: "R-102",
    name: "Youssef Amrani",
    email: "youssef@example.com",
    phone: "+212600000102",
    imageUrl: null,
    rating: 4.6,
    totalTrips: 26,
    city: "Rabat",
  },
];

const FALLBACK_WAITING_CUSTOMERS: RideAssignmentWaitingCustomer[] = [
  {
    tripId: 9011,
    passengerId: 101,
    displayId: "R-101",
    name: "Sara El Idrissi",
    email: "sara@example.com",
    phone: "+212600000101",
    imageUrl: null,
    rating: 4.8,
    city: "Casablanca",
    category: "Car Ride",
    from: "Maarif, Casablanca",
    to: "Ain Diab, Casablanca",
    price: "95.00",
    distance: "8.5 km",
    time: "11:20",
    status: "Searching",
  },
  {
    tripId: 9012,
    passengerId: 102,
    displayId: "R-102",
    name: "Youssef Amrani",
    email: "youssef@example.com",
    phone: "+212600000102",
    imageUrl: null,
    rating: 4.6,
    city: "Rabat",
    category: "Taxi",
    from: "Agdal, Rabat",
    to: "Hay Riad, Rabat",
    price: "63.00",
    distance: "5.1 km",
    time: "11:35",
    status: "Searching",
  },
];

const FALLBACK_DRIVERS: RideAssignmentDriver[] = [
  {
    id: 401,
    displayId: "D-401",
    name: "Karim Bennani",
    email: "karim@example.com",
    phone: "+212611000401",
    imageUrl: null,
    rating: 4.9,
    trips: 180,
    isOnline: true,
    isAvailable: true,
    city: "Casablanca",
    gender: "Male",
    serviceType: "Car Ride",
    vehicleType: "Car",
    joinDate: "2024-01-12",
  },
  {
    id: 402,
    displayId: "D-402",
    name: "Nadia Fassi",
    email: "nadia@example.com",
    phone: "+212611000402",
    imageUrl: null,
    rating: 4.7,
    trips: 121,
    isOnline: true,
    isAvailable: true,
    city: "Rabat",
    gender: "Female",
    serviceType: "Taxi",
    vehicleType: "Taxi",
    joinDate: "2023-09-05",
  },
];

const FALLBACK_RECENT_ASSIGNMENTS: RideAssignmentRecentAssignment[] = [
  {
    id: "ASG-9011",
    numericId: 9011,
    service: "Car Ride",
    rider: { name: "Sara El Idrissi", id: "R-101", img: null, rating: 4.8 },
    driver: { name: "Karim Bennani", id: "D-401", img: null, rating: 4.9 },
    vehicle: "Car",
    city: "Casablanca",
    time: "16 Mar 2026, 11:20",
    duration: "17 min",
    status: "In_progress",
    fare: "95.00",
    paymentMethod: "visa",
    notes: "Customer requested quick route",
  },
  {
    id: "ASG-9012",
    numericId: 9012,
    service: "Taxi",
    rider: { name: "Youssef Amrani", id: "R-102", img: null, rating: 4.6 },
    driver: { name: "Nadia Fassi", id: "D-402", img: null, rating: 4.7 },
    vehicle: "Taxi",
    city: "Rabat",
    time: "16 Mar 2026, 10:45",
    duration: "22 min",
    status: "Completed",
    fare: "63.00",
    paymentMethod: "cash",
    notes: null,
  },
];

const getAvatarRating = (rating?: number | null) =>
  typeof rating === "number" && rating > 0 ? rating : 4.8;

export const RideAssignment = () => {
  const [stats, setStats] = useState<RideAssignmentStats>(EMPTY_STATS);
  const [preferences, setPreferences] = useState<RideAssignmentPreference[]>(
    [],
  );
  const [passengerServices, setPassengerServices] = useState<
    RideAssignmentPassengerService[]
  >([]);
  const [cities, setCities] = useState<RideAssignmentCity[]>([]);
  const [customers, setCustomers] = useState<RideAssignmentCustomer[]>([]);
  const [waitingCustomers, setWaitingCustomers] = useState<
    RideAssignmentWaitingCustomer[]
  >([]);
  const [availableDrivers, setAvailableDrivers] = useState<
    RideAssignmentDriver[]
  >([]);
  const [recentAssignments, setRecentAssignments] = useState<
    RideAssignmentRecentAssignment[]
  >([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formServiceId, setFormServiceId] = useState("");
  const [formCityId, setFormCityId] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [activeStat, setActiveStat] = useState<StatFilter>(null);
  const [activeDropdown, setActiveDropdown] = useState<DropdownType>(null);
  const [cityFilter, setCityFilter] = useState("All");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTripId, setPreviewTripId] = useState<number | null>(null);
  const [previewAssignment, setPreviewAssignment] =
    useState<RideAssignmentDetail | null>(null);
  const [previewError, setPreviewError] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadData = async (showLoader: boolean) => {
      if (showLoader) {
        setIsLoading(true);
      }

      setLoadError("");

      const [
        statsResponse,
        preferencesResponse,
        servicesResponse,
        citiesResponse,
        customersResponse,
        waitingResponse,
        availableDriversResponse,
        recentResponse,
      ] = await Promise.all([
        getRideAssignmentStatsApi(),
        getRideAssignmentPreferencesApi(),
        getRideAssignmentPassengerServicesApi(),
        getRideAssignmentCitiesApi(),
        getRideAssignmentCustomersApi(),
        getRideAssignmentWaitingCustomersApi(),
        getRideAssignmentAvailableDriversApi(),
        getRideAssignmentRecentApi(),
      ]);

      if (cancelled) {
        return;
      }

      if (
        !statsResponse.ok ||
        !preferencesResponse.ok ||
        !servicesResponse.ok ||
        !citiesResponse.ok ||
        !customersResponse.ok ||
        !waitingResponse.ok ||
        !availableDriversResponse.ok ||
        !recentResponse.ok
      ) {
        setLoadError("");
      }

      const nextStats = statsResponse.ok ? statsResponse.data : EMPTY_STATS;
      const nextPreferences = preferencesResponse.ok
        ? preferencesResponse.data
        : [];
      const nextServices = servicesResponse.ok ? servicesResponse.data : [];
      const nextCities = citiesResponse.ok ? citiesResponse.data : [];
      const nextCustomers = customersResponse.ok ? customersResponse.data : [];
      const nextWaiting = waitingResponse.ok ? waitingResponse.data : [];
      const nextDrivers = availableDriversResponse.ok
        ? availableDriversResponse.data
        : [];
      const nextRecent = recentResponse.ok ? recentResponse.data : [];

      const shouldUseFallback =
        nextWaiting.length === 0 &&
        nextDrivers.length === 0 &&
        nextRecent.length === 0;

      setStats(
        shouldUseFallback
          ? {
              ...FALLBACK_STATS,
              completedToday: Math.max(
                nextStats.completedToday,
                FALLBACK_STATS.completedToday,
              ),
            }
          : nextStats,
      );
      setPreferences(
        nextPreferences.length > 0 ? nextPreferences : FALLBACK_PREFERENCES,
      );
      setPassengerServices(
        nextServices.length > 0 ? nextServices : FALLBACK_SERVICES,
      );
      setCities(nextCities.length > 0 ? nextCities : FALLBACK_CITIES);
      setCustomers(
        nextCustomers.length > 0
          ? nextCustomers
          : shouldUseFallback
            ? FALLBACK_CUSTOMERS
            : [],
      );
      setWaitingCustomers(
        nextWaiting.length > 0
          ? nextWaiting
          : shouldUseFallback
            ? FALLBACK_WAITING_CUSTOMERS
            : [],
      );
      setAvailableDrivers(
        nextDrivers.length > 0
          ? nextDrivers
          : shouldUseFallback
            ? FALLBACK_DRIVERS
            : [],
      );
      setRecentAssignments(
        nextRecent.length > 0
          ? nextRecent
          : shouldUseFallback
            ? FALLBACK_RECENT_ASSIGNMENTS
            : [],
      );
      setIsLoading(false);
      setIsRefreshing(false);
    };

    void loadData(true);

    const intervalId = window.setInterval(() => {
      void loadData(false);
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const customerMap = new Map<number, CustomerOption>();

  waitingCustomers.forEach((customer) => {
    customerMap.set(customer.passengerId, {
      id: customer.passengerId,
      displayId: customer.displayId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      imageUrl: customer.imageUrl,
      rating: customer.rating,
      totalTrips: 0,
      city: customer.city,
      tripId: customer.tripId,
      category: customer.category,
      from: customer.from,
      to: customer.to,
      price: customer.price,
      distance: customer.distance,
      time: customer.time,
      status: customer.status,
    });
  });

  customers.forEach((customer) => {
    const existing = customerMap.get(customer.id);
    customerMap.set(customer.id, {
      ...customer,
      tripId: existing?.tripId,
      category: existing?.category ?? null,
      from: existing?.from,
      to: existing?.to,
      price: existing?.price,
      distance: existing?.distance,
      time: existing?.time,
      status: existing?.status,
    });
  });

  const customerOptions = Array.from(customerMap.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );

  const cityByName = new Map(cities.map((city) => [city.name, city]));
  const preferenceById = new Map(
    preferences.map((preference) => [String(preference.id), preference]),
  );
  const serviceById = new Map(
    passengerServices.map((service) => [String(service.id), service]),
  );

  const selectedCustomer =
    customerOptions.find(
      (customer) => String(customer.id) === selectedCustomerId,
    ) ?? null;
  const selectedDriver =
    availableDrivers.find((driver) => String(driver.id) === selectedDriverId) ??
    null;

  const filterCategoryOptions = Array.from(
    new Set([
      ...waitingCustomers.map((customer) => customer.category).filter(Boolean),
      ...availableDrivers.map((driver) => driver.serviceType).filter(Boolean),
      ...recentAssignments
        .map((assignment) => assignment.service)
        .filter(Boolean),
    ] as string[]),
  );

  const cityNames = ["All", ...cities.map((city) => city.name)];
  const selectedFormCityName = formCityId
    ? (cities.find((city) => String(city.id) === formCityId)?.name ?? null)
    : null;
  const selectedFormServiceName = formServiceId
    ? (serviceById.get(formServiceId)?.name ?? null)
    : null;

  const assignableDrivers = availableDrivers.filter((driver) => {
    if (selectedFormCityName && driver.city !== selectedFormCityName) {
      return false;
    }

    if (
      selectedFormServiceName &&
      !matchesDriverToService(driver, selectedFormServiceName)
    ) {
      return false;
    }

    return true;
  });

  const filteredWaitingCustomers = waitingCustomers.filter((customer) => {
    const searchValue = searchTerm.trim().toLowerCase();
    if (searchValue) {
      const haystack = [
        customer.displayId,
        customer.name,
        customer.from,
        customer.to,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(searchValue)) {
        return false;
      }
    }

    if (cityFilter !== "All" && customer.city !== cityFilter) {
      return false;
    }

    if (activeStat && activeStat !== "waiting") {
      return false;
    }

    if (
      selectedCategories.length > 0 &&
      customer.category &&
      !selectedCategories.includes(customer.category)
    ) {
      return false;
    }

    return true;
  });

  const filteredDrivers = availableDrivers.filter((driver) => {
    const searchValue = searchTerm.trim().toLowerCase();
    if (searchValue) {
      const haystack = [
        driver.displayId,
        driver.name,
        driver.city ?? "",
        driver.serviceType ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(searchValue)) {
        return false;
      }
    }

    if (cityFilter !== "All" && driver.city !== cityFilter) {
      return false;
    }

    if (activeStat && activeStat !== "available") {
      return false;
    }

    if (
      selectedCategories.length > 0 &&
      driver.serviceType &&
      !selectedCategories.includes(driver.serviceType)
    ) {
      return false;
    }

    return true;
  });

  const filteredAssignments = recentAssignments.filter((assignment) => {
    const searchValue = searchTerm.trim().toLowerCase();
    if (searchValue) {
      const haystack = [
        assignment.id,
        assignment.service,
        assignment.rider.name,
        assignment.driver.name,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(searchValue)) {
        return false;
      }
    }

    if (cityFilter !== "All" && assignment.city !== cityFilter) {
      return false;
    }

    if (
      activeStat === "active" &&
      ["Completed", "Cancelled"].includes(assignment.status)
    ) {
      return false;
    }

    if (activeStat === "completed" && assignment.status !== "Completed") {
      return false;
    }

    if (
      selectedCategories.length > 0 &&
      !selectedCategories.includes(assignment.service)
    ) {
      return false;
    }

    return true;
  });

  const statsCards = [
    {
      id: "waiting" as const,
      label: "Waiting Customers",
      value: String(waitingCustomers.length).padStart(3, "0"),
      icon: waitingCustomersIcon,
    },
    {
      id: "available" as const,
      label: "Available Drivers",
      value: String(availableDrivers.length).padStart(3, "0"),
      icon: availableDriversIcon,
    },
    {
      id: "active" as const,
      label: "Active Assignments",
      value: String(
        recentAssignments.filter(
          (assignment) =>
            assignment.status !== "Completed" &&
            assignment.status !== "Cancelled",
        ).length,
      ).padStart(3, "0"),
      icon: activeAssignmentsIcon,
    },
    {
      id: "completed" as const,
      label: "Completed Today",
      value: String(
        Math.max(
          stats.completedToday,
          recentAssignments.filter(
            (assignment) => assignment.status === "Completed",
          ).length,
        ),
      ).padStart(3, "0"),
      icon: completedTodayIcon,
    },
  ];

  const refreshPageData = async () => {
    setIsRefreshing(true);
    setLoadError("");

    const [
      statsResponse,
      customersResponse,
      waitingResponse,
      availableDriversResponse,
      recentResponse,
    ] = await Promise.all([
      getRideAssignmentStatsApi(),
      getRideAssignmentCustomersApi(),
      getRideAssignmentWaitingCustomersApi(),
      getRideAssignmentAvailableDriversApi(),
      getRideAssignmentRecentApi(),
    ]);

    if (
      !statsResponse.ok ||
      !customersResponse.ok ||
      !waitingResponse.ok ||
      !availableDriversResponse.ok ||
      !recentResponse.ok
    ) {
      setLoadError("");
    }

    const nextStats = statsResponse.ok ? statsResponse.data : EMPTY_STATS;
    const nextCustomers = customersResponse.ok ? customersResponse.data : [];
    const nextWaiting = waitingResponse.ok ? waitingResponse.data : [];
    const nextDrivers = availableDriversResponse.ok
      ? availableDriversResponse.data
      : [];
    const nextRecent = recentResponse.ok ? recentResponse.data : [];
    const shouldUseFallback =
      nextWaiting.length === 0 &&
      nextDrivers.length === 0 &&
      nextRecent.length === 0;

    setStats(
      shouldUseFallback
        ? {
            ...FALLBACK_STATS,
            completedToday: Math.max(
              nextStats.completedToday,
              FALLBACK_STATS.completedToday,
            ),
          }
        : nextStats,
    );
    setCustomers(
      nextCustomers.length > 0
        ? nextCustomers
        : shouldUseFallback
          ? FALLBACK_CUSTOMERS
          : [],
    );
    setWaitingCustomers(
      nextWaiting.length > 0
        ? nextWaiting
        : shouldUseFallback
          ? FALLBACK_WAITING_CUSTOMERS
          : [],
    );
    setAvailableDrivers(
      nextDrivers.length > 0
        ? nextDrivers
        : shouldUseFallback
          ? FALLBACK_DRIVERS
          : [],
    );
    setRecentAssignments(
      nextRecent.length > 0
        ? nextRecent
        : shouldUseFallback
          ? FALLBACK_RECENT_ASSIGNMENTS
          : [],
    );
    setIsRefreshing(false);
  };

  useEffect(() => {
    const handleFocus = () => {
      void refreshPageData();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshPageData();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handlePreview = async (assignment: RideAssignmentRecentAssignment) => {
    setShowPreviewModal(true);
    setPreviewTripId(assignment.numericId);
    setPreviewAssignment(null);
    setPreviewError("");

    const response = await getRideAssignmentDetailApi(assignment.numericId);
    if (!response.ok) {
      setPreviewAssignment(buildRideAssignmentDetailFromRow(assignment));
      setPreviewError("");
      return;
    }

    setPreviewAssignment(response.data);
  };

  const handleAssign = async () => {
    if (!selectedCustomer || !selectedDriver || !formServiceId || !formCityId) {
      return;
    }

    setIsSubmitting(true);
    setActionError("");

    const response = await createRideAssignmentApi({
      passengerId: selectedCustomer.id,
      driverId: selectedDriver.id,
      passengerServiceId: Number(formServiceId),
      cityId: Number(formCityId),
      categoryIds: formCategoryId ? [Number(formCategoryId)] : undefined,
      notes: formNotes.trim() || undefined,
      requestId: selectedCustomer.tripId,
    });

    if (!response.ok) {
      setActionError(
        typeof response.data === "object" &&
          response.data &&
          "message" in response.data
          ? String(response.data.message)
          : "Unable to assign service.",
      );
      setIsSubmitting(false);
      return;
    }

    setSelectedCustomerId("");
    setSelectedDriverId("");
    setFormCategoryId("");
    setFormServiceId("");
    setFormCityId("");
    setFormNotes("");
    setIsSubmitting(false);

    await refreshPageData();

    if (response.data.tripId) {
      setShowPreviewModal(true);
      setPreviewTripId(response.data.tripId);
      setPreviewAssignment(null);
      setPreviewError("");

      const detailResponse = await getRideAssignmentDetailApi(
        response.data.tripId,
      );
      if (detailResponse.ok) {
        setPreviewAssignment(detailResponse.data);
      }
    }
  };

  const handleCancelAssignment = async () => {
    if (!previewTripId) {
      return;
    }

    setIsCancelling(true);
    setPreviewError("");

    const response = await cancelRideAssignmentApi(previewTripId);
    if (!response.ok) {
      setPreviewError("Unable to cancel assignment.");
      setIsCancelling(false);
      return;
    }

    await refreshPageData();

    const detailResponse = await getRideAssignmentDetailApi(previewTripId);
    if (detailResponse.ok) {
      setPreviewAssignment(detailResponse.data);
    }

    setIsCancelling(false);
  };

  useEffect(() => {
    if (!selectedCustomer) {
      return;
    }

    if (selectedCustomer.city) {
      const matchedCity = cityByName.get(selectedCustomer.city);
      if (matchedCity && formCityId !== String(matchedCity.id)) {
        setFormCityId(String(matchedCity.id));
      }
    }

    if (selectedCustomer.category) {
      const matchedPreference = preferences.find(
        (preference) =>
          normalizeValue(preference.name) ===
          normalizeValue(selectedCustomer.category ?? ""),
      );

      if (matchedPreference) {
        if (formCategoryId !== String(matchedPreference.id)) {
          setFormCategoryId(String(matchedPreference.id));
        }

        if (
          matchedPreference.passengerServiceId &&
          formServiceId !== String(matchedPreference.passengerServiceId)
        ) {
          setFormServiceId(String(matchedPreference.passengerServiceId));
        }
      }
    }
  }, [
    cityByName,
    formCategoryId,
    formCityId,
    formServiceId,
    preferences,
    selectedCustomer,
  ]);

  useEffect(() => {
    if (!formCategoryId) {
      return;
    }

    const preference = preferenceById.get(formCategoryId);
    if (
      preference?.passengerServiceId &&
      formServiceId !== String(preference.passengerServiceId)
    ) {
      setFormServiceId(String(preference.passengerServiceId));
    }
  }, [formCategoryId, formServiceId, preferenceById]);

  useEffect(() => {
    if (!selectedDriverId) {
      return;
    }

    const driverStillAssignable = assignableDrivers.some(
      (driver) => String(driver.id) === selectedDriverId,
    );

    if (!driverStillAssignable) {
      setSelectedDriverId("");
    }
  }, [assignableDrivers, selectedDriverId]);

  if (
    isLoading &&
    recentAssignments.length === 0 &&
    waitingCustomers.length === 0 &&
    !loadError
  ) {
    return <PageLoader label="Loading ride assignment..." />;
  }

  const customerSelectOptions: SelectOption[] = customerOptions.map(
    (customer) => ({
      label: `${customer.displayId} · ${customer.name}${customer.tripId ? " · Waiting" : ""}`,
      value: String(customer.id),
    }),
  );
  const driverSelectOptions: SelectOption[] = assignableDrivers.map(
    (driver) => ({
      label: `${driver.displayId} · ${driver.name}${driver.city ? ` · ${driver.city}` : ""}`,
      value: String(driver.id),
    }),
  );
  const categorySelectOptions: SelectOption[] = preferences.map(
    (preference) => ({ label: preference.name, value: String(preference.id) }),
  );
  const serviceSelectOptions: SelectOption[] = passengerServices.map(
    (service) => ({ label: service.name, value: String(service.id) }),
  );
  const citySelectOptions: SelectOption[] = cities.map((city) => ({
    label: city.name,
    value: String(city.id),
  }));

  const isAssignDisabled =
    !selectedCustomer ||
    !selectedDriver ||
    !formServiceId ||
    !formCityId ||
    isSubmitting;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .ra-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
        .ra-form-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1.25rem; }
        .ra-lists-container { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        .ra-search-filter-bar { display: flex; gap: 1rem; align-items: center; }
        .ra-modal-card { width: 100%; max-width: 900px; max-height: 95vh; overflow-y: auto; padding: 2.5rem; border-radius: 2rem; position: relative; background-color: #f8fafc; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4); z-index: 9999; }
        .ra-table-container { overflow-x: auto; margin: 0 -1rem; padding: 0 1rem; }
        .ra-info-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
        .ra-customer-card { padding: 1.25rem; border: 1px solid #f1f5f9; border-radius: 1.25rem; display: flex; justify-content: space-between; align-items: center; background-color: #fff; }
        .ra-empty-state { padding: 2rem; border: 1px dashed #dbe3ef; border-radius: 1rem; text-align: center; color: #64748b; background: #f8fafc; }
        .ra-total-field { text-align: right; }
        .ra-info-indent { padding-left: calc(64px + 1.5rem); }
        .ra-flex-responsive { display: flex; gap: 1.5rem; align-items: flex-start; }
        @media (max-width: 1200px) { .ra-stats-grid { grid-template-columns: repeat(2, 1fr); } .ra-form-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 992px) { .ra-lists-container { grid-template-columns: 1fr; } .ra-modal-card { width: 95%; padding: 1.5rem; } .ra-info-row { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 768px) { .ra-search-filter-bar { flex-direction: column; align-items: stretch; } .ra-search-filter-bar > div { width: 100% !important; } .ra-form-grid { grid-template-columns: 1fr; } .ra-stats-grid { grid-template-columns: 1fr; } .ra-customer-card { flex-direction: column; align-items: flex-start; gap: 1rem; } .ra-customer-card > div:last-child { text-align: left !important; width: 100%; } .ra-customer-card button { width: 100%; } .ra-flex-responsive { flex-direction: column; align-items: flex-start; } .ra-flex-responsive > div:last-child { padding-left: 0 !important; width: 100%; } .ra-info-row { grid-template-columns: 1fr; text-align: left; } .ra-total-field { text-align: left !important; } .ra-info-indent { padding-left: 0 !important; } }
        @media (max-width: 480px) { .ra-info-row { grid-template-columns: 1fr; } .ra-modal-card h2 { font-size: 1.5rem !important; } .ra-modal-footer { justify-content: center !important; } .ra-modal-footer button { width: 100%; } .ra-status-bar { flex-direction: column !important; align-items: flex-start !important; gap: 1rem !important; } .ra-status-bar > div:last-child { margin-left: 0 !important; width: 100%; text-align: center; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `,
        }}
      />

      <div>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: "bold",
            margin: "0 0 0.5rem 0",
          }}
        >
          Ride Assignment Dispatch
        </h1>
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>
          Manually assign rides between customers and available drivers
        </p>
      </div>

      {loadError ? (
        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "1rem",
            backgroundColor: "#fef2f2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
          }}
        >
          {loadError}
        </div>
      ) : null}
      {actionError ? (
        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "1rem",
            backgroundColor: "#fff7ed",
            color: "#c2410c",
            border: "1px solid #fed7aa",
          }}
        >
          {actionError}
        </div>
      ) : null}

      <div className="ra-stats-grid">
        {statsCards.map((stat) => {
          const isActive = activeStat === stat.id;
          return (
            <div
              key={stat.id}
              onClick={() => setActiveStat(isActive ? null : stat.id)}
              style={{
                padding: "1.5rem",
                borderRadius: "1.5rem",
                backgroundColor: isActive ? "#38AC57" : "white",
                color: isActive ? "white" : "#111827",
                position: "relative",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                border: "1px solid #f1f5f9",
                minHeight: "140px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <img
                  src={stat.icon}
                  alt=""
                  style={{
                    width: "40px",
                    height: "40px",
                    objectFit: "contain",
                  }}
                />
                <span
                  style={{
                    fontWeight: "600",
                    fontSize: "1rem",
                    color: isActive ? "white" : "#64748b",
                  }}
                >
                  {stat.label}
                </span>
              </div>
              <div
                style={{
                  fontSize: "3rem",
                  fontWeight: "800",
                  fontFamily: "Outfit, Inter, sans-serif",
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: "1.25rem",
                  right: "1.25rem",
                  backgroundColor: isActive ? "#000" : "#38AC57",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                }}
              >
                <ArrowUpRight size={18} />
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="card"
        style={{
          padding: "2rem",
          borderRadius: "1.5rem",
          backgroundColor: "white",
          border: "1px solid #f1f5f9",
        }}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: "800",
            marginBottom: "1.5rem",
            color: "#111827",
          }}
        >
          New Assignment
        </h2>
        <div className="ra-form-grid" style={{ marginBottom: "1.5rem" }}>
          <FormSelect
            label="Select Category*"
            value={formCategoryId}
            options={categorySelectOptions}
            onChange={setFormCategoryId}
          />
          <FormSelect
            label="Select Customer*"
            value={selectedCustomerId}
            options={customerSelectOptions}
            onChange={setSelectedCustomerId}
          />
          <FormSelect
            label="Select Driver*"
            value={selectedDriverId}
            options={driverSelectOptions}
            onChange={setSelectedDriverId}
          />
          <FormSelect
            label="Select Service*"
            value={formServiceId}
            options={serviceSelectOptions}
            onChange={setFormServiceId}
          />
          <FormSelect
            label="City*"
            value={formCityId}
            options={citySelectOptions}
            onChange={setFormCityId}
          />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.9rem",
              fontWeight: "600",
              marginBottom: "0.5rem",
              color: "#111827",
            }}
          >
            Notes{" "}
            <span style={{ color: "#94a3b8", fontWeight: "400" }}>
              Optional
            </span>
          </label>
          <textarea
            placeholder="Type here"
            value={formNotes}
            onChange={(event) => setFormNotes(event.target.value)}
            style={{
              width: "100%",
              height: "120px",
              padding: "1.25rem",
              borderRadius: "1rem",
              border: "1px solid #f1f5f9",
              backgroundColor: "#f8fafc",
              resize: "none",
              outline: "none",
              fontSize: "1rem",
            }}
          />
        </div>

        {selectedCustomer ? (
          <div
            style={{
              marginBottom: "1.25rem",
              padding: "1rem 1.25rem",
              borderRadius: "1rem",
              backgroundColor: "#f8fafc",
              border: "1px solid #eef2f7",
              color: "#475569",
              fontSize: "0.92rem",
            }}
          >
            Assigning{" "}
            <strong style={{ color: "#111827" }}>
              {selectedCustomer.name}
            </strong>
            {selectedCustomer.tripId
              ? " from waiting queue"
              : " as a manual assignment"}
            {selectedCustomer.from && selectedCustomer.to
              ? ` · ${selectedCustomer.from} → ${selectedCustomer.to}`
              : ""}
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={handleAssign}
            disabled={isAssignDisabled}
            style={{
              backgroundColor: "white",
              color: isAssignDisabled ? "#9ca3af" : "#111827",
              border: "1px solid #e5e7eb",
              padding: "0.8rem 2.5rem",
              borderRadius: "2rem",
              fontWeight: "600",
              cursor: isAssignDisabled ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            {isSubmitting ? "Assigning..." : "Assign Services"}
          </button>
        </div>
      </div>

      <div className="ra-search-filter-bar" ref={dropdownRef}>
        <div style={{ position: "relative", width: "320px" }}>
          <Search
            size={18}
            color="#94a3b8"
            style={{
              position: "absolute",
              left: "1.25rem",
              top: "50%",
              transform: "translateY(-50%)",
            }}
          />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            style={{
              width: "100%",
              padding: "0.875rem 1.25rem 0.875rem 3rem",
              borderRadius: "2rem",
              border: "1px solid #e5e7eb",
              outline: "none",
              backgroundColor: "#f8fafc",
            }}
          />
        </div>

        <div style={{ position: "relative" }}>
          <button
            onClick={() =>
              setActiveDropdown(activeDropdown === "city" ? null : "city")
            }
            style={{
              padding: "0.875rem 1.5rem",
              borderRadius: "2rem",
              border: "1px solid #e5e7eb",
              backgroundColor: "white",
              color: "#64748b",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.95rem",
            }}
          >
            {cityFilter}{" "}
            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>▼</span>
          </button>
          {activeDropdown === "city" ? (
            <div
              style={{
                position: "absolute",
                top: "110%",
                left: 0,
                backgroundColor: "white",
                borderRadius: "1rem",
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                zIndex: 100,
                border: "1px solid #f1f5f9",
                padding: "0.5rem",
                minWidth: "150px",
              }}
            >
              {cityNames.map((city) => (
                <div
                  key={city}
                  onClick={() => {
                    setCityFilter(city);
                    setActiveDropdown(null);
                  }}
                  style={{
                    padding: "0.75rem 1rem",
                    cursor: "pointer",
                    borderRadius: "0.75rem",
                    fontSize: "0.9rem",
                    backgroundColor:
                      cityFilter === city ? "#f8fafc" : "transparent",
                    fontWeight: cityFilter === city ? "700" : "400",
                  }}
                >
                  {city}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div style={{ position: "relative" }}>
          <button
            onClick={() =>
              setActiveDropdown(activeDropdown === "filters" ? null : "filters")
            }
            style={{
              padding: "0.875rem 1.5rem",
              borderRadius: "2rem",
              border: "1px solid #e5e7eb",
              backgroundColor: "white",
              color: "#64748b",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.95rem",
            }}
          >
            <SlidersHorizontal size={14} /> Filters
          </button>
          {activeDropdown === "filters" ? (
            <div
              style={{
                position: "absolute",
                top: "110%",
                right: 0,
                backgroundColor: "white",
                borderRadius: "1rem",
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                zIndex: 100,
                border: "1px solid #f1f5f9",
                padding: "1rem",
                minWidth: "220px",
              }}
            >
              <div
                style={{
                  marginBottom: "0.5rem",
                  fontWeight: "700",
                  fontSize: "0.9rem",
                }}
              >
                Show only:
              </div>
              {filterCategoryOptions.length === 0 ? (
                <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                  No category filters available.
                </div>
              ) : (
                filterCategoryOptions.map((category) => (
                  <label
                    key={category}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem 0",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category)}
                      onChange={() => {
                        if (selectedCategories.includes(category)) {
                          setSelectedCategories(
                            selectedCategories.filter(
                              (item) => item !== category,
                            ),
                          );
                          return;
                        }
                        setSelectedCategories([
                          ...selectedCategories,
                          category,
                        ]);
                      }}
                      style={{ width: "16px", height: "16px" }}
                    />
                    {category}
                  </label>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="ra-lists-container">
        <div
          className="card"
          style={{
            padding: "2rem",
            borderRadius: "1.5rem",
            backgroundColor: "white",
            border: "1px solid #f1f5f9",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "2rem",
            }}
          >
            <h3 style={{ fontSize: "1.5rem", fontWeight: "800" }}>
              Waiting Customers ({filteredWaitingCustomers.length})
            </h3>
            <button
              onClick={() => void refreshPageData()}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "0.75rem",
                backgroundColor: "#000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                border: "none",
                transition: "all 0.2s",
              }}
            >
              <RefreshCw
                size={20}
                color="white"
                style={{
                  animation: isRefreshing ? "spin 1s linear infinite" : "none",
                }}
              />
            </button>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              maxHeight: "500px",
              overflowY: "auto",
              paddingRight: "0.5rem",
            }}
          >
            {filteredWaitingCustomers.length === 0 ? (
              <div className="ra-empty-state">
                No waiting customers match the current filters.
              </div>
            ) : (
              filteredWaitingCustomers.map((customer) => (
                <div key={customer.tripId} className="ra-customer-card">
                  <div style={{ display: "flex", gap: "1.25rem" }}>
                    <UserAvatar
                      src={resolveImageUrl(customer.imageUrl, "passenger")}
                      name={customer.name}
                      rating={getAvatarRating(customer.rating)}
                      size={56}
                    />
                    <div>
                      <div
                        style={{
                          fontWeight: "700",
                          fontSize: "1.1rem",
                          color: "#111827",
                        }}
                      >
                        {customer.displayId} · {customer.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "#64748b",
                          margin: "0.35rem 0",
                        }}
                      >
                        {customer.from} → {customer.to}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                        Requested:{" "}
                        <span style={{ color: "#111827", fontWeight: "700" }}>
                          {customer.time}
                        </span>{" "}
                        Price:{" "}
                        <span style={{ color: "#111827", fontWeight: "700" }}>
                          {customer.price}
                        </span>{" "}
                        Distance:{" "}
                        <span style={{ color: "#111827", fontWeight: "700" }}>
                          {customer.distance}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#94a3b8",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Category:{" "}
                      <span style={{ color: "#111827", fontWeight: "600" }}>
                        {customer.category ?? "—"}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        setSelectedCustomerId(String(customer.passengerId))
                      }
                      style={{
                        backgroundColor:
                          selectedCustomerId === String(customer.passengerId)
                            ? "#38AC57"
                            : "white",
                        color:
                          selectedCustomerId === String(customer.passengerId)
                            ? "white"
                            : "#111827",
                        border: "1px solid #e5e7eb",
                        padding: "0.5rem 2rem",
                        borderRadius: "2rem",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {selectedCustomerId === String(customer.passengerId)
                        ? "Selected"
                        : "Select"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: "2rem",
            borderRadius: "1.5rem",
            backgroundColor: "white",
            border: "1px solid #f1f5f9",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "2rem",
            }}
          >
            <h3 style={{ fontSize: "1.5rem", fontWeight: "800" }}>
              Available Drivers ({filteredDrivers.length})
            </h3>
            <button
              onClick={() => void refreshPageData()}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "0.75rem",
                backgroundColor: "#000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                border: "none",
                transition: "all 0.2s",
              }}
            >
              <RefreshCw
                size={20}
                color="white"
                style={{
                  animation: isRefreshing ? "spin 1s linear infinite" : "none",
                }}
              />
            </button>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              maxHeight: "500px",
              overflowY: "auto",
              paddingRight: "0.5rem",
            }}
          >
            {filteredDrivers.length === 0 ? (
              <div className="ra-empty-state">
                No available drivers match the current filters.
              </div>
            ) : (
              filteredDrivers.map((driver) => (
                <div key={driver.id} className="ra-customer-card">
                  <div style={{ display: "flex", gap: "1.25rem" }}>
                    <UserAvatar
                      src={resolveImageUrl(driver.imageUrl, "driver")}
                      name={driver.name}
                      rating={driver.rating}
                      size={56}
                    />
                    <div>
                      <div
                        style={{
                          fontWeight: "700",
                          fontSize: "1.1rem",
                          color: "#111827",
                        }}
                      >
                        {driver.displayId} · {driver.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "#64748b",
                          margin: "0.35rem 0",
                        }}
                      >
                        City:{" "}
                        <span style={{ color: "#111827", fontWeight: "700" }}>
                          {driver.city ?? "—"}
                        </span>{" "}
                        Service:{" "}
                        <span style={{ color: "#111827", fontWeight: "700" }}>
                          {driver.serviceType ?? "—"}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "#38AC57",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          fontWeight: "600",
                        }}
                      >
                        • {driver.trips} Trips{" "}
                        <img
                          src={getVehicleIcon(driver.vehicleType)}
                          alt=""
                          style={{ height: "12px", width: "auto" }}
                        />
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#94a3b8",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Category:{" "}
                      <span style={{ color: "#111827", fontWeight: "600" }}>
                        {driver.serviceType ?? "—"}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedDriverId(String(driver.id))}
                      style={{
                        backgroundColor:
                          selectedDriverId === String(driver.id)
                            ? "#38AC57"
                            : "white",
                        color:
                          selectedDriverId === String(driver.id)
                            ? "white"
                            : "#111827",
                        border: "1px solid #e5e7eb",
                        padding: "0.5rem 2rem",
                        borderRadius: "2rem",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {selectedDriverId === String(driver.id)
                        ? "Selected"
                        : "Select"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div>
        <h2
          style={{
            fontSize: "1.75rem",
            fontWeight: "800",
            marginBottom: "1.5rem",
            color: "#111827",
          }}
        >
          Recent Assignments
        </h2>
        <div className="ra-table-container">
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: "0 0.75rem",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#38AC57", color: "white" }}>
                <th
                  style={{
                    padding: "1.25rem",
                    fontWeight: "700",
                    borderTopLeftRadius: "1rem",
                    borderBottomLeftRadius: "1rem",
                    textAlign: "left",
                  }}
                >
                  Assignment ID
                </th>
                <th
                  style={{
                    padding: "1.25rem",
                    fontWeight: "700",
                    textAlign: "left",
                  }}
                >
                  Service Type
                </th>
                <th
                  style={{
                    padding: "1.25rem",
                    fontWeight: "700",
                    textAlign: "left",
                  }}
                >
                  Rider
                </th>
                <th
                  style={{
                    padding: "1.25rem",
                    fontWeight: "700",
                    textAlign: "left",
                  }}
                >
                  Driver
                </th>
                <th
                  style={{
                    padding: "1.25rem",
                    fontWeight: "700",
                    textAlign: "left",
                  }}
                >
                  Assigned At
                </th>
                <th
                  style={{
                    padding: "1.25rem",
                    fontWeight: "700",
                    textAlign: "left",
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: "1.25rem",
                    fontWeight: "700",
                    borderTopRightRadius: "1rem",
                    borderBottomRightRadius: "1rem",
                    textAlign: "center",
                  }}
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "2rem 0" }}>
                    <div className="ra-empty-state">
                      No recent assignments match the current filters.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((assignment) => {
                  const serviceStyle = getServiceStyle(assignment.service);
                  const statusStyle = getStatusStyle(assignment.status);
                  return (
                    <tr
                      key={assignment.numericId}
                      style={{
                        backgroundColor: "white",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                        borderRadius: "1rem",
                      }}
                    >
                      <td
                        style={{
                          padding: "1.25rem",
                          fontWeight: "700",
                          color: "#111827",
                          borderTopLeftRadius: "1rem",
                          borderBottomLeftRadius: "1rem",
                        }}
                      >
                        {assignment.id}
                      </td>
                      <td style={{ padding: "1.25rem" }}>
                        <span
                          style={{
                            backgroundColor: serviceStyle.bg,
                            color: serviceStyle.text,
                            padding: "0.4rem 1.25rem",
                            borderRadius: "1rem",
                            fontSize: "0.9rem",
                            fontWeight: "600",
                          }}
                        >
                          {assignment.service}
                        </span>
                      </td>
                      <td style={{ padding: "1.25rem" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                          }}
                        >
                          <UserAvatar
                            src={resolveImageUrl(
                              assignment.rider.img,
                              "passenger",
                            )}
                            name={assignment.rider.name}
                            rating={getAvatarRating(assignment.rider.rating)}
                            size={40}
                          />
                          <div>
                            <div
                              style={{
                                fontWeight: "700",
                                fontSize: "0.95rem",
                                color: "#111827",
                              }}
                            >
                              {assignment.rider.name}
                            </div>
                            <div
                              style={{ fontSize: "0.75rem", color: "#94a3b8" }}
                            >
                              {assignment.rider.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "1.25rem" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                          }}
                        >
                          <UserAvatar
                            src={resolveImageUrl(
                              assignment.driver.img,
                              "driver",
                            )}
                            name={assignment.driver.name}
                            rating={assignment.driver.rating}
                            size={40}
                          />
                          <div>
                            <div
                              style={{
                                fontWeight: "700",
                                fontSize: "0.95rem",
                                color: "#111827",
                              }}
                            >
                              {assignment.driver.name}
                            </div>
                            <div
                              style={{ fontSize: "0.75rem", color: "#94a3b8" }}
                            >
                              {assignment.driver.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "1.25rem",
                          fontWeight: "600",
                          color: "#111827",
                        }}
                      >
                        {assignment.time}
                      </td>
                      <td style={{ padding: "1.25rem" }}>
                        <span
                          style={{
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color,
                            padding: "0.4rem 1.25rem",
                            borderRadius: "0.5rem",
                            fontSize: "0.9rem",
                            fontWeight: "600",
                            border: `1px solid ${statusStyle.border}`,
                          }}
                        >
                          {statusLabel(assignment.status)}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "1.25rem",
                          textAlign: "center",
                          borderTopRightRadius: "1rem",
                          borderBottomRightRadius: "1rem",
                        }}
                      >
                        <button
                          onClick={() => void handlePreview(assignment)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.6rem 1.5rem",
                            borderRadius: "2rem",
                            border: "1px solid #e5e7eb",
                            backgroundColor: "white",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            fontWeight: "600",
                            color: "#111827",
                          }}
                        >
                          <Eye size={16} /> Preview
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showPreviewModal ? (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div className="ra-modal-card">
            <div style={{ marginBottom: "2rem" }}>
              <button
                onClick={() => setShowPreviewModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  color: "black",
                  marginBottom: "1.5rem",
                }}
              >
                <ArrowLeft size={28} strokeWidth={2.5} />
              </button>
              <h2
                style={{
                  fontSize: "2.2rem",
                  fontWeight: "800",
                  margin: "0 0 0.5rem 0",
                  color: "#111827",
                  fontFamily: "Outfit, Inter, sans-serif",
                }}
              >
                Assignment Details
              </h2>
              <p
                style={{
                  color: "#94a3b8",
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: "500",
                }}
              >
                Information about this service assignment
              </p>
            </div>

            {previewError ? (
              <div
                style={{
                  padding: "1rem 1.25rem",
                  marginBottom: "1rem",
                  borderRadius: "1rem",
                  backgroundColor: "#fef2f2",
                  color: "#b91c1c",
                  border: "1px solid #fecaca",
                }}
              >
                {previewError}
              </div>
            ) : null}

            {!previewAssignment ? (
              <PageLoader label="Loading assignment details..." />
            ) : (
              <>
                <div
                  className="ra-status-bar"
                  style={{
                    backgroundColor: "white",
                    padding: "1.25rem 2rem",
                    borderRadius: "1.25rem",
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "2rem",
                    marginBottom: "2rem",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    border: "1px solid #f1f5f9",
                  }}
                >
                  <InfoItem
                    label="Start Time"
                    value={formatDateTime(previewAssignment.tripInfo.startTime)}
                  />
                  <InfoItem
                    label="End Time"
                    value={formatDateTime(previewAssignment.tripInfo.endTime)}
                  />
                  <InfoItem
                    label="Distance"
                    value={previewAssignment.tripInfo.distance ?? "—"}
                  />
                  <div style={{ marginLeft: "auto" }}>
                    <span
                      style={{
                        backgroundColor: getStatusStyle(
                          previewAssignment.tripInfo.status,
                        ).bg,
                        color: getStatusStyle(previewAssignment.tripInfo.status)
                          .color,
                        padding: "0.5rem 1.25rem",
                        borderRadius: "0.5rem",
                        fontSize: "0.9rem",
                        fontWeight: "700",
                        border: `1px solid ${getStatusStyle(previewAssignment.tripInfo.status).border}`,
                      }}
                    >
                      {statusLabel(previewAssignment.tripInfo.status)}
                    </span>
                  </div>
                </div>

                {previewAssignment.tripInfo.notes ? (
                  <div
                    style={{
                      marginBottom: "2rem",
                      padding: "1rem 1.25rem",
                      borderRadius: "1rem",
                      backgroundColor: "#fff",
                      border: "1px solid #f1f5f9",
                      color: "#475569",
                    }}
                  >
                    <strong style={{ color: "#111827" }}>Notes:</strong>{" "}
                    {previewAssignment.tripInfo.notes}
                  </div>
                ) : null}

                <div style={{ marginBottom: "2rem" }}>
                  <h3
                    style={{
                      fontSize: "1.4rem",
                      fontWeight: "800",
                      marginBottom: "1rem",
                      color: "#111827",
                    }}
                  >
                    Passenger Information
                  </h3>
                  <div
                    style={{
                      backgroundColor: "white",
                      padding: "1.5rem 2rem",
                      borderRadius: "1.25rem",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      border: "1px solid #f1f5f9",
                    }}
                  >
                    <div
                      className="ra-flex-responsive"
                      style={{ marginBottom: "1.25rem" }}
                    >
                      <UserAvatar
                        src={resolveImageUrl(
                          previewAssignment.passenger.imageUrl,
                          "passenger",
                        )}
                        name={previewAssignment.passenger.fullName}
                        rating={previewAssignment.passenger.rating ?? 0}
                        size={64}
                      />
                      <div
                        className="ra-info-row"
                        style={{ flex: 1, gap: "1.5rem" }}
                      >
                        <InfoItem
                          label="Full Name"
                          value={previewAssignment.passenger.fullName}
                        />
                        <InfoItem
                          label="Customer ID"
                          value={previewAssignment.passenger.customerId}
                        />
                        <InfoItem
                          label="Category"
                          value={previewAssignment.passenger.category}
                        />
                        <InfoItem
                          label="Gender"
                          value={formatGender(
                            previewAssignment.passenger.gender,
                          )}
                        />
                      </div>
                    </div>
                    <div
                      className="ra-info-row ra-info-indent"
                      style={{ gap: "1.5rem" }}
                    >
                      <InfoItem
                        label="Email"
                        value={previewAssignment.passenger.email ?? "—"}
                      />
                      <InfoItem
                        label="Phone"
                        value={previewAssignment.passenger.phone ?? "—"}
                      />
                      <InfoItem
                        label="City"
                        value={previewAssignment.passenger.city ?? "—"}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: "2rem" }}>
                  <h3
                    style={{
                      fontSize: "1.4rem",
                      fontWeight: "800",
                      marginBottom: "1rem",
                      color: "#111827",
                    }}
                  >
                    Driver Information
                  </h3>
                  <div
                    className="ra-flex-responsive"
                    style={{
                      backgroundColor: "white",
                      padding: "1.5rem 2rem",
                      borderRadius: "1.25rem",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      border: "1px solid #f1f5f9",
                    }}
                  >
                    <UserAvatar
                      src={resolveImageUrl(
                        previewAssignment.driver.imageUrl,
                        "driver",
                      )}
                      name={previewAssignment.driver.fullName}
                      rating={previewAssignment.driver.rating}
                      size={64}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        className="ra-info-row"
                        style={{ gap: "1.5rem", marginBottom: "1.25rem" }}
                      >
                        <InfoItem
                          label="Full Name"
                          value={previewAssignment.driver.fullName}
                        />
                        <div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "#94a3b8",
                              fontWeight: "500",
                              marginBottom: "0.3rem",
                            }}
                          >
                            Vehicle Type
                          </div>
                          <div
                            style={{
                              fontWeight: "700",
                              fontSize: "1rem",
                              color: "#111827",
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <img
                              src={getVehicleIcon(
                                previewAssignment.driver.vehicleType,
                              )}
                              alt=""
                              style={{
                                height: "38px",
                                width: "auto",
                                objectFit: "contain",
                              }}
                            />{" "}
                            {previewAssignment.driver.vehicleType}
                          </div>
                        </div>
                        <InfoItem
                          label="Phone"
                          value={previewAssignment.driver.phone ?? "—"}
                        />
                      </div>
                      <div className="ra-info-row" style={{ gap: "1.5rem" }}>
                        <InfoItem
                          label="Email"
                          value={previewAssignment.driver.email ?? "—"}
                        />
                        <InfoItem
                          label="Driver ID"
                          value={previewAssignment.driver.driverId}
                        />
                        <InfoItem
                          label="City"
                          value={previewAssignment.driver.city ?? "—"}
                        />
                        <InfoItem
                          label="Gender"
                          value={formatGender(previewAssignment.driver.gender)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: "2rem" }}>
                  <h3
                    style={{
                      fontSize: "1.4rem",
                      fontWeight: "800",
                      marginBottom: "1rem",
                      color: "#111827",
                    }}
                  >
                    Vehicle Information
                  </h3>
                  <div
                    style={{
                      backgroundColor: "white",
                      padding: "1.5rem 2rem",
                      borderRadius: "1.25rem",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      border: "1px solid #f1f5f9",
                    }}
                  >
                    <div
                      className="ra-info-row"
                      style={{ gap: "1.25rem", marginBottom: "1.25rem" }}
                    >
                      <InfoItem
                        label="Driver ID"
                        value={previewAssignment.vehicle.driverId}
                      />
                      <InfoItem
                        label="Vehicle Colour"
                        value={previewAssignment.vehicle.colour ?? "—"}
                      />
                      <InfoItem
                        label="Licence Plate Num"
                        value={previewAssignment.vehicle.licencePlate ?? "—"}
                      />
                      <InfoItem
                        label="Make & Model"
                        value={previewAssignment.vehicle.makeModel ?? "—"}
                      />
                    </div>
                    <div className="ra-info-row" style={{ gap: "1.25rem" }}>
                      <InfoItem
                        label="Year"
                        value={previewAssignment.vehicle.year ?? "—"}
                      />
                      <InfoItem
                        label="Join Date"
                        value={formatDate(previewAssignment.vehicle.joinDate)}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: "2rem" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "white",
                        padding: "1.25rem 1.5rem",
                        borderRadius: "0.75rem",
                        border: "1px solid #f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        gap: "1.25rem",
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={pickupIcon}
                          alt=""
                          style={{
                            width: "32px",
                            height: "32px",
                            objectFit: "contain",
                          }}
                        />
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "#94a3b8",
                            fontWeight: "400",
                            marginBottom: "0.2rem",
                          }}
                        >
                          Pickup
                        </div>
                        <div
                          style={{
                            fontWeight: "400",
                            fontSize: "1.25rem",
                            color: "#111827",
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {previewAssignment.route.pickupAddress ?? "—"}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        zIndex: 10,
                        backgroundColor: "white",
                        width: "64px",
                        height: "64px",
                        borderRadius: "50%",
                        border: "1px solid #f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
                      }}
                    >
                      <img
                        src={locationIcon}
                        alt=""
                        style={{
                          width: "40px",
                          height: "40px",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        backgroundColor: "white",
                        padding: "1.25rem 1.5rem",
                        borderRadius: "0.75rem",
                        border: "1px solid #f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        gap: "1.25rem",
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={destinationIcon}
                          alt=""
                          style={{
                            width: "32px",
                            height: "32px",
                            objectFit: "contain",
                          }}
                        />
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "#94a3b8",
                            fontWeight: "400",
                            marginBottom: "0.2rem",
                          }}
                        >
                          Destination
                        </div>
                        <div
                          style={{
                            fontWeight: "400",
                            fontSize: "1.25rem",
                            color: "#111827",
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {previewAssignment.route.dropoffAddress ?? "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: "2rem" }}>
                  <h3
                    style={{
                      fontSize: "1.4rem",
                      fontWeight: "600",
                      marginBottom: "1rem",
                      color: "#111827",
                    }}
                  >
                    Payment Information
                  </h3>
                  <div
                    style={{
                      backgroundColor: "white",
                      padding: "2rem",
                      borderRadius: "1.25rem",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      border: "1px solid #f1f5f9",
                    }}
                  >
                    <div
                      className="ra-flex-responsive"
                      style={{ marginBottom: "2.5rem" }}
                    >
                      <UserAvatar
                        src={resolveImageUrl(
                          previewAssignment.driver.imageUrl,
                          "driver",
                        )}
                        name={previewAssignment.driver.fullName}
                        rating={previewAssignment.driver.rating}
                        size={90}
                      />
                    </div>
                    <div
                      className="ra-info-row"
                      style={{ gap: "1rem", alignItems: "center" }}
                    >
                      <InfoItem
                        label="TVA"
                        value={previewAssignment.payment?.tva ?? "—"}
                      />
                      <InfoItem
                        label="Service fee"
                        value={previewAssignment.payment?.serviceFee ?? "—"}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "#94a3b8",
                            fontWeight: "400",
                            marginBottom: "0.4rem",
                          }}
                        >
                          Payment Method
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                          }}
                        >
                          <img
                            src={getPaymentIcon(
                              previewAssignment.payment?.method,
                            )}
                            alt=""
                            style={{ height: "22px", width: "auto" }}
                          />
                          <span
                            style={{
                              fontWeight: "600",
                              fontSize: "1.1rem",
                              color: "#111827",
                            }}
                          >
                            {formatPaymentMethod(
                              previewAssignment.payment?.method,
                            )}
                          </span>
                        </div>
                      </div>
                      <InfoItem
                        label="Discount"
                        value={previewAssignment.payment?.discount ?? "—"}
                      />
                      <div className="ra-total-field">
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "#94a3b8",
                            fontWeight: "400",
                            marginBottom: "0.4rem",
                          }}
                        >
                          Total Amount
                        </div>
                        <div
                          style={{
                            fontWeight: "600",
                            fontSize: "1.1rem",
                            color: "#111827",
                          }}
                        >
                          {previewAssignment.payment?.totalAmount ?? "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="ra-modal-footer"
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "1rem",
                  }}
                >
                  {previewAssignment.tripInfo.status !== "Cancelled" &&
                  previewAssignment.tripInfo.status !== "Completed" ? (
                    <button
                      onClick={() => void handleCancelAssignment()}
                      disabled={isCancelling}
                      style={{
                        backgroundColor: "#be1111",
                        color: "white",
                        border: "none",
                        padding: "1rem 3rem",
                        borderRadius: "2rem",
                        fontWeight: "800",
                        cursor: isCancelling ? "not-allowed" : "pointer",
                        fontSize: "1.1rem",
                        boxShadow: "0 4px 6px -1px rgba(190, 17, 17, 0.2)",
                        opacity: isCancelling ? 0.7 : 1,
                      }}
                    >
                      {isCancelling ? "Cancelling..." : "Cancel Assignment"}
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div
      style={{
        fontSize: "0.8rem",
        color: "#94a3b8",
        fontWeight: "500",
        marginBottom: "0.3rem",
      }}
    >
      {label}
    </div>
    <div style={{ fontWeight: "700", fontSize: "1rem", color: "#111827" }}>
      {value}
    </div>
  </div>
);

const FormSelect = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <label
        style={{
          display: "block",
          fontSize: "0.9rem",
          fontWeight: "700",
          marginBottom: "0.5rem",
          color: "#111827",
        }}
      >
        {label}
      </label>
      <div
        onClick={() => setIsOpen((current) => !current)}
        style={{
          padding: "0.875rem 1.25rem",
          borderRadius: "1rem",
          border: "1px solid #f1f5f9",
          backgroundColor: "#f8fafc",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: value ? "#111827" : "#94a3b8",
          fontSize: "0.95rem",
          fontWeight: value ? "700" : "400",
        }}
      >
        {selectedOption?.label || "Select"}
        <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>▼</span>
      </div>
      {isOpen ? (
        <div
          style={{
            position: "absolute",
            top: "110%",
            left: 0,
            right: 0,
            backgroundColor: "white",
            borderRadius: "1rem",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
            zIndex: 100,
            border: "1px solid #f1f5f9",
            padding: "0.5rem",
            maxHeight: "240px",
            overflowY: "auto",
          }}
        >
          {options.length === 0 ? (
            <div
              style={{
                padding: "0.75rem 1rem",
                color: "#94a3b8",
                fontSize: "0.95rem",
              }}
            >
              No options available
            </div>
          ) : (
            options.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                style={{
                  padding: "0.75rem 1rem",
                  cursor: "pointer",
                  borderRadius: "0.75rem",
                  fontSize: "0.95rem",
                  backgroundColor:
                    option.value === value ? "#f8fafc" : "transparent",
                  fontWeight: option.value === value ? "700" : "400",
                }}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};

function statusLabel(status: string) {
  switch (status) {
    case "In_progress":
      return "In Progress";
    case "Searching":
      return "Searching";
    case "Accepted":
      return "Accepted";
    case "Completed":
      return "Completed";
    case "Cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function getStatusStyle(status: string) {
  switch (status) {
    case "In_progress":
      return { bg: "#fef3c7", color: "#d97706", border: "#fde68a" };
    case "Searching":
      return { bg: "#f0f9ff", color: "#0284c7", border: "#bae6fd" };
    case "Accepted":
      return { bg: "#eef7f0", color: "#2d8a46", border: "#bbf7d0" };
    case "Completed":
      return { bg: "#eef7f0", color: "#38AC57", border: "#eef7f0" };
    case "Cancelled":
      return { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" };
    default:
      return { bg: "#f8fafc", color: "#64748b", border: "#f1f5f9" };
  }
}

function getServiceStyle(service: string) {
  const normalized = service.toLowerCase();
  if (normalized.includes("taxi")) return { bg: "#eef7f0", text: "#2d8a46" };
  if (normalized.includes("motor") || normalized.includes("bike"))
    return { bg: "#fef3c7", text: "#d97706" };
  return { bg: "#ede9fe", text: "#7c3aed" };
}

function getVehicleIcon(vehicleType: string | null | undefined) {
  const normalized = (vehicleType || "").toLowerCase();
  if (normalized.includes("motor") || normalized.includes("bike"))
    return bikeIcon;
  if (normalized.includes("taxi")) return taxiIcon;
  return carIcon;
}

function getPaymentIcon(method: string | null | undefined) {
  const normalized = (method || "").toLowerCase();
  if (normalized.includes("visa")) return visaIcon;
  if (normalized.includes("master")) return mastercardIcon;
  return cashIcon;
}

function formatPaymentMethod(method: string | null | undefined) {
  if (!method) return "Cash";
  const normalized = method.toLowerCase();
  if (normalized.includes("visa")) return "Visa";
  if (normalized.includes("master")) return "Mastercard";
  if (normalized.includes("cash")) return "Cash";
  return method;
}

function formatGender(gender: string | null | undefined) {
  if (!gender) return "—";
  return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
}

function normalizeValue(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function matchesDriverToService(
  driver: RideAssignmentDriver,
  serviceName: string,
) {
  const target = normalizeValue(serviceName);
  const serviceType = normalizeValue(driver.serviceType ?? "");
  const vehicleType = normalizeValue(driver.vehicleType ?? "");

  if (!target) {
    return true;
  }

  if (target.includes("motor")) {
    return serviceType.includes("motor") || vehicleType.includes("motor");
  }

  if (target.includes("taxi")) {
    return serviceType.includes("taxi") || vehicleType.includes("taxi");
  }

  if (target.includes("car")) {
    return serviceType.includes("car") || vehicleType.includes("car");
  }

  return serviceType.includes(target) || vehicleType.includes(target);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function resolveImageUrl(
  imageUrl: string | null | undefined,
  kind: "driver" | "passenger",
) {
  if (!imageUrl) return null;
  if (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("data:")
  )
    return imageUrl;
  if (imageUrl.startsWith("/")) return resolveApiAssetUrl(imageUrl);
  if (imageUrl.includes("uploads/")) return resolveApiAssetUrl(imageUrl);
  const folder = kind === "driver" ? "drivers" : "passengers";
  return resolveApiAssetUrl(`/uploads/${folder}/${imageUrl}`);
}

function buildRideAssignmentDetailFromRow(
  assignment: RideAssignmentRecentAssignment,
): RideAssignmentDetail {
  return {
    tripInfo: {
      id: assignment.id,
      startTime: assignment.time,
      endTime: null,
      distance: "—",
      status: assignment.status,
      notes: assignment.notes,
      isManualAssignment: true,
    },
    passenger: {
      fullName: assignment.rider.name,
      customerId: assignment.rider.id,
      category: assignment.service,
      gender: null,
      email: null,
      phone: null,
      city: assignment.city,
      imageUrl: assignment.rider.img,
      rating: assignment.rider.rating,
    },
    driver: {
      fullName: assignment.driver.name,
      driverId: assignment.driver.id,
      vehicleType: assignment.vehicle || assignment.service,
      gender: null,
      email: null,
      phone: null,
      city: assignment.city,
      imageUrl: assignment.driver.img,
      rating: assignment.driver.rating,
    },
    vehicle: {
      driverId: assignment.driver.id,
      colour: null,
      licencePlate: null,
      makeModel: assignment.vehicle || assignment.service,
      year: null,
      joinDate: null,
    },
    route: {
      pickupAddress: "Demo pickup location",
      dropoffAddress: "Demo dropoff location",
    },
    payment: {
      method: assignment.paymentMethod,
      totalAmount: assignment.fare,
      tva: null,
      serviceFee: null,
      discount: null,
    },
  };
}
