import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}: Shop redact`);

  if (shop) {
    try {
      await db.session.deleteMany({ where: { shop } });
      await db.orderRisk.deleteMany({ where: { shop } });
      await db.customer.deleteMany({ where: { shop } });
      await db.appSettings.deleteMany({ where: { shop } });
      await db.riskRule.deleteMany({ where: { shop } });
      console.log(`Successfully completed shop redact for ${shop}`);
    } catch (err) {
      console.warn("Error processing shop redact webhook:", err);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
