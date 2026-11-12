import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { Link } from "react-router";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Customers() {
  return (
    <s-page heading="Trust COD">
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 0" }}>
        <Link
          to="/app"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 14,
            fontWeight: 600,
            color: "#111827",
            textDecoration: "underline",
            marginBottom: 16,
          }}
        >
          ← Back to dashboard
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 6px 0", color: "#111827" }}>
          Customers
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 24px 0" }}>
          Manage trusted and blocked customers for Cash on Delivery.
        </p>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 32,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "#dcfce7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
                fill="#16a34a"
              />
            </svg>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 8px 0" }}>
            Customer Lists
          </h2>
          <p style={{ fontSize: 14, color: "#6b7280", maxWidth: 440, margin: "0 auto 20px" }}>
            You can configure your &quot;Always allow COD&quot; and &quot;Always hide COD&quot; customer lists in the Checkout Control settings.
          </p>
          <Link
            to="/app/checkout-control"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#004d26",
              color: "#ffffff",
              padding: "10px 22px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Go to Checkout Control →
          </Link>
        </div>
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
