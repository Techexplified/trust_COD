import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}: Customer data request`);

  // Log or prepare customer data if requested
  const customerId = payload?.customer?.id ? `gid://shopify/Customer/${payload.customer.id}` : null;
  if (customerId && shop) {
    const customer = await db.customer.findFirst({
      where: { shop, shopifyCustomerId: customerId },
      include: { orders: true },
    });
    console.log(`Found ${customer?.orders?.length || 0} orders for customer data request`);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
