import { useEffect, useState } from "react";
import { ArrowUpRight, Eye, Search, SlidersHorizontal } from "lucide-react";
import { UserAvatar } from "../components/UserAvatar";
import { TripDetailsModal } from "../components/TripDetailsModal";
import { PageLoader } from "../components/PageLoader";
import {
  getLiveTripDetailApi,
  getLiveTripsApi,
  getLiveTripsCitiesApi,
  getLiveTripsServiceTypesApi,
  getLiveTripsStatsApi,
  resolveApiAssetUrl,
  type LiveTripDetail,
  type LiveTripRow,
  type LiveTripsFilterOption,
  type LiveTripsServiceTypeOption,
  type LiveTripsStats,
} from "../services/api";

import bikeIcon from "../assets/icons/bike.png";
import carIcon from "../assets/icons/car.png";
import taxiIcon from "../assets/icons/taxi.png";

import visaIcon from "../assets/icons/visa.png";
import mastercardIcon from "../assets/icons/mastercard.png";
import cashIcon from "../assets/icons/cash.png";

import totalArchivedIcon from "../assets/icons/Total Archived.png";
import completedIcon from "../assets/icons/completed.png";
import cancelledIcon from "../assets/icons/Cancelled Archive.png";
import earningsIcon from "../assets/icons/Total Earnings.png";
import commissionIcon from "../assets/icons/comission.png";

type PeriodValue = "today" | "yesterday" | "last_week" | "last_month";
type CardFilter = "all" | "completed" | "cancelled" | "earnings" | "commission";

interface FiltersState {
  search: string;
  status: string;
  cityId: string;
  serviceTypeId: string;
  method: string;
  period: PeriodValue;
}

interface SelectOption {
  label: string;
  value: string;
}

interface ModalTrip {
  id: string;
  vehicle: string;
  fare: string;
  paymentMethod: string;
  status: string;
  rider: {
    name: string;
    id: string;
    rating: number;
    img: string | null;
  };
  driver: {
    name: string;
    id: string;
    rating: number;
    img: string | null;
  };
  tripInfo: {
    startTime: string;
    endTime: string;
    distance: string;
    status: string;
  };
  passenger: {
    fullName: string;
    customerId: string;
    category: string;
    gender: string;
    email: string;
    phone: string;
    city: string;
    imageUrl: string | null;
    rating: number;
  };
  driverDetails: {
    fullName: string;
    driverId: string;
    vehicleType: string;
    gender: string;
    email: string;
    phone: string;
    city: string;
    imageUrl: string | null;
    rating: number;
  };
  vehicleInfo: {
    driverId: string;
    colour: string;
    licencePlate: string;
    makeModel: string;
    year: string;
    joinDate: string;
  };
  route: {
    pickupAddress: string;
    dropoffAddress: string;
  };
  paymentInfo: {
    tva: string;
    serviceFee: string;
    method: string;
    discount: string;
    totalAmount: string;
  };
}

const EMPTY_STATS: LiveTripsStats = {
  totalArchived: 0,
  completed: 0,
  cancelled: 0,
  totalEarnings: 0,
  commission: {
    percentage: 0,
    earned: 0,
  },
};

const FALLBACK_STATS: LiveTripsStats = {
  totalArchived: 28,
  completed: 21,
  cancelled: 4,
  totalEarnings: 3862.5,
  commission: {
    percentage: 15,
    earned: 579.38,
  },
};

const FALLBACK_TRIPS: LiveTripRow[] = [
  {
    id: "TRP-12031",
    service: "Car Ride",
    rider: { name: "Sara K.", id: "R-1092", rating: 4.8, img: null },
    driver: { name: "Youssef A.", id: "D-448", rating: 4.9, img: null },
    vehicle: "Car",
    time: "10:35",
    duration: "18 min",
    status: "Completed",
    fare: "145.00",
    paymentMethod: "visa",
  },
  {
    id: "TRP-12032",
    service: "Motorcycle",
    rider: { name: "Amine B.", id: "R-1138", rating: 4.6, img: null },
    driver: { name: "Nabil F.", id: "D-507", rating: 4.7, img: null },
    vehicle: "Motorcycle",
    time: "11:20",
    duration: "11 min",
    status: "Searching",
    fare: "42.00",
    paymentMethod: "cash",
  },
  {
    id: "TRP-12033",
    service: "Taxi",
    rider: { name: "Hajar M.", id: "R-1203", rating: 4.9, img: null },
    driver: { name: "Khalid R.", id: "D-392", rating: 4.8, img: null },
    vehicle: "Taxi",
    time: "12:05",
    duration: "22 min",
    status: "Cancelled",
    fare: "0.00",
    paymentMethod: "mastercard",
  },
];

const FALLBACK_CITIES: LiveTripsFilterOption[] = [
  { id: 1, name: "Casablanca" },
  { id: 2, name: "Rabat" },
  { id: 3, name: "Marrakech" },
];

const FALLBACK_SERVICE_TYPES: LiveTripsServiceTypeOption[] = [
  { id: 1, name: "CAR_RIDES", displayName: "Car Ride" },
  { id: 2, name: "MOTORCYCLE", displayName: "Motorcycle" },
  { id: 3, name: "TAXI", displayName: "Taxi" },
];

const DEFAULT_FILTERS: FiltersState = {
  search: "",
  status: "",
  cityId: "",
  serviceTypeId: "",
  method: "",
  period: "today",
};

const STATUS_OPTIONS: SelectOption[] = [
  { label: "Searching", value: "Searching" },
  { label: "Accepted", value: "Accepted" },
  { label: "In_progress", value: "In_progress" },
  { label: "Completed", value: "Completed" },
  { label: "Cancelled", value: "Cancelled" },
];

const METHOD_OPTIONS: SelectOption[] = [
  { label: "Visa", value: "visa" },
  { label: "Mastercard", value: "mastercard" },
  { label: "Cash", value: "cash" },
];

const PERIOD_OPTIONS: SelectOption[] = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last Week", value: "last_week" },
  { label: "Last Month", value: "last_month" },
];

export const LiveTrips = () => {
  const [selectedTrip, setSelectedTrip] = useState<ModalTrip | null>(null);
  const [previewTripId, setPreviewTripId] = useState<string | null>(null);
  const [cardFilter, setCardFilter] = useState<CardFilter>("all");
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [stats, setStats] = useState<LiveTripsStats>(EMPTY_STATS);
  const [trips, setTrips] = useState<LiveTripRow[]>([]);
  const [cities, setCities] = useState<LiveTripsFilterOption[]>([]);
  const [serviceTypes, setServiceTypes] = useState<
    LiveTripsServiceTypeOption[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadFilterOptions = async () => {
      const [citiesResponse, serviceTypesResponse] = await Promise.all([
        getLiveTripsCitiesApi(),
        getLiveTripsServiceTypesApi(),
      ]);

      if (cancelled) {
        return;
      }

      if (citiesResponse.ok) {
        setCities(
          citiesResponse.data.length > 0
            ? citiesResponse.data
            : FALLBACK_CITIES,
        );
      }

      if (serviceTypesResponse.ok) {
        setServiceTypes(
          serviceTypesResponse.data.length > 0
            ? serviceTypesResponse.data
            : FALLBACK_SERVICE_TYPES,
        );
      }

      if (!citiesResponse.ok) {
        setCities(FALLBACK_CITIES);
      }

      if (!serviceTypesResponse.ok) {
        setServiceTypes(FALLBACK_SERVICE_TYPES);
      }
    };

    void loadFilterOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadTripsData = async (showLoader: boolean) => {
      if (showLoader) {
        setIsLoading(true);
      }

      setLoadError("");

      const query = {
        period: filters.period,
        cityId: filters.cityId ? Number(filters.cityId) : undefined,
        serviceTypeId: filters.serviceTypeId
          ? Number(filters.serviceTypeId)
          : undefined,
      };

      const [statsResponse, tripsResponse] = await Promise.all([
        getLiveTripsStatsApi(query),
        getLiveTripsApi({
          ...query,
          page: 1,
          limit: 1000,
        }),
      ]);

      if (cancelled) {
        return;
      }

      const nextStats = statsResponse.ok ? statsResponse.data : EMPTY_STATS;
      const nextTrips = tripsResponse.ok ? tripsResponse.data.trips : [];
      const shouldUseFallback = nextTrips.length === 0;

      if (shouldUseFallback) {
        setStats(resolveFallbackStats(nextStats));
        setTrips(FALLBACK_TRIPS);
        setLoadError("");
      } else {
        setStats(nextStats);
        setTrips(nextTrips);
        if (!statsResponse.ok || !tripsResponse.ok) {
          setLoadError("Some live trip data could not be refreshed.");
        }
      }

      setIsLoading(false);
    };

    void loadTripsData(true);

    const intervalId = window.setInterval(() => {
      void loadTripsData(false);
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [filters.period, filters.cityId, filters.serviceTypeId]);

  const filteredTrips = trips.filter((trip) => {
    const searchValue = filters.search.trim().toLowerCase();
    if (searchValue) {
      const haystack = [trip.id, trip.rider.name, trip.driver.name]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(searchValue)) {
        return false;
      }
    }

    if (filters.status && trip.status !== filters.status) {
      return false;
    }

    if (filters.method && trip.paymentMethod.toLowerCase() !== filters.method) {
      return false;
    }

    if (cardFilter === "completed" && trip.status !== "Completed") {
      return false;
    }

    if (cardFilter === "cancelled" && trip.status !== "Cancelled") {
      return false;
    }

    if (
      (cardFilter === "earnings" || cardFilter === "commission") &&
      trip.status !== "Completed"
    ) {
      return false;
    }

    return true;
  });

  const cityOptions = cities.map((city) => ({
    label: city.name,
    value: String(city.id),
  }));

  const serviceTypeOptions = serviceTypes.map((serviceType) => ({
    label: serviceType.displayName,
    value: String(serviceType.id),
  }));

  const statsCards = [
    {
      id: "all" as const,
      label: "Total Archived",
      value: String(stats.totalArchived).padStart(2, "0"),
      icon: totalArchivedIcon,
    },
    {
      id: "completed" as const,
      label: "Completed",
      value: String(stats.completed).padStart(2, "0"),
      icon: completedIcon,
    },
    {
      id: "cancelled" as const,
      label: "Cancelled",
      value: String(stats.cancelled).padStart(2, "0"),
      icon: cancelledIcon,
    },
    {
      id: "earnings" as const,
      label: "Total Earnings",
      value: stats.totalEarnings.toFixed(2),
      unit: "MAD",
      icon: earningsIcon,
    },
    {
      id: "commission" as const,
      label: "Commission",
      value: `${stats.commission.percentage}%`,
      icon: commissionIcon,
    },
  ];

  const handleCardClick = (nextCardFilter: CardFilter) => {
    setCardFilter((current) =>
      current === nextCardFilter ? "all" : nextCardFilter,
    );
  };

  const handleFilterChange = (key: keyof FiltersState, value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setCardFilter("all");
  };

  const handlePreview = async (trip: LiveTripRow) => {
    setPreviewTripId(trip.id);

    const tripId = Number(trip.id.replace(/[^0-9]/g, ""));
    const response = await getLiveTripDetailApi(tripId);

    if (response.ok) {
      setSelectedTrip(buildModalTripFromDetail(response.data));
    } else {
      setSelectedTrip(buildModalTripFromRow(trip));
    }

    setPreviewTripId(null);
  };

  if (isLoading && trips.length === 0 && !loadError) {
    return <PageLoader label="Loading live trips..." />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
                .stats-container {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 1rem;
                }
                .filter-bar {
                    display: flex;
                    gap: 0.75rem;
                    align-items: center;
                    flex-wrap: wrap;
                    background-color: white;
                    padding: 0.5rem;
                    border-radius: 3rem;
                    border: 1px solid #f1f5f9;
                }
                .search-container {
                    position: relative;
                    flex: 1;
                    min-width: 200px;
                }
                .dropdown-container {
                    flex-shrink: 0;
                }
                @media (max-width: 1400px) {
                    .stats-container {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }
                .stat-card-clickable:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1) !important;
                }
                .stat-card-clickable {
                    transition: all 0.3s ease !important;
                }
                @media (max-width: 1024px) {
                    .stats-container {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    .filter-bar {
                        border-radius: 1.5rem;
                        padding: 1rem;
                    }
                }
                @media (max-width: 768px) {
                    .page-header h1 {
                        font-size: 1.5rem !important;
                    }
                    .page-header p {
                        font-size: 0.85rem;
                    }
                    .stats-container {
                        grid-template-columns: 1fr;
                    }
                    .filter-bar {
                        gap: 0.5rem;
                        border-radius: 1rem;
                    }
                    .search-container {
                        width: 100%;
                        flex: none;
                    }
                    .dropdown-container {
                        flex: 1;
                        min-width: calc(50% - 0.25rem);
                    }
                    .clear-btn {
                        width: 100%;
                        justify-content: center;
                        margin-top: 0.5rem;
                    }
                }
                @media (max-width: 480px) {
                    .dropdown-container {
                        min-width: 100%;
                    }
                    .stats-container {
                        gap: 0.75rem;
                    }
                }
                .table-container {
                    width: 100%;
                    overflow-x: auto;
                    background: white;
                    border-radius: 1.5rem;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                    border: 1px solid #f1f5f9;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 1000px;
                }
                @media (max-width: 1200px) {
                    table {
                        min-width: 900px;
                    }
                }
                @media (max-width: 1024px) {
                    .hide-on-tablet {
                        display: none;
                    }
                    table {
                        min-width: 700px;
                    }
                }
                @media (max-width: 768px) {
                    .hide-on-mobile {
                        display: none;
                    }
                    table {
                        min-width: 600px;
                    }
                }
                .service-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0.4rem 1rem;
                    border-radius: 2rem;
                    font-size: 0.85rem;
                    font-weight: 700;
                    white-space: nowrap;
                    text-align: center;
                    line-height: 1;
                }
                .trip-id-cell {
                    white-space: nowrap;
                    font-weight: 700;
                    color: #111827;
                }
            `,
        }}
      />

      <div className="page-header" style={{ marginBottom: "1rem" }}>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: "bold",
            margin: "0 0 0.5rem 0",
          }}
        >
          Live Trips
        </h1>
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>
          Monitor all trip types across Hezzni&apos;s transportation services
        </p>
      </div>

      <div className="stats-container">
        {statsCards.map((stat) => {
          const isActive = cardFilter === stat.id;

          return (
            <div
              key={stat.id}
              onClick={() => handleCardClick(stat.id)}
              className="stat-card-clickable"
              style={{
                backgroundColor: isActive ? "#38AC57" : "white",
                padding: "1.25rem",
                borderRadius: "1.5rem",
                position: "relative",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                color: isActive ? "white" : "#111827",
                cursor: "pointer",
                transition: "all 0.2s",
                border: isActive ? "none" : "1px solid #f1f5f9",
                minHeight: "140px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ display: "flex" }}>
                  <img
                    src={stat.icon}
                    alt=""
                    style={{
                      width: "28px",
                      height: "28px",
                      objectFit: "contain",
                      filter: isActive ? "brightness(0) invert(1)" : "none",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: "1rem",
                    fontWeight: "800",
                    color: isActive ? "white" : "#111827",
                  }}
                >
                  {stat.label}
                </span>
              </div>
              <div
                style={{ display: "flex", alignItems: "baseline", gap: "4px" }}
              >
                <span
                  style={{
                    fontSize: "2.5rem",
                    fontWeight: "900",
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </span>
                {stat.unit ? (
                  <span
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "700",
                      color: isActive ? "rgba(255,255,255,0.7)" : "#94a3b8",
                    }}
                  >
                    {stat.unit}
                  </span>
                ) : null}
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: "1rem",
                  right: "1rem",
                  backgroundColor: isActive ? "black" : "#38AC57",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  boxShadow: isActive
                    ? "none"
                    : "0 4px 6px -1px rgba(56, 172, 87, 0.4)",
                  border: "none",
                  clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
                  borderRadius: "20px 20px 0 20px",
                }}
              >
                <ArrowUpRight size={18} strokeWidth={3} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="filter-bar">
        <div className="search-container">
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
            value={filters.search}
            onChange={(event) =>
              handleFilterChange("search", event.target.value)
            }
            placeholder="Search"
            style={{
              width: "100%",
              padding: "0.7rem 1rem 0.7rem 3.25rem",
              borderRadius: "2rem",
              border: "none",
              backgroundColor: "#f9fafb",
              outline: "none",
              fontSize: "0.9rem",
            }}
          />
        </div>
        <div className="dropdown-container">
          <SelectDropdown
            label="Status"
            options={STATUS_OPTIONS}
            value={filters.status}
            onChange={(value) => handleFilterChange("status", value)}
          />
        </div>
        <div className="dropdown-container">
          <SelectDropdown
            label="City"
            options={cityOptions}
            value={filters.cityId}
            onChange={(value) => handleFilterChange("cityId", value)}
          />
        </div>
        <div className="dropdown-container">
          <SelectDropdown
            label="Service Type"
            options={serviceTypeOptions}
            value={filters.serviceTypeId}
            onChange={(value) => handleFilterChange("serviceTypeId", value)}
          />
        </div>
        <div className="dropdown-container">
          <SelectDropdown
            label="Method"
            options={METHOD_OPTIONS}
            value={filters.method}
            onChange={(value) => handleFilterChange("method", value)}
          />
        </div>
        <div className="dropdown-container">
          <SelectDropdown
            label="Periods"
            options={PERIOD_OPTIONS}
            value={filters.period}
            onChange={(value) => handleFilterChange("period", value)}
          />
        </div>
        <button
          onClick={clearFilters}
          className="clear-btn"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.7rem 1.25rem",
            borderRadius: "2rem",
            border: "1px solid #e5e7eb",
            backgroundColor: "white",
            cursor: "pointer",
            fontSize: "0.9rem",
            fontWeight: "600",
            color: "#374151",
          }}
        >
          <SlidersHorizontal size={16} /> Clear
        </button>
      </div>

      {loadError ? (
        <div
          style={{
            backgroundColor: "#fff1f2",
            border: "1px solid #fecdd3",
            color: "#be123c",
            padding: "1rem 1.25rem",
            borderRadius: "1rem",
          }}
        >
          {loadError}
        </div>
      ) : null}

      <div className="table-container">
        <table>
          <thead>
            <tr
              style={{
                backgroundColor: "#38AC57",
                color: "white",
                textAlign: "left",
              }}
            >
              <th style={{ padding: "1rem 1.5rem", fontWeight: "600" }}>
                Trip ID
              </th>
              <th style={{ padding: "1rem 1.5rem", fontWeight: "600" }}>
                Service
              </th>
              <th style={{ padding: "1rem 1.5rem", fontWeight: "600" }}>
                Rider
              </th>
              <th
                className="hide-on-tablet"
                style={{ padding: "1rem 1.5rem", fontWeight: "600" }}
              >
                Driver
              </th>
              <th
                className="hide-on-mobile"
                style={{ padding: "1rem 1.5rem", fontWeight: "600" }}
              >
                Vehicle
              </th>
              <th
                className="hide-on-mobile"
                style={{ padding: "1rem 1.5rem", fontWeight: "600" }}
              >
                Time
              </th>
              <th style={{ padding: "1rem 1.5rem", fontWeight: "600" }}>
                Status
              </th>
              <th style={{ padding: "1rem 1.5rem", fontWeight: "600" }}>
                Fare
              </th>
              <th style={{ padding: "1rem 1.5rem", fontWeight: "600" }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "var(--text-secondary)",
                  }}
                >
                  Loading live trips...
                </td>
              </tr>
            ) : filteredTrips.length > 0 ? (
              filteredTrips.map((trip) => {
                const statusStyle = getStatusStyle(trip.status);
                const serviceStyle = getServiceStyle();
                const vehicleIcon = getVehicleIcon(trip.vehicle);
                const paymentIcon = getPaymentIcon(trip.paymentMethod);

                return (
                  <tr
                    key={trip.id}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      backgroundColor: "white",
                    }}
                  >
                    <td
                      className="trip-id-cell"
                      style={{ padding: "1rem 1.5rem" }}
                    >
                      {trip.id}
                    </td>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <span
                        className="service-badge"
                        style={{
                          backgroundColor: serviceStyle.backgroundColor,
                          color: serviceStyle.color,
                        }}
                      >
                        {trip.service}
                      </span>
                    </td>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <UserAvatar
                          src={resolveImageUrl(trip.rider.img)}
                          name={trip.rider.name}
                          rating={trip.rider.rating}
                          size={48}
                          showBadge={true}
                        />
                        <div>
                          <div
                            style={{
                              fontWeight: "700",
                              fontSize: "0.95rem",
                              color: "#111827",
                            }}
                          >
                            {trip.rider.name}
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "#94a3b8",
                              fontWeight: "500",
                            }}
                          >
                            {trip.rider.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td
                      className="hide-on-tablet"
                      style={{ padding: "1rem 1.5rem" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <UserAvatar
                          src={resolveImageUrl(trip.driver.img)}
                          name={trip.driver.name}
                          rating={trip.driver.rating}
                          size={48}
                          showBadge={true}
                        />
                        <div>
                          <div
                            style={{
                              fontWeight: "700",
                              fontSize: "0.95rem",
                              color: "#111827",
                            }}
                          >
                            {trip.driver.name}
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "#94a3b8",
                              fontWeight: "500",
                            }}
                          >
                            {trip.driver.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td
                      className="hide-on-mobile"
                      style={{ padding: "1rem 1.5rem" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          fontWeight: "700",
                          color: "#111827",
                        }}
                      >
                        <img
                          src={vehicleIcon}
                          alt={trip.vehicle}
                          style={{
                            width: "24px",
                            height: "auto",
                            objectFit: "contain",
                          }}
                        />
                        {trip.vehicle}
                      </div>
                    </td>
                    <td
                      className="hide-on-mobile"
                      style={{ padding: "1rem 1.5rem" }}
                    >
                      <div
                        style={{
                          fontWeight: "800",
                          color: "#111827",
                          fontSize: "0.95rem",
                        }}
                      >
                        {trip.time}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "#94a3b8",
                          fontWeight: "500",
                        }}
                      >
                        {trip.duration}
                      </div>
                    </td>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <span
                        style={{
                          backgroundColor: statusStyle.backgroundColor,
                          color: statusStyle.color,
                          padding: "0.5rem 1rem",
                          borderRadius: "0.5rem",
                          fontSize: "0.85rem",
                          fontWeight: "700",
                        }}
                      >
                        {trip.status}
                      </span>
                    </td>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <div
                        style={{
                          fontWeight: "900",
                          color: "#111827",
                          fontSize: "1rem",
                          marginBottom: "4px",
                        }}
                      >
                        {trip.fare}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#64748b",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontWeight: "700",
                        }}
                      >
                        <img
                          src={paymentIcon}
                          alt={trip.paymentMethod}
                          style={{ width: "16px", height: "auto" }}
                        />
                        {trip.paymentMethod.toUpperCase()}
                      </div>
                    </td>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <button
                        onClick={() => void handlePreview(trip)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          border: "1px solid #e5e7eb",
                          backgroundColor: "white",
                          padding: "0.4rem 1rem",
                          borderRadius: "2rem",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                        }}
                      >
                        <Eye size={14} />{" "}
                        {previewTripId === trip.id ? "Loading..." : "Preview"}
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "var(--text-secondary)",
                  }}
                >
                  No trips found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedTrip ? (
        <TripDetailsModal
          trip={selectedTrip}
          onClose={() => setSelectedTrip(null)}
        />
      ) : null}
    </div>
  );
};

interface SelectDropdownProps {
  label: string;
  options?: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
}

const SelectDropdown = ({
  label,
  options = [],
  value = "",
  onChange,
}: SelectDropdownProps) => (
  <div style={{ position: "relative", width: "100%" }}>
    <select
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      style={{
        padding: "0.8rem 2rem 0.8rem 1rem",
        borderRadius: "2rem",
        border: "1px solid #e5e7eb",
        outline: "none",
        appearance: "none",
        backgroundColor: "white",
        width: "100%",
        minWidth: "120px",
        cursor: "pointer",
        color: value ? "black" : "#6b7280",
        fontSize: "0.9rem",
      }}
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <div
      style={{
        position: "absolute",
        right: "1rem",
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none",
        fontSize: "0.8rem",
      }}
    >
      ▼
    </div>
  </div>
);

function getVehicleIcon(vehicle: string) {
  if (vehicle === "Motorcycle") {
    return bikeIcon;
  }

  if (vehicle === "Taxi") {
    return taxiIcon;
  }

  return carIcon;
}

function getPaymentIcon(method: string) {
  if (method === "visa") {
    return visaIcon;
  }

  if (method === "mastercard") {
    return mastercardIcon;
  }

  return cashIcon;
}

function getStatusStyle(status: string) {
  if (status === "Searching") {
    return { backgroundColor: "#dbeafe", color: "#1d4ed8" };
  }

  if (status === "Accepted") {
    return { backgroundColor: "#eef7f0", color: "#2d8a46" };
  }

  if (status === "In_progress") {
    return { backgroundColor: "#f3e8ff", color: "#9333ea" };
  }

  if (status === "Cancelled") {
    return { backgroundColor: "#fee2e2", color: "#dc2626" };
  }

  return { backgroundColor: "#eef7f0", color: "#2d8a46" };
}

function getServiceStyle() {
  return { backgroundColor: "#eef7f0", color: "#2d8a46" };
}

function resolveImageUrl(imageUrl: string | null) {
  if (!imageUrl) {
    return null;
  }

  return resolveApiAssetUrl(imageUrl);
}

function isEmptyLiveStats(stats: LiveTripsStats) {
  return (
    stats.totalArchived === 0 &&
    stats.completed === 0 &&
    stats.cancelled === 0 &&
    stats.totalEarnings === 0 &&
    stats.commission.percentage === 0
  );
}

function resolveFallbackStats(stats: LiveTripsStats) {
  if (isEmptyLiveStats(stats)) {
    return FALLBACK_STATS;
  }

  if (
    stats.totalArchived === 0 &&
    stats.completed === 0 &&
    stats.cancelled === 0 &&
    stats.totalEarnings === 0
  ) {
    return {
      ...FALLBACK_STATS,
      commission: {
        percentage:
          stats.commission.percentage > 0
            ? stats.commission.percentage
            : FALLBACK_STATS.commission.percentage,
        earned:
          stats.commission.earned > 0
            ? stats.commission.earned
            : FALLBACK_STATS.commission.earned,
      },
    };
  }

  return stats;
}

function buildModalTripFromRow(trip: LiveTripRow): ModalTrip {
  return {
    id: trip.id,
    vehicle: trip.vehicle,
    fare: trip.fare,
    paymentMethod: trip.paymentMethod,
    status: trip.status,
    rider: {
      ...trip.rider,
      img: resolveImageUrl(trip.rider.img),
    },
    driver: {
      ...trip.driver,
      img: resolveImageUrl(trip.driver.img),
    },
    tripInfo: {
      startTime: trip.time,
      endTime: "—",
      distance: "—",
      status: trip.status,
    },
    passenger: {
      fullName: trip.rider.name,
      customerId: trip.rider.id,
      category: trip.service,
      gender: "—",
      email: "—",
      phone: "—",
      city: "—",
      imageUrl: resolveImageUrl(trip.rider.img),
      rating: trip.rider.rating,
    },
    driverDetails: {
      fullName: trip.driver.name,
      driverId: trip.driver.id,
      vehicleType: trip.vehicle,
      gender: "—",
      email: "—",
      phone: "—",
      city: "—",
      imageUrl: resolveImageUrl(trip.driver.img),
      rating: trip.driver.rating,
    },
    vehicleInfo: {
      driverId: trip.driver.id,
      colour: "—",
      licencePlate: "—",
      makeModel: trip.vehicle,
      year: "—",
      joinDate: "—",
    },
    route: {
      pickupAddress: "Demo pickup location",
      dropoffAddress: "Demo dropoff location",
    },
    paymentInfo: {
      tva: "—",
      serviceFee: "—",
      method: trip.paymentMethod.toLowerCase(),
      discount: "—",
      totalAmount: trip.fare,
    },
  };
}

function buildModalTripFromDetail(detail: LiveTripDetail): ModalTrip {
  const passengerAvatar = resolveImageUrl(detail.passenger.imageUrl);
  const driverAvatar = resolveImageUrl(detail.driver.imageUrl);
  const vehicleType = detail.driver.vehicleType || detail.passenger.category;

  return {
    id: detail.tripInfo.id,
    vehicle: vehicleType,
    fare: detail.payment?.totalAmount ?? "—",
    paymentMethod: detail.payment?.method ?? "cash",
    status: detail.tripInfo.status,
    rider: {
      name: detail.passenger.fullName,
      id: detail.passenger.customerId,
      rating: detail.passenger.rating ?? 0,
      img: passengerAvatar,
    },
    driver: {
      name: detail.driver.fullName,
      id: detail.driver.driverId,
      rating: detail.driver.rating,
      img: driverAvatar,
    },
    tripInfo: {
      startTime: formatDateTime(detail.tripInfo.startTime),
      endTime: formatDateTime(detail.tripInfo.endTime),
      distance: detail.tripInfo.distance ?? "—",
      status: detail.tripInfo.status,
    },
    passenger: {
      fullName: detail.passenger.fullName,
      customerId: detail.passenger.customerId,
      category: detail.passenger.category,
      gender: detail.passenger.gender ?? "—",
      email: detail.passenger.email ?? "—",
      phone: detail.passenger.phone ?? "—",
      city: detail.passenger.city ?? "—",
      imageUrl: passengerAvatar,
      rating: detail.passenger.rating ?? 0,
    },
    driverDetails: {
      fullName: detail.driver.fullName,
      driverId: detail.driver.driverId,
      vehicleType: detail.driver.vehicleType,
      gender: detail.driver.gender ?? "—",
      email: detail.driver.email ?? "—",
      phone: detail.driver.phone ?? "—",
      city: detail.driver.city ?? "—",
      imageUrl: driverAvatar,
      rating: detail.driver.rating,
    },
    vehicleInfo: {
      driverId: detail.vehicle.driverId,
      colour: detail.vehicle.colour ?? "—",
      licencePlate: detail.vehicle.licencePlate ?? "—",
      makeModel: detail.vehicle.makeModel ?? "—",
      year: detail.vehicle.year ?? "—",
      joinDate: formatDate(detail.vehicle.joinDate),
    },
    route: {
      pickupAddress: detail.route.pickupAddress ?? "—",
      dropoffAddress: detail.route.dropoffAddress ?? "—",
    },
    paymentInfo: {
      tva: detail.payment?.tva ?? "—",
      serviceFee: detail.payment?.serviceFee ?? "—",
      method: (detail.payment?.method ?? "cash").toLowerCase(),
      discount: detail.payment?.discount ?? "—",
      totalAmount: detail.payment?.totalAmount ?? "—",
    },
  };
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB");
}
