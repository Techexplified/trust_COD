import { useState } from "react";
import { Link, useLoaderData } from "react-router";
import { authenticate } from "../../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return { ok: true };
};

export default function AnalyticsRoute() {
  useLoaderData();

  // Date range dropdown state
  const [dateRange, setDateRange] = useState("Last 30 days");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Average loss per failed COD order (editable)
  const [averageLoss, setAverageLoss] = useState("500");
  const [inputValue, setInputValue] = useState("500");
  const [savedMessage, setSavedMessage] = useState(false);

  // Active chart hover tooltips
  const [hoveredBar, setHoveredBar] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const dateOptions = [
    "Last 7 days",
    "Last 30 days",
    "Last 60 days",
    "Last 90 days",
  ];

  const handleUpdateLoss = (e) => {
    e.preventDefault();
    setAverageLoss(inputValue);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2500);
  };

  // Stacked Bar Data (11 points across the 30-day period)
  const barData = [
    { date: "Apr 1", low: 18, med: 15, high: 10 },
    { date: "Apr 4", low: 22, med: 17, high: 10 },
    { date: "Apr 7", low: 24, med: 19, high: 12 },
    { date: "Apr 10", low: 38, med: 20, high: 13 },
    { date: "Apr 13", low: 20, med: 16, high: 10 },
    { date: "Apr 16", low: 22, med: 19, high: 10 },
    { date: "Apr 19", low: 19, med: 15, high: 9 },
    { date: "Apr 22", low: 28, med: 18, high: 11 },
    { date: "Apr 25", low: 36, med: 21, high: 14 },
    { date: "Apr 28", low: 22, med: 20, high: 11 },
    { date: "Apr 30", low: 28, med: 18, high: 10 },
  ];

  // Savings Area Line Data (in thousands ₹)
  const lineData = [
    { date: "Apr 1", val: 3.8 },
    { date: "Apr 4", val: 6.5 },
    { date: "Apr 7", val: 9.8 },
    { date: "Apr 10", val: 14.2 },
    { date: "Apr 13", val: 16.5 },
    { date: "Apr 16", val: 20.0 },
    { date: "Apr 19", val: 23.4 },
    { date: "Apr 22", val: 28.5 },
    { date: "Apr 25", val: 26.8 },
    { date: "Apr 28", val: 31.5 },
    { date: "Apr 30", val: 36.2 },
  ];

  // SVG Chart Coordinate Math
  const chartHeight = 150;
  const chartTop = 20;
  const chartBottom = chartTop + chartHeight; // 170
  const maxBarY = 80;
  const maxLineY = 40;

  // Compute Area / Line Chart Points
  const leftX = 45;
  const stepX = 43.5;
  const linePoints = lineData.map((d, i) => {
    const x = leftX + i * stepX;
    const y = chartBottom - (d.val / maxLineY) * chartHeight;
    return { ...d, x, y };
  });

  const pathD = linePoints.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ""
  );

  const areaD = `${pathD} L ${linePoints[linePoints.length - 1].x} ${chartBottom} L ${linePoints[0].x} ${chartBottom} Z`;

  return (
    <s-page>
      <div className={styles.pageContainer}>
        {/* Navigation Breadcrumb / Back Link */}
        <div className={styles.backNavRow}>
          <Link to="/app" className={styles.backLink}>
            <span className={styles.backArrowIcon}>←</span> Back to dashboard
          </Link>
        </div>

        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>Analytics</h1>
            <p className={styles.pageSubtitle}>
              Get insights into your COD orders, risk levels, and estimated savings.
            </p>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.dateDropdownWrapper}>
              <button
                type="button"
                className={styles.dateDropdownBtn}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                aria-haspopup="true"
                aria-expanded={isDropdownOpen}
              >
                <svg
                  className={styles.calendarIcon}
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <rect
                    x="2.5"
                    y="3.5"
                    width="15"
                    height="14"
                    rx="2"
                    stroke="#4b5563"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="2.5"
                    y1="7.5"
                    x2="17.5"
                    y2="7.5"
                    stroke="#4b5563"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="6.5"
                    y1="1.5"
                    x2="6.5"
                    y2="4.5"
                    stroke="#4b5563"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="13.5"
                    y1="1.5"
                    x2="13.5"
                    y2="4.5"
                    stroke="#4b5563"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <span>{dateRange}</span>
                <span className={styles.dropdownChevron}>▾</span>
              </button>

              {isDropdownOpen && (
                <div className={styles.dateDropdownMenu}>
                  {dateOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`${styles.dateDropdownItem} ${
                        dateRange === opt ? styles.dateDropdownItemActive : ""
                      }`}
                      onClick={() => {
                        setDateRange(opt);
                        setIsDropdownOpen(false);
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3 Top Summary / KPI Cards */}
        <div className={styles.kpiGrid}>
          {/* Card 1: Orders flagged */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrapper}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 4v17M4 5h12.5a1.5 1.5 0 0 1 1.2 2.4L15.5 10l2.2 2.6A1.5 1.5 0 0 1 16.5 15H4"
                  stroke="#16a34a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>Orders flagged</span>
              <div className={styles.kpiValue}>248</div>
              <div className={styles.kpiTrend}>
                <span className={styles.trendArrow}>↑</span>
                <span className={styles.trendText}>12% vs previous 30 days</span>
              </div>
            </div>
          </div>

          {/* Card 2: Confirmed or cancelled before shipping */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrapper}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17L4 12"
                  stroke="#16a34a"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>
                Confirmed or cancelled before shipping
              </span>
              <div className={styles.kpiValue}>186</div>
              <div className={styles.kpiTrend}>
                <span className={styles.trendArrow}>↑</span>
                <span className={styles.trendText}>18% vs previous 30 days</span>
              </div>
            </div>
          </div>

          {/* Card 3: Estimated money saved */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrapper}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <ellipse
                  cx="12"
                  cy="6"
                  rx="7"
                  ry="3"
                  stroke="#16a34a"
                  strokeWidth="1.8"
                />
                <path
                  d="M5 6v5c0 1.66 3.13 3 7 3s7-1.34 7-3V6"
                  stroke="#16a34a"
                  strokeWidth="1.8"
                />
                <path
                  d="M5 11v5c0 1.66 3.13 3 7 3s7-1.34 7-3v-5"
                  stroke="#16a34a"
                  strokeWidth="1.8"
                />
              </svg>
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>Estimated money saved</span>
              <div className={styles.kpiValue}>₹24,800</div>
              <div className={styles.kpiTrend}>
                <span className={styles.trendArrow}>↑</span>
                <span className={styles.trendText}>22% vs previous 30 days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row: 2 Cards Side-by-Side */}
        <div className={styles.chartsGrid}>
          {/* Left Chart Card: COD orders by risk profile */}
          <div className={styles.chartCard}>
            <div className={styles.chartCardHeader}>
              <h3 className={styles.chartCardTitle}>COD orders by risk profile</h3>
              <p className={styles.chartCardSubtitle}>
                See the number of COD orders in each risk category.
              </p>
            </div>

            <div className={styles.chartSvgWrapper}>
              <svg
                viewBox="0 0 520 220"
                className={styles.chartSvg}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Horizontal Gridlines & Y-Axis Labels */}
                {[
                  { val: 80, y: 20 },
                  { val: 60, y: 57.5 },
                  { val: 40, y: 95 },
                  { val: 20, y: 132.5 },
                  { val: 0, y: 170 },
                ].map((grid) => (
                  <g key={grid.val}>
                    <line
                      x1="40"
                      y1={grid.y}
                      x2="505"
                      y2={grid.y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray={grid.val === 0 ? "none" : "3,3"}
                    />
                    <text
                      x="32"
                      y={grid.y + 3.5}
                      textAnchor="end"
                      fill="#94a3b8"
                      fontSize="10"
                      fontFamily="inherit"
                    >
                      {grid.val}
                    </text>
                  </g>
                ))}

                {/* Stacked Bars */}
                {barData.map((d, i) => {
                  const x = leftX + i * stepX - 10;
                  const barW = 20;

                  const hLow = (d.low / maxBarY) * chartHeight;
                  const hMed = (d.med / maxBarY) * chartHeight;
                  const hHigh = (d.high / maxBarY) * chartHeight;

                  const yLow = chartBottom - hLow;
                  const yMed = yLow - hMed;
                  const yHigh = yMed - hHigh;

                  const isHovered = hoveredBar === i;

                  return (
                    <g
                      key={d.date}
                      className={styles.barGroup}
                      onMouseEnter={() => setHoveredBar(i)}
                      onMouseLeave={() => setHoveredBar(null)}
                      style={{ cursor: "pointer" }}
                    >
                      {/* Low Risk Segment (Green) */}
                      <rect
                        x={x}
                        y={yLow}
                        width={barW}
                        height={hLow}
                        fill="#16a34a"
                        rx="0"
                        opacity={isHovered ? 0.85 : 1}
                      />
                      {/* Medium Risk Segment (Amber) */}
                      <rect
                        x={x}
                        y={yMed}
                        width={barW}
                        height={hMed}
                        fill="#f59e0b"
                        rx="0"
                        opacity={isHovered ? 0.85 : 1}
                      />
                      {/* High Risk Segment (Red) */}
                      <rect
                        x={x}
                        y={yHigh}
                        width={barW}
                        height={hHigh}
                        fill="#ef4444"
                        rx="2"
                        opacity={isHovered ? 0.85 : 1}
                      />

                      {/* X-axis Date label */}
                      <text
                        x={x + barW / 2}
                        y="188"
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="9.5"
                        fontWeight="500"
                      >
                        {d.date}
                      </text>

                      {/* Tooltip on hover */}
                      {isHovered && (
                        <g>
                          <rect
                            x={Math.min(Math.max(x - 30, 10), 430)}
                            y={Math.max(yHigh - 44, 2)}
                            width="80"
                            height="38"
                            rx="4"
                            fill="#0f172a"
                            opacity="0.92"
                          />
                          <text
                            x={Math.min(Math.max(x - 30, 10), 430) + 40}
                            y={Math.max(yHigh - 44, 2) + 15}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="9"
                            fontWeight="600"
                          >
                            {d.date}: {d.low + d.med + d.high} orders
                          </text>
                          <text
                            x={Math.min(Math.max(x - 30, 10), 430) + 40}
                            y={Math.max(yHigh - 44, 2) + 29}
                            textAnchor="middle"
                            fill="#cbd5e1"
                            fontSize="8"
                          >
                            H:{d.high} M:{d.med} L:{d.low}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legend */}
            <div className={styles.chartLegend}>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ background: "#16a34a" }}
                />
                <span className={styles.legendLabel}>Low risk</span>
              </div>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ background: "#f59e0b" }}
                />
                <span className={styles.legendLabel}>Medium risk</span>
              </div>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ background: "#ef4444" }}
                />
                <span className={styles.legendLabel}>High risk</span>
              </div>
            </div>
          </div>

          {/* Right Chart Card: Estimated money saved over time */}
          <div className={styles.chartCard}>
            <div className={styles.chartCardHeader}>
              <h3 className={styles.chartCardTitle}>
                Estimated money saved over time
              </h3>
              <p className={styles.chartCardSubtitle}>
                This is an estimate based on failed COD orders.
              </p>
            </div>

            <div className={styles.chartSvgWrapper}>
              <svg
                viewBox="0 0 520 220"
                className={styles.chartSvg}
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16a34a" stopOpacity="0.28" />
                    <stop offset="85%" stopColor="#16a34a" stopOpacity="0.04" />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines & Y-Axis Labels */}
                {[
                  { label: "40K", y: 20 },
                  { label: "30K", y: 57.5 },
                  { label: "20K", y: 95 },
                  { label: "10K", y: 132.5 },
                  { label: "0", y: 170 },
                ].map((grid) => (
                  <g key={grid.label}>
                    <line
                      x1="40"
                      y1={grid.y}
                      x2="505"
                      y2={grid.y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <text
                      x="32"
                      y={grid.y + 3.5}
                      textAnchor="end"
                      fill="#94a3b8"
                      fontSize="10"
                      fontFamily="inherit"
                    >
                      {grid.label}
                    </text>
                  </g>
                ))}

                {/* Filled Area */}
                <path d={areaD} fill="url(#areaGradient)" />

                {/* Line Path */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Point Circles and Date Labels */}
                {linePoints.map((pt, i) => {
                  const isHovered = hoveredPoint === i;

                  return (
                    <g
                      key={pt.date}
                      onMouseEnter={() => setHoveredPoint(i)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      style={{ cursor: "pointer" }}
                    >
                      {/* Point Circle */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 5.5 : 3.5}
                        fill="#16a34a"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />

                      {/* X-axis Date label */}
                      <text
                        x={pt.x}
                        y="188"
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="9.5"
                        fontWeight="500"
                      >
                        {pt.date}
                      </text>

                      {/* Tooltip on hover */}
                      {isHovered && (
                        <g>
                          <rect
                            x={Math.min(Math.max(pt.x - 38, 10), 430)}
                            y={Math.max(pt.y - 36, 4)}
                            width="76"
                            height="26"
                            rx="4"
                            fill="#0f172a"
                            opacity="0.92"
                          />
                          <text
                            x={Math.min(Math.max(pt.x - 38, 10), 430) + 38}
                            y={Math.max(pt.y - 36, 4) + 17}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="9.5"
                            fontWeight="600"
                          >
                            ₹{(pt.val * 1000).toLocaleString("en-IN")}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* Card: How the saving is estimated */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionCardHeader}>
            <h3 className={styles.sectionCardTitle}>How the saving is estimated</h3>
            <p className={styles.sectionCardDesc}>
              Estimated saving is the number of orders cancelled before shipping
              multiplied by your average loss on a failed COD order. It is an
              estimate, not an exact figure.
            </p>
          </div>

          <form onSubmit={handleUpdateLoss} className={styles.estimateForm}>
            <div className={styles.inputGroup}>
              <label htmlFor="avgLoss" className={styles.inputLabel}>
                Average loss per failed COD order
              </label>
              <div className={styles.currencyInputWrapper}>
                <span className={styles.currencyPrefix}>₹</span>
                <input
                  id="avgLoss"
                  type="number"
                  className={styles.currencyInput}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  min="0"
                  step="10"
                />
              </div>
            </div>

            <button type="submit" className={styles.btnUpdate}>
              Update
            </button>

            {savedMessage && (
              <span className={styles.savedNotice}>
                ✓ Saved (using ₹{averageLoss})
              </span>
            )}
          </form>
        </div>

        {/* Bottom Card: Install report: your last 60 days */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionCardHeader}>
            <h3 className={styles.sectionCardTitle}>
              Install report: your last 60 days
            </h3>
            <p className={styles.sectionCardDesc}>
              What the app would have flagged in your COD orders before you
              installed it.
            </p>
          </div>

          <div className={styles.installReportGrid}>
            {/* Sub-card 1: COD orders scanned */}
            <div className={styles.installReportCard}>
              <div className={styles.installReportIcon}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect
                    x="3"
                    y="2"
                    width="14"
                    height="16"
                    rx="2"
                    stroke="#16a34a"
                    strokeWidth="1.6"
                  />
                  <line
                    x1="6"
                    y1="6"
                    x2="8"
                    y2="6"
                    stroke="#16a34a"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <line
                    x1="10"
                    y1="6"
                    x2="14"
                    y2="6"
                    stroke="#16a34a"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <line
                    x1="6"
                    y1="10"
                    x2="8"
                    y2="10"
                    stroke="#16a34a"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <line
                    x1="10"
                    y1="10"
                    x2="14"
                    y2="10"
                    stroke="#16a34a"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <line
                    x1="6"
                    y1="14"
                    x2="8"
                    y2="14"
                    stroke="#16a34a"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <line
                    x1="10"
                    y1="14"
                    x2="12"
                    y2="14"
                    stroke="#16a34a"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className={styles.installReportContent}>
                <span className={styles.installReportLabel}>
                  COD orders scanned
                </span>
                <span className={styles.installReportValue}>1,240</span>
              </div>
            </div>

            {/* Sub-card 2: Would have been high or medium risk */}
            <div className={styles.installReportCard}>
              <div className={styles.installReportIcon}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 2.5L1.8 16.5C1.6 16.8 1.8 17.5 2.3 17.5H17.7C18.2 17.5 18.4 16.8 18.2 16.5L10 2.5Z"
                    fill="#fef3c7"
                    stroke="#f59e0b"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="10"
                    y1="8"
                    x2="10"
                    y2="11.5"
                    stroke="#f59e0b"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <circle cx="10" cy="14.5" r="0.9" fill="#f59e0b" />
                </svg>
              </div>
              <div className={styles.installReportContent}>
                <span className={styles.installReportLabel}>
                  Would have been high or medium risk
                </span>
                <span className={styles.installReportValue}>420</span>
              </div>
            </div>

            {/* Sub-card 3: Of those, cancelled or refunded */}
            <div className={styles.installReportCard}>
              <div className={styles.installReportIcon}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 2L3.5 5V9.5C3.5 13.5 6.3 17.2 10 18.2C13.7 17.2 16.5 13.5 16.5 9.5V5L10 2Z"
                    fill="#dcfce7"
                    stroke="#16a34a"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7.5 9.5L9.2 11.2L12.8 7.5"
                    stroke="#16a34a"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className={styles.installReportContent}>
                <span className={styles.installReportLabel}>
                  Of those, cancelled or refunded
                </span>
                <span className={styles.installReportValue}>310</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error();
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
