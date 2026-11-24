import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { getRulesForShop } from "../services/rules.server";
import { evaluateOrderRisk } from "../services/riskEngine.server";
import { getAppSettings } from "../services/orders.server";

export const action = async ({ request }) => {
  const { shop, payload, topic, admin } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}: Order ${payload.name || payload.id}`);

  try {
    const rules = await getRulesForShop(shop);
    const settings = await getAppSettings(shop);
    const blockedPhones = (settings.blockedPhones || "").split(",").map((p) => p.trim());
    const blockedPincodes = (settings.blockedPincodes || "").split(",").map((p) => p.trim());

    const customerPhone = payload.shipping_address?.phone || payload.customer?.phone || payload.phone || "";
    const customerName = payload.customer
      ? [payload.customer.first_name, payload.customer.last_name].filter(Boolean).join(" ") || payload.shipping_address?.name || "Customer"
      : payload.shipping_address?.name || "Customer";
    const customerEmail = payload.customer?.email || payload.email || "";
    const shippingAddress = [payload.shipping_address?.address1, payload.shipping_address?.address2].filter(Boolean).join(", ");
    const pincode = payload.shipping_address?.zip || "";
    const city = payload.shipping_address?.city || "";
    const totalPrice = parseFloat(payload.total_price || 0);
    const orderNumber = payload.name || `#${payload.order_number}`;
    const shopifyOrderId = payload.admin_graphql_api_id || `gid://shopify/Order/${payload.id}`;
    const shopifyCustId = payload.customer?.admin_graphql_api_id || (payload.customer?.id ? `gid://shopify/Customer/${payload.customer.id}` : null);

    // Upsert Customer if present in Shopify payload
    let dbCustomerId = null;
    if (shopifyCustId) {
      const ordersCount = parseInt(payload.customer?.orders_count || "1", 10);
      const totalSpent = parseFloat(payload.customer?.total_spent || String(totalPrice));

      const upsertedCust = await prisma.customer.upsert({
        where: {
          shop_shopifyCustomerId: {
            shop,
            shopifyCustomerId: shopifyCustId,
          },
        },
        update: {
          firstName: payload.customer?.first_name,
          lastName: payload.customer?.last_name,
          displayName: customerName,
          phone: customerPhone || undefined,
          email: customerEmail || undefined,
          ordersCount,
          totalSpent,
          city: city || undefined,
          zip: pincode || undefined,
        },
        create: {
          shop,
          shopifyCustomerId: shopifyCustId,
          firstName: payload.customer?.first_name,
          lastName: payload.customer?.last_name,
          displayName: customerName,
          phone: customerPhone,
          email: customerEmail,
          ordersCount,
          totalSpent,
          currency: payload.currency || "INR",
          city,
          zip: pincode,
        },
      });
      dbCustomerId = upsertedCust.id;
    }

    // Evaluate risk
    const assessment = evaluateOrderRisk(
      { customerPhone, shippingAddress, pincode, customerEmail, totalPrice, customerName },
      rules,
      { blockedPhones, blockedPincodes }
    );

    const status = assessment.risk === "Low" ? "Confirmed" : "Waiting for a call";

    await prisma.orderRisk.upsert({
      where: {
        id: `shopify_${payload.id}`,
      },
      update: {
        orderNumber,
        customerId: dbCustomerId,
        shopifyCustomerId: shopifyCustId,
        customerName,
        customerPhone,
        customerEmail,
        shippingAddress,
        pincode,
        city,
        totalPrice,
        currency: payload.currency || "INR",
        risk: assessment.risk,
        riskScore: assessment.riskScore,
        reason: assessment.reason,
        matchedRules: JSON.stringify(assessment.matchedRules),
      },
      create: {
        id: `shopify_${payload.id}`,
        shop,
        shopifyOrderId,
        customerId: dbCustomerId,
        shopifyCustomerId: shopifyCustId,
        orderNumber,
        customerName,
        customerPhone,
        customerEmail,
        shippingAddress,
        pincode,
        city,
        totalPrice,
        currency: payload.currency || "INR",
        risk: assessment.risk,
        riskScore: assessment.riskScore,
        reason: assessment.reason,
        matchedRules: JSON.stringify(assessment.matchedRules),
        status,
        orderCreatedAt: new Date(payload.created_at || Date.now()),
      },
    });

    // If High risk and admin client is available, tag order in Shopify
    if (admin && assessment.risk === "High") {
      try {
        await admin.graphql(
          `#graphql
          mutation TagHighRiskOrder($id: ID!, $tags: [String!]!) {
            tagsAdd(id: $id, tags: $tags) {
              userErrors {
                field
                message
              }
            }
          }`,
          {
            variables: {
              id: shopifyOrderId,
              tags: ["COD-High-Risk", "TrustCOD-Flagged"],
            },
          }
        );
      } catch (tagErr) {
        console.warn("Could not tag high risk order in Shopify:", tagErr);
      }
    }
  } catch (err) {
    console.error("Error processing order webhook:", err);
  }

  return new Response();
};
