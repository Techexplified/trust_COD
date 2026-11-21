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
    const customerName = payload.shipping_address?.name || payload.customer?.first_name || "";
    const customerEmail = payload.customer?.email || payload.email || "";
    const shippingAddress = [payload.shipping_address?.address1, payload.shipping_address?.address2].filter(Boolean).join(", ");
    const pincode = payload.shipping_address?.zip || "";
    const city = payload.shipping_address?.city || "";
    const totalPrice = parseFloat(payload.total_price || 0);
    const orderNumber = payload.name || `#${payload.order_number}`;
    const shopifyOrderId = payload.admin_graphql_api_id || `gid://shopify/Order/${payload.id}`;

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
