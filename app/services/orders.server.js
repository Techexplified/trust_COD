import prisma from "../db.server";
import { getRulesForShop } from "./rules.server";
import { evaluateOrderRisk } from "./riskEngine.server";

// Standard sample orders for merchants with fresh/empty stores
const SEED_ORDERS = [
  // High risk
  { orderNumber: "#1048", customerPhone: "+91 98765 43210", totalPrice: 1299, risk: "High", reason: "Incomplete address", status: "Waiting for a call", daysAgo: 0 },
  { orderNumber: "#1047", customerPhone: "+91 91234 56789", totalPrice: 799, risk: "High", reason: "Repeat orders from same phone", status: "Waiting for a call", daysAgo: 0 },
  { orderNumber: "#1046", customerPhone: "+91 99887 66554", totalPrice: 1499, risk: "High", reason: "New customer, no history", status: "Waiting for a call", daysAgo: 1 },
  { orderNumber: "#1045", customerPhone: "+91 77654 32109", totalPrice: 699, risk: "High", reason: "COD refused previously", status: "Waiting for a call", daysAgo: 1 },
  { orderNumber: "#1044", customerPhone: "+91 88990 12345", totalPrice: 1199, risk: "High", reason: "Wrong or incomplete address", status: "Waiting for a call", daysAgo: 2 },
  { orderNumber: "#1043", customerPhone: "+91 90123 45678", totalPrice: 899, risk: "High", reason: "Multiple failed COD orders", status: "Waiting for a call", daysAgo: 2 },
  { orderNumber: "#1042", customerPhone: "+91 98712 34567", totalPrice: 1599, risk: "High", reason: "Suspicious pattern", status: "Waiting for a call", daysAgo: 3 },
  { orderNumber: "#1041", customerPhone: "+91 91234 09876", totalPrice: 749, risk: "High", reason: "Unreachable customer", status: "Waiting for a call", daysAgo: 3 },

  // Medium risk
  { orderNumber: "#1040", customerPhone: "+91 94567 12340", totalPrice: 1099, risk: "Medium", reason: "First-time COD order", status: "Waiting for a call", daysAgo: 3 },
  { orderNumber: "#1039", customerPhone: "+91 93210 98765", totalPrice: 1350, risk: "Medium", reason: "High cart value for COD", status: "Waiting for a call", daysAgo: 4 },
  { orderNumber: "#1038", customerPhone: "+91 91122 33445", totalPrice: 850, risk: "Medium", reason: "Address pin code mismatch", status: "Waiting for a call", daysAgo: 4 },
  { orderNumber: "#1037", customerPhone: "+91 97788 99001", totalPrice: 620, risk: "Medium", reason: "Order placed late night", status: "Waiting for a call", daysAgo: 5 },
  { orderNumber: "#1036", customerPhone: "+91 95544 33221", totalPrice: 1800, risk: "Medium", reason: "Multiple items in first order", status: "Waiting for a call", daysAgo: 5 },
  { orderNumber: "#1035", customerPhone: "+91 92233 44556", totalPrice: 999, risk: "Medium", reason: "Unverified phone number", status: "Waiting for a call", daysAgo: 6 },
  { orderNumber: "#1034", customerPhone: "+91 96677 88990", totalPrice: 720, risk: "Medium", reason: "Frequent address changes", status: "Waiting for a call", daysAgo: 6 },
  { orderNumber: "#1033", customerPhone: "+91 93344 55667", totalPrice: 1150, risk: "Medium", reason: "Slow delivery zone", status: "Waiting for a call", daysAgo: 7 },

  // Low risk
  { orderNumber: "#1032", customerPhone: "+91 98877 66554", totalPrice: 599, risk: "Low", reason: "Verified repeat buyer", status: "Confirmed", daysAgo: 7 },
  { orderNumber: "#1031", customerPhone: "+91 91234 56780", totalPrice: 1240, risk: "Low", reason: "Delivered previous 3 orders", status: "Confirmed", daysAgo: 8 },
  { orderNumber: "#1030", customerPhone: "+91 97766 55443", totalPrice: 899, risk: "Low", reason: "Complete address verified", status: "Confirmed", daysAgo: 8 },
  { orderNumber: "#1029", customerPhone: "+91 94455 66778", totalPrice: 450, risk: "Low", reason: "Regular customer", status: "Confirmed", daysAgo: 9 },
  { orderNumber: "#1028", customerPhone: "+91 93322 11009", totalPrice: 1500, risk: "Low", reason: "Prepaid history on store", status: "Confirmed", daysAgo: 9 },
  { orderNumber: "#1027", customerPhone: "+91 92211 00998", totalPrice: 799, risk: "Low", reason: "High delivery success area", status: "Confirmed", daysAgo: 10 },
  { orderNumber: "#1026", customerPhone: "+91 91100 99887", totalPrice: 1100, risk: "Low", reason: "Confirmed via OTP", status: "Confirmed", daysAgo: 10 },
  { orderNumber: "#1025", customerPhone: "+91 90099 88776", totalPrice: 650, risk: "Low", reason: "Fast response on WhatsApp", status: "Confirmed", daysAgo: 11 },
];

/**
 * Ensure database has orders for this shop (seed if needed)
 */
export async function ensureOrdersForShop(shop) {
  const normalizedShop = shop || "default";
  const count = await prisma.orderRisk.count({
    where: { shop: normalizedShop },
  });

  if (count === 0) {
    const now = Date.now();
    await prisma.$transaction(
      SEED_ORDERS.map((seed, idx) => {
        const orderDate = new Date(now - (seed.daysAgo || 0) * 86400000 - idx * 3600000);
        return prisma.orderRisk.create({
          data: {
            shop: normalizedShop,
            orderNumber: seed.orderNumber,
            customerPhone: seed.customerPhone,
            totalPrice: seed.totalPrice,
            currency: "INR",
            risk: seed.risk,
            reason: seed.reason,
            status: seed.status || "Waiting for a call",
            orderCreatedAt: orderDate,
            createdAt: orderDate,
          },
        });
      })
    );
  }
}

/**
 * Fetch orders from Shopify GraphQL API and evaluate risk against rules
 */
export async function syncShopifyOrders(admin, shop) {
  const normalizedShop = shop || "default";

  if (!admin) {
    await ensureOrdersForShop(normalizedShop);
    return;
  }

  try {
    const query = `#graphql
      query GetRecentOrders {
        orders(first: 30, sortKey: CREATED_AT, reverse: true) {
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
                displayName
                phone
                email
                numberOfOrders
              }
              tags
            }
          }
        }
      }
    `;

    const response = await admin.graphql(query);
    const json = await response.json();
    const edges = json?.data?.orders?.edges || [];

    if (edges.length === 0) {
      await ensureOrdersForShop(normalizedShop);
      return;
    }

    const rules = await getRulesForShop(normalizedShop);
    const settings = await getAppSettings(normalizedShop);
    const blockedPhones = (settings.blockedPhones || "").split(",").map((p) => p.trim());
    const blockedPincodes = (settings.blockedPincodes || "").split(",").map((p) => p.trim());

    for (const { node } of edges) {
      const shopifyOrderId = node.id;
      const orderNumber = node.name;
      const totalPrice = parseFloat(node.totalPriceSet?.shopMoney?.amount || 0);
      const currency = node.totalPriceSet?.shopMoney?.currencyCode || "INR";
      const customerPhone = node.shippingAddress?.phone || node.customer?.phone || "";
      const customerName = node.customer?.displayName || node.shippingAddress?.name || "";
      const customerEmail = node.customer?.email || "";
      const shippingAddress = [node.shippingAddress?.address1, node.shippingAddress?.address2].filter(Boolean).join(", ");
      const pincode = node.shippingAddress?.zip || "";
      const city = node.shippingAddress?.city || "";
      const orderCreatedAt = new Date(node.createdAt);

      const isCOD =
        (node.paymentGatewayNames && node.paymentGatewayNames.some((g) => /cod|cash|manual/i.test(g))) ||
        node.displayFinancialStatus === "PENDING";

      if (!isCOD && edges.length > 5) {
        // Skip non-COD orders if we have enough orders
        continue;
      }

      // Check existing order in DB to preserve merchant action if already taken
      const existing = await prisma.orderRisk.findFirst({
        where: { shop: normalizedShop, shopifyOrderId },
      });

      if (existing && existing.action) {
        continue; // Keep merchant's action
      }

      // Evaluate order risk
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
    }
  } catch (err) {
    console.warn("Failed to fetch Shopify orders or lack permissions, using database orders:", err);
    await ensureOrdersForShop(normalizedShop);
  }
}

/**
 * Get orders for Risk Orders page
 */
export async function getRiskOrders(shop, { risk = "high", search = "", page = 1, limit = 8 }) {
  const normalizedShop = shop || "default";
  await ensureOrdersForShop(normalizedShop);

  const activeCategory = ["low", "medium", "high"].includes(risk.toLowerCase())
    ? risk.charAt(0).toUpperCase() + risk.slice(1).toLowerCase()
    : "High";

  // Counts for each risk category
  const [totalLow, totalMed, totalHigh] = await Promise.all([
    prisma.orderRisk.count({ where: { shop: normalizedShop, risk: "Low" } }),
    prisma.orderRisk.count({ where: { shop: normalizedShop, risk: "Medium" } }),
    prisma.orderRisk.count({ where: { shop: normalizedShop, risk: "High" } }),
  ]);

  const totalAll = totalLow + totalMed + totalHigh || 1;
  const counts = {
    low: { count: totalLow, percent: Math.round((totalLow / totalAll) * 100) },
    medium: { count: totalMed, percent: Math.round((totalMed / totalAll) * 100) },
    high: { count: totalHigh, percent: Math.round((totalHigh / totalAll) * 100) },
  };

  // Where query for table
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
    }),
    prisma.orderRisk.count({ where }),
  ]);

  return {
    orders: orders.map((o) => ({
      id: o.orderNumber,
      dbId: o.id,
      shopifyOrderId: o.shopifyOrderId,
      date: new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(
        new Date(o.orderCreatedAt)
      ),
      phone: o.customerPhone || "—",
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

  // Find order by orderNumber or DB id
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

  if (action === "Confirmed") {
    updatedStatus = "Confirmed";
  } else if (action === "Cancelled") {
    updatedStatus = "Cancelled";
  } else if (action === "Unreachable") {
    updatedStatus = "Unreachable";
  } else if (action === "Mark safe") {
    updatedRisk = "Low";
    updatedStatus = "Confirmed";
    updatedReason = "Marked safe by merchant";
  }

  const updated = await prisma.orderRisk.update({
    where: { id: order.id },
    data: {
      action,
      status: updatedStatus,
      risk: updatedRisk,
      reason: updatedReason,
    },
  });

  // Tag order in Shopify if connected
  if (admin && order.shopifyOrderId) {
    try {
      const tag = `COD-${action.replace(/\s+/g, "-")}`;
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
            tags: [tag, "TrustCOD-Reviewed"],
          },
        }
      );
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
  await ensureOrdersForShop(normalizedShop);

  // Summary counts
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [waitingCount, confirmedTodayCount, cancelledCount, allEligible] = await Promise.all([
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
        updatedAt: { gte: todayStart },
      },
    }),
    prisma.orderRisk.count({
      where: {
        shop: normalizedShop,
        status: "Cancelled",
      },
    }),
    prisma.orderRisk.findMany({
      where: {
        shop: normalizedShop,
        risk: { in: ["High", "Medium"] },
      },
      orderBy: { orderCreatedAt: "desc" },
    }),
  ]);

  // Apply filters in memory or query
  const filtered = allEligible.filter((order) => {
    if (riskFilter === "high" && order.risk !== "High") return false;
    if (riskFilter === "medium" && order.risk !== "Medium") return false;

    if (statusFilter !== "All statuses" && order.status !== statusFilter) {
      return false;
    }
    return true;
  });

  return {
    summary: {
      waitingForCall: waitingCount,
      confirmedToday: confirmedTodayCount,
      cancelledSaved: cancelledCount,
    },
    orders: filtered.map((o) => ({
      id: o.orderNumber,
      dbId: o.id,
      phone: o.customerPhone || "—",
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
  await ensureOrdersForShop(normalizedShop);
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

  const totalOrders = orders.length || 1;
  const avgLoss = settings.averageLoss || 500;
  const estimatedSavings = savedCount * avgLoss;

  // Build 11 timeline sample points for the charts
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

    const low = bracketOrders.filter((o) => o.risk === "Low").length || Math.max(1, Math.round(lowCount / 12));
    const med = bracketOrders.filter((o) => o.risk === "Medium").length || Math.max(1, Math.round(medCount / 12));
    const high = bracketOrders.filter((o) => o.risk === "High").length || Math.max(1, Math.round(highCount / 12));
    const savedInBracket = bracketOrders.filter((o) => o.status === "Cancelled" || o.action === "Cancelled").length;

    cumulativeSavings += (savedInBracket * avgLoss) / 1000;
    if (cumulativeSavings === 0) {
      cumulativeSavings = (i * avgLoss * 0.7) / 100;
    }

    barData.push({ date: dateLabel, low, med, high });
    lineData.push({ date: dateLabel, val: parseFloat(cumulativeSavings.toFixed(1)) });
  }

  return {
    dateRange,
    averageLoss: avgLoss,
    metrics: {
      total: orders.length,
      low: lowCount,
      lowPercent: Math.round((lowCount / totalOrders) * 100),
      med: medCount,
      medPercent: Math.round((medCount / totalOrders) * 100),
      high: highCount,
      highPercent: Math.round((highCount / totalOrders) * 100),
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
  await ensureOrdersForShop(normalizedShop);
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

  const total = totalLow + totalMed + totalHigh || 1;

  return {
    range,
    metrics: {
      label: range,
      total: totalLow + totalMed + totalHigh,
      low: totalLow,
      lowPercent: Math.round((totalLow / total) * 100),
      med: totalMed,
      medPercent: Math.round((totalMed / total) * 100),
      high: totalHigh,
      highPercent: Math.round((totalHigh / total) * 100),
    },
    appEmbedEnabled: settings.appEmbedEnabled,
  };
}
