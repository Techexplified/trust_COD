import { useState, useEffect } from "react";
import { Link, useLoaderData, useFetcher } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../../shopify.server";
import { getRulesForShop, updateRulesForShop, resetRulesForShop } from "../../services/rules.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop || "default";
  const rules = await getRulesForShop(shop);
  return { rules, shop };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop || "default";
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save_rules") {
    const rulesJson = formData.get("rules");
    const rules = JSON.parse(rulesJson || "[]");
    const updated = await updateRulesForShop(shop, rules);
    return { ok: true, rules: updated, message: "Rules saved successfully" };
  }

  if (intent === "reset_rules") {
    const updated = await resetRulesForShop(shop);
    return { ok: true, rules: updated, message: "Rules reset to defaults" };
  }

  return null;
};

export default function RiskRules() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();

  const [rules, setRules] = useState(loaderData.rules || []);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("✔ Changes saved successfully");

  // Keep rules updated from loaderData or fetcher response
  useEffect(() => {
    if (fetcher.data?.rules) {
      setRules(fetcher.data.rules);
      setToastMessage(fetcher.data.message || "✔ Changes saved successfully");
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [fetcher.data]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(`.${styles.dropdownWrap}`)) {
        setOpenDropdownId(null);
      }
    };
    if (openDropdownId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdownId]);

  // Group rules by profile
  const highRules = rules.filter((r) => r.profile === "high");
  const mediumRules = rules.filter((r) => r.profile === "medium");
  const lowRules = rules.filter((r) => r.profile === "low");

  const handleProfileChange = (ruleId, newProfile) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, profile: newProfile } : r))
    );
    setOpenDropdownId(null);
  };

  const handleInputChange = (ruleId, field, value) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, [field]: value } : r))
    );
  };

  const handleReset = () => {
    fetcher.submit({ intent: "reset_rules" }, { method: "POST" });
    setOpenDropdownId(null);
  };

  const handleSave = () => {
    fetcher.submit(
      { intent: "save_rules", rules: JSON.stringify(rules) },
      { method: "POST" }
    );
  };

  const renderRuleDescription = (rule) => {
    switch (rule.descType) {
      case "order_burst":
        return (
          <div className={styles.ruleDesc}>
            <span>COD orders from the same phone or address within</span>
            <input
              type="text"
              className={styles.inlineInput}
              value={rule.orders || ""}
              onChange={(e) => handleInputChange(rule.id, "orders", e.target.value)}
            />
            <span>or more within</span>
            <input
              type="text"
              className={styles.inlineInput}
              value={rule.hours || ""}
              onChange={(e) => handleInputChange(rule.id, "hours", e.target.value)}
            />
            <span>hours.</span>
          </div>
        );

      case "high_value":
        return (
          <div className={styles.ruleDesc}>
            <span>A first time customer&apos;s COD order is well above your usual COD order value. More than</span>
            <input
              type="text"
              className={styles.inlineInput}
              value={rule.multiplier || ""}
              onChange={(e) => handleInputChange(rule.id, "multiplier", e.target.value)}
            />
            <span>times the median.</span>
          </div>
        );

      case "repeat_order":
        return (
          <div className={styles.ruleDesc}>
            <span>Two COD orders from the same phone or address within</span>
            <input
              type="text"
              className={styles.inlineInput}
              value={rule.hours || ""}
              onChange={(e) => handleInputChange(rule.id, "hours", e.target.value)}
            />
            <span>hours.</span>
          </div>
        );

      case "mixed_identity":
        return (
          <div className={styles.ruleDesc}>
            <span>The same phone number was used with a different customer name within the last</span>
            <input
              type="text"
              className={styles.inlineInput}
              value={rule.days || ""}
              onChange={(e) => handleInputChange(rule.id, "days", e.target.value)}
            />
            <span>days.</span>
          </div>
        );

      case "unusual_quantity":
        return (
          <div className={styles.ruleDesc}>
            <span>A COD order has more than</span>
            <input
              type="text"
              className={styles.inlineInput}
              value={rule.units || ""}
              placeholder="e.g. 5"
              onChange={(e) => handleInputChange(rule.id, "units", e.target.value)}
            />
            <span>units of the same item.</span>
          </div>
        );

      case "weak_pincode":
        return (
          <div className={styles.ruleDesc}>
            <span>A pincode with low delivery success in your store (at least</span>
            <input
              type="text"
              className={styles.inlineInput}
              value={rule.orders || ""}
              onChange={(e) => handleInputChange(rule.id, "orders", e.target.value)}
            />
            <span>past COD orders).</span>
          </div>
        );

      default:
        return <p className={styles.ruleDesc}>{rule.desc}</p>;
    }
  };

  const renderRuleRow = (rule) => {
    const isStackedRule = rule.id === "stacked_warnings";

    return (
      <div key={rule.id} className={styles.ruleRow}>
        {/* Left: Title + Description */}
        <div className={styles.ruleContent}>
          <h3 className={styles.ruleTitle}>{rule.title}</h3>
          {renderRuleDescription(rule)}
        </div>

        {/* Right: Profile Selector */}
        <div className={styles.ruleAction}>
          {isStackedRule ? (
            <div className={styles.alwaysOnTag}>
              <span className={styles.alwaysOnDot} />
              <span>Always high risk</span>
            </div>
          ) : (
            <div className={styles.dropdownWrap}>
              <button
                type="button"
                className={`${styles.dropdownTrigger} ${
                  rule.profile === "high"
                    ? styles.triggerHigh
                    : rule.profile === "medium"
                    ? styles.triggerMedium
                    : styles.triggerLow
                }`}
                onClick={() =>
                  setOpenDropdownId(openDropdownId === rule.id ? null : rule.id)
                }
                aria-haspopup="true"
                aria-expanded={openDropdownId === rule.id}
              >
                <div className={styles.dropdownTriggerLeft}>
                  <span
                    className={`${styles.dot} ${
                      rule.profile === "high"
                        ? styles.dotHigh
                        : rule.profile === "medium"
                        ? styles.dotMedium
                        : styles.dotLow
                    }`}
                  />
                  <span>
                    {rule.profile === "high"
                      ? "High risk"
                      : rule.profile === "medium"
                      ? "Medium risk"
                      : "Low risk"}
                  </span>
                </div>
                <svg
                  className={`${styles.chevronIcon} ${
                    openDropdownId === rule.id ? styles.chevronOpen : ""
                  }`}
                  width="12"
                  height="12"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M5 7.5L10 12.5L15 7.5"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {openDropdownId === rule.id && (
                <div className={styles.dropdownMenu}>
                  <button
                    type="button"
                    className={`${styles.dropdownItem} ${
                      rule.profile === "high" ? styles.dropdownItemActive : ""
                    }`}
                    onClick={() => handleProfileChange(rule.id, "high")}
                  >
                    <span className={`${styles.dot} ${styles.dotHigh}`} />
                    <span>High risk</span>
                    {rule.profile === "high" && <span className={styles.checkIcon}>✓</span>}
                  </button>
                  <button
                    type="button"
                    className={`${styles.dropdownItem} ${
                      rule.profile === "medium" ? styles.dropdownItemActive : ""
                    }`}
                    onClick={() => handleProfileChange(rule.id, "medium")}
                  >
                    <span className={`${styles.dot} ${styles.dotMedium}`} />
                    <span>Medium risk</span>
                    {rule.profile === "medium" && <span className={styles.checkIcon}>✓</span>}
                  </button>
                  <button
                    type="button"
                    className={`${styles.dropdownItem} ${
                      rule.profile === "low" ? styles.dropdownItemActive : ""
                    }`}
                    onClick={() => handleProfileChange(rule.id, "low")}
                  >
                    <span className={`${styles.dot} ${styles.dotLow}`} />
                    <span>Low risk</span>
                    {rule.profile === "low" && <span className={styles.checkIcon}>✓</span>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
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
          <div>
            <h1 className={styles.title}>Risk rules</h1>
            <p className={styles.subtitle}>
              Adjust which rules put an order into high, medium, or low risk. Changes apply to all new COD orders.
            </p>
          </div>
        </div>

        {/* ── High Risk Section ── */}
        <div className={styles.profileSection}>
          <div className={`${styles.sectionHeader} ${styles.headerHigh}`}>
            <div className={styles.headerLeft}>
              <span className={`${styles.dot} ${styles.dotHigh}`} />
              <div>
                <h2 className={styles.sectionTitle}>High risk</h2>
                <p className={styles.sectionSubtitle}>
                  An order is high risk if any one of these is true.
                </p>
              </div>
            </div>
            <span className={`${styles.ruleCountBadge} ${styles.badgeBorderHigh}`}>
              {highRules.length} rules
            </span>
          </div>

          <div className={styles.tableHeaderRow}>
            <span>Rule</span>
            <span style={{ minWidth: 150, textAlign: "right" }}>Risk profile</span>
          </div>

          <div>{highRules.map((rule) => renderRuleRow(rule))}</div>
        </div>

        {/* ── Medium Risk Section ── */}
        <div className={styles.profileSection}>
          <div className={`${styles.sectionHeader} ${styles.headerMedium}`}>
            <div className={styles.headerLeft}>
              <span className={`${styles.dot} ${styles.dotMedium}`} />
              <div>
                <h2 className={styles.sectionTitle}>Medium risk</h2>
                <p className={styles.sectionSubtitle}>
                  An order is medium risk if any one of these is true.
                </p>
              </div>
            </div>
            <span className={`${styles.ruleCountBadge} ${styles.badgeBorderMedium}`}>
              {mediumRules.length} rules
            </span>
          </div>

          <div className={styles.tableHeaderRow}>
            <span>Rule</span>
            <span style={{ minWidth: 150, textAlign: "right" }}>Risk profile</span>
          </div>

          <div>{mediumRules.map((rule) => renderRuleRow(rule))}</div>
        </div>

        {/* ── Low Risk Section ── */}
        <div className={styles.profileSection}>
          <div className={`${styles.sectionHeader} ${styles.headerLow}`}>
            <div className={styles.headerLeft}>
              <span className={`${styles.dot} ${styles.dotLow}`} />
              <div>
                <h2 className={styles.sectionTitle}>Low risk</h2>
                <p className={styles.sectionSubtitle}>
                  An order is low risk if it matches any of these rules.
                </p>
              </div>
            </div>
            <span className={`${styles.ruleCountBadge} ${styles.badgeBorderLow}`}>
              {lowRules.length} rules
            </span>
          </div>

          <div className={styles.tableHeaderRow}>
            <span>Rule</span>
            <span style={{ minWidth: 150, textAlign: "right" }}>Risk profile</span>
          </div>

          <div>{lowRules.map((rule) => renderRuleRow(rule))}</div>
        </div>

        {/* Footer Actions */}
        <div className={styles.footerRow}>
          <button
            type="button"
            className={styles.btnReset}
            onClick={handleReset}
            disabled={fetcher.state === "submitting"}
          >
            Reset to defaults
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

        {/* Toast confirmation */}
        {showToast && (
          <div className={styles.toastSuccess}>
            {toastMessage}
          </div>
        )}
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
