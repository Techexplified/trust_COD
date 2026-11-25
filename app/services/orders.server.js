import prisma from "../db.server";
import { getRulesForShop } from "./rules.server";
import { evaluateOrderRisk } from "./riskEngine.server";

// Pure Shopify data integration - no sample data
export async function ensureOrdersForShop(shop) {
  // Pure Shopify sync only — no sample or mock data
}

/**
 * Fetch and upsert Customers & Orders directly from Shopify GraphQL API
 */
export async function syncShopifyOrders(admin, shop) {
  const normalizedShop = shop || "default";

  if (!admin) {
    return;
  }

  try {
    const rules = await getRulesForShop(normalizedShop);
    const settings = await getAppSettings(normalizedShop);
    const blockedPhones = (settings.blockedPhones || "").split(",").map((p) => p.trim());
    const blockedPincodes = (settings.blockedPincodes || "").split(",").map((p) => p.trim());

    // 1. Fetch Customers from Shopify
    try {
      const customersQuery = `#graphql
        query GetShopifyCustomers {
          customers(first: 50, sortKey: UPDATED_AT, reverse: true) {
            edges {
              node {
                id
                firstName
                lastName
                displayName
                phone
                email
                numberOfOrders
                amountSpent {
                  amount
                  currencyCode
                }
                defaultAddress {
                  address1
                  address2
                  city
                  province
                  zip
                  country
                  phone
                }
                tags
              }
            }
          }
        }
      `;

      const custRes = await admin.graphql(customersQuery);
      const custJson = await custRes.json();
      const customerEdges = custJson?.data?.customers?.edges || [];

      for (const { node } of customerEdges) {
        const shopifyCustomerId = node.id;
        const phone = node.phone || node.defaultAddress?.phone || "";
        const email = node.email || "";
        const displayName = node.displayName || [node.firstName, node.lastName].filter(Boolean).join(" ") || "Customer";
        const ordersCount = parseInt(node.numberOfOrders || "0", 10);
        const totalSpent = parseFloat(node.amountSpent?.amount || "0");
        const currency = node.amountSpent?.currencyCode || "INR";
        const tags = (node.tags || []).join(", ");
        const isBlocked = tags.includes("COD-Blocked") || (phone && blockedPhones.includes(phone));
        const isAllowlisted = tags.includes("COD-Allowed");

        // Determine risk level based on Shopify history
        let riskLevel = "Low";
        if (isBlocked) {
          riskLevel = "High";
        } else if (ordersCount <= 1) {
          riskLevel = "Medium";
        }

        await prisma.customer.upsert({
          where: {
            shop_shopifyCustomerId: {
              shop: normalizedShop,
              shopifyCustomerId,
            },
          },
          update: {
            firstName: node.firstName,
            lastName: node.lastName,
            displayName,
            email,
            phone,
            ordersCount,
            totalSpent,
            currency,
            address1: node.defaultAddress?.address1,
            address2: node.defaultAddress?.address2,
            city: node.defaultAddress?.city,
            province: node.defaultAddress?.province,
            zip: node.defaultAddress?.zip,
            country: node.defaultAddress?.country,
            tags,
            isBlocked,
            isAllowlisted,
          },
          create: {
            shop: normalizedShop,
            shopifyCustomerId,
            firstName: node.firstName,
            lastName: node.lastName,
            displayName,
            email,
            phone,
            ordersCount,
            totalSpent,
            currency,
            address1: node.defaultAddress?.address1,
            address2: node.defaultAddress?.address2,
            city: node.defaultAddress?.city,
            province: node.defaultAddress?.province,
            zip: node.defaultAddress?.zip,
            country: node.defaultAddress?.country,
            tags,
            riskLevel,
            isBlocked,
            isAllowlisted,
          },
        });
      }
    } catch (custErr) {
      console.warn("Shopify customers query failed, continuing with orders:", custErr);
    }

    // 2. Fetch Orders from Shopify
    const ordersQuery = `#graphql
      query GetRecentOrdersAndCustomers {
        orders(first: 50, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              name
              createdAt
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              displayFinancialStatus
              paymentGatewayNames
              tags
              shippingAddress {
                address1
                address2
                city
                province
                zip
                country
                phone
                name
              }
              customer {
                id
                firstName
                lastName
                displayName
                phone
                email
                numberOfOrders
                amountSpent {
                  amount
                  currencyCode
                }
                defaultAddress {
                  address1
                  address2
                  city
                  province
                  zip
                  country
                  phone
                }
                tags
              }
            }
          }
        }
      }
    `;

    const response = await admin.graphql(ordersQuery);
    const json = await response.json();
    const edges = json?.data?.orders?.edges || [];

    if (edges.length === 0) {
      return;
    }

    for (const { node } of edges) {
      const shopifyOrderId = node.id;
      const orderNumber = node.name;
      const totalPrice = parseFloat(node.totalPriceSet?.shopMoney?.amount || 0);
      const currency = node.totalPriceSet?.shopMoney?.currencyCode || "INR";
      const customerPhone = node.shippingAddress?.phone || node.customer?.phone || "";
      const customerName = node.customer?.displayName || node.shippingAddress?.name || "Customer";
      const customerEmail = node.customer?.email || "";
      const shippingAddress = [node.shippingAddress?.address1, node.shippingAddress?.address2].filter(Boolean).join(", ");
      const pincode = node.shippingAddress?.zip || "";
      const city = node.shippingAddress?.city || "";
      const orderCreatedAt = new Date(node.createdAt);

      const isCOD =
        (node.paymentGatewayNames && node.paymentGatewayNames.some((g) => /cod|cash|manual/i.test(g))) ||
        node.displayFinancialStatus === "PENDING";

      if (!isCOD && edges.length > 5) {
        continue;
      }

      // Upsert Customer if attached
      let dbCustomerId = null;
      let shopifyCustId = node.customer?.id || null;

      if (shopifyCustId) {
        const custOrdersCount = parseInt(node.customer?.numberOfOrders || "1", 10);
        const custTotalSpent = parseFloat(node.customer?.amountSpent?.amount || String(totalPrice));

        const upsertedCust = await prisma.customer.upsert({
          where: {
            shop_shopifyCustomerId: {
              shop: normalizedShop,
              shopifyCustomerId: shopifyCustId,
            },
          },
          update: {
            displayName: customerName,
            phone: customerPhone || undefined,
            email: customerEmail || undefined,
            ordersCount: custOrdersCount,
            totalSpent: custTotalSpent,
            city: city || undefined,
            zip: pincode || undefined,
          },
          create: {
            shop: normalizedShop,
            shopifyCustomerId: shopifyCustId,
            firstName: node.customer?.firstName,
            lastName: node.customer?.lastName,
            displayName: customerName,
            phone: customerPhone,
            email: customerEmail,
            ordersCount: custOrdersCount,
            totalSpent: custTotalSpent,
            currency,
            city,
            zip: pincode,
          },
        });
        dbCustomerId = upsertedCust.id;
      }

      // Preserve existing merchant action if already reviewed
      const existing = await prisma.orderRisk.findFirst({
        where: { shop: normalizedShop, shopifyOrderId },
      });

      if (existing && existing.action) {
        continue;
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
          id: existing ? existing.id : "new-order-id-placeholder",
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
          currency,
          risk: assessment.risk,
          riskScore: assessment.riskScore,
          reason: assessment.reason,
          matchedRules: JSON.stringify(assessment.matchedRules),
          orderCreatedAt,
        },
        create: {
          shop: normalizedShop,
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
          currency,
          risk: assessment.risk,
          riskScore: assessment.riskScore,
          reason: assessment.reason,
          matchedRules: JSON.stringify(assessment.matchedRules),
          status,
          orderCreatedAt,
        },
      });

      // Tag order in Shopify with risk tag
      if (admin && shopifyOrderId) {
        try {
          const riskTag = assessment.risk === "High" ? "risk-high" : assessment.risk === "Medium" ? "risk-medium" : "risk-low";
          await admin.graphql(
            `#graphql
            mutation TagOrderRiskOnSync($id: ID!, $tags: [String!]!) {
              tagsAdd(id: $id, tags: $tags) {
                userErrors { field message }
              }
            }`,
            {
              variables: {
                id: shopifyOrderId,
                tags: [riskTag, `TrustCOD-${assessment.risk}`],
              },
            }
          );
        } catch (tagErr) {
          console.warn("Could not tag order on sync:", tagErr);
        }
      }
    }
  } catch (err) {
    console.warn("Failed to fetch Shopify orders or customers, using database data:", err);
  }
}

/**
 * Get Customers for Customer Management Page
 */
export async function getCustomersForShop(shop, { search = "", risk = "all", page = 1, limit = 15 } = {}) {
  const normalizedShop = shop || "default";

  const where = { shop: normalizedShop };

  if (risk && risk !== "all") {
    where.riskLevel = risk.charAt(0).toUpperCase() + risk.slice(1).toLowerCase();
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { displayName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
    ];
  }

  const [customers, totalCount, highRiskCount, blockedCount, allowlistedCount] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        orders: {
          select: { id: true, orderNumber: true, totalPrice: true, risk: true, status: true },
          take: 5,
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
    prisma.customer.count({ where: { shop: normalizedShop, riskLevel: "High" } }),
    prisma.customer.count({ where: { shop: normalizedShop, isBlocked: true } }),
    prisma.customer.count({ where: { shop: normalizedShop, isAllowlisted: true } }),
  ]);

  return {
    customers: customers.map((c) => ({
      id: c.id,
      shopifyCustomerId: c.shopifyCustomerId,
      name: c.displayName || "Customer",
      phone: c.phone || "—",
      email: c.email || "—",
      ordersCount: c.ordersCount || 0,
      totalSpent: `₹${Math.round(c.totalSpent || 0).toLocaleString("en-IN")}`,
      riskLevel: c.riskLevel || "Low",
      isBlocked: !!c.isBlocked,
      isAllowlisted: !!c.isAllowlisted,
      city: c.city || "—",
      recentOrders: (c.orders || []).map((o) => o.orderNumber).join(", ") || "—",
    })),
    stats: {
      total: totalCount,
      highRisk: highRiskCount,
      blocked: blockedCount,
      allowlisted: allowlistedCount,
    },
    totalCount,
    totalPages: Math.ceil(totalCount / limit) || 1,
    activePage: page,
  };
}

/**
 * Toggle Block/Allow status for a Customer
 */
export async function toggleCustomerBlock(shop, customerId, shouldBlock, admin = null) {
  const normalizedShop = shop || "default";

  const customer = await prisma.customer.findFirst({
    where: {
      shop: normalizedShop,
      OR: [{ id: customerId }, { shopifyCustomerId: customerId }],
    },
  });

  if (!customer) {
    throw new Error(`Customer ${customerId} not found`);
  }

  // Update customer record
  const updatedCustomer = await prisma.customer.update({
    where: { id: customer.id },
    data: {
      isBlocked: shouldBlock,
      isAllowlisted: shouldBlock ? false : customer.isAllowlisted,
      riskLevel: shouldBlock ? "High" : customer.riskLevel,
    },
  });

  // Sync phone with AppSettings.blockedPhones
  if (customer.phone) {
    const settings = await getAppSettings(normalizedShop);
    const phones = (settings.blockedPhones || "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    let newPhones;
    if (shouldBlock) {
      if (!phones.includes(customer.phone)) phones.push(customer.phone);
      newPhones = phones;
    } else {
      newPhones = phones.filter((p) => p !== customer.phone);
    }

    await updateAppSettings(normalizedShop, {
      blockedPhones: newPhones.join(","),
    });
  }

  // Tag customer and set COD allowed metafield in Shopify if connected
  if (admin && customer.shopifyCustomerId) {
    try {
      if (shouldBlock) {
        await admin.graphql(
          `#graphql
          mutation TagAndSetBlockedCustomer($id: ID!, $tags: [String!]!, $metafields: [MetafieldsSetInput!]!) {
            tagsAdd(id: $id, tags: $tags) {
              userErrors { field message }
            }
            tagsRemove(id: $id, tags: ["COD-Allowed"]) {
              userErrors { field message }
            }
            metafieldsSet(metafields: $metafields) {
              userErrors { field message }
            }
          }`,
          {
            variables: {
              id: customer.shopifyCustomerId,
              tags: ["COD-Blocked", "TrustCOD-Flagged"],
              metafields: [
                {
                  ownerId: customer.shopifyCustomerId,
                  namespace: "trust_cod",
                  key: "cod_allowed",
                  value: "false",
                  type: "single_line_text_field",
                },
              ],
            },
          }
        );
      } else {
        await admin.graphql(
          `#graphql
          mutation RemoveCustomerBlock($id: ID!, $tags: [String!]!, $metafields: [MetafieldsSetInput!]!) {
            tagsRemove(id: $id, tags: $tags) {
              userErrors { field message }
            }
            metafieldsSet(metafields: $metafields) {
              userErrors { field message }
            }
          }`,
          {
            variables: {
              id: customer.shopifyCustomerId,
              tags: ["COD-Blocked"],
              metafields: [
                {
                  ownerId: customer.shopifyCustomerId,
                  namespace: "trust_cod",
                  key: "cod_allowed",
                  value: "true",
                  type: "single_line_text_field",
                },
              ],
            },
          }
        );
      }
    } catch (err) {
      console.warn("Could not update customer tags/metafield in Shopify:", err);
    }
  }

  return updatedCustomer;
}

/**
 * Toggle Allowlist for Customer
 */
export async function toggleCustomerAllow(shop, customerId, shouldAllow, admin = null) {
  const normalizedShop = shop || "default";

  const customer = await prisma.customer.findFirst({
    where: {
      shop: normalizedShop,
      OR: [{ id: customerId }, { shopifyCustomerId: customerId }],
    },
  });

  if (!customer) throw new Error("Customer not found");

  const updatedCustomer = await prisma.customer.update({
    where: { id: customer.id },
    data: {
      isAllowlisted: shouldAllow,
      isBlocked: shouldAllow ? false : customer.isBlocked,
      riskLevel: shouldAllow ? "Low" : customer.riskLevel,
    },
  });

  if (admin && customer.shopifyCustomerId) {
    try {
      if (shouldAllow) {
        await admin.graphql(
          `#graphql
          mutation AllowCustomerCod($id: ID!, $tags: [String!]!, $metafields: [MetafieldsSetInput!]!) {
            tagsAdd(id: $id, tags: $tags) { userErrors { field message } }
            tagsRemove(id: $id, tags: ["COD-Blocked"]) { userErrors { field message } }
            metafieldsSet(metafields: $metafields) { userErrors { field message } }
          }`,
          {
            variables: {
              id: customer.shopifyCustomerId,
              tags: ["COD-Allowed"],
              metafields: [
                {
                  ownerId: customer.shopifyCustomerId,
                  namespace: "trust_cod",
                  key: "cod_allowed",
                  value: "true",
                  type: "single_line_text_field",
                },
              ],
            },
          }
        );
      } else {
        await admin.graphql(
          `#graphql
          mutation RemoveCustomerAllow($id: ID!, $tags: [String!]!) {
            tagsRemove(id: $id, tags: $tags) { userErrors { field message } }
          }`,
          {
            variables: {
              id: customer.shopifyCustomerId,
              tags: ["COD-Allowed"],
            },
          }
        );
      }
    } catch (err) {
      console.warn("Could not tag customer allowlist in Shopify:", err);
    }
  }

  return updatedCustomer;
}

/**
 * Get orders for Risk Orders page
 */
export async function getRiskOrders(shop, { risk = "high", search = "", page = 1, limit = 8 }) {
  const normalizedShop = shop || "default";

  const activeCategory = ["low", "medium", "high"].includes(risk.toLowerCase())
    ? risk.charAt(0).toUpperCase() + risk.slice(1).toLowerCase()
    : "High";

  // Counts for each risk category
  const [totalLow, totalMed, totalHigh] = await Promise.all([
    prisma.orderRisk.count({ where: { shop: normalizedShop, risk: "Low" } }),
    prisma.orderRisk.count({ where: { shop: normalizedShop, risk: "Medium" } }),
    prisma.orderRisk.count({ where: { shop: normalizedShop, risk: "High" } }),
  ]);

  const totalAll = totalLow + totalMed + totalHigh;
  const counts = {
    low: { count: totalLow, percent: totalAll > 0 ? Math.round((totalLow / totalAll) * 100) : 0 },
    medium: { count: totalMed, percent: totalAll > 0 ? Math.round((totalMed / totalAll) * 100) : 0 },
    high: { count: totalHigh, percent: totalAll > 0 ? Math.round((totalHigh / totalAll) * 100) : 0 },
  };

  const where = {
    shop: normalizedShop,
    risk: activeCategory,
  };

  if (search.trim()) {
    const q = search.trim();
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q, mode: "insensitive" } },
      { reason: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
    ];
  }

  const [orders, filteredCount] = await Promise.all([
    prisma.orderRisk.findMany({
      where,
      orderBy: { orderCreatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { customer: true },
    }),
    prisma.orderRisk.count({ where }),
  ]);

  return {
    orders: orders.map((o) => ({
      id: o.orderNumber,
      dbId: o.id,
      shopifyOrderId: o.shopifyOrderId,
      customerId: o.customerId,
      customerName: o.customerName || o.customer?.displayName || "—",
      date: new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(
        new Date(o.orderCreatedAt)
      ),
      phone: o.customerPhone || o.customer?.phone || "—",
      value: `₹${Math.round(o.totalPrice).toLocaleString("en-IN")}`,
      risk: o.risk,
      reason: o.reason,
      status: o.status,
      action: o.action,
    })),
    counts,
    totalCount: filteredCount,
    totalPages: Math.ceil(filteredCount / limit) || 1,
  };
}

/**
 * Handle merchant action on an order
 */
export async function updateOrderAction(shop, orderIdentifier, action, admin = null) {
  const normalizedShop = shop || "default";

  const order = await prisma.orderRisk.findFirst({
    where: {
      shop: normalizedShop,
      OR: [{ orderNumber: orderIdentifier }, { id: orderIdentifier }],
    },
  });

  if (!order) {
    throw new Error(`Order ${orderIdentifier} not found`);
  }

  let updatedStatus = order.status;
  let updatedRisk = order.risk;
  let updatedReason = order.reason;
  let tagsToAdd = [];
  let tagsToRemove = [];

  if (action === "Confirmed") {
    updatedStatus = "Confirmed";
    tagsToAdd = ["confirmed", "COD-Confirmed", "TrustCOD-Reviewed"];
  } else if (action === "Cancelled") {
    updatedStatus = "Cancelled";
    tagsToAdd = ["cancelled", "COD-Cancelled", "TrustCOD-Reviewed"];
  } else if (action === "Unreachable") {
    updatedStatus = "Unreachable";
    tagsToAdd = ["unreachable", "COD-Unreachable"];
  } else if (action === "Mark safe") {
    updatedRisk = "Low";
    updatedStatus = "Confirmed";
    updatedReason = "Marked safe by merchant";
    tagsToAdd = ["risk-low", "safe", "COD-Safe"];
    tagsToRemove = ["risk-high", "risk-medium", "COD-High-Risk", "COD-Medium-Risk", "TrustCOD-Flagged"];
  }

  const updated = await prisma.orderRisk.update({
    where: { id: order.id },
    data: {
      action,
      status: updatedStatus,
      risk: updatedRisk,
      reason: updatedReason,
      riskScore: action === "Mark safe" ? 0 : order.riskScore,
    },
  });

  // If Mark safe, unblock customer in database and Shopify
  if (action === "Mark safe" && order.customerId) {
    try {
      await prisma.customer.update({
        where: { id: order.customerId },
        data: { riskLevel: "Low", isBlocked: false },
      });
      if (admin && order.shopifyCustomerId) {
        await admin.graphql(
          `#graphql
          mutation UnblockCustomerOnMarkSafe($id: ID!, $tags: [String!]!, $metafields: [MetafieldsSetInput!]!) {
            tagsRemove(id: $id, tags: $tags) { userErrors { field message } }
            metafieldsSet(metafields: $metafields) { userErrors { field message } }
          }`,
          {
            variables: {
              id: order.shopifyCustomerId,
              tags: ["COD-Blocked"],
              metafields: [
                {
                  ownerId: order.shopifyCustomerId,
                  namespace: "trust_cod",
                  key: "cod_allowed",
                  value: "true",
                  type: "single_line_text_field",
                },
              ],
            },
          }
        );
      }
    } catch (custErr) {
      console.warn("Could not unblock customer on mark safe:", custErr);
    }
  }

  // Tag order in Shopify if connected
  if (admin && order.shopifyOrderId) {
    try {
      if (tagsToAdd.length > 0) {
        await admin.graphql(
          `#graphql
          mutation AddOrderTag($id: ID!, $tags: [String!]!) {
            tagsAdd(id: $id, tags: $tags) {
              userErrors {
                field
                message
              }
            }
          }`,
          {
            variables: {
              id: order.shopifyOrderId,
              tags: tagsToAdd,
            },
          }
        );
      }
      if (tagsToRemove.length > 0) {
        await admin.graphql(
          `#graphql
          mutation RemoveOrderTags($id: ID!, $tags: [String!]!) {
            tagsRemove(id: $id, tags: $tags) {
              userErrors {
                field
                message
              }
            }
          }`,
          {
            variables: {
              id: order.shopifyOrderId,
              tags: tagsToRemove,
            },
          }
        );
      }
    } catch (err) {
      console.warn("Could not tag order in Shopify:", err);
    }
  }

  return updated;
}

/**
 * Get Contact Sheet data
 */
export async function getContactSheetData(shop, { riskFilter = "all", statusFilter = "Waiting for a call" } = {}) {
  const normalizedShop = shop || "default";

  const [waitingCount, confirmedCount, cancelledOrUnreachableCount, allEligible] = await Promise.all([
    prisma.orderRisk.count({
      where: {
        shop: normalizedShop,
        risk: { in: ["High", "Medium"] },
        status: "Waiting for a call",
      },
    }),
    prisma.orderRisk.count({
      where: {
        shop: normalizedShop,
        status: "Confirmed",
      },
    }),
    prisma.orderRisk.count({
      where: {
        shop: normalizedShop,
        status: { in: ["Cancelled", "Unreachable"] },
      },
    }),
    prisma.orderRisk.findMany({
      where: {
        shop: normalizedShop,
        risk: { in: ["High", "Medium"] },
      },
      include: { customer: true },
      orderBy: { orderCreatedAt: "desc" },
    }),
  ]);

  return {
    summary: {
      waitingForCall: waitingCount,
      confirmed: confirmedCount,
      confirmedToday: confirmedCount,
      cancelledSaved: cancelledOrUnreachableCount,
      cancelledOrUnreachable: cancelledOrUnreachableCount,
    },
    orders: allEligible.map((o) => ({
      id: o.orderNumber,
      dbId: o.id,
      phone: o.customerPhone || o.customer?.phone || "—",
      customerName: o.customerName || o.customer?.displayName || "—",
      risk: o.risk,
      reason: o.reason,
      status: o.status,
      outcome: o.action,
    })),
  };
}

/**
 * Get App Settings for merchant
 */
export async function getAppSettings(shop) {
  const normalizedShop = shop || "default";
  let settings = await prisma.appSettings.findUnique({
    where: { shop: normalizedShop },
  });

  if (!settings) {
    settings = await prisma.appSettings.create({
      data: {
        shop: normalizedShop,
        averageLoss: 500,
        appEmbedEnabled: true,
      },
    });
  }

  return settings;
}

/**
 * Update App Settings
 */
export async function updateAppSettings(shop, data) {
  const normalizedShop = shop || "default";
  return prisma.appSettings.upsert({
    where: { shop: normalizedShop },
    update: data,
    create: {
      shop: normalizedShop,
      ...data,
    },
  });
}

/**
 * Compute Analytics metrics and chart points
 */
export async function getAnalyticsData(shop, dateRange = "Last 30 days") {
  const normalizedShop = shop || "default";
  const settings = await getAppSettings(normalizedShop);

  const daysMap = {
    "Last 7 days": 7,
    "Last 30 days": 30,
    "Last 60 days": 60,
    "Last 90 days": 90,
  };
  const days = daysMap[dateRange] || 30;
  const cutoffDate = new Date(Date.now() - days * 86400000);

  const orders = await prisma.orderRisk.findMany({
    where: {
      shop: normalizedShop,
      orderCreatedAt: { gte: cutoffDate },
    },
    orderBy: { orderCreatedAt: "asc" },
  });

  let lowCount = 0;
  let medCount = 0;
  let highCount = 0;
  let confirmedCount = 0;
  let savedCount = 0;

  for (const o of orders) {
    if (o.risk === "Low") lowCount++;
    else if (o.risk === "Medium") medCount++;
    else if (o.risk === "High") highCount++;

    if (o.status === "Confirmed" || o.action === "Confirmed" || o.action === "Mark safe") {
      confirmedCount++;
    }
    if (o.status === "Cancelled" || o.action === "Cancelled") {
      savedCount++;
    }
  }

  const totalCount = orders.length;
  const avgLoss = settings.averageLoss || 500;
  const estimatedSavings = savedCount * avgLoss;

  const numIntervals = 10;
  const stepTime = (days * 86400000) / numIntervals;
  const startTime = cutoffDate.getTime();

  const barData = [];
  const lineData = [];
  let cumulativeSavings = 0;

  for (let i = 0; i <= numIntervals; i++) {
    const ptDate = new Date(startTime + i * stepTime);
    const dateLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(ptDate);

    // Filter orders belonging to this time bracket
    const bracketEnd = new Date(startTime + (i + 1) * stepTime);
    const bracketOrders = orders.filter((o) => {
      const t = new Date(o.orderCreatedAt).getTime();
      return t >= ptDate.getTime() && t < bracketEnd.getTime();
    });

    const low = bracketOrders.filter((o) => o.risk === "Low").length;
    const med = bracketOrders.filter((o) => o.risk === "Medium").length;
    const high = bracketOrders.filter((o) => o.risk === "High").length;
    const savedInBracket = bracketOrders.filter((o) => o.status === "Cancelled" || o.action === "Cancelled").length;

    cumulativeSavings += (savedInBracket * avgLoss) / 1000;

    barData.push({ date: dateLabel, low, med, high });
    lineData.push({ date: dateLabel, val: parseFloat(cumulativeSavings.toFixed(1)) });
  }

  return {
    dateRange,
    averageLoss: avgLoss,
    metrics: {
      total: totalCount,
      low: lowCount,
      lowPercent: totalCount > 0 ? Math.round((lowCount / totalCount) * 100) : 0,
      med: medCount,
      medPercent: totalCount > 0 ? Math.round((medCount / totalCount) * 100) : 0,
      high: highCount,
      highPercent: totalCount > 0 ? Math.round((highCount / totalCount) * 100) : 0,
      confirmed: confirmedCount,
      saved: savedCount,
      estimatedSavings,
    },
    barData,
    lineData,
  };
}

/**
 * Get Dashboard metrics for specified date range
 */
export async function getDashboardData(shop, range = "Last 30 days") {
  const normalizedShop = shop || "default";
  const settings = await getAppSettings(normalizedShop);

  const daysMap = {
    "Today": 1,
    "Last 7 days": 7,
    "Last 30 days": 30,
    "Last 90 days": 90,
  };
  const days = daysMap[range] || 30;
  const cutoff = new Date(Date.now() - days * 86400000);

  const [totalLow, totalMed, totalHigh] = await Promise.all([
    prisma.orderRisk.count({ where: { shop: normalizedShop, risk: "Low", orderCreatedAt: { gte: cutoff } } }),
    prisma.orderRisk.count({ where: { shop: normalizedShop, risk: "Medium", orderCreatedAt: { gte: cutoff } } }),
    prisma.orderRisk.count({ where: { shop: normalizedShop, risk: "High", orderCreatedAt: { gte: cutoff } } }),
  ]);

  const total = totalLow + totalMed + totalHigh;

  return {
    range,
    metrics: {
      label: range,
      total,
      low: totalLow,
      lowPercent: total > 0 ? Math.round((totalLow / total) * 100) : 0,
      med: totalMed,
      medPercent: total > 0 ? Math.round((totalMed / total) * 100) : 0,
      high: totalHigh,
      highPercent: total > 0 ? Math.round((totalHigh / total) * 100) : 0,
    },
    appEmbedEnabled: settings.appEmbedEnabled,
  };
}
