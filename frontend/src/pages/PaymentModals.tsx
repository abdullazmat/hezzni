import { ArrowLeft, X } from "lucide-react";
import { UserAvatar } from "../components/UserAvatar";

// Specialized Icons
import mastercardIcon from "../assets/icons/mastercard.png";
import visaIcon from "../assets/icons/visa.png";
import cashIcon from "../assets/icons/cash.png";
import walletIcon from "../assets/icons/hezzni wallet.png";
import cashplusIcon from "../assets/icons/cashplus.png";
import wafacashIcon from "../assets/icons/wafacash.png";

const PaymentMethodInfo = ({ method }: { method: string }) => {
  let icon = visaIcon;
  let width = "32px";
  let height = "20px";

  if (method === "Mastercard") {
    icon = mastercardIcon;
    height = "32px";
  } else if (method === "Hezzni Wallet") {
    icon = walletIcon;
    height = "24px";
    width = "24px";
  } else if (method === "Cash") {
    icon = cashIcon;
    height = "24px";
    width = "24px";
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <img
        src={icon}
        alt={method}
        style={{ width, height, objectFit: "contain" }}
      />
      <span style={{ fontWeight: "700", fontSize: "0.9rem", color: "#111827" }}>
        {method}
      </span>
    </div>
  );
};

interface ModalProps {
  onClose: () => void;
  transaction: any;
  onProcessRefund?: () => void;
  onViewHistory?: () => void;
  onBack?: () => void;
}

// --- Responsive Styles ---
const ModalStyles = () => (
  <style>{`
        .pmo-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0,0,0,0.4);
            backdrop-filter: blur(4px);
            z-index: 1100;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: 20px;
            overflow-y: auto;
        }
        .pmo-modal-content {
            background-color: white;
            border-radius: 1.5rem;
            width: 100%;
            position: relative;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
            margin-top: 2rem;
            margin-bottom: 2rem;
        }
        .pmo-info-grid-4 {
            display: grid;
            grid-template-columns: 1.2fr 1fr 0.8fr 1fr;
            gap: 1rem;
        }
        .pmo-info-grid-3 {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5rem;
        }
        .pmo-footer-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
        }
        .pmo-history-user-info {
            display: flex;
            gap: 1.5rem;
            background-color: #f9fafb;
            padding: 1.5rem;
            border-radius: 1rem;
        }
        .pmo-user-details-grid {
            flex: 1;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 1rem;
        }

        @media (max-width: 768px) {
            .pmo-modal-content {
                padding: 1.5rem !important;
                margin-top: 1rem;
                margin-bottom: 1rem;
            }
            .pmo-info-grid-4, .pmo-info-grid-3, .pmo-user-details-grid {
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
            }
            .pmo-footer-actions, .pmo-history-user-info {
                flex-direction: column;
                align-items: stretch;
            }
            .pmo-info-item {
                margin-bottom: 0.5rem;
            }
            .pmo-history-user-info {
                align-items: center;
                text-align: center;
            }
            .pmo-refund-grid-special {
                grid-template-columns: 1fr !important;
            }
        }

        @media (max-width: 480px) {
            .pmo-info-grid-4, .pmo-info-grid-3, .pmo-user-details-grid {
                grid-template-columns: 1fr;
            }
        }
    `}</style>
);

const ModalOverlay = ({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) => (
  <div
    className="pmo-modal-overlay"
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <ModalStyles />
    {children}
  </div>
);

const InfoItem = ({
  label,
  value,
  isStatus,
}: {
  label: string;
  value: string | React.ReactNode;
  isStatus?: boolean;
}) => (
  <div className="pmo-info-item" style={{ marginBottom: "1rem" }}>
    <div
      style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}
    >
      {label}
    </div>
    {isStatus ? (
      <div
        style={{
          backgroundColor: "#eef7f0",
          color: "#2d8a46",
          padding: "0.2rem 0.6rem",
          borderRadius: "0.4rem",
          fontSize: "0.75rem",
          fontWeight: "bold",
          display: "inline-block",
        }}
      >
        {value}
      </div>
    ) : (
      <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "#111827" }}>
        {value}
      </div>
    )}
  </div>
);

// --- Transaction Details Modal ---
export const TransactionDetailsModal = ({
  onClose,
  transaction,
  onProcessRefund,
  onViewHistory,
}: ModalProps) => {
  return (
    <ModalOverlay onClose={onClose}>
      <div
        className="pmo-modal-content"
        style={{ maxWidth: "640px", padding: "2rem" }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            right: "1.5rem",
            top: "1.5rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            zIndex: 10,
          }}
        >
          <X size={24} color="#111827" strokeWidth={3} />
        </button>

        <h2
          style={{
            fontSize: "1.4rem",
            fontWeight: "800",
            margin: "0 0 0.25rem 0",
            paddingRight: "40px",
          }}
        >
          Transaction Details - {transaction.id}
        </h2>
        <p
          style={{
            color: "#6b7280",
            margin: "0 0 1.5rem 0",
            fontSize: "0.9rem",
          }}
        >
          Review payment transaction details and manage refunds.
        </p>

        <div
          className="pmo-info-grid-4"
          style={{
            backgroundColor: "#f9fafb",
            padding: "1.5rem",
            borderRadius: "1rem",
            marginBottom: "2rem",
          }}
        >
          <InfoItem label="Transaction ID" value={transaction.id} />
          <InfoItem label="Rider" value={transaction.rider} />
          <InfoItem label="Trip ID" value={transaction.tripId} />
          <InfoItem
            label="Amount"
            value={`${transaction.amount.replace(" MAD", "")}.00 MAD`}
          />

          <InfoItem
            label="Payment Method"
            value={<PaymentMethodInfo method={transaction.paymentMethod} />}
          />
          <InfoItem label="Date" value={transaction.date} />
          <InfoItem
            label="Current Status"
            value={
              transaction.status === "Completed"
                ? "Complete"
                : transaction.status
            }
            isStatus
          />
          <InfoItem label="Phone" value="+212 6 12 34 56" />
        </div>

        <div className="pmo-footer-actions">
          <button
            onClick={onViewHistory}
            style={{
              flex: 1,
              padding: "0.85rem",
              borderRadius: "2rem",
              border: "1px solid #e5e7eb",
              backgroundColor: "white",
              fontWeight: "700",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Transaction History
          </button>
          <button
            onClick={onProcessRefund}
            style={{
              flex: 1,
              padding: "0.85rem",
              borderRadius: "2rem",
              border: "1px solid #e5e7eb",
              backgroundColor: "white",
              fontWeight: "700",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Process Refund
          </button>
          <button
            style={{
              flex: 1,
              padding: "0.85rem",
              borderRadius: "2rem",
              border: "none",
              backgroundColor: "#38AC57",
              color: "white",
              fontWeight: "700",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Download Receipt
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
};

// --- Transaction History Modal ---
export const TransactionHistoryModal = ({
  onClose,
  transaction,
  onProcessRefund,
}: ModalProps) => {
  const historyItems = [
    {
      method: "Mastercard",
      last4: "4532",
      date: "03 Jun, 2025 at 12:00 PM",
      amount: "+ 55.66 MAD",
      icon: mastercardIcon,
    },
    {
      method: "Visa Card",
      last4: "4532",
      date: "03 Jun, 2025 at 12:00 PM",
      amount: "+ 55.66 MAD",
      icon: visaIcon,
    },
    {
      method: "Cashplus",
      last4: "",
      date: "03 Jun, 2025 at 12:00 PM",
      amount: "+ 55.66 MAD",
      icon: cashplusIcon,
    },
    {
      method: "Wafacash",
      last4: "",
      date: "03 Jun, 2025 at 12:00 PM",
      amount: "+ 55.66 MAD",
      icon: wafacashIcon,
    },
  ];

  return (
    <ModalOverlay onClose={onClose}>
      <div
        className="pmo-modal-content"
        style={{
          maxWidth: "640px",
          padding: "0",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            right: "1.5rem",
            top: "1.5rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            zIndex: 10,
          }}
        >
          <X size={24} color="#111827" strokeWidth={3} />
        </button>

        {/* Scrollable Body */}
        <div style={{ padding: "2rem", overflowY: "auto", flex: 1 }}>
          <h2
            style={{
              fontSize: "1.4rem",
              fontWeight: "800",
              margin: "0 0 1.5rem 0",
              paddingRight: "40px",
            }}
          >
            Transaction History
          </h2>

          <h3
            style={{
              fontSize: "1rem",
              fontWeight: "700",
              margin: "0 0 1rem 0",
            }}
          >
            User Information
          </h3>

          <div
            className="pmo-history-user-info"
            style={{ marginBottom: "1.5rem" }}
          >
            <div style={{ position: "relative", flexShrink: 0 }}>
              <UserAvatar
                src={transaction.riderAvatar}
                name={transaction.rider}
                size={64}
                rating={4.8}
              />
            </div>
            <div className="pmo-user-details-grid">
              <div>
                <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                  Full Name
                </div>
                <div style={{ fontWeight: "700", fontSize: "0.85rem" }}>
                  {transaction.rider}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                  Phone
                </div>
                <div style={{ fontWeight: "700", fontSize: "0.85rem" }}>
                  +212 6 12 34 56
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                  Account ID
                </div>
                <div style={{ fontWeight: "700", fontSize: "0.85rem" }}>
                  R-00045
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                  User Type
                </div>
                <div style={{ fontWeight: "700", fontSize: "0.85rem" }}>
                  Driver
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>City</div>
                <div style={{ fontWeight: "700", fontSize: "0.85rem" }}>
                  Casablanca
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                  Email
                </div>
                <div
                  style={{
                    fontWeight: "700",
                    fontSize: "0.85rem",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "200px",
                  }}
                >
                  Mohamedalaoui@email.com
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundImage:
                "radial-gradient(circle at top right, rgba(255,255,255,0.2) 0%, transparent 60%), linear-gradient(135deg, #38AC57 0%, #38AC57 100%)",
              padding: "1.5rem",
              borderRadius: "1rem",
              color: "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
              position: "relative",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  padding: "0.25rem 0.6rem",
                  borderRadius: "0.5rem",
                  fontSize: "0.7rem",
                  fontWeight: "bold",
                  marginBottom: "0.5rem",
                }}
              >
                <ArrowLeft size={10} style={{ transform: "rotate(90deg)" }} />{" "}
                Top up
              </div>
              <div
                style={{ fontSize: "0.85rem", fontWeight: "500", opacity: 0.9 }}
              >
                Wallet Balance
              </div>
              <div
                style={{
                  fontSize: "1.8rem",
                  fontWeight: "800",
                  margin: "0.25rem 0",
                }}
              >
                55.66 MAD
              </div>
              <div
                style={{
                  fontSize: "0.65rem",
                  opacity: 0.8,
                  maxWidth: "240px",
                  lineHeight: "1.4",
                }}
              >
                Virtual balance is non-redeemable and can only be used for
                Hezzni services.
              </div>
            </div>
            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.15)",
                width: "80px",
                height: "80px",
                borderRadius: "1.2rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(4px)",
              }}
            >
              <img
                src={walletIcon}
                alt="Wallet"
                style={{
                  width: "40px",
                  height: "40px",
                  objectFit: "contain",
                  filter: "brightness(0) invert(1)",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            {historyItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: "1rem 1.2rem",
                  borderRadius: "1rem",
                  backgroundColor: "white",
                  border: "1px solid #f3f4f6",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "1rem" }}
                >
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "0.6rem",
                      backgroundColor: "#eef7f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0.4rem",
                    }}
                  >
                    <img
                      src={item.icon}
                      alt={item.method}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: "800",
                        fontSize: "0.9rem",
                        color: "#111827",
                      }}
                    >
                      Wallet Top-Up
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#6b7280",
                        fontWeight: "500",
                      }}
                    >
                      via {item.method} {item.last4 && `**** ${item.last4}`}
                    </div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "#9ca3af",
                        marginTop: "1px",
                      }}
                    >
                      {item.date}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    color: "#38AC57",
                    fontWeight: "800",
                    fontSize: "1rem",
                  }}
                >
                  {item.amount}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fixed Footer */}
        <div
          className="pmo-footer-actions"
          style={{
            padding: "1.5rem",
            borderTop: "1px solid #f3f4f6",
            backgroundColor: "white",
          }}
        >
          <button
            style={{
              flex: 1,
              padding: "0.85rem",
              borderRadius: "2rem",
              border: "1px solid #e5e7eb",
              backgroundColor: "white",
              fontWeight: "700",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Transaction History
          </button>
          <button
            onClick={onProcessRefund}
            style={{
              flex: 1,
              padding: "0.85rem",
              borderRadius: "2rem",
              border: "1px solid #e5e7eb",
              backgroundColor: "white",
              fontWeight: "700",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Process Refund
          </button>
          <button
            style={{
              flex: 1,
              padding: "0.85rem",
              borderRadius: "2rem",
              border: "none",
              backgroundColor: "#38AC57",
              color: "white",
              fontWeight: "700",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Download Receipt
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
};

// --- Process Refund Modal ---
export const ProcessRefundModal = ({ onClose, transaction }: ModalProps) => {
  return (
    <ModalOverlay onClose={onClose}>
      <div
        className="pmo-modal-content"
        style={{ maxWidth: "720px", padding: "2rem" }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            right: "1.5rem",
            top: "1.5rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            zIndex: 10,
          }}
        >
          <X size={24} color="#111827" strokeWidth={3} />
        </button>

        <h2
          style={{
            fontSize: "1.4rem",
            fontWeight: "800",
            margin: "0 0 0.25rem 0",
            paddingRight: "40px",
          }}
        >
          Process Refund
        </h2>
        <p
          style={{
            color: "#6b7280",
            margin: "0 0 1.5rem 0",
            fontSize: "0.9rem",
          }}
        >
          Process refund for payment {transaction.id}
        </p>

        <div
          className="pmo-info-grid-3"
          style={{
            backgroundColor: "#f9fafb",
            padding: "1.5rem",
            borderRadius: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                marginBottom: "0.25rem",
              }}
            >
              Payment ID:
            </div>
            <div style={{ fontWeight: "700", fontSize: "0.9rem" }}>PAY001</div>
          </div>
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                marginBottom: "0.25rem",
              }}
            >
              Customer:
            </div>
            <div style={{ fontWeight: "700", fontSize: "0.9rem" }}>
              Nadia Lahlou
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                marginBottom: "0.25rem",
              }}
            >
              Original Amount:
            </div>
            <div style={{ fontWeight: "700", fontSize: "0.9rem" }}>
              75.50 MAD
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                marginBottom: "0.25rem",
              }}
            >
              Payment Method:
            </div>
            <PaymentMethodInfo method={transaction.paymentMethod} />
          </div>
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                marginBottom: "0.25rem",
              }}
            >
              Transaction Date & Time:
            </div>
            <div style={{ fontWeight: "700", fontSize: "0.9rem" }}>
              2025-01-10 09:30
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                marginBottom: "0.25rem",
              }}
            >
              Phone:
            </div>
            <div style={{ fontWeight: "700", fontSize: "0.9rem" }}>
              +212 6 12 34 56
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                marginBottom: "0.25rem",
              }}
            >
              Account Name:
            </div>
            <div style={{ fontWeight: "700", fontSize: "0.9rem" }}>Youssef</div>
          </div>
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                marginBottom: "0.25rem",
              }}
            >
              IBAN:
            </div>
            <div style={{ fontWeight: "700", fontSize: "0.9rem" }}>
              8921 8921 8921
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                marginBottom: "0.25rem",
              }}
            >
              Bank Code (optional):
            </div>
            <div style={{ fontWeight: "700", fontSize: "0.9rem" }}>
              BCMAMAMC
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                marginBottom: "0.25rem",
              }}
            >
              Transaction ID:
            </div>
            <div
              style={{
                fontWeight: "700",
                fontSize: "0.85rem",
                color: "#6b7280",
              }}
            >
              TXN_1751555882063
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                marginBottom: "0.25rem",
              }}
            >
              Transaction Date & Time:
            </div>
            <div
              style={{
                fontWeight: "700",
                fontSize: "0.85rem",
                color: "#6b7280",
              }}
            >
              03 Jun, 2025 · 01:01 AM
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                marginBottom: "0.25rem",
              }}
            >
              Status:
            </div>
            <div
              style={{
                backgroundColor: "#fee2e2",
                color: "#ef4444",
                padding: "0.2rem 0.6rem",
                borderRadius: "0.4rem",
                fontSize: "0.7rem",
                fontWeight: "bold",
                display: "inline-block",
              }}
            >
              Expired
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#fffbeb",
            border: "1px solid #fef3c7",
            borderRadius: "0.75rem",
            padding: "1rem",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              fontWeight: "700",
              fontSize: "0.9rem",
              color: "#92400e",
              marginBottom: "0.25rem",
            }}
          >
            Refund Eligibility Notice
          </div>
          <div style={{ fontSize: "0.8rem", color: "#92400e", opacity: 0.8 }}>
            Cash refunds require driver confirmation and manual processing
            before approval.
          </div>
        </div>

        <div
          className="pmo-info-grid-3 pmo-refund-grid-special"
          style={{
            gridTemplateColumns: "1.5fr 1fr 1fr",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.9rem",
                fontWeight: "700",
                marginBottom: "0.5rem",
              }}
            >
              Refund Amount
            </label>
            <input
              type="text"
              placeholder="Type Here"
              style={{
                width: "100%",
                padding: "0.85rem",
                borderRadius: "0.75rem",
                border: "1px solid #e5e7eb",
                backgroundColor: "#f9fafb",
                fontSize: "0.9rem",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.9rem",
                fontWeight: "700",
                marginBottom: "0.5rem",
              }}
            >
              Refund Reason
            </label>
            <select
              style={{
                width: "100%",
                padding: "0.85rem",
                borderRadius: "0.75rem",
                border: "1px solid #e5e7eb",
                backgroundColor: "#f9fafb",
                fontSize: "0.9rem",
                appearance: "none",
              }}
            >
              <option>Other</option>
            </select>
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.9rem",
                fontWeight: "700",
                marginBottom: "0.5rem",
              }}
            >
              Status
            </label>
            <select
              style={{
                width: "100%",
                padding: "0.85rem",
                borderRadius: "0.75rem",
                border: "1px solid #e5e7eb",
                backgroundColor: "#f9fafb",
                fontSize: "0.9rem",
                appearance: "none",
              }}
            >
              <option>Active</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.9rem",
              fontWeight: "700",
              marginBottom: "0.5rem",
            }}
          >
            Admin Notes
          </label>
          <textarea
            placeholder="Type Here"
            style={{
              width: "100%",
              padding: "1rem",
              borderRadius: "1rem",
              border: "1px solid #e5e7eb",
              backgroundColor: "#f9fafb",
              fontSize: "0.9rem",
              minHeight: "100px",
              resize: "none",
              fontFamily: "inherit",
            }}
          />
        </div>

        <div className="pmo-footer-actions">
          <button
            style={{
              flex: 1,
              padding: "1rem",
              borderRadius: "2rem",
              border: "1px solid #e5e7eb",
              backgroundColor: "white",
              fontWeight: "700",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Update Status
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "1rem",
              borderRadius: "2rem",
              border: "none",
              backgroundColor: "black",
              color: "white",
              fontWeight: "700",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Process Refund
          </button>
          <button
            style={{
              flex: 1,
              padding: "1rem",
              borderRadius: "2rem",
              border: "none",
              backgroundColor: "#38AC57",
              color: "white",
              fontWeight: "700",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Download Receipt
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
};
