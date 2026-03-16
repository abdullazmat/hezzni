import { useState, useRef, useEffect } from "react";
import {
  Search,
  Filter,
  ChevronDown,
  ArrowUpRight,
  Download,
  ExternalLink,
  Eye,
} from "lucide-react";
import { UserAvatar } from "../components/UserAvatar";
import {
  TransactionDetailsModal,
  TransactionHistoryModal,
  ProcessRefundModal,
} from "./PaymentModals";
import {
  getAdminTransactionsApi,
  getAdminTransactionDetailApi,
} from "../services/api";
import { useCallback } from "react";
import { jsPDF } from "jspdf";

const PAYMENT_OVERRIDES_KEY = "adminPaymentTransactionOverridesV1";

// Specialized Icons
import totalTransactionsIcon from "../assets/icons/total payments.png";
import successfulPaymentsIcon from "../assets/icons/successful payments.png";
import failedPaymentsIcon from "../assets/icons/failed payments.png";
import pendingRefundsIcon from "../assets/icons/pending payments.png";
import mastercardIcon from "../assets/icons/mastercard.png";
import visaIcon from "../assets/icons/visa.png";
import cashIcon from "../assets/icons/cash.png";
import walletIcon from "../assets/icons/hezzni wallet.png";

const FALLBACK_TRANSACTIONS = {
  "Trip Payments": [
    {
      id: "TX-24001",
      tripId: "TRP-12031",
      rider: "Sara K.",
      riderAvatar: "",
      amount: "145.00",
      currency: "MAD",
      paymentMethod: "VISA",
      status: "Completed",
      refundStatus: "No Refund",
      date: "16 Mar 2026, 10:35",
    },
    {
      id: "TX-24002",
      tripId: "TRP-12044",
      rider: "Hajar M.",
      riderAvatar: "",
      amount: "89.00",
      currency: "MAD",
      paymentMethod: "Cash",
      status: "Failed",
      refundStatus: "Refund Pending",
      date: "15 Mar 2026, 18:10",
    },
    {
      id: "TX-24003",
      tripId: "TRP-12057",
      rider: "Omar T.",
      riderAvatar: "",
      amount: "112.00",
      currency: "MAD",
      paymentMethod: "Mastercard",
      status: "Completed",
      refundStatus: "No Refund",
      date: "14 Mar 2026, 09:40",
    },
  ],
  "Wallet Recharges": [
    {
      id: "WL-11001",
      accountId: "R-00045",
      rider: "Mohamed Alaoui",
      riderAvatar: "",
      amount: "55.66",
      currency: "MAD",
      paymentMethod: "Mastercard",
      status: "Completed",
      refundStatus: "No Refund",
      date: "03 Jun 2025, 12:00",
    },
    {
      id: "WL-11002",
      accountId: "R-00062",
      rider: "Lina B.",
      riderAvatar: "",
      amount: "120.00",
      currency: "MAD",
      paymentMethod: "Hezzni Wallet",
      status: "Completed",
      refundStatus: "No Refund",
      date: "15 Mar 2026, 14:20",
    },
    {
      id: "WL-11003",
      accountId: "R-00077",
      rider: "Salma H.",
      riderAvatar: "",
      amount: "80.00",
      currency: "MAD",
      paymentMethod: "Cash",
      status: "Failed",
      refundStatus: "No Refund",
      date: "15 Mar 2026, 09:05",
    },
  ],
  "Refund Management": [
    {
      id: "RF-51001",
      tripId: "TRP-11881",
      rider: "Youssef A.",
      riderAvatar: "",
      amount: "64.00",
      currency: "MAD",
      paymentMethod: "VISA",
      status: "Completed",
      refundStatus: "Refund Pending",
      date: "13 Mar 2026, 17:15",
    },
    {
      id: "RF-51002",
      tripId: "TRP-11867",
      rider: "Nora A.",
      riderAvatar: "",
      amount: "92.00",
      currency: "MAD",
      paymentMethod: "Mastercard",
      status: "Completed",
      refundStatus: "Refunded",
      date: "12 Mar 2026, 11:45",
    },
    {
      id: "RF-51003",
      tripId: "TRP-11852",
      rider: "Karim S.",
      riderAvatar: "",
      amount: "48.00",
      currency: "MAD",
      paymentMethod: "Cash",
      status: "Failed",
      refundStatus: "Under Review",
      date: "11 Mar 2026, 20:30",
    },
  ],
} as const;

function normalizePaymentStatus(status?: string) {
  const v = String(status || "").toUpperCase();
  if (v === "COMPLETED" || v === "SUCCESS" || v === "SUCCESSFUL")
    return "Completed";
  if (v === "FAILED" || v === "FAIL") return "Failed";
  if (v === "PENDING" || v === "IN_REVIEW") return "Pending";
  if (v === "CANCELLED" || v === "CANCELED") return "Cancelled";
  return status || "Pending";
}

function normalizeRefundStatus(status?: string) {
  const v = String(status || "").toUpperCase();
  if (v === "REFUNDED") return "Refunded";
  if (v === "REFUND_PENDING" || v === "PENDING_REFUND" || v === "PENDING")
    return "Refund Pending";
  if (v === "REFUND_FAILED" || v === "FAILED") return "Refund Failed";
  if (v === "UNDER_REVIEW" || v === "IN_REVIEW") return "Under Review";
  if (!v || v === "NONE" || v === "NO_REFUND") return "No Refund";
  return status || "No Refund";
}

function readPaymentOverrides(): Record<string, Record<string, string>> {
  try {
    const raw = localStorage.getItem(PAYMENT_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writePaymentOverrides(
  overrides: Record<string, Record<string, string>>,
) {
  try {
    localStorage.setItem(PAYMENT_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // Ignore storage failures and continue runtime behavior.
  }
}

function applyPaymentOverrides(tx: any) {
  const overrides = readPaymentOverrides();
  const key = String(tx.id);
  const override = overrides[key] || {};
  return {
    ...tx,
    ...override,
    status: normalizePaymentStatus(override.status || tx.status),
    refundStatus: normalizeRefundStatus(
      override.refundStatus || tx.refundStatus,
    ),
  };
}

function csvEscape(value: unknown) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/\"/g, '""')}"`;
  }
  return str;
}

// --- Helper Components ---

const StatusBadge = ({
  status,
  type,
}: {
  status: string;
  type: "payment" | "refund";
}) => {
  let bgColor = "#f3f4f6";
  let textColor = "#374151";

  if (type === "payment") {
    switch (status) {
      case "Completed":
        bgColor = "#eef7f0";
        textColor = "#2d8a46";
        break;
      case "Failed":
        bgColor = "#fee2e2";
        textColor = "#991b1b";
        break;
      case "Pending":
        bgColor = "#fef3c7";
        textColor = "#38AC57";
        break;
      case "Cancelled":
        bgColor = "#fef08a";
        textColor = "#2d8a46";
        break;
    }
  } else {
    switch (status) {
      case "Refunded":
        bgColor = "#eef7f0";
        textColor = "#2d8a46";
        break;
      case "Refund Failed":
        bgColor = "#fee2e2";
        textColor = "#991b1b";
        break;
      case "Refund Pending":
        bgColor = "#f3f4f6";
        textColor = "#4b5563";
        break;
      case "Under Review":
        bgColor = "#e0e7ff";
        textColor = "#3730a3";
        break;
      case "No Refund":
        bgColor = "white";
        textColor = "#374151";
        break;
    }
  }

  return (
    <span
      style={{
        backgroundColor: bgColor,
        color: textColor,
        padding: "0.4rem 0.8rem",
        borderRadius: "0.5rem",
        fontSize: "0.75rem",
        fontWeight: "600",
        display: "inline-block",
        minWidth: "80px",
        textAlign: "center",
        border: status === "No Refund" ? "1px solid #e5e7eb" : "none",
      }}
    >
      {status}
    </span>
  );
};

const PaymentIcon = ({ method }: { method: string }) => {
  if (method === "VISA")
    return (
      <img
        src={visaIcon}
        alt="VISA"
        style={{ width: "32px", height: "20px", objectFit: "contain" }}
      />
    );
  if (method === "Mastercard")
    return (
      <img
        src={mastercardIcon}
        alt="Mastercard"
        style={{ width: "32px", height: "32px", objectFit: "contain" }}
      />
    );
  if (method === "Hezzni Wallet")
    return (
      <img
        src={walletIcon}
        alt="Hezzni Wallet"
        style={{ width: "24px", height: "24px", objectFit: "contain" }}
      />
    );
  if (method === "Cash")
    return (
      <img
        src={cashIcon}
        alt="Cash"
        style={{ width: "24px", height: "24px", objectFit: "contain" }}
      />
    );
  return (
    <img
      src={totalTransactionsIcon}
      alt="Payment"
      style={{ width: "24px", height: "24px", objectFit: "contain" }}
    />
  );
};

const DropdownItem = ({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "0.5rem 1rem",
        cursor: "pointer",
        borderRadius: "0.5rem",
        fontWeight: isActive ? "bold" : "normal",
        backgroundColor: hovered
          ? "#f3f4f6"
          : isActive
            ? "#eef7f0"
            : "transparent",
        color: isActive ? "#2d8a46" : "#374151",
        fontSize: "0.85rem",
        transition: "background-color 0.15s",
      }}
    >
      {label}
    </div>
  );
};

const Dropdown = ({
  label,
  options,
  activeValue,
  onSelect,
}: {
  label: string;
  options: string[];
  activeValue: string;
  onSelect: (val: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div
      ref={dropdownRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "0.6rem 1rem",
          borderRadius: "2rem",
          border:
            activeValue !== "All" ? "1px solid #38AC57" : "1px solid #e5e7eb",
          backgroundColor: activeValue !== "All" ? "#eef7f0" : "white",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.85rem",
          color: activeValue !== "All" ? "#2d8a46" : "#374151",
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "all 0.2s",
        }}
      >
        {activeValue === "All" ? label : activeValue}
        <ChevronDown
          size={14}
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "120%",
            left: 0,
            minWidth: "180px",
            backgroundColor: "white",
            borderRadius: "1rem",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15)",
            padding: "0.5rem",
            zIndex: 50,
            border: "1px solid #e5e7eb",
          }}
        >
          <DropdownItem
            label="All"
            isActive={activeValue === "All"}
            onClick={() => {
              onSelect("All");
              setIsOpen(false);
            }}
          />
          {options.map((opt) => (
            <DropdownItem
              key={opt}
              label={opt}
              isActive={activeValue === opt}
              onClick={() => {
                onSelect(opt);
                setIsOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main Component ---

export const Payment = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [refundStatusFilter, setRefundStatusFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(true);
  const [activeView, setActiveView] = useState<
    "Trip Payments" | "Wallet Recharges" | "Refund Management"
  >("Trip Payments");
  const [activeStat, setActiveStat] = useState("All");

  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(
    null,
  );
  const [activeModal, setActiveModal] = useState<
    "details" | "history" | "refund" | null
  >(null);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const typeMap: Record<string, string> = {
        "Trip Payments": "TRIP",
        "Wallet Recharges": "WALLET",
        "Refund Management": "REFUND",
      };

      const params: any = {
        type: typeMap[activeView],
      };

      const res = await getAdminTransactionsApi(params);
      if (res.ok && res.data.transactions.length > 0) {
        setTransactions(
          res.data.transactions.map((tx: any) => ({
            ...applyPaymentOverrides({
              ...tx,
              status: normalizePaymentStatus(tx.status),
              refundStatus: normalizeRefundStatus(tx.refundStatus),
            }),
          })),
        );
      } else {
        setTransactions(
          [...FALLBACK_TRANSACTIONS[activeView]].map((tx) =>
            applyPaymentOverrides(tx),
          ),
        );
      }
    } catch (e) {
      console.error("Failed to fetch transactions:", e);
      setTransactions(
        [...FALLBACK_TRANSACTIONS[activeView]].map((tx) =>
          applyPaymentOverrides(tx),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [activeView]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Filter transactions in UI so cards + table always share the same source of truth.
  const baseFilteredTransactions = (transactions || []).filter((tx) => {
    if (
      searchTerm &&
      !String(tx.id || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) &&
      !String(tx.tripId || tx.accountId || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) &&
      !String(tx.rider || tx.passengerName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )
      return false;

    if (
      paymentMethodFilter !== "All" &&
      tx.paymentMethod !== paymentMethodFilter
    )
      return false;
    if (statusFilter !== "All" && tx.status !== statusFilter) return false;
    if (refundStatusFilter !== "All" && tx.refundStatus !== refundStatusFilter)
      return false;

    return true;
  });

  const stats = {
    total: baseFilteredTransactions.length,
    successful: baseFilteredTransactions.filter(
      (tx) => tx.status === "Completed",
    ).length,
    failed: baseFilteredTransactions.filter((tx) => tx.status === "Failed")
      .length,
    pendingRefunds: baseFilteredTransactions.filter(
      (tx) => tx.refundStatus === "Refund Pending",
    ).length,
  };

  const filteredTransactions = baseFilteredTransactions.filter((tx) => {
    if (activeStat === "Successful") return tx.status === "Completed";
    if (activeStat === "Failed") return tx.status === "Failed";
    if (activeStat === "Pending Refunds")
      return tx.refundStatus === "Refund Pending";
    return true;
  });

  const activeFilterCount = [
    paymentMethodFilter,
    statusFilter,
    refundStatusFilter,
  ].filter((f) => f !== "All").length;

  const clearAllFilters = () => {
    setPaymentMethodFilter("All");
    setStatusFilter("All");
    setRefundStatusFilter("All");
    setActiveStat("All");
    setSearchTerm("");
  };

  const handleViewTransaction = async (tx: any) => {
    try {
      const res = await getAdminTransactionDetailApi(tx.id);
      if (res.ok) {
        setSelectedTransaction(res.data);
      } else {
        setSelectedTransaction(tx);
      }
    } catch {
      setSelectedTransaction(tx);
    }
    setActiveModal("details");
  };

  const persistAndPatchTransaction = useCallback(
    (transactionId: string | number, patch: Record<string, string>) => {
      const id = String(transactionId);
      const existing = readPaymentOverrides();
      const next = {
        ...existing,
        [id]: {
          ...(existing[id] || {}),
          ...patch,
        },
      };
      writePaymentOverrides(next);

      setTransactions((prev) =>
        prev.map((tx) => {
          if (String(tx.id) !== id) return tx;
          return applyPaymentOverrides({ ...tx, ...patch });
        }),
      );

      setSelectedTransaction((prev: any) => {
        if (!prev || String(prev.id) !== id) return prev;
        return applyPaymentOverrides({ ...prev, ...patch });
      });
    },
    [],
  );

  const handleUpdateRefundStatus = useCallback(
    (transaction: any, refundStatus: string, adminNotes: string) => {
      persistAndPatchTransaction(transaction.id, {
        refundStatus,
        adminNotes,
      });
    },
    [persistAndPatchTransaction],
  );

  const handleProcessRefund = useCallback(
    (
      transaction: any,
      payload: {
        refundAmount: string;
        refundReason: string;
        refundStatus: string;
        adminNotes: string;
      },
    ) => {
      persistAndPatchTransaction(transaction.id, {
        refundStatus: "Refunded",
        refundAmount: payload.refundAmount,
        refundReason: payload.refundReason,
        adminNotes: payload.adminNotes,
      });
      setActiveModal(null);
    },
    [persistAndPatchTransaction],
  );

  const handleDownloadReceipt = useCallback((transaction: any) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("HEZZNI PAYMENT RECEIPT", 15, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const rows: Array<[string, string]> = [
      ["Transaction ID", String(transaction.id || "N/A")],
      [
        "Reference",
        String(
          transaction.transactionId ||
            transaction.tripId ||
            transaction.accountId ||
            "N/A",
        ),
      ],
      [
        "Customer",
        String(transaction.rider || transaction.passengerName || "N/A"),
      ],
      [
        "Amount",
        `${transaction.amount || "0"} ${transaction.currency || "MAD"}`,
      ],
      ["Method", String(transaction.paymentMethod || "N/A")],
      ["Payment Status", String(transaction.status || "N/A")],
      ["Refund Status", String(transaction.refundStatus || "No Refund")],
      ["Date", String(transaction.date || transaction.createdAt || "N/A")],
    ];

    let y = 35;
    rows.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, 15, y);
      doc.setFont("helvetica", "normal");
      const wrapped = doc.splitTextToSize(value, 130);
      doc.text(wrapped, 60, y);
      y += Math.max(8, wrapped.length * 6);
    });

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      15,
      Math.min(285, y + 8),
    );

    doc.save(`receipt-${transaction.id}.pdf`);
  }, []);

  const handleExportCsv = useCallback(() => {
    const headers = [
      "Transaction ID",
      "Reference",
      "Customer",
      "Amount",
      "Currency",
      "Payment Method",
      "Status",
      "Refund Status",
      "Date",
    ];

    const rows = filteredTransactions.map((tx) => [
      tx.id,
      tx.tripId || tx.accountId || tx.transactionId || "",
      tx.rider || tx.passengerName || "",
      tx.amount,
      tx.currency || "MAD",
      tx.paymentMethod,
      tx.status,
      tx.refundStatus || "No Refund",
      tx.date || tx.createdAt || "",
    ]);

    const content = [headers, ...rows]
      .map((row) => row.map((cell) => csvEscape(cell)).join(","))
      .join("\n");

    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeView.toLowerCase().replace(/\s+/g, "-")}-transactions.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [activeView, filteredTransactions]);

  const handleExportExcel = useCallback(() => {
    const headers = [
      "Transaction ID",
      "Reference",
      "Customer",
      "Amount",
      "Currency",
      "Payment Method",
      "Status",
      "Refund Status",
      "Date",
    ];

    const bodyRows = filteredTransactions
      .map(
        (tx) =>
          `<tr>${[
            tx.id,
            tx.tripId || tx.accountId || tx.transactionId || "",
            tx.rider || tx.passengerName || "",
            tx.amount,
            tx.currency || "MAD",
            tx.paymentMethod,
            tx.status,
            tx.refundStatus || "No Refund",
            tx.date || tx.createdAt || "",
          ]
            .map((cell) => `<td>${String(cell ?? "")}</td>`)
            .join("")}</tr>`,
      )
      .join("");

    const html = `
      <html>
        <head><meta charset="utf-8" /></head>
        <body>
          <table border="1">
            <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeView.toLowerCase().replace(/\s+/g, "-")}-transactions.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [activeView, filteredTransactions]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
        paddingBottom: "4rem",
      }}
    >
      <style>{`
                .pay-header-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .pay-export-buttons {
                    display: flex;
                    gap: 1rem;
                }
                .pay-tabs-container {
                    display: flex;
                    backgroundColor: #f3f4f6;
                    padding: 0.3rem;
                    borderRadius: 2rem;
                    width: fit-content;
                }
                .pay-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1.5rem;
                }
                .pay-controls-container {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }
                .pay-table-container {
                    width: 100%;
                    overflow-x: auto;
                    border-radius: 12px;
                }
                .pay-table-header, .pay-table-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr 2fr 1.2fr 1.6fr 1.3fr 1.6fr 1.2fr 100px;
                    min-width: 1150px;
                    align-items: center;
                }
                .pay-table-header {
                    background-color: #38AC57;
                    color: white;
                    padding: 1rem;
                    border-radius: 1rem;
                    font-weight: bold;
                    font-size: 0.85rem;
                    margin-bottom: 1rem;
                }
                .pay-table-row {
                    background-color: white;
                    padding: 1.2rem 1rem;
                    border-radius: 1.2rem;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
                    font-size: 0.9rem;
                    margin-bottom: 0.5rem;
                }
                .pay-search-wrapper {
                    position: relative;
                    width: 250px;
                    flex-shrink: 0;
                }

                @media (max-width: 1024px) {
                    .pay-stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 768px) {
                    .pay-header-container {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 1.5rem;
                        text-align: center;
                    }
                    .pay-export-buttons {
                        justify-content: center;
                    }
                    .pay-tabs-container {
                        width: 100%;
                        flex-wrap: wrap;
                        justify-content: center;
                    }
                    .pay-tabs-container button {
                        flex: 1;
                        min-width: 120px;
                        padding: 0.6rem 1rem !important;
                    }
                    .pay-controls-container {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .pay-search-wrapper {
                        width: 100%;
                    }
                    .pay-controls-container > button {
                        width: 100%;
                        justify-content: space-between;
                    }
                    .pay-dropdown-group {
                        display: flex;
                        flex-direction: column;
                        gap: 0.75rem;
                    }
                    .pay-dropdown-group > div {
                        width: 100% !important;
                    }
                    .pay-dropdown-group button {
                        width: 100% !important;
                        justify-content: space-between;
                    }
                }

                @media (max-width: 480px) {
                    .pay-stats-grid {
                        grid-template-columns: 1fr;
                    }
                    .pay-export-buttons {
                        flex-direction: column;
                    }
                }
            `}</style>

      {/* Header */}
      <div className="pay-header-container">
        <div>
          <h1
            style={{
              fontSize: "1.8rem",
              fontWeight: "bold",
              margin: "0 0 0.5rem 0",
            }}
          >
            Payments & Refunds
          </h1>
          <p style={{ color: "#6b7280", margin: 0 }}>
            Monitor payment transactions, wallet recharges, and manage refunds
          </p>
        </div>
        <div className="pay-export-buttons">
          <button
            onClick={handleExportCsv}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 1.2rem",
              borderRadius: "2rem",
              backgroundColor: "#38AC57",
              color: "white",
              border: "none",
              fontWeight: "600",
              cursor: "pointer",
              justifyContent: "center",
            }}
          >
            <Download size={18} /> Export CSV
          </button>
          <button
            onClick={handleExportExcel}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 1.2rem",
              borderRadius: "2rem",
              backgroundColor: "white",
              color: "#374151",
              border: "1px solid #e5e7eb",
              fontWeight: "600",
              cursor: "pointer",
              justifyContent: "center",
            }}
          >
            Export Excel
          </button>
        </div>
      </div>

      {/* Sub-Nav / Tabs */}
      <div className="pay-tabs-container">
        {(
          ["Trip Payments", "Wallet Recharges", "Refund Management"] as const
        ).map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            style={{
              padding: "0.6rem 2rem",
              borderRadius: "2rem",
              border: "none",
              backgroundColor: activeView === view ? "#38AC57" : "transparent",
              color: activeView === view ? "white" : "#6b7280",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            {view}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="pay-stats-grid">
        {[
          {
            id: "All",
            label: "Total Transactions",
            count: String(stats.total).padStart(4, "0"),
            icon: totalTransactionsIcon,
          },
          {
            id: "Successful",
            label: "Successful",
            count: String(stats.successful).padStart(4, "0"),
            icon: successfulPaymentsIcon,
          },
          {
            id: "Failed",
            label: "Failed",
            count: String(stats.failed).padStart(4, "0"),
            icon: failedPaymentsIcon,
          },
          {
            id: "Pending Refunds",
            label: "Pending Refunds",
            count: String(stats.pendingRefunds).padStart(4, "0"),
            icon: pendingRefundsIcon,
          },
        ].map((stat) => {
          const isActive = activeStat === stat.id;
          return (
            <div
              key={stat.id}
              onClick={() => setActiveStat(isActive ? "All" : stat.id)}
              className="card"
              style={{
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                height: "140px",
                backgroundColor: isActive ? "#38AC57" : "white",
                color: isActive ? "white" : "inherit",
                cursor: "pointer",
                transition: "all 0.2s",
                transform: isActive ? "translateY(-4px)" : "none",
                boxShadow: isActive
                  ? "0 10px 15px -3px rgba(56, 172, 87, 0.3)"
                  : "var(--shadow-sm)",
                width: "auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: isActive ? "white" : "#6b7280",
                  fontWeight: "600",
                }}
              >
                <img
                  src={stat.icon}
                  alt=""
                  style={{
                    width: "32px",
                    height: "32px",
                    objectFit: "contain",
                  }}
                />{" "}
                {stat.label}
              </div>
              <div style={{ fontSize: "2.5rem", fontWeight: "bold" }}>
                {stat.count}
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    display: "inline-flex",
                    padding: "0.3rem",
                    borderRadius: "50%",
                    backgroundColor: isActive ? "black" : "#38AC57",
                    color: "white",
                  }}
                >
                  <ArrowUpRight size={16} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div className="pay-controls-container">
          <div className="pay-search-wrapper">
            <Search
              size={18}
              color="#2d8a46"
              style={{
                position: "absolute",
                left: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 1,
              }}
            />
            <input
              type="text"
              placeholder="Search transaction..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "0.7rem 1rem 0.7rem 2.8rem",
                borderRadius: "2rem",
                border: "1px solid #e5e7eb",
                outline: "none",
                fontSize: "0.85rem",
                color: "#1f2937",
                backgroundColor: "white",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: "2rem",
              border:
                activeFilterCount > 0
                  ? "1px solid #38AC57"
                  : "1px solid #e5e7eb",
              backgroundColor:
                activeFilterCount > 0
                  ? "#eef7f0"
                  : showFilters
                    ? "#f3f4f6"
                    : "white",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.85rem",
              color: activeFilterCount > 0 ? "#2d8a46" : "#374151",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "all 0.2s",
              justifyContent: "center",
            }}
          >
            <Filter size={14} /> Filters
            {activeFilterCount > 0 && (
              <span
                style={{
                  backgroundColor: "#38AC57",
                  color: "white",
                  borderRadius: "50%",
                  width: 20,
                  height: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.7rem",
                  fontWeight: "bold",
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
          {showFilters && (
            <div
              className="pay-dropdown-group"
              style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}
            >
              <Dropdown
                label="Payment Method"
                options={["VISA", "Mastercard", "Hezzni Wallet", "Cash"]}
                activeValue={paymentMethodFilter}
                onSelect={setPaymentMethodFilter}
              />
              <Dropdown
                label="Status"
                options={["Completed", "Failed", "Cancelled"]}
                activeValue={statusFilter}
                onSelect={setStatusFilter}
              />
              <Dropdown
                label="Refund Status"
                options={[
                  "No Refund",
                  "Refunded",
                  "Refund Pending",
                  "Refund Failed",
                  "Under Review",
                ]}
                activeValue={refundStatusFilter}
                onSelect={setRefundStatusFilter}
              />
            </div>
          )}
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "2rem",
                border: "none",
                backgroundColor: "#fee2e2",
                color: "#b91c1c",
                fontSize: "0.8rem",
                fontWeight: "600",
                cursor: "pointer",
                whiteSpace: "nowrap",
                justifyContent: "center",
              }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="pay-table-container">
        <div className="pay-table-header">
          <div>Transaction ID</div>
          <div>{activeView === "Trip Payments" ? "Trip ID" : "Account ID"}</div>
          <div>{activeView === "Trip Payments" ? "Rider" : "User"}</div>
          <div>Amount</div>
          <div>Method</div>
          <div>Status</div>
          <div>Refund</div>
          <div>Date</div>
          <div style={{ textAlign: "right" }}>Actions</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            minWidth: "1150px",
          }}
        >
          {(loading ? [] : filteredTransactions).map((tx) => (
            <div key={tx.id} className="pay-table-row">
              <div style={{ fontWeight: "bold", color: "#374151" }}>
                {tx.id}
              </div>
              <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>
                {tx.tripId || tx.accountId || "—"}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <UserAvatar
                  src={tx.riderAvatar || tx.passengerAvatar}
                  name={tx.rider || tx.passengerName}
                  size={32}
                />
                <span style={{ fontWeight: "500" }}>
                  {tx.rider || tx.passengerName}
                </span>
              </div>
              <div style={{ fontWeight: "bold", color: "#38AC57" }}>
                {tx.amount} {tx.currency || "MAD"}
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <PaymentIcon method={tx.paymentMethod} />
                <span>{tx.paymentMethod}</span>
              </div>
              <div>
                <StatusBadge status={tx.status} type="payment" />
              </div>
              <div>
                <StatusBadge
                  status={tx.refundStatus || "No Refund"}
                  type="refund"
                />
              </div>
              <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>
                {tx.date || tx.createdAt}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  onClick={() => handleViewTransaction(tx)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#38AC57",
                    cursor: "pointer",
                    padding: "0.4rem",
                    borderRadius: "0.4rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#eef7f0",
                  }}
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => {
                    setSelectedTransaction(tx);
                    setActiveModal("history");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#6b7280",
                    cursor: "pointer",
                    padding: "0.4rem",
                    borderRadius: "0.4rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#f3f4f6",
                  }}
                >
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
          ))}

          {!loading && filteredTransactions.length === 0 && (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                color: "#6b7280",
                backgroundColor: "white",
                borderRadius: "1rem",
              }}
            >
              No {activeView.toLowerCase()} found
            </div>
          )}

          {loading && (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                color: "#6b7280",
                backgroundColor: "white",
                borderRadius: "1rem",
              }}
            >
              Loading transactions...
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {activeModal === "details" && selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          onClose={() => setActiveModal(null)}
          onProcessRefund={() => setActiveModal("refund")}
          onViewHistory={() => setActiveModal("history")}
          onDownloadReceipt={handleDownloadReceipt}
        />
      )}

      {activeModal === "history" && selectedTransaction && (
        <TransactionHistoryModal
          transaction={selectedTransaction}
          onClose={() => setActiveModal(null)}
          onProcessRefund={() => setActiveModal("refund")}
          onBack={() => setActiveModal("details")}
          onDownloadReceipt={handleDownloadReceipt}
        />
      )}

      {activeModal === "refund" && selectedTransaction && (
        <ProcessRefundModal
          transaction={selectedTransaction}
          onClose={() => setActiveModal(null)}
          onBack={() => setActiveModal("details")}
          onUpdateRefundStatus={handleUpdateRefundStatus}
          onProcessRefundAction={handleProcessRefund}
          onDownloadReceipt={handleDownloadReceipt}
        />
      )}
    </div>
  );
};
