import { useState } from "react";
import { Link } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Dashboard() {
  const [showModal, setShowModal] = useState(true);
  const [checkoutStatus, setCheckoutStatus] = useState("Off");

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  const toggleCheckoutStatus = () => {
    setCheckoutStatus((prev) => (prev === "Off" ? "On" : "Off"));
  };

  return (
    <s-page heading="Trust COD">
      {/* ── COD Losses Prevention Modal (Appears on Dashboard) ── */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Close button */}
            <button
              className={styles.modalClose}
              onClick={handleCloseModal}
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M15 5L5 15M5 5l10 10"
                  stroke="#6b7280"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Modal content layout */}
            <div className={styles.modalBody}>
              <div className={styles.modalLeft}>
                {/* Header with chart icon */}
                <div className={styles.modalHeader}>
                  <div className={styles.modalChartIcon}>
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <rect x="3" y="11" width="3.5" height="7" rx="1" fill="#16a34a" />
                      <rect x="8.5" y="7" width="3.5" height="11" rx="1" fill="#16a34a" />
                      <rect x="14" y="3" width="3.5" height="15" rx="1" fill="#16a34a" />
                    </svg>
                  </div>
                  <span className={styles.modalHeaderText}>
                    In the last 60 days,
                  </span>
                </div>

                {/* Title */}
                <h2 className={styles.modalTitle}>
                  You could have prevented
                  <br />
                  these COD losses
                </h2>

                {/* Description */}
                <p className={styles.modalDesc}>
                  Based on your store&apos;s COD orders, here&apos;s what our app could
                  have helped you identify and prevent.
                </p>

                {/* Stats row */}
                <div className={styles.statsRow}>
                  {/* Stat 1 - COD orders scanned */}
                  <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                        <rect x="3" y="2" width="14" height="16" rx="2" stroke="#16a34a" strokeWidth="1.6" />
                        <line x1="6" y1="6" x2="8" y2="6" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" />
                        <line x1="10" y1="6" x2="14" y2="6" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" />
                        <line x1="6" y1="10" x2="8" y2="10" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" />
                        <line x1="10" y1="10" x2="14" y2="10" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" />
                        <line x1="6" y1="14" x2="8" y2="14" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" />
                        <line x1="10" y1="14" x2="12" y2="14" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className={styles.statContent}>
                      <span className={styles.statLabel}>
                        COD orders scanned
                      </span>
                      <span className={styles.statValue}>1,240</span>
                    </div>
                  </div>

                  {/* Stat 2 - High or medium risk */}
                  <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.statIconAmber}`}>
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M10 2.5L1.8 16.5C1.6 16.8 1.8 17.5 2.3 17.5H17.7C18.2 17.5 18.4 16.8 18.2 16.5L10 2.5Z"
                          fill="#fef3c7"
                          stroke="#f59e0b"
                          strokeWidth="1.6"
                          strokeLinejoin="round"
                        />
                        <line x1="10" y1="8" x2="10" y2="11.5" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
                        <circle cx="10" cy="14.5" r="0.9" fill="#f59e0b" />
                      </svg>
                    </div>
                    <div className={styles.statContent}>
                      <span className={styles.statLabel}>
                        Would have been high
                        <br />
                        or medium risk
                      </span>
                      <span className={styles.statValue}>420</span>
                    </div>
                  </div>

                  {/* Stat 3 - Cancelled or refunded */}
                  <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.statIconRed}`}>
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="7.5" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.6" />
                        <line x1="7.5" y1="7.5" x2="12.5" y2="12.5" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round" />
                        <line x1="12.5" y1="7.5" x2="7.5" y2="12.5" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className={styles.statContent}>
                      <span className={styles.statLabel}>
                        Of those, cancelled
                        <br />
                        or refunded
                      </span>
                      <span className={styles.statValue}>310</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Rupee & chart illustration */}
              <div className={styles.modalRight}>
                <svg
                  width="180"
                  height="160"
                  viewBox="0 0 180 160"
                  fill="none"
                  className={styles.modalIllustration}
                >
                  <circle cx="120" cy="70" r="60" fill="#f0fdf4" />
                  <circle cx="70" cy="85" r="45" fill="#f6fef8" />

                  {/* Floating document / card */}
                  <rect
                    x="20"
                    y="45"
                    width="95"
                    height="68"
                    rx="8"
                    fill="white"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                  <rect x="28" y="55" width="38" height="8" rx="4" fill="#bbf7d0" />
                  <circle cx="31" cy="75" r="2.5" fill="#bbf7d0" />
                  <rect x="37" y="73.5" width="32" height="3.5" rx="1.75" fill="#e5e7eb" />
                  <circle cx="31" cy="88" r="2.5" fill="#bbf7d0" />
                  <rect x="37" y="86.5" width="22" height="3.5" rx="1.75" fill="#e5e7eb" />

                  {/* Rising bar chart columns */}
                  <rect x="118" y="92" width="10" height="24" rx="4" fill="#86efac" />
                  <rect x="132" y="76" width="10" height="40" rx="4" fill="#4ade80" />
                  <rect x="146" y="58" width="10" height="58" rx="4" fill="#22c55e" />

                  {/* Rupee badge at top right */}
                  <circle cx="138" cy="36" r="22" fill="#dcfce7" />
                  <text
                    x="138"
                    y="44"
                    textAnchor="middle"
                    fontSize="22"
                    fontWeight="700"
                    fill="#15803d"
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    ₹
                  </text>
                </svg>
              </div>
            </div>

            {/* Modal footer buttons */}
            <div className={styles.modalFooter}>
              <button
                className={styles.modalBtnSecondary}
                onClick={handleCloseModal}
              >
                Maybe later
              </button>
              <button
                className={styles.modalBtnPrimary}
                onClick={handleCloseModal}
              >
                Continue to dashboard <span className={styles.arrowIcon}>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Dashboard Layout ── */}
      <div className={styles.dashboardContainer}>
        {/* Header Row */}
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.heading}>Dashboard</h1>
            <p className={styles.subheading}>
              Get an overview of your COD risk, manage controls, and take action to prevent losses.
            </p>
          </div>

          <button className={styles.datePickerBtn} type="button">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="4" width="14" height="13" rx="2" stroke="#4b5563" strokeWidth="1.6" />
              <line x1="3" y1="8" x2="17" y2="8" stroke="#4b5563" strokeWidth="1.6" />
              <line x1="7" y1="2" x2="7" y2="5" stroke="#4b5563" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="13" y1="2" x2="13" y2="5" stroke="#4b5563" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span>Last 30 days</span>
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
              <path d="M5 7.5L10 12.5L15 7.5" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Banner: Checkout COD control */}
        <div className={styles.bannerCard}>
          <div className={styles.bannerContent}>
            <h2 className={styles.bannerTitle}>Checkout COD control</h2>
            <p className={styles.bannerDesc}>
              Hide or limit COD at checkout for customers with a risky history.
            </p>
            <div
              className={styles.statusIndicator}
              style={{ cursor: "pointer" }}
              onClick={toggleCheckoutStatus}
              title="Click to toggle status"
            >
              <span
                className={`${styles.statusDot} ${
                  checkoutStatus === "On" ? styles.statusDotActive : ""
                }`}
              />
              <span>Status: {checkoutStatus}</span>
            </div>
          </div>

          <button
            className={styles.btnPrimary}
            onClick={() => setCheckoutStatus((s) => (s === "Off" ? "On" : "Off"))}
          >
            Set up checkout control <span className={styles.arrowIcon}>→</span>
          </button>
        </div>

        {/* Section: Risk profile of your COD orders */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Risk profile of your COD orders</h2>
            <p className={styles.sectionSubtitle}>
              Select a profile to see which orders fall in it.
            </p>
          </div>

          <div className={styles.riskProfileContent}>
            {/* Left: Donut Chart with center label */}
            <div className={styles.chartContainer}>
              <svg className={styles.chartSvg} viewBox="0 0 200 200">
                {/* Background track circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="75"
                  fill="none"
                  stroke="#f3f4f6"
                  strokeWidth="24"
                />

                {/* 
                  Circumference = 2 * PI * 75 = 471.24
                  Red segment: 20% = 94.25 (starts at 0)
                  Amber segment: 32% = 150.80 (starts after 94.25)
                  Green segment: 48% = 226.19 (starts after 94.25 + 150.80 = 245.05)
                */}
                {/* Red segment: 20% (High risk) */}
                <circle
                  cx="100"
                  cy="100"
                  r="75"
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="24"
                  strokeDasharray="94.25 471.24"
                  strokeDashoffset="0"
                />

                {/* Amber segment: 32% (Medium risk) */}
                <circle
                  cx="100"
                  cy="100"
                  r="75"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="24"
                  strokeDasharray="150.80 471.24"
                  strokeDashoffset="-94.25"
                />

                {/* Green segment: 48% (Low risk) */}
                <circle
                  cx="100"
                  cy="100"
                  r="75"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="24"
                  strokeDasharray="226.19 471.24"
                  strokeDashoffset="-245.05"
                />
              </svg>

              <div className={styles.chartCenterLabel}>
                <h3 className={styles.chartTotal}>248</h3>
                <p className={styles.chartLabel}>COD orders</p>
                <p className={styles.chartSublabel}>Last 30 days</p>
              </div>
            </div>

            {/* Right: 3 Risk Profile Cards */}
            <div className={styles.profileCardsList}>
              {/* Low risk profile */}
              <Link to="/app/risk-orders?risk=low" className={`${styles.profileCard} ${styles.profileCardLow}`}>
                <div className={styles.profileLeft}>
                  <span className={`${styles.profileDot} ${styles.dotLow}`} />
                  <div>
                    <h4 className={styles.profileTitle}>Low risk profile</h4>
                    <p className={styles.profileCount}>120 orders (48%)</p>
                  </div>
                </div>
                <span className={styles.chevronIcon}>›</span>
              </Link>

              {/* Medium risk profile */}
              <Link to="/app/risk-orders?risk=medium" className={`${styles.profileCard} ${styles.profileCardMedium}`}>
                <div className={styles.profileLeft}>
                  <span className={`${styles.profileDot} ${styles.dotMedium}`} />
                  <div>
                    <h4 className={styles.profileTitle}>Medium risk profile</h4>
                    <p className={styles.profileCount}>80 orders (32%)</p>
                  </div>
                </div>
                <span className={styles.chevronIcon}>›</span>
              </Link>

              {/* High risk profile */}
              <Link to="/app/risk-orders?risk=high" className={`${styles.profileCard} ${styles.profileCardHigh}`}>
                <div className={styles.profileLeft}>
                  <span className={`${styles.profileDot} ${styles.dotHigh}`} />
                  <div>
                    <h4 className={styles.profileTitle}>High risk profile</h4>
                    <p className={styles.profileCount}>48 orders (20%)</p>
                  </div>
                </div>
                <span className={styles.chevronIcon}>›</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Section: Manage risk rules */}
        <div className={styles.riskRulesBanner}>
          <div className={styles.riskRulesLeft}>
            <div className={styles.riskRulesIconBox}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <line x1="4" y1="7" x2="20" y2="7" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
                <circle cx="8" cy="7" r="2.5" fill="#16a34a" />
                <line x1="4" y1="17" x2="20" y2="17" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
                <circle cx="16" cy="17" r="2.5" fill="#16a34a" />
              </svg>
            </div>
            <div className={styles.riskRulesContent}>
              <h3 className={styles.riskRulesTitle}>Manage risk rules</h3>
              <p className={styles.riskRulesDesc}>
                Choose which order patterns count as high, medium, or low risk.
              </p>
              <div className={styles.pillRow}>
                <span className={`${styles.pill} ${styles.pillHigh}`}>
                  <span className={styles.pillDot} /> High risk
                </span>
                <span className={`${styles.pill} ${styles.pillMedium}`}>
                  <span className={styles.pillDot} /> Medium risk
                </span>
                <span className={`${styles.pill} ${styles.pillLow}`}>
                  <span className={styles.pillDot} /> Low risk
                </span>
              </div>
            </div>
          </div>

          <Link to="/app/risk-rules" className={styles.btnPrimary}>
            Edit risk rules <span className={styles.arrowIcon}>→</span>
          </Link>
        </div>

        {/* Bottom Grid: 3 Action Cards */}
        <div className={styles.bottomGrid}>
          {/* Card 1: Contact sheet */}
          <div className={styles.actionCard}>
            <div className={styles.actionCardTop}>
              <div className={styles.actionCardIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
                    fill="#16a34a"
                  />
                </svg>
              </div>
              <h3 className={styles.actionCardTitle}>Contact sheet</h3>
              <p className={styles.actionCardDesc}>
                View high and medium risk orders with phone numbers for a quick review.
              </p>
            </div>
            <Link to="/app/contact-sheet" className={styles.btnOutline}>
              Open contact sheet <span className={styles.arrowIcon}>→</span>
            </Link>
          </div>

          {/* Card 2: Analytics */}
          <div className={styles.actionCard}>
            <div className={styles.actionCardTop}>
              <div className={styles.actionCardIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="13" width="3.5" height="7" rx="1" fill="#16a34a" />
                  <rect x="10.25" y="8" width="3.5" height="12" rx="1" fill="#16a34a" />
                  <rect x="16.5" y="4" width="3.5" height="16" rx="1" fill="#16a34a" />
                </svg>
              </div>
              <h3 className={styles.actionCardTitle}>Analytics</h3>
              <p className={styles.actionCardDesc}>
                See orders flagged, orders stopped and estimated money saved.
              </p>
            </div>
            <Link to="/app/analytics" className={styles.btnOutline}>
              Check analytics <span className={styles.arrowIcon}>→</span>
            </Link>
          </div>

          {/* Card 3: Review us */}
          <div className={styles.actionCard}>
            <div className={styles.actionCardTop}>
              <div className={styles.actionCardIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0-2-.9-2-2V4c0-1.1-.9-2-2-2zm-6 10H7v-2h7v2zm3-4H7V6h10v2z"
                    fill="#16a34a"
                  />
                </svg>
              </div>
              <h3 className={styles.actionCardTitle}>Review us</h3>
              <p className={styles.actionCardDesc}>
                Enjoying the app? Tell us what you think.
              </p>
            </div>
            <a
              href="https://apps.shopify.com"
              target="_blank"
              rel="noreferrer"
              className={styles.btnOutline}
            >
              Review us <span className={styles.arrowIcon}>→</span>
            </a>
          </div>
        </div>
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
