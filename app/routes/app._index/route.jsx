import { useState, useEffect } from "react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  const [appEmbedEnabled, setAppEmbedEnabled] = useState(true);
  const [showModal, setShowModal] = useState(true);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("trust_cod_modal_dismissed") === "true") {
        setShowModal(false);
      }
    } catch {
      // ignore storage access issues
    }
  }, []);

  const handleCloseModal = () => {
    try {
      sessionStorage.setItem("trust_cod_modal_dismissed", "true");
    } catch {
      // ignore storage access issues
    }
    setShowModal(false);
  };

  return (
    <s-page heading="Trust COD">
      {/* ── COD Losses Prevention Modal (Appears once when page opens) ── */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
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

              {/* Right side - Rupee & chart illustration matching wireframe */}
              <div className={styles.modalRight}>
                <svg
                  width="180"
                  height="160"
                  viewBox="0 0 180 160"
                  fill="none"
                  className={styles.modalIllustration}
                >
                  {/* Soft green background auras */}
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
                  {/* Top pill inside card */}
                  <rect x="28" y="55" width="38" height="8" rx="4" fill="#bbf7d0" />
                  {/* Row 1 inside card */}
                  <circle cx="31" cy="75" r="2.5" fill="#bbf7d0" />
                  <rect x="37" y="73.5" width="32" height="3.5" rx="1.75" fill="#e5e7eb" />
                  {/* Row 2 inside card */}
                  <circle cx="31" cy="88" r="2.5" fill="#bbf7d0" />
                  <rect x="37" y="86.5" width="22" height="3.5" rx="1.75" fill="#e5e7eb" />

                  {/* Rising bar chart columns */}
                  {/* Bar 1 (leftmost/shortest) */}
                  <rect x="118" y="92" width="10" height="24" rx="4" fill="#86efac" />
                  {/* Bar 2 (middle) */}
                  <rect x="132" y="76" width="10" height="40" rx="4" fill="#4ade80" />
                  {/* Bar 3 (rightmost/tallest) */}
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
                Continue to dashboard <span className={styles.arrow}>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Onboarding Screen ── */}
      <div className={styles.onboardingCard}>
        {/* Decorative background shapes */}
        <div className={styles.bgShape1} />
        <div className={styles.bgShape2} />
        <div className={styles.bgShape3} />

        <div className={styles.mainContent}>
          {/* ── Left: Welcome + Features ── */}
          <div className={styles.left}>
            <h1 className={styles.heading}>
              Welcome to <span className={styles.brand}>Trust COD</span>
            </h1>
            <p className={styles.tagline}>
              Spot risky Cash on Delivery orders before you ship them.
            </p>

            <div className={styles.featureList}>
              {/* Feature 1 – Risk labelling */}
              <div className={styles.feature}>
                <div className={styles.iconCircle}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <path
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      fill="white"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className={styles.featureTitle}>
                    Know which COD orders are risky
                  </h3>
                  <p className={styles.featureDesc}>
                    Every COD order gets a low, medium or high risk label with a
                    reason.
                  </p>
                </div>
              </div>

              {/* Feature 2 – Contact sheet */}
              <div className={styles.feature}>
                <div className={styles.iconCircle}>
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
                      fill="white"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className={styles.featureTitle}>
                    Call only the orders that need it
                  </h3>
                  <p className={styles.featureDesc}>
                    A contact sheet lists high and medium risk orders for your
                    team.
                  </p>
                </div>
              </div>

              {/* Feature 3 – Checkout control */}
              <div className={styles.feature}>
                <div className={styles.iconCircle}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <path
                      d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.062 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                      fill="white"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className={styles.featureTitle}>
                    Stay in control at checkout
                  </h3>
                  <p className={styles.featureDesc}>
                    Hide COD for risky customers or set usage limits.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Illustration with risk badges ── */}
          <div className={styles.right}>
            <div className={styles.illustrationArea}>
              <div className={styles.glowCircle} />
              <img
                src="/trust-cod-logo.png"
                alt="Trust COD"
                className={styles.logoImage}
              />

              {/* High Risk badge */}
              <div className={`${styles.badge} ${styles.badgeHigh}`}>
                <div className={styles.badgeIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M1 21h22L12 2 1 21z"
                      fill="#dc2626"
                      stroke="#dc2626"
                      strokeWidth="0.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 9v4"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <circle cx="12" cy="16" r="1" fill="white" />
                  </svg>
                </div>
                <div>
                  <div
                    className={styles.badgeLabel}
                    style={{ color: "#dc2626" }}
                  >
                    High Risk
                  </div>
                  <div className={styles.badgeDesc}>Incomplete address</div>
                </div>
              </div>

              {/* Medium Risk badge */}
              <div className={`${styles.badge} ${styles.badgeMedium}`}>
                <div className={styles.badgeIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M1 21h22L12 2 1 21z"
                      fill="#f59e0b"
                      stroke="#f59e0b"
                      strokeWidth="0.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 9v4"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <circle cx="12" cy="16" r="1" fill="white" />
                  </svg>
                </div>
                <div>
                  <div
                    className={styles.badgeLabel}
                    style={{ color: "#f59e0b" }}
                  >
                    Medium Risk
                  </div>
                  <div className={styles.badgeDesc}>Repeat orders</div>
                </div>
              </div>

              {/* Low Risk badge */}
              <div className={`${styles.badge} ${styles.badgeLow}`}>
                <div className={styles.badgeIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#16a34a" />
                    <path
                      d="M7 12l3.5 3.5L17 9"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <div
                    className={styles.badgeLabel}
                    style={{ color: "#16a34a" }}
                  >
                    Low Risk
                  </div>
                  <div className={styles.badgeDesc}>Looks good</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── App Embed Bar ── */}
        <div className={styles.embedBar}>
          <div className={styles.embedIcon}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect
                x="2"
                y="4"
                width="16"
                height="13"
                rx="2"
                fill="#16a34a"
              />
              <rect x="5" y="1" width="10" height="5" rx="1" fill="#22c55e" />
              <rect x="6" y="8" width="3" height="3" rx="0.5" fill="white" />
              <rect x="6" y="12" width="8" height="1.5" rx="0.5" fill="white" opacity="0.6" />
            </svg>
          </div>
          <div className={styles.embedTextArea}>
            <h4 className={styles.embedTitle}>
              Enable app embed (Recommended)
            </h4>
            <p className={styles.embedDesc}>
              This helps Trust COD check risky customers at checkout and hide
              Cash on Delivery for them.
            </p>
          </div>

          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={appEmbedEnabled}
              onChange={(e) => setAppEmbedEnabled(e.target.checked)}
              className={styles.toggleInput}
            />
            <span className={styles.toggleSlider} />
          </label>

          {appEmbedEnabled && (
            <div className={styles.embedStatus}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" fill="#16a34a" />
                <path
                  d="M5 8l2 2 4-4"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>App embed enabled</span>
            </div>
          )}
        </div>

        {/* ── Get Started CTA ── */}
        <div className={styles.ctaWrapper}>
          <button className={styles.ctaButton} onClick={() => setShowModal(true)}>
            Get started <span className={styles.arrow}>→</span>
          </button>
        </div>
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
