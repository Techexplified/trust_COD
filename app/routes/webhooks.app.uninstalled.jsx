import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (shop) {
    try {
      await db.session.deleteMany({ where: { shop } });
      await db.orderRisk.deleteMany({ where: { shop } });
      await db.customer.deleteMany({ where: { shop } });
      await db.appSettings.deleteMany({ where: { shop } });
      await db.riskRule.deleteMany({ where: { shop } });
      console.log(`Successfully cleaned up all records for uninstalled shop: ${shop}`);
    } catch (err) {
      console.warn(`Error cleaning up data for uninstalled shop ${shop}:`, err);
    }
  }

  return new Response();
};
