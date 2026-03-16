import { useState, useEffect } from "react";
import {
  getPricingMatrixFlatApi,
  getServicesForPriceApi,
  updatePricingEntryApi,
  getPricingCitiesApi,
} from "../../services/api";

const FALLBACK_SERVICES = [
  { id: 1, serviceName: "Car Ride" },
  { id: 2, serviceName: "Motorcycle" },
  { id: 3, serviceName: "Taxi" },
];

const FALLBACK_CITIES = [{ id: 1, name: "Casablanca" }];

const FALLBACK_PRICING = [
  {
    id: 1,
    serviceName: "Car Ride",
    baseFare: 8,
    bookingFee: 2,
    perMinute: 0.6,
    nightSurcharge: 15,
    perKm: 2.8,
    cancellationFee: 6,
    minFare: 12,
    peakHourSurcharge: 20,
  },
  {
    id: 2,
    serviceName: "Motorcycle",
    baseFare: 5,
    bookingFee: 1,
    perMinute: 0.35,
    nightSurcharge: 10,
    perKm: 1.6,
    cancellationFee: 4,
    minFare: 8,
    peakHourSurcharge: 18,
  },
  {
    id: 3,
    serviceName: "Taxi",
    baseFare: 9,
    bookingFee: 2,
    perMinute: 0.7,
    nightSurcharge: 12,
    perKm: 3.2,
    cancellationFee: 7,
    minFare: 14,
    peakHourSurcharge: 22,
  },
];

export const FareStructure = () => {
  const [activeService, setActiveService] = useState("");
  const [services, setServices] = useState<any[]>([]);
  const [pricingData, setPricingData] = useState<any[]>([]);
  const [, setCities] = useState<any[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedCityId) loadPricingData();
  }, [selectedCityId]);

  const loadInitialData = async () => {
    try {
      const [servicesRes, citiesRes] = await Promise.all([
        getServicesForPriceApi(),
        getPricingCitiesApi(),
      ]);
      let nextServices = FALLBACK_SERVICES;
      let nextCities = FALLBACK_CITIES;

      if (servicesRes.ok && servicesRes.data) {
        const svcList = (servicesRes.data as any).services || servicesRes.data;
        if (Array.isArray(svcList) && svcList.length > 0) {
          nextServices = svcList;
        }
      }
      if (citiesRes.ok && citiesRes.data) {
        const cityList = (citiesRes.data as any).cities || citiesRes.data;
        if (Array.isArray(cityList) && cityList.length > 0) {
          nextCities = cityList;
        }
      }

      setServices(nextServices);
      setActiveService(
        (nextServices[0] as any)?.serviceName ||
          (nextServices[0] as any)?.name ||
          "Car Ride",
      );
      setCities(nextCities);
      setSelectedCityId(
        (nextCities[0] as any)?.id || (nextCities[0] as any)?.cityId || 1,
      );
    } catch (e) {
      console.error("Failed to load services/cities", e);
      setServices(FALLBACK_SERVICES);
      setActiveService(FALLBACK_SERVICES[0].serviceName);
      setCities(FALLBACK_CITIES);
      setSelectedCityId(FALLBACK_CITIES[0].id);
    }
  };

  const loadPricingData = async () => {
    setLoading(true);
    try {
      const res = await getPricingMatrixFlatApi(selectedCityId);
      if (res.ok && res.data) {
        const list =
          (res.data as any).pricing || (res.data as any).matrix || res.data;
        if (Array.isArray(list)) {
          setPricingData(list.length > 0 ? list : FALLBACK_PRICING);
          // Set active service if not already set
          if (!activeService) {
            const firstPricing = list.length > 0 ? list[0] : FALLBACK_PRICING[0];
            setActiveService(firstPricing.serviceName || firstPricing.name || "");
          }
        } else {
          setPricingData(FALLBACK_PRICING);
        }
      } else {
        setPricingData(FALLBACK_PRICING);
      }
    } catch (e) {
      console.error("Failed to load pricing", e);
      setPricingData(FALLBACK_PRICING);
    }
    setLoading(false);
  };

  const activePricing = pricingData.find(
    (p: any) => (p.serviceName || p.name) === activeService,
  );

  const fareFields = activePricing
    ? [
        {
          label: "Base Fare (MAD)",
          key: "baseFare",
          value: String(activePricing.baseFare ?? ""),
        },
        {
          label: "Booking Fee (MAD)",
          key: "bookingFee",
          value: String(activePricing.bookingFee ?? ""),
        },
        {
          label: "Per Minute Rate (MAD)",
          key: "perMinute",
          value: String(activePricing.perMinute ?? ""),
        },
        {
          label: "Night Surcharge (%)",
          key: "nightSurcharge",
          value: String(activePricing.nightSurcharge ?? ""),
        },
        {
          label: "Per KM Rate (MAD)",
          key: "perKm",
          value: String(activePricing.perKm ?? ""),
        },
        {
          label: "Cancellation Fee (MAD)",
          key: "cancellationFee",
          value: String(activePricing.cancellationFee ?? ""),
        },
        {
          label: "Minimum Fare",
          key: "minFare",
          value: String(activePricing.minFare ?? ""),
        },
        {
          label: "Peak Hour Surcharge (%)",
          key: "peakHourSurcharge",
          value: String(activePricing.peakHourSurcharge ?? ""),
        },
      ]
    : [
        { label: "Base Fare (MAD)", key: "baseFare", value: "" },
        { label: "Booking Fee (MAD)", key: "bookingFee", value: "" },
        { label: "Per Minute Rate (MAD)", key: "perMinute", value: "" },
        { label: "Night Surcharge (%)", key: "nightSurcharge", value: "" },
        { label: "Per KM Rate (MAD)", key: "perKm", value: "" },
        { label: "Cancellation Fee (MAD)", key: "cancellationFee", value: "" },
        { label: "Minimum Fare", key: "minFare", value: "" },
        {
          label: "Peak Hour Surcharge (%)",
          key: "peakHourSurcharge",
          value: "",
        },
      ];

  // Initialize edit values when active pricing changes
  useEffect(() => {
    if (activePricing) {
      const vals: Record<string, string> = {};
      fareFields.forEach((f) => {
        vals[f.key] = f.value;
      });
      setEditValues(vals);
    }
  }, [activeService, pricingData]);

  const serviceNames =
    services.length > 0
      ? services.map((s: any) => s.serviceName || s.name || "")
      : pricingData
          .map((p: any) => p.serviceName || p.name || "")
          .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

  const handleUpdate = async () => {
    if (!activePricing) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      fareFields.forEach((f) => {
        const val = editValues[f.key];
        if (val !== undefined && val !== "") payload[f.key] = parseFloat(val);
      });
      const id = activePricing.id || activePricing.pricingId;
      const res = await updatePricingEntryApi(id, payload);
      if (res.ok) {
        alert(`Fare structure for ${activeService} updated successfully!`);
        loadPricingData();
      } else {
        alert("Failed to update fare structure");
      }
    } catch (e) {
      alert("Error updating fare structure");
    }
    setSaving(false);
  };

  return (
    <div className="vp-fare-container">
      <style>{`
        .vp-fare-container {
            animation: fadeIn 0.4s ease-out;
        }

        .vp-fare-header {
            margin-bottom: 2.5rem;
        }

        .vp-fare-header h2 {
            font-size: 1.75rem;
            font-weight: 900;
            color: #1e293b;
            margin: 0;
            letter-spacing: -0.025em;
        }

        .vp-fare-header p {
            color: #64748b;
            margin: 0.5rem 0 0 0;
            font-size: 1.1rem;
            font-weight: 500;
        }

        .vp-fare-subtabs {
            display: flex;
            gap: 0.625rem;
            background: #f1f5f9;
            padding: 8px;
            border-radius: 100px;
            width: fit-content;
            margin-bottom: 2.5rem;
            overflow-x: auto;
            max-width: 100%;
            scrollbar-width: none;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
        }

        .vp-fare-subtabs::-webkit-scrollbar {
            display: none;
        }

        .vp-subtab-btn {
            padding: 0.75rem 1.75rem;
            border-radius: 100px;
            border: none;
            background: transparent;
            color: #64748b;
            font-weight: 800;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            white-space: nowrap;
        }

        .vp-subtab-btn.active {
            background: #38AC57;
            color: white;
            box-shadow: 0 4px 12px rgba(56, 172, 87, 0.2);
        }

        .vp-fare-card {
            background: white;
            padding: 2.5rem;
            border-radius: 32px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .vp-fare-card h3 {
            font-size: 1.5rem;
            font-weight: 900;
            margin: 0;
            color: #1e293b;
        }

        .vp-fare-card p {
            color: #64748b;
            font-size: 1rem;
            margin: 0.5rem 0 2.5rem 0;
            font-weight: 500;
        }

        .vp-fare-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 2rem;
        }

        .vp-fare-input-group label {
            display: block;
            font-size: 1rem;
            font-weight: 700;
            margin-bottom: 0.75rem;
            color: #334155;
        }

        .vp-fare-input-group input {
            width: 100%;
            padding: 1.125rem 1.5rem;
            border-radius: 16px;
            border: 1px solid #e2e8f0;
            background-color: #f8fafc;
            font-size: 1.1rem;
            font-weight: 700;
            outline: none;
            transition: all 0.2s;
            color: #1e293b;
            box-sizing: border-box;
        }

        .vp-fare-input-group input:focus {
            border-color: #38AC57;
            background: white;
            box-shadow: 0 0 0 4px rgba(56, 172, 87, 0.1);
        }

        .vp-update-btn {
            background: #111827;
            color: white;
            border: none;
            padding: 1.25rem 3.5rem;
            border-radius: 100px;
            font-weight: 900;
            font-size: 1.1rem;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 10px 15px -3px rgba(17, 24, 39, 0.2);
        }

        .vp-update-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 20px 25px -5px rgba(17, 24, 39, 0.3);
        }

        @media (max-width: 768px) {
            .vp-fare-card {
                padding: 1.5rem;
            }
            .vp-fare-grid {
                grid-template-columns: 1fr;
            }
            .vp-subtab-btn {
                padding: 0.6rem 1.25rem;
                font-size: 0.85rem;
            }
            .vp-update-btn {
                width: 100%;
            }
        }
      `}</style>

      <div className="vp-fare-header">
        <h2>Fare Structure</h2>
        <p>Configure pricing for different service types</p>
      </div>

      <div className="vp-fare-subtabs">
        {serviceNames.map((service: string) => (
          <button
            key={service}
            onClick={() => setActiveService(service)}
            className={`vp-subtab-btn ${activeService === service ? "active" : ""}`}
          >
            {service}
          </button>
        ))}
      </div>

      <div className="vp-fare-card">
        <div className="vp-fare-card-header">
          <h3>{activeService}</h3>
          <p>Configure pricing for {activeService} service</p>
        </div>

        {loading ? (
          <p style={{ color: "#64748b", textAlign: "center", padding: "2rem" }}>
            Loading pricing data...
          </p>
        ) : (
          <div className="vp-fare-grid">
            {fareFields.map((field, i) => (
              <div key={i} className="vp-fare-input-group">
                <label>{field.label}</label>
                <input
                  type="text"
                  value={editValues[field.key] ?? field.value}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      [field.key]: e.target.value,
                    })
                  }
                />
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: "4rem",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            className="vp-update-btn"
            onClick={handleUpdate}
            disabled={saving}
          >
            {saving ? "Updating..." : "Update Fare Structure"}
          </button>
        </div>
      </div>
    </div>
  );
};
