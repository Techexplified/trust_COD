import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useLoaderData, useFetcher } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../../shopify.server";
import prisma from "../../db.server";
import { getAppSettings, updateAppSettings, syncShopifyOrders } from "../../services/orders.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session?.shop || "default";

  // Ensure orders and customers are populated/synced
  await syncShopifyOrders(admin, shop);

  const [settings, dbCustomers] = await Promise.all([
    getAppSettings(shop),
    prisma.customer.findMany({
      where: { shop },
      orderBy: { displayName: "asc" },
    }),
  ]);

  return {
    settings,
    customers: dbCustomers.map((c) => ({
      id: c.id,
      shopifyCustomerId: c.shopifyCustomerId,
      name: c.displayName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Customer",
      phone: c.phone || "",
      email: c.email || "",
      city: c.city || "",
      ordersCount: c.ordersCount,
      totalSpent: c.totalSpent,
      riskLevel: c.riskLevel,
      isBlocked: c.isBlocked,
      isAllowlisted: c.isAllowlisted,
    })),
    shop,
  };
};

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session?.shop || "default";
  const formData = await request.formData();
  const enabled = formData.get("enabled") === "true";
  const blockedPhones = formData.get("blockedPhones") || "";
  const allowedPhones = formData.get("allowedPhones") || "";

  // 1. Update AppSettings in database
  await updateAppSettings(shop, {
    appEmbedEnabled: enabled,
    blockedPhones,
  });

  // 2. Update Customer records in database
  const blockedList = blockedPhones.split(",").map((p) => p.trim()).filter(Boolean);
  const allowedList = allowedPhones.split(",").map((p) => p.trim()).filter(Boolean);

  // Reset previously blocked customers if removed
  await prisma.customer.updateMany({
    where: { shop, phone: { notIn: blockedList }, isBlocked: true },
    data: { isBlocked: false },
  });

  // Mark blocked customers
  if (blockedList.length > 0) {
    await prisma.customer.updateMany({
      where: { shop, phone: { in: blockedList } },
      data: { isBlocked: true, isAllowlisted: false, riskLevel: "High" },
    });
  }

  // Reset previously allowlisted customers if removed
  await prisma.customer.updateMany({
    where: { shop, phone: { notIn: allowedList }, isAllowlisted: true },
    data: { isAllowlisted: false },
  });

  // Mark allowlisted customers
  if (allowedList.length > 0) {
    await prisma.customer.updateMany({
      where: { shop, phone: { in: allowedList } },
      data: { isAllowlisted: true, isBlocked: false, riskLevel: "Low" },
    });
  }

  // 3. Sync tags in Shopify Admin if available
  if (admin) {
    for (const phone of blockedList) {
      const cust = await prisma.customer.findFirst({ where: { shop, phone } });
      if (cust?.shopifyCustomerId) {
        try {
          await admin.graphql(
            `#graphql
            mutation TagBlockedCustomer($id: ID!, $tags: [String!]!) {
              tagsAdd(id: $id, tags: $tags) { userErrors { field message } }
            }`,
            { variables: { id: cust.shopifyCustomerId, tags: ["COD-Blocked"] } }
          );
        } catch (e) {
          console.warn("Shopify tag sync skipped:", e);
        }
      }
    }
  }

  return { ok: true };
};

const normalizeDigits = (val) => (val ? String(val).replace(/\D/g, "") : "");

export default function CheckoutControl() {
  const navigate = useNavigate();
  const loaderData = useLoaderData();
  const fetcher = useFetcher();

  const allCustomers = useMemo(() => loaderData?.customers || [], [loaderData?.customers]);

  // Control state synced with database & localStorage
  const [isEnabled, setIsEnabled] = useState(loaderData?.settings?.appEmbedEnabled ?? false);

  // 1. Choose the rule
  const [ruleType, setRuleType] = useState("hide"); // "hide" | "limit"
  const [maxOrders, setMaxOrders] = useState("3");
  const [timePeriodDays, setTimePeriodDays] = useState("30");

  // 2. Which history counts?
  const [historyChecks, setHistoryChecks] = useState({
    refusedOrCancelled: true,
    unreachable: true,
    fraud: false,
    highRiskProfile: false,
  });

  // 3. Your own lists (Customer Objects)
  const [allowPhoneInput, setAllowPhoneInput] = useState("");
  const [allowError, setAllowError] = useState("");
  const [showAllowDropdown, setShowAllowDropdown] = useState(false);
  const [allowedCustomers, setAllowedCustomers] = useState(() => {
    // Initialise from DB customers who are allowlisted
    return allCustomers.filter((c) => c.isAllowlisted);
  });

  const [hidePhoneInput, setHidePhoneInput] = useState("");
  const [hideError, setHideError] = useState("");
  const [showHideDropdown, setShowHideDropdown] = useState(false);
  const [hiddenCustomers, setHiddenCustomers] = useState(() => {
    // Initialise from AppSettings blockedPhones or DB customers
    const fromDb = loaderData?.settings?.blockedPhones || "";
    const blockedPhonesList = fromDb.split(",").map((s) => s.trim()).filter(Boolean);
    return allCustomers.filter((c) => c.isBlocked || blockedPhonesList.includes(c.phone));
  });

  const allowRef = useRef(null);
  const hideRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (allowRef.current && !allowRef.current.contains(e.target)) {
        setShowAllowDropdown(false);
      }
      if (hideRef.current && !hideRef.current.contains(e.target)) {
        setShowHideDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter autocomplete suggestions for "Always allow COD"
  const allowSuggestions = useMemo(() => {
    const trimmed = allowPhoneInput.trim();
    if (!trimmed) return [];
    const queryDigits = normalizeDigits(trimmed);

    const existingPhones = new Set(allowedCustomers.map((c) => c.phone));
    return allCustomers.filter((c) => {
      if (existingPhones.has(c.phone)) return false;
      const cDigits = normalizeDigits(c.phone);
      return (
        (queryDigits && cDigits.includes(queryDigits)) ||
        c.phone.includes(trimmed) ||
        c.name.toLowerCase().includes(trimmed.toLowerCase())
      );
    });
  }, [allowPhoneInput, allCustomers, allowedCustomers]);

  // Filter autocomplete suggestions for "Always hide COD"
  const hideSuggestions = useMemo(() => {
    const trimmed = hidePhoneInput.trim();
    if (!trimmed) return [];
    const queryDigits = normalizeDigits(trimmed);

    const existingPhones = new Set(hiddenCustomers.map((c) => c.phone));
    return allCustomers.filter((c) => {
      if (existingPhones.has(c.phone)) return false;
      const cDigits = normalizeDigits(c.phone);
      return (
        (queryDigits && cDigits.includes(queryDigits)) ||
        c.phone.includes(trimmed) ||
        c.name.toLowerCase().includes(trimmed.toLowerCase())
      );
    });
  }, [hidePhoneInput, allCustomers, hiddenCustomers]);

  const handleToggle = (checked) => {
    setIsEnabled(checked);
    try {
      localStorage.setItem("trust_cod_checkout_status", checked ? "On" : "Off");
    } catch {
      // storage
    }
  };

  const toggleHistoryCheck = (key) => {
    setHistoryChecks((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Add customer to "Always allow"
  const handleSelectAllowCustomer = (customer) => {
    if (!allowedCustomers.some((c) => c.phone === customer.phone)) {
      setAllowedCustomers((prev) => [...prev, customer]);
    }
    setAllowPhoneInput("");
    setAllowError("");
    setShowAllowDropdown(false);
  };

  const handleAddAllowedSubmit = (e) => {
    e?.preventDefault();
    const inputDigits = normalizeDigits(allowPhoneInput);
    if (!inputDigits) return;

    // Check if the typed number belongs to an actual customer in the database
    const matchedCustomer = allCustomers.find((c) => {
      const cDigits = normalizeDigits(c.phone);
      return cDigits === inputDigits || c.phone.trim() === allowPhoneInput.trim();
    });

    if (matchedCustomer) {
      if (!allowedCustomers.some((c) => c.phone === matchedCustomer.phone)) {
        setAllowedCustomers((prev) => [...prev, matchedCustomer]);
        setAllowPhoneInput("");
        setAllowError("");
        setShowAllowDropdown(false);
      } else {
        setAllowError("Customer is already added to Always allow COD list.");
      }
    } else {
      setAllowError("Customer not found in database. Only registered customers from Shopify can be chosen.");
    }
  };

  const handleRemoveAllowed = (phone) => {
    setAllowedCustomers((prev) => prev.filter((c) => c.phone !== phone));
  };

  // Add customer to "Always hide"
  const handleSelectHideCustomer = (customer) => {
    if (!hiddenCustomers.some((c) => c.phone === customer.phone)) {
      setHiddenCustomers((prev) => [...prev, customer]);
    }
    setHidePhoneInput("");
    setHideError("");
    setShowHideDropdown(false);
  };

  const handleAddHiddenSubmit = (e) => {
    e?.preventDefault();
    const inputDigits = normalizeDigits(hidePhoneInput);
    if (!inputDigits) return;

    // Check if the typed number belongs to an actual customer in the database
    const matchedCustomer = allCustomers.find((c) => {
      const cDigits = normalizeDigits(c.phone);
      return cDigits === inputDigits || c.phone.trim() === hidePhoneInput.trim();
    });

    if (matchedCustomer) {
      if (!hiddenCustomers.some((c) => c.phone === matchedCustomer.phone)) {
        setHiddenCustomers((prev) => [...prev, matchedCustomer]);
        setHidePhoneInput("");
        setHideError("");
        setShowHideDropdown(false);
      } else {
        setHideError("Customer is already added to Always hide COD list.");
      }
    } else {
      setHideError("Customer not found in database. Only registered customers from Shopify can be chosen.");
    }
  };

  const handleRemoveHidden = (phone) => {
    setHiddenCustomers((prev) => prev.filter((c) => c.phone !== phone));
  };

  const handleSave = () => {
    const blockedPhoneList = hiddenCustomers.map((c) => c.phone).filter(Boolean);
    const allowedPhoneList = allowedCustomers.map((c) => c.phone).filter(Boolean);

    try {
      localStorage.setItem("trust_cod_checkout_status", isEnabled ? "On" : "Off");
      localStorage.setItem("trust_cod_rule_type", ruleType);
      localStorage.setItem("trust_cod_max_orders", maxOrders);
      localStorage.setItem("trust_cod_time_period_days", timePeriodDays);
      localStorage.setItem("trust_cod_history_checks", JSON.stringify(historyChecks));
      localStorage.setItem("trust_cod_allowed_numbers", JSON.stringify(allowedPhoneList));
      localStorage.setItem("trust_cod_hidden_numbers", JSON.stringify(blockedPhoneList));
    } catch {
      // storage
    }

    // Persist to Neon PostgreSQL AppSettings & Customer records
    fetcher.submit(
      {
        enabled: String(isEnabled),
        blockedPhones: blockedPhoneList.join(","),
        allowedPhones: allowedPhoneList.join(","),
      },
      { method: "POST" }
    );

    // Navigate back to dashboard with confirmation
    navigate("/app");
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
            <h1 className={styles.title}>Checkout COD control</h1>
            <p className={styles.subtitle}>
              Decide when COD is hidden or limited on your checkout based on customer risk history.
            </p>
          </div>

          <div className={styles.headerIllustration}>
            <svg width="200" height="110" viewBox="0 0 200 110" fill="none">
              <rect x="20" y="20" width="160" height="70" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
              <rect x="35" y="35" width="60" height="10" rx="3" fill="#cbd5e1" />
              <rect x="35" y="52" width="100" height="8" rx="2" fill="#e2e8f0" />
              <rect x="35" y="66" width="40" height="8" rx="2" fill="#e2e8f0" />
              <circle cx="150" cy="55" r="16" fill="#fef2f2" />
              <path d="M144 49L156 61M156 49L144 61" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Banner: Turn on checkout COD control */}
        <div className={styles.bannerCard}>
          <div className={styles.bannerLeft}>
            <div className={styles.bannerTitleRow}>
              <span className={styles.checkBadge}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <h2 className={styles.bannerTitle}>Turn on checkout COD control</h2>
            </div>
            <p className={styles.bannerDesc}>
              When turned on, your rules apply to customer checkouts.
            </p>
            <div className={styles.statusRow}>
              <span className={styles.statusDotActive} />
              <span className={styles.statusTextActive}>
                App embed is <strong>{isEnabled ? "On" : "Off"}</strong> in your live theme
              </span>
            </div>
          </div>

          <label className={styles.toggleSwitch}>
            <input
              type="checkbox"
              className={styles.toggleInput}
              checked={isEnabled}
              onChange={(e) => handleToggle(e.target.checked)}
            />
            <span className={styles.toggleSlider} />
          </label>
        </div>

        {/* Section 1: Choose the rule */}
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>1. Choose the rule</h2>
          <p className={styles.sectionDesc}>
            What happens when a customer matches your risk criteria.
          </p>

          <div className={styles.radioGroup}>
            {/* Option A: Hide COD completely */}
            <label
              className={`${styles.radioCard} ${
                ruleType === "hide" ? styles.radioCardSelected : ""
              }`}
            >
              <input
                type="radio"
                name="ruleType"
                value="hide"
                checked={ruleType === "hide"}
                onChange={() => setRuleType("hide")}
                className={styles.radioInput}
              />
              <div className={styles.radioContent}>
                <span className={styles.radioTitle}>Hide COD completely</span>
                <span className={styles.radioSub}>
                  Customers who match your rules will not see COD at checkout. Only prepaid options will be visible.
                </span>
              </div>
            </label>

            {/* Option B: Limit COD */}
            <label
              className={`${styles.radioCard} ${
                ruleType === "limit" ? styles.radioCardSelected : ""
              }`}
            >
              <input
                type="radio"
                name="ruleType"
                value="limit"
                checked={ruleType === "limit"}
                onChange={() => setRuleType("limit")}
                className={styles.radioInput}
              />
              <div className={styles.radioContent}>
                <span className={styles.radioTitle}>Limit COD</span>
                <span className={styles.radioSub}>
                  Customers can only place a limited number of COD orders in a given time window.
                </span>

                {ruleType === "limit" && (
                  <div className={styles.limitInputsRow}>
                    <span>Maximum</span>
                    <input
                      type="number"
                      className={styles.numInput}
                      value={maxOrders}
                      onChange={(e) => setMaxOrders(e.target.value)}
                      min="1"
                    />
                    <span>COD orders per customer in the last</span>
                    <input
                      type="number"
                      className={styles.numInput}
                      value={timePeriodDays}
                      onChange={(e) => setTimePeriodDays(e.target.value)}
                      min="1"
                    />
                    <span>days.</span>
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Section 2: Which history counts? */}
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>2. Which history counts?</h2>
          <p className={styles.sectionDesc}>
            COD is hidden or limited if any of these conditions are true.
          </p>

          <div className={styles.historyList}>
            {/* Item 1 */}
            <div
              className={styles.historyItem}
              onClick={() => toggleHistoryCheck("refusedOrCancelled")}
            >
              <div
                className={`${styles.checkboxBox} ${
                  historyChecks.refusedOrCancelled ? styles.checkboxBoxChecked : ""
                }`}
              >
                {historyChecks.refusedOrCancelled && (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3.5 8.5L6.5 11.5L12.5 4.5"
                      stroke="white"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <div className={styles.historyContent}>
                <h3 className={styles.historyTitle}>
                  An earlier COD order was refused or cancelled
                </h3>
                <p className={styles.historyDesc}>
                  Customer refused delivery at their doorstep, or cancelled after dispatch.
                </p>
              </div>
            </div>

            {/* Item 2 */}
            <div
              className={styles.historyItem}
              onClick={() => toggleHistoryCheck("unreachable")}
            >
              <div
                className={`${styles.checkboxBox} ${
                  historyChecks.unreachable ? styles.checkboxBoxChecked : ""
                }`}
              >
                {historyChecks.unreachable && (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3.5 8.5L6.5 11.5L12.5 4.5"
                      stroke="white"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <div className={styles.historyContent}>
                <h3 className={styles.historyTitle}>
                  Customer was unreachable on verification call
                </h3>
                <p className={styles.historyDesc}>
                  Did not answer the phone when your team called to confirm the COD order.
                </p>
              </div>
            </div>

            {/* Item 3 */}
            <div
              className={styles.historyItem}
              onClick={() => toggleHistoryCheck("fraud")}
            >
              <div
                className={`${styles.checkboxBox} ${
                  historyChecks.fraud ? styles.checkboxBoxChecked : ""
                }`}
              >
                {historyChecks.fraud && (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3.5 8.5L6.5 11.5L12.5 4.5"
                      stroke="white"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <div className={styles.historyContent}>
                <h3 className={styles.historyTitle}>
                  An earlier order was marked as fraud
                </h3>
                <p className={styles.historyDesc}>
                  Includes orders you or your team marked as fraud.
                </p>
              </div>
            </div>

            {/* Item 4 */}
            <div
              className={styles.historyItem}
              onClick={() => toggleHistoryCheck("highRiskProfile")}
            >
              <div
                className={`${styles.checkboxBox} ${
                  historyChecks.highRiskProfile
                    ? styles.checkboxBoxChecked
                    : ""
                }`}
              >
                {historyChecks.highRiskProfile && (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3.5 8.5L6.5 11.5L12.5 4.5"
                      stroke="white"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <div className={styles.historyContent}>
                <h3 className={styles.historyTitle}>
                  The current order is in the high risk profile
                </h3>
                <p className={styles.historyDesc}>
                  Applies to customers whose latest order is flagged as high risk.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Your own lists (with Customer Intelligence Autocomplete) */}
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>3. Your own lists</h2>
          <p className={styles.sectionDesc}>
            Trusted customers always keep COD. Blocked customers never see it.
          </p>

          <div className={styles.twoColGrid}>
            {/* Column 1: Always allow COD */}
            <div className={styles.listCard} ref={allowRef}>
              <div className={`${styles.listHeader} ${styles.listHeaderAllow}`}>
                <div className={`${styles.listIconBox} ${styles.iconBoxAllow}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
                      fill="#16a34a"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className={styles.listTitle}>Always allow COD</h3>
                  <p className={styles.listSub}>Trusted customers ({allowedCustomers.length})</p>
                </div>
              </div>

              <div className={styles.listBody}>
                <form className={styles.inputRow} onSubmit={handleAddAllowedSubmit}>
                  <div className={styles.inputWrapper}>
                    <input
                      type="tel"
                      className={styles.phoneInput}
                      placeholder="Enter numeric customer phone number"
                      value={allowPhoneInput}
                      onChange={(e) => {
                        // Enforce numeric contact numbers only (digits, +, spaces)
                        const cleaned = e.target.value.replace(/[^0-9+ ]/g, "");
                        setAllowPhoneInput(cleaned);
                        setShowAllowDropdown(true);
                        setAllowError("");
                      }}
                      onFocus={() => {
                        if (allowPhoneInput.trim()) setShowAllowDropdown(true);
                      }}
                    />

                    {/* Predictive suggestions dropdown for actual customers in database */}
                    {showAllowDropdown && allowPhoneInput.trim().length > 0 && (
                      <div className={styles.suggestionDropdown}>
                        {allowSuggestions.length === 0 ? (
                          <div className={styles.suggestionEmpty}>
                            No customer with phone matching &quot;{allowPhoneInput}&quot; found in database.
                          </div>
                        ) : (
                          allowSuggestions.slice(0, 6).map((cust) => (
                            <div
                              key={cust.id}
                              className={styles.suggestionItem}
                              onClick={() => handleSelectAllowCustomer(cust)}
                            >
                              <div className={styles.suggestionAvatar}>
                                {cust.name.charAt(0).toUpperCase()}
                              </div>
                              <div className={styles.suggestionInfo}>
                                <div className={styles.suggestionNameRow}>
                                  <span className={styles.suggestionName}>{cust.name}</span>
                                  <span className={styles.suggestionPhone}>{cust.phone}</span>
                                </div>
                                <div className={styles.suggestionMeta}>
                                  {cust.city && <span>{cust.city} • </span>}
                                  <span>{cust.ordersCount || 1} {cust.ordersCount === 1 ? "order" : "orders"}</span>
                                  <span
                                    className={`${styles.miniRiskBadge} ${
                                      cust.riskLevel === "High"
                                        ? styles.miniRiskHigh
                                        : cust.riskLevel === "Medium"
                                        ? styles.miniRiskMedium
                                        : styles.miniRiskLow
                                    }`}
                                  >
                                    {cust.riskLevel}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <button type="submit" className={styles.btnAdd}>
                    Add
                  </button>
                </form>

                {allowError && <div className={styles.inputErrorNotice}>⚠️ {allowError}</div>}

                {/* Selected Customers Details Cards */}
                {allowedCustomers.length === 0 ? (
                  <div className={styles.emptyStateBox}>
                    <svg
                      className={styles.emptyIcon}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <div>
                      <h4 className={styles.emptyTitle}>No numbers added yet</h4>
                      <p className={styles.emptySub}>
                        Add phone numbers of customers you trust from database.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={styles.customerRowsList}>
                    {allowedCustomers.map((cust) => (
                      <div key={cust.phone} className={styles.customerCardItem}>
                        <div className={styles.customerAvatarAllow}>
                          {cust.name ? cust.name.charAt(0).toUpperCase() : "C"}
                        </div>
                        <div className={styles.customerDetails}>
                          <div className={styles.customerHeaderLine}>
                            <span className={styles.customerDisplayName}>{cust.name}</span>
                            <span className={styles.customerPhoneBadge}>{cust.phone}</span>
                            <span className={`${styles.riskPill} ${styles.pillLow}`}>
                              Always Allow COD
                            </span>
                          </div>
                          <div className={styles.customerMetaLine}>
                            {cust.email && <span>{cust.email} • </span>}
                            {cust.city && <span>{cust.city} • </span>}
                            <span>{cust.ordersCount || 1} orders</span>
                            {cust.totalSpent > 0 && (
                              <span> • ₹{Math.round(cust.totalSpent).toLocaleString("en-IN")} spent</span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={styles.removeCustomerBtn}
                          onClick={() => handleRemoveAllowed(cust.phone)}
                          title="Remove customer from list"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Always hide COD */}
            <div className={styles.listCard} ref={hideRef}>
              <div className={`${styles.listHeader} ${styles.listHeaderHide}`}>
                <div className={`${styles.listIconBox} ${styles.iconBoxHide}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#dc2626" strokeWidth="2" />
                    <line x1="5.5" y1="5.5" x2="18.5" y2="18.5" stroke="#dc2626" strokeWidth="2" />
                  </svg>
                </div>
                <div>
                  <h3 className={styles.listTitle}>Always hide COD</h3>
                  <p className={styles.listSub}>Blocked customers ({hiddenCustomers.length})</p>
                </div>
              </div>

              <div className={styles.listBody}>
                <form className={styles.inputRow} onSubmit={handleAddHiddenSubmit}>
                  <div className={styles.inputWrapper}>
                    <input
                      type="tel"
                      className={styles.phoneInput}
                      placeholder="Enter numeric customer phone number"
                      value={hidePhoneInput}
                      onChange={(e) => {
                        // Enforce numeric contact numbers only (digits, +, spaces)
                        const cleaned = e.target.value.replace(/[^0-9+ ]/g, "");
                        setHidePhoneInput(cleaned);
                        setShowHideDropdown(true);
                        setHideError("");
                      }}
                      onFocus={() => {
                        if (hidePhoneInput.trim()) setShowHideDropdown(true);
                      }}
                    />

                    {/* Predictive suggestions dropdown for actual customers in database */}
                    {showHideDropdown && hidePhoneInput.trim().length > 0 && (
                      <div className={styles.suggestionDropdown}>
                        {hideSuggestions.length === 0 ? (
                          <div className={styles.suggestionEmpty}>
                            No customer with phone matching &quot;{hidePhoneInput}&quot; found in database.
                          </div>
                        ) : (
                          hideSuggestions.slice(0, 6).map((cust) => (
                            <div
                              key={cust.id}
                              className={styles.suggestionItem}
                              onClick={() => handleSelectHideCustomer(cust)}
                            >
                              <div className={styles.suggestionAvatar}>
                                {cust.name.charAt(0).toUpperCase()}
                              </div>
                              <div className={styles.suggestionInfo}>
                                <div className={styles.suggestionNameRow}>
                                  <span className={styles.suggestionName}>{cust.name}</span>
                                  <span className={styles.suggestionPhone}>{cust.phone}</span>
                                </div>
                                <div className={styles.suggestionMeta}>
                                  {cust.city && <span>{cust.city} • </span>}
                                  <span>{cust.ordersCount || 1} {cust.ordersCount === 1 ? "order" : "orders"}</span>
                                  <span
                                    className={`${styles.miniRiskBadge} ${
                                      cust.riskLevel === "High"
                                        ? styles.miniRiskHigh
                                        : cust.riskLevel === "Medium"
                                        ? styles.miniRiskMedium
                                        : styles.miniRiskLow
                                    }`}
                                  >
                                    {cust.riskLevel}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <button type="submit" className={styles.btnAdd}>
                    Add
                  </button>
                </form>

                {hideError && <div className={styles.inputErrorNotice}>⚠️ {hideError}</div>}

                {/* Selected Blocked Customers Details Cards */}
                {hiddenCustomers.length === 0 ? (
                  <div className={styles.emptyStateBox}>
                    <svg
                      className={styles.emptyIcon}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <div>
                      <h4 className={styles.emptyTitle}>No numbers added yet</h4>
                      <p className={styles.emptySub}>
                        Add phone numbers of customers to block from database.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={styles.customerRowsList}>
                    {hiddenCustomers.map((cust) => (
                      <div key={cust.phone} className={styles.customerCardItem}>
                        <div className={styles.customerAvatarHide}>
                          {cust.name ? cust.name.charAt(0).toUpperCase() : "C"}
                        </div>
                        <div className={styles.customerDetails}>
                          <div className={styles.customerHeaderLine}>
                            <span className={styles.customerDisplayName}>{cust.name}</span>
                            <span className={styles.customerPhoneBadge}>{cust.phone}</span>
                            <span className={`${styles.riskPill} ${styles.pillHigh}`}>
                              Blocked from COD
                            </span>
                          </div>
                          <div className={styles.customerMetaLine}>
                            {cust.email && <span>{cust.email} • </span>}
                            {cust.city && <span>{cust.city} • </span>}
                            <span>{cust.ordersCount || 1} orders</span>
                            {cust.totalSpent > 0 && (
                              <span> • ₹{Math.round(cust.totalSpent).toLocaleString("en-IN")} spent</span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={styles.removeCustomerBtn}
                          onClick={() => handleRemoveHidden(cust.phone)}
                          title="Remove customer from blocklist"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info Callout Box */}
          <div className={styles.infoBox} style={{ marginTop: 20 }}>
            <svg
              className={styles.infoIcon}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <p className={styles.infoText}>
              This works when the customer can be recognized at checkout, for example by phone number or email. Customers who cannot be recognized keep COD.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={styles.footerRow}>
          <button
            type="button"
            className={styles.btnCancel}
            onClick={() => navigate("/app")}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnSave}
            onClick={handleSave}
            disabled={fetcher.state === "submitting"}
          >
            {fetcher.state === "submitting" ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
