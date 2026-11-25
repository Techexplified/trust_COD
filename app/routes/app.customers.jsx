import { useState, useEffect, useMemo } from "react";
import { Link, useLoaderData, useFetcher, useSearchParams, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  getCustomersForShop,
  toggleCustomerBlock,
  toggleCustomerAllow,
  syncShopifyOrders,
} from "../services/orders.server";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session?.shop || "default";
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const risk = url.searchParams.get("risk") || "all";
  const page = parseInt(url.searchParams.get("page") || "1", 10);

  // Sync latest customer data from Shopify
  await syncShopifyOrders(admin, shop);

  const data = await getCustomersForShop(shop, { search, risk, page, limit: 12 });
  return { ...data, search, risk, shop };
};

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session?.shop || "default";
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "toggle_block") {
    const customerId = formData.get("customerId");
    const shouldBlock = formData.get("shouldBlock") === "true";
    await toggleCustomerBlock(shop, customerId, shouldBlock, admin);
    return { ok: true, customerId, isBlocked: shouldBlock };
  }

  if (intent === "toggle_allow") {
    const customerId = formData.get("customerId");
    const shouldAllow = formData.get("shouldAllow") === "true";
    await toggleCustomerAllow(shop, customerId, shouldAllow, admin);
    return { ok: true, customerId, isAllowlisted: shouldAllow };
  }

  if (intent === "sync_customers") {
    await syncShopifyOrders(admin, shop);
    return { ok: true, synced: true };
  }

  return null;
};

export default function Customers() {
  const loaderData = useLoaderData() || {};
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher();

  const [searchQuery, setSearchQuery] = useState(loaderData?.search || "");
  const [activeTab, setActiveTab] = useState(loaderData?.risk || "all");
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [activePage, setActivePage] = useState(
    parseInt(searchParams.get("page") || String(loaderData?.activePage || 1), 10)
  );

  const customers = loaderData?.customers || [];
  const stats = loaderData?.stats || {
    total: 0,
    highRisk: 0,
    blocked: 0,
    allowlisted: 0,
  };

  const totalPages = loaderData?.totalPages || 1;
  const totalCount = loaderData?.totalCount ?? customers.length;
  const safeActivePage = Math.min(Math.max(1, activePage), totalPages);

  useEffect(() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    setActivePage(p);
  }, [searchParams]);

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    setActivePage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === "all") next.delete("risk");
      else next.set("risk", tab);
      next.set("page", "1");
      return next;
    });
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActivePage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!searchQuery.trim()) next.delete("search");
      else next.set("search", searchQuery.trim());
      next.set("page", "1");
      return next;
    });
  };

  const handlePageChange = (p) => {
    const next = Math.max(1, Math.min(totalPages, p));
    setActivePage(next);
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      nextParams.set("page", String(next));
      return nextParams;
    });
  };

  const handleSyncShopify = () => {
    fetcher.submit({ intent: "sync_customers" }, { method: "POST" });
  };

  const handleAction = (customerId, actionType) => {
    if (actionType === "block") {
      fetcher.submit(
        { intent: "toggle_block", customerId, shouldBlock: "true" },
        { method: "POST" }
      );
    } else if (actionType === "unblock") {
      fetcher.submit(
        { intent: "toggle_block", customerId, shouldBlock: "false" },
        { method: "POST" }
      );
    } else if (actionType === "allow") {
      fetcher.submit(
        { intent: "toggle_allow", customerId, shouldAllow: "true" },
        { method: "POST" }
      );
    } else if (actionType === "remove_allow") {
      fetcher.submit(
        { intent: "toggle_allow", customerId, shouldAllow: "false" },
        { method: "POST" }
      );
    }
    setOpenDropdownId(null);
  };

  return (
    <s-page heading="Trust COD">
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 0 60px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", color: "#111827" }}>
        {/* Navigation & Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Link
            to="/app"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 8,
              color: "#111827",
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
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
            <span>{fetcher.state === "submitting" ? "Syncing..." : "Sync Shopify customers"}</span>
          </button>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 6px 0", letterSpacing: "-0.3px", color: "#111827" }}>
            Customer Intelligence
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
            Customer profiles synced directly from Shopify with purchase history, COD risk ratings, and checkout controls.
          </p>
        </div>

        {/* 4 Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 20px" }}>
            <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>Total customers</span>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginTop: 4 }}>{stats.total}</div>
          </div>
          <div style={{ background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: 12, padding: "16px 20px" }}>
            <span style={{ fontSize: 13, color: "#991b1b", fontWeight: 500 }}>High risk buyers</span>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#991b1b", marginTop: 4 }}>{stats.highRisk}</div>
          </div>
          <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: 12, padding: "16px 20px" }}>
            <span style={{ fontSize: 13, color: "#92400e", fontWeight: 500 }}>Blocked from COD</span>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#92400e", marginTop: 4 }}>{stats.blocked}</div>
          </div>
          <div style={{ background: "#f0fdf4", border: "1px solid #dcfce7", borderRadius: 12, padding: "16px 20px" }}>
            <span style={{ fontSize: 13, color: "#166534", fontWeight: 500 }}>Always allow COD</span>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#166534", marginTop: 4 }}>{stats.allowlisted}</div>
          </div>
        </div>

        {/* Main Card */}
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)" }}>
          {/* Header Controls (Tabs & Search) */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {/* Risk Tabs */}
            <div style={{ display: "flex", gap: 6, background: "#f3f4f6", padding: 4, borderRadius: 8 }}>
              {["all", "high", "medium", "low"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleSelectTab(tab)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    background: activeTab === tab ? "#ffffff" : "transparent",
                    color: activeTab === tab ? "#111827" : "#6b7280",
                    boxShadow: activeTab === tab ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab === "all" ? "All" : tab === "high" ? "High risk" : tab === "medium" ? "Medium risk" : "Low risk"}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <svg
                  style={{ position: "absolute", left: 10, width: 16, height: 16, color: "#9ca3af" }}
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M13.5 13.5L17.5 17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  placeholder="Search customer, phone or email..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  style={{
                    padding: "7px 12px 7px 34px",
                    fontSize: 13,
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    outline: "none",
                    width: 250,
                  }}
                />
              </div>
            </form>
          </div>

          {/* Customers Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#fafafa", borderBottom: "1px solid #f3f4f6" }}>
                  <th style={{ padding: "12px 24px", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Customer</th>
                  <th style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Contact</th>
                  <th style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Shopify orders</th>
                  <th style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Total spent</th>
                  <th style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>COD risk</th>
                  <th style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Checkout COD</th>
                  <th style={{ padding: "12px 24px", fontSize: 12, fontWeight: 600, color: "#6b7280", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: 40, textAlign: "center", color: "#6b7280", fontSize: 14 }}>
                      No customers found {searchQuery ? `matching "${searchQuery}"` : "in database"}.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "14px 24px" }}>
                        <div style={{ fontWeight: 600, color: "#111827", fontSize: 14 }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{c.city}</div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{c.phone}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{c.email}</div>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600, color: "#111827" }}>
                        {c.ordersCount} {c.ordersCount === 1 ? "order" : "orders"}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600, color: "#111827" }}>
                        {c.totalSpent}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            background:
                              c.riskLevel === "High" ? "#fef2f2" : c.riskLevel === "Medium" ? "#fffbeb" : "#f0fdf4",
                            color:
                              c.riskLevel === "High" ? "#991b1b" : c.riskLevel === "Medium" ? "#92400e" : "#166534",
                            border: `1px solid ${
                              c.riskLevel === "High" ? "#fecaca" : c.riskLevel === "Medium" ? "#fde68a" : "#bbf7d0"
                            }`,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              backgroundColor:
                                c.riskLevel === "High" ? "#ef4444" : c.riskLevel === "Medium" ? "#f59e0b" : "#22c55e",
                            }}
                          />
                          {c.riskLevel}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {c.isBlocked ? (
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#991b1b", background: "#fef2f2", padding: "4px 8px", borderRadius: 6, border: "1px solid #fecaca" }}>
                            ✕ Blocked
                          </span>
                        ) : c.isAllowlisted ? (
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#166534", background: "#f0fdf4", padding: "4px 8px", borderRadius: 6, border: "1px solid #bbf7d0" }}>
                            ✓ Always allow
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "#6b7280" }}>Standard</span>
                        )}
                      </td>
                      <td style={{ padding: "14px 24px", textAlign: "right", position: "relative" }}>
                        <div style={{ display: "inline-block", position: "relative" }}>
                          <button
                            type="button"
                            onClick={() => setOpenDropdownId(openDropdownId === c.id ? null : c.id)}
                            style={{
                              padding: "5px 10px",
                              fontSize: 12,
                              fontWeight: 600,
                              borderRadius: 6,
                              background: "#ffffff",
                              border: "1px solid #d1d5db",
                              color: "#374151",
                              cursor: "pointer",
                            }}
                          >
                            Manage ▾
                          </button>

                          {openDropdownId === c.id && (
                            <div
                              style={{
                                position: "absolute",
                                right: 0,
                                top: "100%",
                                marginTop: 4,
                                background: "#ffffff",
                                border: "1px solid #e5e7eb",
                                borderRadius: 8,
                                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                                zIndex: 50,
                                minWidth: 160,
                                padding: 4,
                                textAlign: "left",
                              }}
                            >
                              {!c.isBlocked ? (
                                <button
                                  type="button"
                                  onClick={() => handleAction(c.id, "block")}
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "7px 10px",
                                    fontSize: 12,
                                    border: "none",
                                    background: "none",
                                    textAlign: "left",
                                    color: "#991b1b",
                                    cursor: "pointer",
                                    borderRadius: 4,
                                    fontWeight: 500,
                                  }}
                                  onMouseEnter={(e) => (e.target.style.background = "#fef2f2")}
                                  onMouseLeave={(e) => (e.target.style.background = "none")}
                                >
                                  ✕ Block from COD
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAction(c.id, "unblock")}
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "7px 10px",
                                    fontSize: 12,
                                    border: "none",
                                    background: "none",
                                    textAlign: "left",
                                    color: "#374151",
                                    cursor: "pointer",
                                    borderRadius: 4,
                                    fontWeight: 500,
                                  }}
                                  onMouseEnter={(e) => (e.target.style.background = "#f3f4f6")}
                                  onMouseLeave={(e) => (e.target.style.background = "none")}
                                >
                                  Unblock customer
                                </button>
                              )}

                              {!c.isAllowlisted ? (
                                <button
                                  type="button"
                                  onClick={() => handleAction(c.id, "allow")}
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "7px 10px",
                                    fontSize: 12,
                                    border: "none",
                                    background: "none",
                                    textAlign: "left",
                                    color: "#166534",
                                    cursor: "pointer",
                                    borderRadius: 4,
                                    fontWeight: 500,
                                  }}
                                  onMouseEnter={(e) => (e.target.style.background = "#f0fdf4")}
                                  onMouseLeave={(e) => (e.target.style.background = "none")}
                                >
                                  ✓ Always allow COD
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAction(c.id, "remove_allow")}
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "7px 10px",
                                    fontSize: 12,
                                    border: "none",
                                    background: "none",
                                    textAlign: "left",
                                    color: "#374151",
                                    cursor: "pointer",
                                    borderRadius: 4,
                                    fontWeight: 500,
                                  }}
                                  onMouseEnter={(e) => (e.target.style.background = "#f3f4f6")}
                                  onMouseLeave={(e) => (e.target.style.background = "none")}
                                >
                                  Remove from allowlist
                                </button>
                              )}
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

          {/* Pagination Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderTop: "1px solid #f1f5f9",
              fontSize: 13,
              color: "#64748b",
            }}
          >
            <span>
              Showing{" "}
              {totalCount === 0
                ? "0"
                : `${(safeActivePage - 1) * 12 + 1} - ${Math.min(
                    safeActivePage * 12,
                    totalCount
                  )}`}{" "}
              of {totalCount} customers
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                type="button"
                onClick={() => handlePageChange(safeActivePage - 1)}
                disabled={safeActivePage <= 1}
                aria-label="Previous page"
                style={{
                  minWidth: 32,
                  height: 32,
                  padding: "0 8px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#ffffff",
                  color: "#111827",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: safeActivePage <= 1 ? "not-allowed" : "pointer",
                  opacity: safeActivePage <= 1 ? 0.4 : 1,
                  fontWeight: 500,
                  fontSize: 13,
                  fontFamily: "inherit",
                  transition: "all 0.15s ease",
                }}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const isActive = safeActivePage === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePageChange(p)}
                    style={{
                      minWidth: 32,
                      height: 32,
                      padding: "0 8px",
                      borderRadius: 8,
                      border: isActive ? "1px solid #004d26" : "1px solid #d1d5db",
                      background: isActive ? "#004d26" : "#ffffff",
                      color: isActive ? "#ffffff" : "#111827",
                      boxShadow: isActive ? "0 0 0 2px #005bd3" : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontWeight: isActive ? 600 : 500,
                      fontSize: 13,
                      fontFamily: "inherit",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => handlePageChange(safeActivePage + 1)}
                disabled={safeActivePage >= totalPages}
                aria-label="Next page"
                style={{
                  minWidth: 32,
                  height: 32,
                  padding: "0 8px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#ffffff",
                  color: "#111827",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: safeActivePage >= totalPages ? "not-allowed" : "pointer",
                  opacity: safeActivePage >= totalPages ? 0.4 : 1,
                  fontWeight: 500,
                  fontSize: 13,
                  fontFamily: "inherit",
                  transition: "all 0.15s ease",
                }}
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

export function ErrorBoundary() {
  const error = useRouteError();
  if (error && (error.constructor?.name === "ErrorResponse" || error.constructor?.name === "ErrorResponseImpl")) {
    return boundary.error(error);
  }
  return (
    <s-page heading="Trust COD">
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "40px 20px",
          textAlign: "center",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #fee2e2",
            borderRadius: 12,
            padding: "32px 24px",
            maxWidth: 500,
            margin: "0 auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "#fee2e2",
              color: "#b91c1c",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
            Unable to load customers
          </h2>
          <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 20px", lineHeight: 1.5 }}>
            {error?.message || "An unexpected error occurred while loading customer records."}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link
              to="/app"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "8px 16px",
                background: "#f3f4f6",
                color: "#374151",
                textDecoration: "none",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: "8px 16px",
                background: "#004d26",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
