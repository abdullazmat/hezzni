import { useState, useMemo, useEffect, useCallback } from "react";
import { Plus, Eye, Search as SearchIcon } from "lucide-react";
import { Promotion } from "./CouponTypes";
import { CouponsModal, CreatePromotionModal } from "./CouponsModals";
import {
  getAdminCouponsApi,
  getAdminCouponStatsApi,
  createAdminCouponApi,
  updateAdminCouponApi,
  deleteAdminCouponApi,
} from "../services/api";
import { Ticket, CheckCircle, XCircle } from "lucide-react";

export const Coupons = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(
    null,
  );
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0 });

  const fetchStats = useCallback(async () => {
    try {
      const res = await getAdminCouponStatsApi();
      if (res.ok) {
        setStats(res.data);
      }
    } catch (e) {
      console.error("Failed to fetch coupon stats:", e);
    }
  }, []);

  const fetchPromotions = useCallback(async () => {
    try {
      const res = await getAdminCouponsApi({
        search: searchQuery || undefined,
      });
      if (res.ok && res.data?.promotions) {
        setPromotions(res.data.promotions);
      }
    } catch (e) {
      console.error("Failed to fetch promotions:", e);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchPromotions();
    fetchStats();
  }, [fetchPromotions, fetchStats]);

  const filteredPromotions = useMemo(() => {
    return promotions.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [promotions, searchQuery]);

  const handleUpdatePromotion = async (updated: Promotion) => {
    const dbId = (updated as any).dbId || updated.id;
    // Map service names back to IDs for the API
    const serviceNameToId: Record<string, number> = {
      Rides: 1,
      Motorcycle: 2,
      Taxi: 3,
      "Rental Car": 4,
    };
    const eligibleServiceIds = updated.eligibleServices
      .map((name) => serviceNameToId[name])
      .filter(Boolean);

    await updateAdminCouponApi(dbId, {
      promotionName: updated.name,
      code: updated.code,
      description: updated.description,
      discountType:
        updated.discountType === "Percentage" ? "PERCENTAGE" : "FIXED",
      discountValue: parseFloat(updated.discountValue) || 0,
      expiryDate: updated.validUntil || undefined,
      isActive: updated.status === "Active",
      maxUsage: updated.maxUsage,
      minOrderAmount:
        parseFloat(updated.minOrderAmount?.replace(/[^0-9.]/g, "") || "0") || 0,
      eligibleServiceIds,
    });
    setPromotions((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p)),
    );
    fetchPromotions();
  };

  const handleDeletePromotion = async (id: string) => {
    const promo = promotions.find((p) => p.id === id);
    const dbId = (promo as any)?.dbId || id;
    await deleteAdminCouponApi(dbId);
    setPromotions((prev) => prev.filter((p) => p.id !== id));
    setIsDetailsModalOpen(false);
    fetchPromotions();
  };

  const handleCreatePromotion = async (newPromo: Promotion) => {
    const serviceNameToId: Record<string, number> = {
      Rides: 1,
      Motorcycle: 2,
      Taxi: 3,
      "Rental Car": 4,
    };
    const eligibleServiceIds = newPromo.eligibleServices
      .map((name) => serviceNameToId[name])
      .filter(Boolean);

    await createAdminCouponApi({
      promotionName: newPromo.name,
      code: newPromo.code,
      description: newPromo.description,
      discountType:
        newPromo.discountType === "Percentage" ? "PERCENTAGE" : "FIXED",
      discountValue: parseFloat(newPromo.discountValue) || 0,
      expiryDate: newPromo.validUntil || undefined,
      isActive: newPromo.status === "Active",
      maxUsage: newPromo.maxUsage,
      minOrderAmount:
        parseFloat(newPromo.minOrderAmount?.replace(/[^0-9.]/g, "") || "0") ||
        0,
      eligibleServiceIds,
    });
    setIsCreateModalOpen(false);
    fetchPromotions();
  };

  return (
    <div
      className="main-content"
      style={{
        padding: "2rem",
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
        overflowY: "auto",
      }}
    >
      <style>{`
        .prm-header-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 2.5rem;
            gap: 1.5rem;
        }
        .prm-title-section h1 {
            font-size: 2rem;
            font-weight: 800;
            margin: 0 0 0.5rem 0;
            color: #111827;
        }
        .prm-title-section p {
            margin: 0;
            color: #6B7280;
            font-size: 1rem;
        }
        .prm-stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5rem;
            margin-bottom: 2.5rem;
        }
        .prm-stat-card {
            background-color: white;
            padding: 1.5rem;
            border-radius: 20px;
            border: 1px solid #e5e7eb;
            display: flex;
            align-items: center;
            gap: 1rem;
            transition: all 0.2s;
        }
        .prm-stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
        }
        .prm-stat-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .prm-create-btn {
            background-color: #38AC57;
            color: white;
            border: none;
            padding: 14px 32px;
            border-radius: 16px;
            fontWeight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 1.1rem;
            box-shadow: 0 8px 16px -4px rgba(56, 172, 87, 0.4);
            transition: all 0.2s ease;
            white-space: nowrap;
        }
        .prm-create-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 20px -4px rgba(56, 172, 87, 0.5);
        }
        .prm-search-container {
            position: relative;
            margin-bottom: 2.5rem;
            max-width: 450px;
        }
        .prm-search-input {
            width: 100%;
            padding: 14px 16px 14px 52px;
            border-radius: 20px;
            border: 1px solid #e5e7eb;
            font-size: 1rem;
            font-weight: 500;
            outline: none;
            background-color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            transition: all 0.2s;
        }
        .prm-search-input:focus {
            border-color: #38AC57;
            box-shadow: 0 0 0 4px rgba(56, 172, 87, 0.1);
        }
        .prm-table-card {
            background-color: white;
            border-radius: 24px;
            overflow: hidden;
            border: 1px solid #e5e7eb;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
        }
        .prm-table-wrapper {
            width: 100%;
            overflow-x: auto;
        }
        .prm-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 1100px;
        }
        .prm-table th {
            background-color: #38AC57;
            color: white;
            padding: 1.25rem 1.5rem;
            text-align: left;
            font-weight: 700;
            font-size: 14px;
            white-space: nowrap;
        }
        .prm-table td {
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid #f3f4f6;
        }
        .prm-status-badge {
            padding: 6px 16px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
        }
        .prm-view-btn {
            background-color: white;
            border: 1px solid #e5e7eb;
            padding: 8px 20px;
            border-radius: 12px;
            font-size: 14px;
            color: #374151;
            font-weight: 700;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
        }
        .prm-view-btn:hover {
            background-color: #f9fafb;
            border-color: #D1D5DB;
        }

        @media (max-width: 768px) {
            .prm-header-container {
                flex-direction: column;
                align-items: stretch;
                text-align: center;
                gap: 1.5rem;
            }
            .prm-create-btn {
                width: 100%;
                justify-content: center;
            }
            .prm-search-container {
                max-width: 100%;
            }
            .prm-title-section h1 {
                font-size: 1.75rem;
            }
        }
      `}</style>

      <div className="prm-header-container">
        <div className="prm-title-section">
          <h1>Promotions & Coupons</h1>
          <p>Manage promotional campaigns and discount codes</p>
        </div>
        <button
          className="prm-create-btn"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus size={24} strokeWidth={3} /> Create Promotion
        </button>
      </div>

      <div className="prm-stats-grid">
        <div className="prm-stat-card">
          <div className="prm-stat-icon" style={{ backgroundColor: "#eef2ff", color: "#6366f1" }}>
            <Ticket size={24} />
          </div>
          <div>
            <div style={{ color: "#6B7280", fontSize: "0.85rem", fontWeight: "600" }}>Total Coupons</div>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#111827" }}>{stats.total}</div>
          </div>
        </div>
        <div className="prm-stat-card">
          <div className="prm-stat-icon" style={{ backgroundColor: "#ecfdf5", color: "#10b981" }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div style={{ color: "#6B7280", fontSize: "0.85rem", fontWeight: "600" }}>Active Coupons</div>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#111827" }}>{stats.active}</div>
          </div>
        </div>
        <div className="prm-stat-card">
          <div className="prm-stat-icon" style={{ backgroundColor: "#fef2f2", color: "#ef4444" }}>
            <XCircle size={24} />
          </div>
          <div>
            <div style={{ color: "#6B7280", fontSize: "0.85rem", fontWeight: "600" }}>Expired Coupons</div>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#111827" }}>{stats.expired}</div>
          </div>
        </div>
      </div>

      <div className="prm-search-container">
        <input
          type="text"
          className="prm-search-input"
          placeholder="Search by name, code or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <SearchIcon
          size={20}
          color="#9CA3AF"
          style={{
            position: "absolute",
            left: "18px",
            top: "50%",
            transform: "translateY(-50%)",
          }}
        />
      </div>

      <div className="prm-table-card">
        <div className="prm-table-wrapper">
          <table className="prm-table">
            <thead>
              <tr>
                <th>Promotion Name</th>
                <th>Code</th>
                <th>Discount</th>
                <th>Valid Until</th>
                <th>Usage Count</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPromotions.length > 0 ? (
                filteredPromotions.map((promo) => (
                  <tr key={promo.id}>
                    <td>
                      <div
                        style={{
                          fontWeight: "800",
                          fontSize: "16px",
                          color: "#111827",
                        }}
                      >
                        {promo.name}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6B7280",
                          fontWeight: "700",
                        }}
                      >
                        {promo.id}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "14px",
                          color: "#6B7280",
                          fontWeight: "700",
                          backgroundColor: "#f3f4f6",
                          padding: "4px 10px",
                          borderRadius: "6px",
                        }}
                      >
                        {promo.code}
                      </span>
                    </td>
                    <td
                      style={{
                        fontSize: "16px",
                        color: "#38AC57",
                        fontWeight: "900",
                      }}
                    >
                      {promo.discount}
                    </td>
                    <td
                      style={{
                        fontSize: "14px",
                        color: "#374151",
                        fontWeight: "700",
                      }}
                    >
                      {promo.validUntil}
                    </td>
                    <td>
                      <div
                        style={{
                          fontWeight: "900",
                          fontSize: "16px",
                          color: "#111827",
                        }}
                      >
                        {promo.usageCount}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#9CA3AF",
                          fontWeight: "700",
                        }}
                      >
                        of {promo.maxUsage}
                      </div>
                    </td>
                    <td>
                      <span
                        className="prm-status-badge"
                        style={{
                          backgroundColor:
                            promo.status === "Active" ? "#eef7f0" : "#FEF2F2",
                          color:
                            promo.status === "Active" ? "#38AC57" : "#EF4444",
                        }}
                      >
                        {promo.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="prm-view-btn"
                        onClick={() => {
                          setSelectedPromotion(promo);
                          setIsDetailsModalOpen(true);
                        }}
                      >
                        <Eye size={16} /> View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      padding: "4rem",
                      color: "#9CA3AF",
                      fontWeight: "700",
                    }}
                  >
                    No promotions found matching your search
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CouponsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        promotion={selectedPromotion}
        onUpdate={handleUpdatePromotion}
        onDelete={handleDeletePromotion}
      />

      <CreatePromotionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreatePromotion}
      />
    </div>
  );
};
