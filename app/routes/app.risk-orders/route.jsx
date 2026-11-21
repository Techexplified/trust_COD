import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams, useLoaderData, useFetcher } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../../shopify.server";
import { getRiskOrders, updateOrderAction, syncShopifyOrders } from "../../services/orders.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session?.shop || "default";
  const url = new URL(request.url);
  const risk = url.searchParams.get("risk") || "high";
  const search = url.searchParams.get("search") || "";
  const page = parseInt(url.searchParams.get("page") || "1", 10);

  // Sync recent orders from Shopify
  await syncShopifyOrders(admin, shop);

  // Fetch orders from Neon PostgreSQL
  const data = await getRiskOrders(shop, { risk, search, page, limit: 8 });

  return {
    ...data,
    currentRisk: risk,
    searchQuery: search,
    activePage: page,
    shop,
  };
};

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session?.shop || "default";
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "update_action") {
    const orderId = formData.get("orderId");
    const chosenAction = formData.get("action");
    const updated = await updateOrderAction(shop, orderId, chosenAction, admin);
    return { ok: true, orderId, action: chosenAction, updated };
  }

  if (intent === "sync_orders") {
    await syncShopifyOrders(admin, shop);
    return { ok: true, synced: true };
  }

  return null;
};

const RISK_CONFIG = {
  high: {
    title: "High risk orders",
    subtitle: "These orders have a higher chance of failing or being refused upon delivery.",
    badgeClass: styles.badgeHigh,
  },
  medium: {
    title: "Medium risk orders",
    subtitle: "These orders need a quick review or customer call before shipping.",
    badgeClass: styles.badgeMedium,
  },
  low: {
    title: "Low risk orders",
    subtitle: "These orders have verified details and look safe to fulfill.",
    badgeClass: styles.badgeLow,
  },
};

export default function RiskOrders() {
  const loaderData = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher();

  const currentRisk = searchParams.get("risk") || loaderData.currentRisk || "high";
  const activeCategory = ["low", "medium", "high"].includes(currentRisk) ? currentRisk : "high";

  const [searchQuery, setSearchQuery] = useState(loaderData.searchQuery || "");
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [activePage, setActivePage] = useState(loaderData.activePage || 1);
  const [orderActions, setOrderActions] = useState({});
  const [syncToast, setSyncToast] = useState("");

  // Sync local action state from database loader data
  useEffect(() => {
    if (loaderData.orders) {
      const actionsMap = {};
      loaderData.orders.forEach((o) => {
        if (o.action) actionsMap[o.id] = o.action;
      });
      setOrderActions((prev) => ({ ...actionsMap, ...prev }));
    }
  }, [loaderData.orders]);

  // Handle fetcher toast feedback
  useEffect(() => {
    if (fetcher.data?.synced) {
      setSyncToast("✓ Orders synced with Shopify");
      setTimeout(() => setSyncToast(""), 3000);
    }
  }, [fetcher.data]);

  const handleSelectRisk = (risk) => {
    setSearchParams({ risk });
    setOpenDropdownId(null);
    setActivePage(1);
  };

  const handleSelectAction = (orderId, actionName) => {
    // Optimistic UI update
    setOrderActions((prev) => ({
      ...prev,
      [orderId]: actionName,
    }));
    setOpenDropdownId(null);

    // Persist to Neon PostgreSQL & sync with Shopify
    fetcher.submit(
      { intent: "update_action", orderId, action: actionName },
      { method: "POST" }
    );
  };

  const handleSyncShopify = () => {
    fetcher.submit({ intent: "sync_orders" }, { method: "POST" });
  };

  const ordersList = loaderData.orders || [];

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return ordersList;
    const q = searchQuery.toLowerCase();
    return ordersList.filter(
      (order) =>
        order.id.toLowerCase().includes(q) ||
        (order.phone && order.phone.toLowerCase().includes(q)) ||
        (order.reason && order.reason.toLowerCase().includes(q)) ||
        (order.date && order.date.toLowerCase().includes(q))
    );
  }, [ordersList, searchQuery]);

  const counts = loaderData.counts || {
    low: { count: 0, percent: 0 },
    medium: { count: 0, percent: 0 },
    high: { count: 0, percent: 0 },
  };

  const toggleDropdown = (id) => {
    setOpenDropdownId((prev) => (prev === id ? null : id));
  };

  return (
    <s-page heading="Trust COD">
      <div className={styles.container}>
        {/* Back navigation & Actions row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
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

          <button
            type="button"
            onClick={handleSyncShopify}
            disabled={fetcher.state === "submitting"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              background: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              color: "#374151",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              style={{
                animation: fetcher.state === "submitting" ? "spin 1s linear infinite" : "none",
              }}
            >
              <path
                d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C15.3013 3 18.1884 4.77973 19.7542 7.42857M21 3V8H16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{fetcher.state === "submitting" ? "Syncing..." : "Sync Shopify orders"}</span>
          </button>
        </div>

        {syncToast && (
          <div
            style={{
              padding: "10px 16px",
              background: "#ecfdf5",
              color: "#065f46",
              borderRadius: 8,
              border: "1px solid #a7f3d0",
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 16,
            }}
          >
            {syncToast}
          </div>
        )}

        {/* Header Row */}
        <div className={styles.headerRow}>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Risk profile</h1>
            <p className={styles.subtitle}>
              See which COD orders fall in each profile, why they were flagged by rules, and take immediate action.
            </p>
          </div>

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

        {/* 3 Risk Profile Selection Tabs */}
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
                <p className={styles.tabCount}>
                  {counts.low.count} orders ({counts.low.percent}%)
                </p>
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
                <p className={styles.tabCount}>
                  {counts.medium.count} orders ({counts.medium.percent}%)
                </p>
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
                <p className={styles.tabCount}>
                  {counts.high.count} orders ({counts.high.percent}%)
                </p>
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
              <p className={styles.tableSubtitle}>
                Showing {filteredOrders.length} {activeCategory} risk COD orders from database. {RISK_CONFIG[activeCategory].subtitle}
              </p>
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
                placeholder="Search by order, phone or reason"
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
                      No {activeCategory} risk orders found {searchQuery ? `matching "${searchQuery}"` : "in database"}
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
              Showing {filteredOrders.length} of {counts[activeCategory]?.count || 0} orders
            </span>
            <div className={styles.paginationBtns}>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setActivePage((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>
              {Array.from({ length: Math.min(5, loaderData.totalPages || 1) }, (_, i) => i + 1).map((p) => (
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
                onClick={() => setActivePage((p) => Math.min(loaderData.totalPages || 1, p + 1))}
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
