import { useState, useEffect } from "react";
import { Moon } from "lucide-react";
import {
  getSurgePricingApi,
  toggleSurgeRuleApi,
  getReservationFeesApi,
} from "../../services/api";

// Vehicle Icons
import carIcon from "../../assets/icons/car.png";
import taxiIcon from "../../assets/icons/taxi.png";
import bikeIcon from "../../assets/icons/bike.png";

const defaultIconMap: Record<string, any> = {
  motorcycle: bikeIcon,
  moto: bikeIcon,
  "standard car": carIcon,
  "car ride": carIcon,
  "comfort car": carIcon,
  comfort: carIcon,
  xl: carIcon,
  taxi: taxiIcon,
  "express delivery": "📦",
  delivery: "📦",
  "city to city": "🏬",
  "group ride": "👥",
  group: "👥",
  reservation: "📅",
  airport: carIcon,
  "airport ride": carIcon,
};

function getIconForService(name: string) {
  const lower = (name || "").toLowerCase();
  for (const [key, icon] of Object.entries(defaultIconMap)) {
    if (lower.includes(key)) return icon;
  }
  return carIcon;
}

export const SurgeControl = () => {
  const [surgeItems, setSurgeItems] = useState<any[]>([]);
  const [reservationFees, setReservationFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [surgeRes, reservRes] = await Promise.all([
        getSurgePricingApi(),
        getReservationFeesApi(),
      ]);

      if (surgeRes.ok && surgeRes.data) {
        const list =
          (surgeRes.data as any).rules ||
          (surgeRes.data as any).surge ||
          surgeRes.data;
        if (Array.isArray(list)) {
          setSurgeItems(
            list.map((item: any) => ({
              id: item.id,
              title: item.name || item.scenarioName || "Surge Rule",
              subtitle: item.description || item.timeRange || "",
              rate: String(item.multiplier ?? item.rate ?? "1.0"),
              isActive: item.isActive !== undefined ? item.isActive : true,
            })),
          );
        }
      }

      if (reservRes.ok && reservRes.data) {
        const list =
          (reservRes.data as any).reservations ||
          (reservRes.data as any).fees ||
          reservRes.data;
        if (Array.isArray(list)) {
          setReservationFees(
            list.map((item: any) => ({
              id: item.id || item.passengerServiceId,
              type: item.serviceName || item.name || "",
              city:
                item.cityFee !== undefined ? `+${item.cityFee} MAD` : "+0 MAD",
              intercity:
                item.intercityFee !== undefined
                  ? `+${item.intercityFee} MAD`
                  : "+0 MAD",
              airport:
                item.airportFee !== undefined
                  ? `+${item.airportFee} MAD`
                  : "+0 MAD",
              icon: getIconForService(item.serviceName || item.name || ""),
            })),
          );
        }
      }
    } catch (e) {
      console.error("Failed to load surge/reservation data", e);
    }
    setLoading(false);
  };

  const handleSurgeRateChange = (index: number, value: string) => {
    setSurgeItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, rate: value } : item)),
    );
  };

  const handleToggleSurge = async (index: number) => {
    const item = surgeItems[index];
    if (!item?.id) return;
    try {
      const res = await toggleSurgeRuleApi(item.id);
      if (res.ok) {
        setSurgeItems((prev) =>
          prev.map((it, i) =>
            i === index ? { ...it, isActive: !it.isActive } : it,
          ),
        );
      }
    } catch (e) {
      console.error("Failed to toggle surge rule", e);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", margin: 0 }}>
          Surge Pricing Control
        </h2>
        <select
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "2rem",
            border: "1px solid #e5e7eb",
            backgroundColor: "white",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          <option>Casablanca</option>
        </select>
      </div>
      <p style={{ color: "#6b7280", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Seven scenarios (all 1.2x except airport) • Manage dynamic pricing for
        high-demand periods
      </p>

      {loading ? (
        <p style={{ color: "#64748b", textAlign: "center", padding: "2rem" }}>
          Loading surge rules...
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1rem",
            marginBottom: "3rem",
          }}
        >
          {surgeItems.map((item, index) => (
            <div
              key={item.id || index}
              style={{
                backgroundColor: "white",
                padding: "1rem",
                borderRadius: "0.75rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#eef7f0",
                    padding: "0.5rem",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Moon size={18} color="#38AC57" />
                </div>
                <div>
                  <div style={{ fontWeight: "500", fontSize: "0.9rem" }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                    {item.subtitle}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="text"
                    value={item.rate}
                    onChange={(e) =>
                      handleSurgeRateChange(index, e.target.value)
                    }
                    style={{
                      width: "40px",
                      padding: "0.3rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #e5e7eb",
                      fontSize: "0.875rem",
                      textAlign: "center",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      marginLeft: "2px",
                    }}
                  >
                    <span style={{ fontSize: "8px", cursor: "pointer" }}>
                      ▲
                    </span>
                    <span style={{ fontSize: "8px", cursor: "pointer" }}>
                      ▼
                    </span>
                  </div>
                </div>

                {/* Toggle Switch */}
                <label
                  style={{
                    position: "relative",
                    display: "inline-block",
                    width: "36px",
                    height: "20px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={item.isActive}
                    onChange={() => handleToggleSurge(index)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      cursor: "pointer",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: item.isActive ? "#38AC57" : "#ccc",
                      transition: ".4s",
                      borderRadius: "34px",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        content: '""',
                        height: "14px",
                        width: "14px",
                        left: item.isActive ? "18px" : "4px",
                        bottom: "3px",
                        backgroundColor: "white",
                        transition: ".4s",
                        borderRadius: "50%",
                      }}
                    ></span>
                  </span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2
        style={{
          fontSize: "1.25rem",
          fontWeight: "bold",
          marginBottom: "0.5rem",
        }}
      >
        Reservation Fees
      </h2>
      <p
        style={{ color: "#6b7280", marginBottom: "1.5rem", fontSize: "0.9rem" }}
      >
        Pre-booking charges by service type and destination
      </p>

      <div style={{ overflowX: "auto" }}>
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
                  padding: "1rem",
                  borderTopLeftRadius: "0.5rem",
                  borderBottomLeftRadius: "0.5rem",
                  textAlign: "left",
                }}
              >
                Service Type
              </th>
              <th style={{ padding: "1rem", textAlign: "left" }}>City</th>
              <th style={{ padding: "1rem", textAlign: "left" }}>Intercity</th>
              <th
                style={{
                  padding: "1rem",
                  borderTopRightRadius: "0.5rem",
                  borderBottomRightRadius: "0.5rem",
                  textAlign: "left",
                }}
              >
                Airport
              </th>
            </tr>
          </thead>
          <tbody>
            {reservationFees.map((fee, index) => (
              <tr
                key={index}
                style={{
                  backgroundColor: "white",
                  borderBottom: "1px solid #f3f4f6",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <td
                  style={{
                    padding: "1rem",
                    borderTopLeftRadius: "0.5rem",
                    borderBottomLeftRadius: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    {typeof fee.icon === "string" && fee.icon.includes(".") ? (
                      <img
                        src={fee.icon}
                        alt=""
                        style={{ height: "24px", width: "auto" }}
                      />
                    ) : (
                      <span style={{ fontSize: "1.25rem" }}>{fee.icon}</span>
                    )}
                    <span style={{ fontWeight: "500" }}>{fee.type}</span>
                  </div>
                </td>
                <td style={{ padding: "1rem", fontWeight: "500" }}>
                  {fee.city}
                </td>
                <td style={{ padding: "1rem", fontWeight: "500" }}>
                  {fee.intercity}
                </td>
                <td
                  style={{
                    padding: "1rem",
                    borderTopRightRadius: "0.5rem",
                    borderBottomRightRadius: "0.5rem",
                    fontWeight: "500",
                  }}
                >
                  {fee.airport}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
