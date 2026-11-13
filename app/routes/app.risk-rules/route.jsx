import { useState } from "react";
import { Link } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

const DEFAULT_RULES = [
  // High risk
  {
    id: "bad_history",
    title: "Bad history on this phone number",
    descType: "text",
    desc: "An earlier COD order from this number was refused, cancelled by the customer, or marked as fraud.",
    profile: "high",
  },
  {
    id: "blocked_list",
    title: "On your blocked list",
    descType: "text",
    desc: "The phone number or pincode is on the blocked list you manage in Checkout COD control.",
    profile: "high",
  },
  {
    id: "fake_phone",
    title: "Fake looking phone number",
    descType: "text",
    desc: "Not a valid 10 digit Indian mobile number, or repeated digits or a simple sequence.",
    profile: "high",
  },
  {
    id: "gibberish",
    title: "Gibberish or test details",
    descType: "text",
    desc: "Random characters or test words in the name or address.",
    profile: "high",
  },
  {
    id: "pincode_problem",
    title: "Pincode problem",
    descType: "text",
    desc: "The pincode is invalid, or does not match the city and state.",
    profile: "high",
  },
  {
    id: "order_burst",
    title: "Order burst",
    descType: "order_burst",
    orders: "3",
    hours: "24",
    profile: "high",
  },
  {
    id: "stacked_warnings",
    title: "Stacked warnings",
    descType: "text",
    desc: "Two or more medium risk rules match the same order. This rule is always on.",
    profile: "high",
  },

  // Medium risk
  {
    id: "high_value_first",
    title: "High value first order",
    descType: "high_value",
    multiplier: "2",
    profile: "medium",
  },
  {
    id: "weak_address",
    title: "Weak address",
    descType: "text",
    desc: "No house or flat number, or a very short address.",
    profile: "medium",
  },
  {
    id: "repeat_order",
    title: "Repeat order",
    descType: "repeat_order",
    hours: "24",
    profile: "medium",
  },
  {
    id: "mixed_identity",
    title: "Mixed identity",
    descType: "mixed_identity",
    days: "30",
    profile: "medium",
  },
  {
    id: "disposable_email",
    title: "Disposable email",
    descType: "text",
    desc: "The email uses a known throwaway domain.",
    profile: "medium",
  },
  {
    id: "unusual_quantity",
    title: "Unusual quantity",
    descType: "unusual_quantity",
    units: "",
    profile: "medium",
  },
  {
    id: "weak_pincode",
    title: "Weak pincode",
    descType: "weak_pincode",
    orders: "20",
    profile: "medium",
  },

  // Low risk
  {
    id: "trusted_returning",
    title: "Trusted returning customers",
    descType: "text",
    desc: "A repeat customer with at least one delivered COD order skips the medium risk rules that apply to new customers, such as the high value first order. High risk rules still apply.",
    profile: "low",
  },
  {
    id: "complete_address",
    title: "Complete address and valid pincode",
    descType: "text",
    desc: "All required address fields are present and the pincode matches the city and state.",
    profile: "low",
  },
  {
    id: "normal_pattern",
    title: "Order pattern looks normal",
    descType: "text",
    desc: "No burst of recent COD orders and no repeated failed COD history.",
    profile: "low",
  },
];

export default function RiskRules() {
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [showToast, setShowToast] = useState(false);

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
    setRules(DEFAULT_RULES);
    setOpenDropdownId(null);
  };

  const handleSave = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
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
              value={rule.orders}
              onChange={(e) => handleInputChange(rule.id, "orders", e.target.value)}
            />
            <span>or more within</span>
            <input
              type="text"
              className={styles.inlineInput}
              value={rule.hours}
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
              value={rule.multiplier}
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
              value={rule.hours}
              onChange={(e) => handleInputChange(rule.id, "hours", e.target.value)}
            />
            <span>hours.</span>
          </div>
        );

      case "mixed_identity":
        return (
          <div className={styles.ruleDesc}>
            <span>The same phone number appears with different names or addresses in the last</span>
            <input
              type="text"
              className={styles.inlineInput}
              value={rule.days}
              onChange={(e) => handleInputChange(rule.id, "days", e.target.value)}
            />
            <span>days.</span>
          </div>
        );

      case "unusual_quantity":
        return (
          <div className={styles.ruleDesc}>
            <span>A very large quantity of one item. More than</span>
            <input
              type="text"
              className={`${styles.inlineInput} ${styles.inlineInputWide}`}
              placeholder="number"
              value={rule.units}
              onChange={(e) => handleInputChange(rule.id, "units", e.target.value)}
            />
            <span>units.</span>
          </div>
        );

      case "weak_pincode":
        return (
          <div className={styles.ruleDesc}>
            <span>Past COD orders to this pincode failed far more often than your store average. Starts after enough orders:</span>
            <input
              type="text"
              className={styles.inlineInput}
              value={rule.orders}
              onChange={(e) => handleInputChange(rule.id, "orders", e.target.value)}
            />
            <span>orders.</span>
          </div>
        );

      default:
        return <p className={styles.ruleDesc}>{rule.desc}</p>;
    }
  };

  const renderRuleRow = (rule) => {
    const profileLabel =
      rule.profile === "high"
        ? "High"
        : rule.profile === "medium"
        ? "Medium"
        : "Low";

    const btnClass =
      rule.profile === "high"
        ? styles.btnHigh
        : rule.profile === "medium"
        ? styles.btnMedium
        : styles.btnLow;

    const dotClass =
      rule.profile === "high"
        ? styles.dotHigh
        : rule.profile === "medium"
        ? styles.dotMedium
        : styles.dotLow;

    return (
      <div key={rule.id} className={styles.ruleRow}>
        <div className={styles.ruleContent}>
          <h4 className={styles.ruleTitle}>{rule.title}</h4>
          {renderRuleDescription(rule)}
        </div>

        <div className={styles.dropdownWrap}>
          <button
            type="button"
            className={`${styles.dropdownBtn} ${btnClass}`}
            onClick={() =>
              setOpenDropdownId((prev) => (prev === rule.id ? null : rule.id))
            }
          >
            <span className={`${styles.dot} ${dotClass}`} />
            <span>{profileLabel}</span>
            <span className={styles.dropdownArrow}>▼</span>
          </button>

          {openDropdownId === rule.id && (
            <div className={styles.dropdownMenu}>
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => handleProfileChange(rule.id, "high")}
              >
                <span className={`${styles.dot} ${styles.dotHigh}`} />
                <span>High</span>
              </button>
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => handleProfileChange(rule.id, "medium")}
              >
                <span className={`${styles.dot} ${styles.dotMedium}`} />
                <span>Medium</span>
              </button>
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => handleProfileChange(rule.id, "low")}
              >
                <span className={`${styles.dot} ${styles.dotLow}`} />
                <span>Low</span>
              </button>
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

        {/* Header */}
        <div className={styles.headerRow}>
          <h1 className={styles.title}>Risk rules</h1>
          <p className={styles.subtitle}>
            Choose which signals make an order high, medium, or low risk. You can move any rule between profiles.
          </p>
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
            <span>Risk profile</span>
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
            <span>Risk profile</span>
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
            <span>Risk profile</span>
          </div>

          <div>{lowRules.map((rule) => renderRuleRow(rule))}</div>
        </div>

        {/* Footer Actions */}
        <div className={styles.footerRow}>
          <button type="button" className={styles.btnReset} onClick={handleReset}>
            Reset to defaults
          </button>
          <button type="button" className={styles.btnSave} onClick={handleSave}>
            Save changes
          </button>
        </div>

        {/* Toast confirmation */}
        {showToast && (
          <div className={styles.toastSuccess}>
            ✔ Changes saved successfully
          </div>
        )}
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
