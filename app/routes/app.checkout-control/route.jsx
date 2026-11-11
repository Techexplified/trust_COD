import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function CheckoutControl() {
  const navigate = useNavigate();

  // Control state
  const [isEnabled, setIsEnabled] = useState(false);

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

  const toggleHistoryCheck = (key) => {
    setHistoryChecks((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // 3. Your own lists
  const [allowPhoneInput, setAllowPhoneInput] = useState("");
  const [allowedNumbers, setAllowedNumbers] = useState([]);

  const [hidePhoneInput, setHidePhoneInput] = useState("");
  const [hiddenNumbers, setHiddenNumbers] = useState([]);

  const handleAddAllowed = (e) => {
    e?.preventDefault();
    const trimmed = allowPhoneInput.trim();
    if (trimmed && !allowedNumbers.includes(trimmed)) {
      setAllowedNumbers([...allowedNumbers, trimmed]);
      setAllowPhoneInput("");
    }
  };

  const handleRemoveAllowed = (num) => {
    setAllowedNumbers(allowedNumbers.filter((n) => n !== num));
  };

  const handleAddHidden = (e) => {
    e?.preventDefault();
    const trimmed = hidePhoneInput.trim();
    if (trimmed && !hiddenNumbers.includes(trimmed)) {
      setHiddenNumbers([...hiddenNumbers, trimmed]);
      setHidePhoneInput("");
    }
  };

  const handleRemoveHidden = (num) => {
    setHiddenNumbers(hiddenNumbers.filter((n) => n !== num));
  };

  const handleSave = () => {
    // Navigate back to dashboard with confirmation
    navigate("/app");
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
            <h1 className={styles.title}>Checkout COD control</h1>
            <p className={styles.subtitle}>
              Decide when Cash on Delivery is hidden at checkout for customers with a risky history.
            </p>
          </div>

          {/* Right Header Illustration */}
          <div className={styles.headerIllustration}>
            <svg width="200" height="110" viewBox="0 0 200 110" fill="none">
              {/* Soft green ambient aura */}
              <circle cx="140" cy="55" r="50" fill="#f0fdf4" />
              <circle cx="90" cy="65" r="40" fill="#f6fef8" />

              {/* Floating window / card */}
              <rect
                x="20"
                y="15"
                width="115"
                height="80"
                rx="8"
                fill="white"
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              {/* Top header bar */}
              <rect x="20" y="15" width="115" height="18" rx="8" fill="#86efac" fillOpacity="0.8" />
              <circle cx="28" cy="24" r="2.5" fill="white" />
              <circle cx="36" cy="24" r="2.5" fill="white" />
              <circle cx="44" cy="24" r="2.5" fill="white" />

              {/* Inside window card items */}
              <rect x="30" y="44" width="45" height="6" rx="3" fill="#bbf7d0" />
              <circle cx="32" cy="64" r="3" fill="#a7f3d0" />
              <rect x="40" y="62.5" width="45" height="3.5" rx="1.75" fill="#e5e7eb" />
              <circle cx="32" cy="78" r="3" fill="#a7f3d0" />
              <rect x="40" y="76.5" width="30" height="3.5" rx="1.75" fill="#e5e7eb" />

              {/* Controlled Rupee Badge (Circle with Rupee and strike) */}
              <circle cx="150" cy="55" r="28" fill="#dcfce7" stroke="#16a34a" strokeWidth="2.5" />
              <text
                x="150"
                y="65"
                textAnchor="middle"
                fontSize="32"
                fontWeight="700"
                fill="#15803d"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                ₹
              </text>
              {/* Diagonal prohibition/control line */}
              <line
                x1="130"
                y1="37"
                x2="170"
                y2="73"
                stroke="#15803d"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Banner: Turn on checkout COD control */}
        <div className={styles.bannerCard}>
          <div className={styles.bannerLeft}>
            <div className={styles.bannerTitleRow}>
              <span className={styles.checkBadge}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3.5 8.5L6.5 11.5L12.5 4.5"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <h2 className={styles.bannerTitle}>Turn on checkout COD control</h2>
            </div>
            <p className={styles.bannerDesc}>
              Enable this to hide or limit COD at checkout for customers with a risky history.
            </p>
            <div className={styles.statusRow}>
              <div className={styles.statusIndicator}>
                <span
                  className={`${styles.statusDot} ${
                    isEnabled ? styles.statusDotActive : ""
                  }`}
                />
                <span className={styles.statusText}>
                  Status: {isEnabled ? "On" : "Off"}
                </span>
              </div>
              <span className={styles.statusHint}>
                {isEnabled
                  ? "Checkout COD control is currently active."
                  : "Nothing changes at checkout until you turn this on."}
              </span>
            </div>
          </div>

          <div className={styles.toggleWrap}>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                className={styles.toggleInput}
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
              />
              <span className={styles.toggleSlider} />
            </label>
            <span className={styles.toggleLabel}>{isEnabled ? "On" : "Off"}</span>
          </div>
        </div>

        {/* Section 1: Choose the rule */}
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>1. Choose the rule</h2>
          <p className={styles.sectionDesc}>
            Pick what happens to COD for a customer who matches the history below.
          </p>

          {/* Option 1: Hide COD completely */}
          <div
            className={styles.ruleOption}
            onClick={() => setRuleType("hide")}
            role="radio"
            aria-checked={ruleType === "hide"}
          >
            <div
              className={`${styles.radioCircle} ${
                ruleType === "hide" ? styles.radioCircleSelected : ""
              }`}
            >
              {ruleType === "hide" && <div className={styles.radioDot} />}
            </div>
            <div className={styles.ruleContent}>
              <h3 className={styles.ruleTitle}>
                Hide COD completely for that customer
              </h3>
              <p className={styles.ruleSubtext}>
                COD will not be shown at checkout for these customers.
              </p>
            </div>
          </div>

          {/* Option 2: Limit COD */}
          <div
            className={styles.ruleOption}
            onClick={() => setRuleType("limit")}
            role="radio"
            aria-checked={ruleType === "limit"}
          >
            <div
              className={`${styles.radioCircle} ${
                ruleType === "limit" ? styles.radioCircleSelected : ""
              }`}
            >
              {ruleType === "limit" && <div className={styles.radioDot} />}
            </div>
            <div className={styles.ruleContent}>
              <h3 className={styles.ruleTitle}>Limit COD for that customer</h3>
              <p className={styles.ruleSubtext}>
                Allow only a certain number of COD orders in a given time period.
              </p>
            </div>
          </div>

          {/* Inline inputs row for Limit */}
          <div className={styles.limitInputsRow}>
            <span>Allow up to</span>
            <input
              type="number"
              className={styles.numberInput}
              value={maxOrders}
              onChange={(e) => setMaxOrders(e.target.value)}
              min="1"
            />
            <span>COD orders every</span>
            <input
              type="number"
              className={styles.numberInput}
              value={timePeriodDays}
              onChange={(e) => setTimePeriodDays(e.target.value)}
              min="1"
            />
            <span>days</span>
          </div>
        </div>

        {/* Section 2: Which history counts? */}
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>2. Which history counts?</h2>
          <p className={styles.sectionDesc}>
            A customer matches if any checked item is true in your store.
          </p>

          <div className={styles.historyList}>
            {/* Item 1 */}
            <div
              className={styles.historyItem}
              onClick={() => toggleHistoryCheck("refusedOrCancelled")}
            >
              <div
                className={`${styles.checkboxBox} ${
                  historyChecks.refusedOrCancelled
                    ? styles.checkboxBoxChecked
                    : ""
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
                  An earlier COD order was refused or cancelled by the customer
                </h3>
                <p className={styles.historyDesc}>
                  Includes orders cancelled by the customer or returned without delivery.
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
                  An earlier COD order was marked unreachable in the contact sheet
                </h3>
                <p className={styles.historyDesc}>
                  Includes orders you marked as unreachable.
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

        {/* Section 3: Your own lists */}
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>3. Your own lists</h2>
          <p className={styles.sectionDesc}>
            Trusted customers always keep COD. Blocked customers never see it.
          </p>

          <div className={styles.twoColGrid}>
            {/* Column 1: Always allow COD */}
            <div className={styles.listCard}>
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
                  <p className={styles.listSub}>Trusted customers</p>
                </div>
              </div>

              <div className={styles.listBody}>
                <form className={styles.inputRow} onSubmit={handleAddAllowed}>
                  <input
                    type="tel"
                    className={styles.phoneInput}
                    placeholder="Enter phone number"
                    value={allowPhoneInput}
                    onChange={(e) => setAllowPhoneInput(e.target.value)}
                  />
                  <button type="submit" className={styles.btnAdd}>
                    Add
                  </button>
                </form>

                {allowedNumbers.length === 0 ? (
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
                        Add phone numbers of customers you trust.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={styles.tagList}>
                    {allowedNumbers.map((num) => (
                      <span key={num} className={styles.phoneTag}>
                        {num}
                        <button
                          type="button"
                          className={styles.tagRemoveBtn}
                          onClick={() => handleRemoveAllowed(num)}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Always hide COD */}
            <div className={styles.listCard}>
              <div className={`${styles.listHeader} ${styles.listHeaderHide}`}>
                <div className={`${styles.listIconBox} ${styles.iconBoxHide}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#dc2626" strokeWidth="2" />
                    <line x1="5.5" y1="5.5" x2="18.5" y2="18.5" stroke="#dc2626" strokeWidth="2" />
                  </svg>
                </div>
                <div>
                  <h3 className={styles.listTitle}>Always hide COD</h3>
                  <p className={styles.listSub}>Blocked customers</p>
                </div>
              </div>

              <div className={styles.listBody}>
                <form className={styles.inputRow} onSubmit={handleAddHidden}>
                  <input
                    type="tel"
                    className={styles.phoneInput}
                    placeholder="Enter phone number"
                    value={hidePhoneInput}
                    onChange={(e) => setHidePhoneInput(e.target.value)}
                  />
                  <button type="submit" className={styles.btnAdd}>
                    Add
                  </button>
                </form>

                {hiddenNumbers.length === 0 ? (
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
                        Add phone numbers of customers to block.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={styles.tagList}>
                    {hiddenNumbers.map((num) => (
                      <span key={num} className={styles.phoneTag}>
                        {num}
                        <button
                          type="button"
                          className={styles.tagRemoveBtn}
                          onClick={() => handleRemoveHidden(num)}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info callout at bottom of Section 3 */}
          <div className={styles.infoBox}>
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

        {/* Footer actions */}
        <div className={styles.footerRow}>
          <Link to="/app" className={styles.btnCancel}>
            Cancel
          </Link>
          <button type="button" className={styles.btnSave} onClick={handleSave}>
            Save changes
          </button>
        </div>
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
