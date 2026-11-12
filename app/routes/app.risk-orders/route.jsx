import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

const ORDERS_DATA = {
  high: [
    { id: "#1048", date: "May 12, 2024", phone: "+91 98765 43210", value: "₹1,299", risk: "High", reason: "Incomplete address" },
    { id: "#1047", date: "May 12, 2024", phone: "+91 91234 56789", value: "₹799", risk: "High", reason: "Repeat orders from same phone" },
    { id: "#1046", date: "May 11, 2024", phone: "+91 99887 66554", value: "₹1,499", risk: "High", reason: "New customer, no history" },
    { id: "#1045", date: "May 11, 2024", phone: "+91 77654 32109", value: "₹699", risk: "High", reason: "COD refused previously" },
    { id: "#1044", date: "May 10, 2024", phone: "+91 88990 12345", value: "₹1,199", risk: "High", reason: "Wrong or incomplete address" },
    { id: "#1043", date: "May 10, 2024", phone: "+91 90123 45678", value: "₹899", risk: "High", reason: "Multiple failed COD orders" },
    { id: "#1042", date: "May 09, 2024", phone: "+91 98712 34567", value: "₹1,599", risk: "High", reason: "Suspicious pattern" },
    { id: "#1041", date: "May 09, 2024", phone: "+91 91234 09876", value: "₹749", risk: "High", reason: "Unreachable customer" },
  ],
  medium: [
    { id: "#1040", date: "May 09, 2024", phone: "+91 94567 12340", value: "₹1,099", risk: "Medium", reason: "First-time COD order" },
    { id: "#1039", date: "May 08, 2024", phone: "+91 93210 98765", value: "₹1,350", risk: "Medium", reason: "High cart value for COD" },
    { id: "#1038", date: "May 08, 2024", phone: "+91 91122 33445", value: "₹850", risk: "Medium", reason: "Address pin code mismatch" },
    { id: "#1037", date: "May 07, 2024", phone: "+91 97788 99001", value: "₹620", risk: "Medium", reason: "Order placed late night" },
    { id: "#1036", date: "May 07, 2024", phone: "+91 95544 33221", value: "₹1,800", risk: "Medium", reason: "Multiple items in first order" },
    { id: "#1035", date: "May 06, 2024", phone: "+91 92233 44556", value: "₹999", risk: "Medium", reason: "Unverified phone number" },
    { id: "#1034", date: "May 06, 2024", phone: "+91 96677 88990", value: "₹720", risk: "Medium", reason: "Frequent address changes" },
    { id: "#1033", date: "May 05, 2024", phone: "+91 93344 55667", value: "₹1,150", risk: "Medium", reason: "Slow delivery zone" },
  ],
  low: [
    { id: "#1032", date: "May 05, 2024", phone: "+91 98877 66554", value: "₹599", risk: "Low", reason: "Verified repeat buyer" },
    { id: "#1031", date: "May 04, 2024", phone: "+91 91234 56780", value: "₹1,240", risk: "Low", reason: "Delivered previous 3 orders" },
    { id: "#1030", date: "May 04, 2024", phone: "+91 97766 55443", value: "₹899", risk: "Low", reason: "Complete address verified" },
    { id: "#1029", date: "May 03, 2024", phone: "+91 94455 66778", value: "₹450", risk: "Low", reason: "Regular customer" },
    { id: "#1028", date: "May 03, 2024", phone: "+91 93322 11009", value: "₹1,500", risk: "Low", reason: "Prepaid history on store" },
    { id: "#1027", date: "May 02, 2024", phone: "+91 92211 00998", value: "₹799", risk: "Low", reason: "High delivery success area" },
    { id: "#1026", date: "May 02, 2024", phone: "+91 91100 99887", value: "₹1,100", risk: "Low", reason: "Confirmed via OTP" },
    { id: "#1025", date: "May 01, 2024", phone: "+91 90099 88776", value: "₹650", risk: "Low", reason: "Fast response on WhatsApp" },
  ],
};

const RISK_CONFIG = {
  high: {
    title: "High risk orders",
    subtitle: "Showing 48 high risk COD orders. These orders have a higher chance of failing.",
    totalCount: 48,
    badgeClass: styles.badgeHigh,
  },
  medium: {
    title: "Medium risk orders",
    subtitle: "Showing 80 medium risk COD orders. These orders need a quick review before shipping.",
    totalCount: 80,
    badgeClass: styles.badgeMedium,
  },
  low: {
    title: "Low risk orders",
    subtitle: "Showing 120 low risk COD orders. These orders look safe to fulfill.",
    totalCount: 120,
    badgeClass: styles.badgeLow,
  },
};

export default function RiskOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentRisk = searchParams.get("risk") || "high";

  const [searchQuery, setSearchQuery] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [activePage, setActivePage] = useState(1);
  const [orderActions, setOrderActions] = useState({});

  const activeCategory = ["low", "medium", "high"].includes(currentRisk) ? currentRisk : "high";

  const handleSelectRisk = (risk) => {
    setSearchParams({ risk });
    setOpenDropdownId(null);
    setActivePage(1);
  };

  const handleSelectAction = (orderId, actionName) => {
    setOrderActions((prev) => ({
      ...prev,
      [orderId]: actionName,
    }));
    setOpenDropdownId(null);
  };

  const currentList = ORDERS_DATA[activeCategory] || [];

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return currentList;
    const q = searchQuery.toLowerCase();
    return currentList.filter(
      (order) =>
        order.id.toLowerCase().includes(q) ||
        order.phone.toLowerCase().includes(q) ||
        order.reason.toLowerCase().includes(q) ||
        order.date.toLowerCase().includes(q)
    );
  }, [currentList, searchQuery]);

  const toggleDropdown = (id) => {
    setOpenDropdownId((prev) => (prev === id ? null : id));
  };

  return (
    <s-page heading="Trust COD">
      <div className={styles.container}>
        {/* Back navigation */}
        <Link to="/app" className={styles.backLink}>
          <span className={styles.arrowLeft}>←</span> Back to dashboard
        </Link>

        {/* Header Row */}
        <div className={styles.headerRow}>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Risk profile</h1>
            <p className={styles.subtitle}>
              See which COD orders fall in each profile, why they were flagged, and what to do next.
            </p>
          </div>

          {/* Top right green shield illustration */}
          <div className={styles.headerIllustration}>
            <svg width="140" height="80" viewBox="0 0 140 80" fill="none">
              <circle cx="90" cy="40" r="35" fill="#f0fdf4" />
              <path
                d="M90 20L108 26V42C108 53 90 60 90 60C90 60 72 53 72 42V26L90 20Z"
                fill="#16a34a"
              />
              <path
                d="M82 39L87 44L98 33"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* 3 Risk Profile Selection Tabs (Cards) */}
        <div className={styles.tabsGrid}>
          {/* Low risk card */}
          <div
            className={`${styles.tabCard} ${styles.tabCardLow} ${
              activeCategory === "low" ? styles.tabCardActive : ""
            }`}
            onClick={() => handleSelectRisk("low")}
          >
            <div className={styles.tabLeft}>
              <span className={`${styles.tabDot} ${styles.dotLow}`} />
              <div>
                <h3 className={styles.tabTitle}>Low risk</h3>
                <p className={styles.tabCount}>120 orders (48%)</p>
              </div>
            </div>
            <span className={styles.chevronIcon}>›</span>
          </div>

          {/* Medium risk card */}
          <div
            className={`${styles.tabCard} ${styles.tabCardMedium} ${
              activeCategory === "medium" ? styles.tabCardActive : ""
            }`}
            onClick={() => handleSelectRisk("medium")}
          >
            <div className={styles.tabLeft}>
              <span className={`${styles.tabDot} ${styles.dotMedium}`} />
              <div>
                <h3 className={styles.tabTitle}>Medium risk</h3>
                <p className={styles.tabCount}>80 orders (32%)</p>
              </div>
            </div>
            <span className={styles.chevronIcon}>›</span>
          </div>

          {/* High risk card */}
          <div
            className={`${styles.tabCard} ${styles.tabCardHigh} ${
              activeCategory === "high" ? styles.tabCardActive : ""
            }`}
            onClick={() => handleSelectRisk("high")}
          >
            <div className={styles.tabLeft}>
              <span className={`${styles.tabDot} ${styles.dotHigh}`} />
              <div>
                <h3 className={styles.tabTitle}>High risk</h3>
                <p className={styles.tabCount}>48 orders (20%)</p>
              </div>
            </div>
            <span className={styles.chevronIcon}>›</span>
          </div>
        </div>

        {/* Table Card Container */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeaderRow}>
            <div>
              <h2 className={styles.tableTitle}>{RISK_CONFIG[activeCategory].title}</h2>
              <p className={styles.tableSubtitle}>{RISK_CONFIG[activeCategory].subtitle}</p>
            </div>

            {/* Search Input */}
            <div className={styles.searchInputWrap}>
              <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="none">
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
                <path d="M13.5 13.5L17.5 17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search by order number, phone or customer"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Order</th>
                  <th className={styles.th}>Date</th>
                  <th className={styles.th}>Customer phone</th>
                  <th className={styles.th}>Order value</th>
                  <th className={styles.th}>Risk and reason</th>
                  <th className={`${styles.th} ${styles.actionCell}`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={styles.emptyOrders}>
                      No orders found matching &quot;{searchQuery}&quot;
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className={styles.tr}>
                      <td className={`${styles.td} ${styles.orderNum}`}>{order.id}</td>
                      <td className={`${styles.td} ${styles.orderDate}`}>{order.date}</td>
                      <td className={`${styles.td} ${styles.orderPhone}`}>{order.phone}</td>
                      <td className={`${styles.td} ${styles.orderValue}`}>{order.value}</td>
                      <td className={styles.td}>
                        <div className={styles.riskCell}>
                          <span
                            className={`${styles.riskBadge} ${
                              order.risk === "High"
                                ? styles.badgeHigh
                                : order.risk === "Medium"
                                ? styles.badgeMedium
                                : styles.badgeLow
                            }`}
                          >
                            {order.risk}
                          </span>
                          <span className={styles.reasonText}>{order.reason}</span>
                        </div>
                      </td>
                      <td className={`${styles.td} ${styles.actionCell}`}>
                        <div className={styles.actionDropdownWrap}>
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${
                              orderActions[order.id] === "Confirmed"
                                ? styles.actionBtnConfirmed
                                : orderActions[order.id] === "Cancelled"
                                ? styles.actionBtnCancelled
                                : orderActions[order.id] === "Unreachable"
                                ? styles.actionBtnUnreachable
                                : orderActions[order.id] === "Mark safe"
                                ? styles.actionBtnMarkSafe
                                : ""
                            }`}
                            onClick={() => toggleDropdown(order.id)}
                          >
                            <span>{orderActions[order.id] || "Choose action"}</span>
                            <span className={styles.dropdownArrow}>▼</span>
                          </button>

                          {openDropdownId === order.id && (
                            <div className={styles.actionMenu}>
                              {/* 1. Confirmed */}
                              <button
                                type="button"
                                className={styles.actionMenuItem}
                                onClick={() => handleSelectAction(order.id, "Confirmed")}
                              >
                                <div className={`${styles.actionItemIcon} ${styles.actionIconConfirmed}`}>
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
                                <div className={styles.actionItemContent}>
                                  <div className={styles.actionItemTitle}>Confirmed</div>
                                  <p className={styles.actionItemDesc}>Order is okay to ship (tagged in Shopify)</p>
                                </div>
                              </button>

                              {/* 2. Cancelled */}
                              <button
                                type="button"
                                className={styles.actionMenuItem}
                                onClick={() => handleSelectAction(order.id, "Cancelled")}
                              >
                                <div className={`${styles.actionItemIcon} ${styles.actionIconCancelled}`}>
                                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                    <path
                                      d="M4 4L12 12M12 4L4 12"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </div>
                                <div className={styles.actionItemContent}>
                                  <div className={styles.actionItemTitle}>Cancelled</div>
                                  <p className={styles.actionItemDesc}>Order should not ship (counts to saved)</p>
                                </div>
                              </button>

                              {/* 3. Unreachable */}
                              <button
                                type="button"
                                className={styles.actionMenuItem}
                                onClick={() => handleSelectAction(order.id, "Unreachable")}
                              >
                                <div className={`${styles.actionItemIcon} ${styles.actionIconUnreachable}`}>
                                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.8" />
                                    <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                  </svg>
                                </div>
                                <div className={styles.actionItemContent}>
                                  <div className={styles.actionItemTitle}>Unreachable</div>
                                  <p className={styles.actionItemDesc}>Customer did not answer call (retry later)</p>
                                </div>
                              </button>

                              {/* 4. Mark safe */}
                              <button
                                type="button"
                                className={styles.actionMenuItem}
                                onClick={() => handleSelectAction(order.id, "Mark safe")}
                              >
                                <div className={`${styles.actionItemIcon} ${styles.actionIconMarkSafe}`}>
                                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                    <path
                                      d="M8 1.5L13.5 3.5V8.5C13.5 12 8 14.5 8 14.5C8 14.5 2.5 12 2.5 8.5V3.5L8 1.5Z"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </div>
                                <div className={styles.actionItemContent}>
                                  <div className={styles.actionItemTitle}>Mark safe</div>
                                  <p className={styles.actionItemDesc}>Flag was wrong, moves order to low risk</p>
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

          {/* Pagination & Footer */}
          <div className={styles.paginationRow}>
            <span>
              Showing 1–{filteredOrders.length} of {RISK_CONFIG[activeCategory].totalCount} orders
            </span>
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
