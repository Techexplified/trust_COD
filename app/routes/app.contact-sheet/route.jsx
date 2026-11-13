import { useState, useMemo } from "react";
import { Link } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

const INITIAL_ORDERS = [
  { id: "#1048", phone: "+91 98765 43210", risk: "High", reason: "Incomplete address", status: "Waiting for a call", outcome: null },
  { id: "#1047", phone: "+91 91234 56789", risk: "High", reason: "Repeat orders from same phone", status: "Waiting for a call", outcome: null },
  { id: "#1046", phone: "+91 99887 66554", risk: "High", reason: "New customer, no history", status: "Waiting for a call", outcome: null },
  { id: "#1045", phone: "+91 77654 32109", risk: "Medium", reason: "COD refused previously", status: "Waiting for a call", outcome: null },
  { id: "#1044", phone: "+91 88990 12345", risk: "High", reason: "Wrong or incomplete address", status: "Waiting for a call", outcome: null },
  { id: "#1043", phone: "+91 90123 45678", risk: "Medium", reason: "Multiple failed COD orders", status: "Waiting for a call", outcome: null },
  { id: "#1042", phone: "+91 98712 34567", risk: "Medium", reason: "Suspicious pattern", status: "Waiting for a call", outcome: null },
  { id: "#1041", phone: "+91 91234 09876", risk: "High", reason: "Unreachable customer", status: "Waiting for a call", outcome: null },
  { id: "#1040", phone: "+91 99876 54321", risk: "Medium", reason: "New customer, high value", status: "Waiting for a call", outcome: null },
  { id: "#1039", phone: "+91 88766 55443", risk: "High", reason: "Repeated address", status: "Waiting for a call", outcome: null },
];

export default function ContactSheet() {
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [riskFilter, setRiskFilter] = useState("all"); // "all" | "high" | "medium"
  const [statusFilter, setStatusFilter] = useState("Waiting for a call"); // "All statuses" | "Waiting for a call" | "Confirmed" | "Cancelled" | "Unreachable"
  const [openStatusMenu, setOpenStatusMenu] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [activePage, setActivePage] = useState(1);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Risk filter
      if (riskFilter === "high" && order.risk !== "High") return false;
      if (riskFilter === "medium" && order.risk !== "Medium") return false;

      // Status filter
      if (statusFilter !== "All statuses" && order.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [orders, riskFilter, statusFilter]);

  const handleSelectOutcome = (orderId, outcome) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          let newStatus = order.status;
          if (outcome === "Confirmed") newStatus = "Confirmed";
          else if (outcome === "Cancelled") newStatus = "Cancelled";
          else if (outcome === "Unreachable") newStatus = "Unreachable";
          else if (outcome === "Mark safe") newStatus = "Confirmed";

          return {
            ...order,
            outcome,
            status: newStatus,
          };
        }
        return order;
      })
    );
    setOpenDropdownId(null);
  };

  const handleDownloadCSV = () => {
    const headers = ["Order,Customer phone,Risk,Reason,Status,Outcome\n"];
    const rows = orders.map(
      (o) => `"${o.id}","${o.phone}","${o.risk}","${o.reason}","${o.status}","${o.outcome || ""}"\n`
    );
    const blob = new Blob([...headers, ...rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "trust-cod-contact-sheet.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <s-page heading="Trust COD">
      <div className={styles.container}>
        {/* Back navigation */}
        <Link
          to="/app"
          className={styles.backArrow}
          aria-label="Back to dashboard"
          title="Back to dashboard"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M5 12L12 19M5 12L12 5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        {/* Header Row */}
        <div className={styles.headerRow}>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Contact sheet</h1>
            <p className={styles.subtitle}>
              High and medium risk COD orders to confirm before shipping.
            </p>
          </div>

          <button
            type="button"
            className={styles.btnDownload}
            onClick={handleDownloadCSV}
            title="Download CSV"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7 10L12 15L17 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 15V3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Download sheet</span>
          </button>
        </div>

        {/* Top 3 Summary Cards */}
        <div className={styles.summaryGrid}>
          {/* Card 1: Waiting for a call */}
          <div className={styles.summaryCard}>
            <div className={`${styles.summaryIconBox} ${styles.iconBoxGreen}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 16.92V19.92C22.0011 20.1985 21.9441 20.4741 21.8325 20.7293C21.7209 20.9845 21.5572 21.2137 21.352 21.4018C21.1468 21.59 20.9047 21.733 20.6413 21.8214C20.3779 21.9098 20.0989 21.9416 19.82 21.9146C16.7428 21.5799 13.787 20.5273 11.19 18.84C8.77382 17.2932 6.70681 15.2262 5.16 12.81C3.46675 10.1982 2.41372 7.22485 2.085 4.135C2.05809 3.85699 2.08977 3.57888 2.17801 3.31631C2.26626 3.05374 2.40909 2.81245 2.59687 2.60803C2.78465 2.40361 3.01323 2.24056 3.26781 2.12966C3.52239 2.01875 3.79744 1.96245 4.075 1.965H7.075C7.56293 1.96025 8.03598 2.13324 8.40498 2.4514C8.77398 2.76957 9.01377 3.21096 9.08 3.695C9.20336 4.60627 9.42618 5.50346 9.745 6.37C9.88876 6.75718 9.91266 7.17804 9.81395 7.58107C9.71524 7.98409 9.49826 8.34994 9.19 8.635L7.92 9.905C9.35205 12.4239 11.4311 14.5029 13.95 15.935L15.22 14.665C15.5051 14.3567 15.8709 14.1398 16.2739 14.0411C16.677 13.9423 17.0978 13.9662 17.485 14.11C18.3515 14.4288 19.2487 14.6516 20.16 14.775C20.6492 14.8419 21.0945 15.0858 21.4135 15.4604C21.7325 15.8349 21.9042 16.3146 21.895 16.805L22 16.92Z"
                  stroke="#16a34a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.summaryContent}>
              <h4 className={styles.summaryLabel}>Waiting for a call</h4>
              <p className={styles.summaryValue}>24</p>
              <p className={styles.summarySub}>COD orders</p>
            </div>
          </div>

          {/* Card 2: Confirmed */}
          <div className={styles.summaryCard}>
            <div className={`${styles.summaryIconBox} ${styles.iconBoxGreen}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#16a34a" strokeWidth="2" />
                <path
                  d="M8.5 12.5L11 15L15.5 9.5"
                  stroke="#16a34a"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.summaryContent}>
              <h4 className={styles.summaryLabel}>Confirmed</h4>
              <p className={styles.summaryValue}>18</p>
              <p className={styles.summarySub}>COD orders</p>
            </div>
          </div>

          {/* Card 3: Cancelled or unreachable */}
          <div className={styles.summaryCard}>
            <div className={`${styles.summaryIconBox} ${styles.iconBoxRed}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#dc2626" strokeWidth="2" />
                <path
                  d="M9 9L15 15M15 9L9 15"
                  stroke="#dc2626"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className={styles.summaryContent}>
              <h4 className={styles.summaryLabel}>Cancelled or unreachable</h4>
              <p className={styles.summaryValue}>12</p>
              <p className={styles.summarySub}>COD orders</p>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className={styles.filtersBar}>
          {/* Left: Risk Filters */}
          <div className={styles.riskFilterPills}>
            <button
              type="button"
              className={`${styles.filterPill} ${riskFilter === "all" ? styles.filterPillActive : ""}`}
              onClick={() => setRiskFilter("all")}
            >
              All (54)
            </button>
            <button
              type="button"
              className={`${styles.filterPill} ${riskFilter === "high" ? styles.filterPillActive : ""}`}
              onClick={() => setRiskFilter("high")}
            >
              High risk (32)
            </button>
            <button
              type="button"
              className={`${styles.filterPill} ${riskFilter === "medium" ? styles.filterPillActive : ""}`}
              onClick={() => setRiskFilter("medium")}
            >
              Medium risk (22)
            </button>
          </div>

          {/* Right: Status Dropdown Filter */}
          <div className={styles.statusFilterWrap}>
            <span className={styles.statusLabel}>Show</span>
            <button
              type="button"
              className={styles.statusSelectBtn}
              onClick={() => setOpenStatusMenu(!openStatusMenu)}
            >
              <span>{statusFilter}</span>
              <span className={styles.dropdownArrow}>▼</span>
            </button>

            {openStatusMenu && (
              <div className={styles.statusMenu}>
                {["All statuses", "Waiting for a call", "Confirmed", "Cancelled", "Unreachable"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`${styles.statusMenuItem} ${
                      statusFilter === status ? styles.statusMenuItemActive : ""
                    }`}
                    onClick={() => {
                      setStatusFilter(status);
                      setOpenStatusMenu(false);
                    }}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Orders Table Card */}
        <div className={styles.tableCard}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Order</th>
                  <th className={styles.th}>Customer phone</th>
                  <th className={styles.th}>Risk</th>
                  <th className={styles.th}>Reason</th>
                  <th className={styles.th}>Status</th>
                  <th className={`${styles.th} ${styles.actionCell}`}>Call outcome</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={styles.emptyOrders}>
                      No orders found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className={styles.tr}>
                      <td className={`${styles.td} ${styles.orderNum}`}>{order.id}</td>
                      <td className={`${styles.td} ${styles.phoneCell}`}>
                        <a href={`tel:${order.phone}`} className={styles.phoneLink}>
                          {order.phone}
                        </a>
                      </td>
                      <td className={styles.td}>
                        <span
                          className={`${styles.riskBadge} ${
                            order.risk === "High" ? styles.badgeHigh : styles.badgeMedium
                          }`}
                        >
                          {order.risk}
                        </span>
                      </td>
                      <td className={`${styles.td} ${styles.reasonText}`}>{order.reason}</td>
                      <td className={styles.td}>
                        <span
                          className={`${styles.statusText} ${
                            order.status === "Confirmed"
                              ? styles.statusConfirmed
                              : order.status === "Cancelled"
                              ? styles.statusCancelled
                              : order.status === "Unreachable"
                              ? styles.statusUnreachable
                              : ""
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className={`${styles.td} ${styles.actionCell}`}>
                        <div className={styles.dropdownWrap}>
                          <button
                            type="button"
                            className={`${styles.outcomeBtn} ${
                              order.outcome === "Confirmed"
                                ? styles.outcomeBtnConfirmed
                                : order.outcome === "Cancelled"
                                ? styles.outcomeBtnCancelled
                                : order.outcome === "Unreachable"
                                ? styles.outcomeBtnUnreachable
                                : order.outcome === "Mark safe"
                                ? styles.outcomeBtnMarkSafe
                                : ""
                            }`}
                            onClick={() =>
                              setOpenDropdownId(openDropdownId === order.id ? null : order.id)
                            }
                          >
                            <span>{order.outcome || "Choose outcome"}</span>
                            <span className={styles.dropdownArrow}>▼</span>
                          </button>

                          {openDropdownId === order.id && (
                            <div className={styles.outcomeMenu}>
                              {/* 1. Confirmed */}
                              <button
                                type="button"
                                className={styles.outcomeMenuItem}
                                onClick={() => handleSelectOutcome(order.id, "Confirmed")}
                              >
                                <div className={`${styles.outcomeItemIcon} ${styles.iconConfirmed}`}>
                                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                    <path
                                      d="M3.5 8.5L6.5 11.5L12.5 4.5"
                                      stroke="currentColor"
                                      strokeWidth="2.2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </div>
                                <div className={styles.outcomeItemContent}>
                                  <div className={styles.outcomeItemTitle}>Confirmed</div>
                                  <p className={styles.outcomeItemDesc}>Order is okay to ship</p>
                                </div>
                              </button>

                              {/* 2. Cancelled */}
                              <button
                                type="button"
                                className={styles.outcomeMenuItem}
                                onClick={() => handleSelectOutcome(order.id, "Cancelled")}
                              >
                                <div className={`${styles.outcomeItemIcon} ${styles.iconCancelled}`}>
                                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                    <path
                                      d="M4 4L12 12M12 4L4 12"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </div>
                                <div className={styles.outcomeItemContent}>
                                  <div className={styles.outcomeItemTitle}>Cancelled</div>
                                  <p className={styles.outcomeItemDesc}>Order should not ship</p>
                                </div>
                              </button>

                              {/* 3. Unreachable */}
                              <button
                                type="button"
                                className={styles.outcomeMenuItem}
                                onClick={() => handleSelectOutcome(order.id, "Unreachable")}
                              >
                                <div className={`${styles.outcomeItemIcon} ${styles.iconUnreachable}`}>
                                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.8" />
                                    <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                  </svg>
                                </div>
                                <div className={styles.outcomeItemContent}>
                                  <div className={styles.outcomeItemTitle}>Unreachable</div>
                                  <p className={styles.outcomeItemDesc}>Customer did not answer</p>
                                </div>
                              </button>

                              {/* 4. Mark safe */}
                              <button
                                type="button"
                                className={styles.outcomeMenuItem}
                                onClick={() => handleSelectOutcome(order.id, "Mark safe")}
                              >
                                <div className={`${styles.outcomeItemIcon} ${styles.iconMarkSafe}`}>
                                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                    <path
                                      d="M8 1.5L13.5 3.5V8.5C13.5 12 8 14.5 8 14.5C8 14.5 2.5 12 2.5 8.5V3.5L8 1.5Z"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </div>
                                <div className={styles.outcomeItemContent}>
                                  <div className={styles.outcomeItemTitle}>Mark safe</div>
                                  <p className={styles.outcomeItemDesc}>Flag was wrong, moves to low risk</p>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Pagination */}
          <div className={styles.paginationRow}>
            <span>Showing 1–{filteredOrders.length} of 54 orders</span>
            <div className={styles.paginationBtns}>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setActivePage((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>
              {[1, 2, 3, 4, 5, 6].map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`${styles.pageBtn} ${activePage === p ? styles.pageBtnActive : ""}`}
                  onClick={() => setActivePage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setActivePage((p) => Math.min(6, p + 1))}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
