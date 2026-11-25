import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}: Customer redact`);

  const customerId = payload?.customer?.id ? `gid://shopify/Customer/${payload.customer.id}` : null;
  const customerEmail = payload?.customer?.email;
  const customerPhone = payload?.customer?.phone;

  if (shop && (customerId || customerEmail || customerPhone)) {
    try {
      // Redact customer PII
      await db.customer.updateMany({
        where: {
          shop,
          OR: [
            customerId ? { shopifyCustomerId: customerId } : undefined,
            customerEmail ? { email: customerEmail } : undefined,
            customerPhone ? { phone: customerPhone } : undefined,
          ].filter(Boolean),
        },
        data: {
          firstName: "REDACTED",
          lastName: "REDACTED",
          displayName: "Redacted Customer",
          email: "redacted@privacy.local",
          phone: "—",
          address1: "REDACTED",
          address2: null,
          city: "REDACTED",
          zip: "000000",
        },
      });

      // Redact matching order risks
      await db.orderRisk.updateMany({
        where: {
          shop,
          OR: [
            customerId ? { shopifyCustomerId: customerId } : undefined,
            customerEmail ? { customerEmail } : undefined,
            customerPhone ? { customerPhone } : undefined,
          ].filter(Boolean),
        },
        data: {
          customerName: "Redacted Customer",
          customerPhone: "—",
          customerEmail: "redacted@privacy.local",
          shippingAddress: "REDACTED",
          pincode: "000000",
          city: "REDACTED",
        },
      });

      console.log(`Successfully redacted customer data for ${shop}`);
    } catch (err) {
      console.warn("Error redacting customer data:", err);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
