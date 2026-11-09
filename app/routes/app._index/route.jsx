import { useState } from "react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  const [appEmbedEnabled, setAppEmbedEnabled] = useState(true);

  return (
    <s-page heading="Trust COD">
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
          <button className={styles.ctaButton}>
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
