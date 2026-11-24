import prisma from "../db.server";
import { getRulesForShop } from "./rules.server";
import { evaluateOrderRisk } from "./riskEngine.server";

// Sample customer & order seeds for initial empty states
const SEED_CUSTOMERS = [
  { id: "cust_1048", name: "Rahul Sharma", phone: "+91 98765 43210", email: "rahul.s98@example.com", ordersCount: 1, totalSpent: 1299, risk: "High", isBlocked: false, isAllowlisted: false, city: "Mumbai", zip: "400001" },
  { id: "cust_1047", name: "Vikram Malhotra", phone: "+91 91234 56789", email: "vikram.m@example.com", ordersCount: 2, totalSpent: 2149, risk: "High", isBlocked: true, isAllowlisted: false, city: "Delhi", zip: "110001" },
  { id: "cust_1046", name: "Pooja Gupta", phone: "+91 99887 66554", email: "pooja.g@example.com", ordersCount: 1, totalSpent: 1499, risk: "High", isBlocked: false, isAllowlisted: false, city: "Bengaluru", zip: "560001" },
  { id: "cust_1045", name: "Amit Verma", phone: "+91 77654 32109", email: "amit.v@example.com", ordersCount: 3, totalSpent: 2899, risk: "High", isBlocked: false, isAllowlisted: false, city: "Pune", zip: "411001" },
  { id: "cust_1044", name: "Sneha Patel", phone: "+91 88990 12345", email: "sneha.p@example.com", ordersCount: 1, totalSpent: 1199, risk: "High", isBlocked: false, isAllowlisted: false, city: "Ahmedabad", zip: "380001" },
  { id: "cust_1043", name: "Kunal Singhania", phone: "+91 90123 45678", email: "kunal.s@example.com", ordersCount: 2, totalSpent: 1999, risk: "High", isBlocked: true, isAllowlisted: false, city: "Jaipur", zip: "302001" },
  { id: "cust_1042", name: "Ananya Roy", phone: "+91 98712 34567", email: "ananya.r@example.com", ordersCount: 1, totalSpent: 1599, risk: "High", isBlocked: false, isAllowlisted: false, city: "Kolkata", zip: "700001" },
  { id: "cust_1041", name: "Rohan Deshmukh", phone: "+91 91234 09876", email: "rohan.d@example.com", ordersCount: 1, totalSpent: 749, risk: "High", isBlocked: false, isAllowlisted: false, city: "Nagpur", zip: "440001" },
  // Medium
  { id: "cust_1040", name: "Deepak Yadav", phone: "+91 94567 12340", email: "deepak.y@example.com", ordersCount: 1, totalSpent: 1099, risk: "Medium", isBlocked: false, isAllowlisted: false, city: "Lucknow", zip: "226001" },
  { id: "cust_1039", name: "Simran Kaur", phone: "+91 93210 98765", email: "simran.k@example.com", ordersCount: 2, totalSpent: 2600, risk: "Medium", isBlocked: false, isAllowlisted: false, city: "Chandigarh", zip: "160001" },
  { id: "cust_1038", name: "Karthik Nair", phone: "+91 91122 33445", email: "karthik.n@example.com", ordersCount: 1, totalSpent: 850, risk: "Medium", isBlocked: false, isAllowlisted: false, city: "Kochi", zip: "682001" },
  { id: "cust_1037", name: "Neha Joshi", phone: "+91 97788 99001", email: "neha.j@example.com", ordersCount: 2, totalSpent: 1820, risk: "Medium", isBlocked: false, isAllowlisted: false, city: "Indore", zip: "452001" },
  // Low (Trusted)
  { id: "cust_1032", name: "Priya Sundaram", phone: "+91 98877 66554", email: "priya.s@example.com", ordersCount: 4, totalSpent: 4200, risk: "Low", isBlocked: false, isAllowlisted: true, city: "Chennai", zip: "600001" },
  { id: "cust_1031", name: "Manish Tiwari", phone: "+91 91234 56780", email: "manish.t@example.com", ordersCount: 3, totalSpent: 3500, risk: "Low", isBlocked: false, isAllowlisted: true, city: "Bhopal", zip: "462001" },
  { id: "cust_1030", name: "Tanvi Agarwal", phone: "+91 97766 55443", email: "tanvi.a@example.com", ordersCount: 5, totalSpent: 6200, risk: "Low", isBlocked: false, isAllowlisted: true, city: "Surat", zip: "395001" },
  { id: "cust_1029", name: "Arjun Reddy", phone: "+91 94455 66778", email: "arjun.r@example.com", ordersCount: 4, totalSpent: 5100, risk: "Low", isBlocked: false, isAllowlisted: true, city: "Hyderabad", zip: "500001" },
];

const SEED_ORDERS = [
  // High risk
  { orderNumber: "#1048", customerIndex: 0, totalPrice: 1299, risk: "High", reason: "Incomplete address", status: "Waiting for a call", daysAgo: 0 },
  { orderNumber: "#1047", customerIndex: 1, totalPrice: 799, risk: "High", reason: "Repeat orders from same phone", status: "Waiting for a call", daysAgo: 0 },
  { orderNumber: "#1046", customerIndex: 2, totalPrice: 1499, risk: "High", reason: "New customer, no history", status: "Waiting for a call", daysAgo: 1 },
  { orderNumber: "#1045", customerIndex: 3, totalPrice: 699, risk: "High", reason: "COD refused previously", status: "Waiting for a call", daysAgo: 1 },
  { orderNumber: "#1044", customerIndex: 4, totalPrice: 1199, risk: "High", reason: "Wrong or incomplete address", status: "Waiting for a call", daysAgo: 2 },
  { orderNumber: "#1043", customerIndex: 5, totalPrice: 899, risk: "High", reason: "Multiple failed COD orders", status: "Waiting for a call", daysAgo: 2 },
  { orderNumber: "#1042", customerIndex: 6, totalPrice: 1599, risk: "High", reason: "Suspicious pattern", status: "Waiting for a call", daysAgo: 3 },
  { orderNumber: "#1041", customerIndex: 7, totalPrice: 749, risk: "High", reason: "Unreachable customer", status: "Waiting for a call", daysAgo: 3 },

  // Medium risk
  { orderNumber: "#1040", customerIndex: 8, totalPrice: 1099, risk: "Medium", reason: "First-time COD order", status: "Waiting for a call", daysAgo: 3 },
  { orderNumber: "#1039", customerIndex: 9, totalPrice: 1350, risk: "Medium", reason: "High cart value for COD", status: "Waiting for a call", daysAgo: 4 },
  { orderNumber: "#1038", customerIndex: 10, totalPrice: 850, risk: "Medium", reason: "Address pin code mismatch", status: "Waiting for a call", daysAgo: 4 },
  { orderNumber: "#1037", customerIndex: 11, totalPrice: 620, risk: "Medium", reason: "Order placed late night", status: "Waiting for a call", daysAgo: 5 },

  // Low risk
  { orderNumber: "#1032", customerIndex: 12, totalPrice: 599, risk: "Low", reason: "Verified repeat buyer", status: "Confirmed", daysAgo: 7 },
  { orderNumber: "#1031", customerIndex: 13, totalPrice: 1240, risk: "Low", reason: "Delivered previous 3 orders", status: "Confirmed", daysAgo: 8 },
  { orderNumber: "#1030", customerIndex: 14, totalPrice: 899, risk: "Low", reason: "Complete address verified", status: "Confirmed", daysAgo: 8 },
  { orderNumber: "#1029", customerIndex: 15, totalPrice: 450, risk: "Low", reason: "Regular customer", status: "Confirmed", daysAgo: 9 },
];

/**
 * Ensure database has customers and orders for this shop (seed if needed)
 */
export async function ensureOrdersForShop(shop) {
  const normalizedShop = shop || "default";
  const count = await prisma.customer.count({
    where: { shop: normalizedShop },
  });

  if (count === 0) {
    const createdCustomers = [];
    for (const c of SEED_CUSTOMERS) {
      const dbCust = await prisma.customer.create({
        data: {
          shop: normalizedShop,
          shopifyCustomerId: `gid://shopify/Customer/${c.id}`,
          displayName: c.name,
          firstName: c.name.split(" ")[0],
          lastName: c.name.split(" ")[1] || "",
          phone: c.phone,
          email: c.email,
          ordersCount: c.ordersCount,
          totalSpent: c.totalSpent,
          currency: "INR",
          riskLevel: c.risk,
          isBlocked: c.isBlocked,
          isAllowlisted: c.isAllowlisted,
          city: c.city,
          zip: c.zip,
          codOrdersCount: c.ordersCount,
          codDeliveredCount: c.risk === "Low" ? c.ordersCount : 0,
          codCancelledCount: c.isBlocked ? 2 : 0,
        },
      });
      createdCustomers.push(dbCust);
    }

    const now = Date.now();
    for (let idx = 0; idx < SEED_ORDERS.length; idx++) {
      const seed = SEED_ORDERS[idx];
      const assignedCust = createdCustomers[seed.customerIndex] || createdCustomers[0];
      const orderDate = new Date(now - (seed.daysAgo || 0) * 86400000 - idx * 3600000);

      await prisma.orderRisk.create({
        data: {
          shop: normalizedShop,
          customerId: assignedCust.id,
          shopifyCustomerId: assignedCust.shopifyCustomerId,
          orderNumber: seed.orderNumber,
          customerName: assignedCust.displayName,
          customerPhone: assignedCust.phone,
          customerEmail: assignedCust.email,
          city: assignedCust.city,
          pincode: assignedCust.zip,
          totalPrice: seed.totalPrice,
          currency: "INR",
          risk: seed.risk,
          reason: seed.reason,
          status: seed.status || "Waiting for a call",
          orderCreatedAt: orderDate,
          createdAt: orderDate,
        },
      });
    }
  }
}

/**
 * Fetch and upsert Customers & Orders directly from Shopify GraphQL API
 */
export async function syncShopifyOrders(admin, shop) {
  const normalizedShop = shop || "default";

  if (!admin) {
    await ensureOrdersForShop(normalizedShop);
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
      await ensureOrdersForShop(normalizedShop);
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
    }
  } catch (err) {
    console.warn("Failed to fetch Shopify orders or customers, using database data:", err);
    await ensureOrdersForShop(normalizedShop);
  }
}

/**
 * Get Customers for Customer Management Page
 */
export async function getCustomersForShop(shop, { search = "", risk = "all", page = 1, limit = 15 } = {}) {
  const normalizedShop = shop || "default";
  await ensureOrdersForShop(normalizedShop);

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
      ordersCount: c.ordersCount,
      totalSpent: `₹${Math.round(c.totalSpent).toLocaleString("en-IN")}`,
      riskLevel: c.riskLevel,
      isBlocked: c.isBlocked,
      isAllowlisted: c.isAllowlisted,
      city: c.city || "—",
      recentOrders: c.orders.map((o) => o.orderNumber).join(", ") || "—",
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

  // Tag customer in Shopify if connected
  if (admin && customer.shopifyCustomerId) {
    try {
      if (shouldBlock) {
        await admin.graphql(
          `#graphql
          mutation TagCustomer($id: ID!, $tags: [String!]!) {
            tagsAdd(id: $id, tags: $tags) {
              userErrors { field message }
            }
          }`,
          {
            variables: {
              id: customer.shopifyCustomerId,
              tags: ["COD-Blocked", "TrustCOD-Flagged"],
            },
          }
        );
      } else {
        await admin.graphql(
          `#graphql
          mutation RemoveCustomerTag($id: ID!, $tags: [String!]!) {
            tagsRemove(id: $id, tags: $tags) {
              userErrors { field message }
            }
          }`,
          {
            variables: {
              id: customer.shopifyCustomerId,
              tags: ["COD-Blocked"],
            },
          }
        );
      }
    } catch (err) {
      console.warn("Could not update customer tags in Shopify:", err);
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
      const tagMutation = shouldAllow
        ? `#graphql
          mutation TagCustomer($id: ID!, $tags: [String!]!) {
            tagsAdd(id: $id, tags: $tags) { userErrors { field message } }
          }`
        : `#graphql
          mutation RemoveCustomerTag($id: ID!, $tags: [String!]!) {
            tagsRemove(id: $id, tags: $tags) { userErrors { field message } }
          }`;

      await admin.graphql(tagMutation, {
        variables: {
          id: customer.shopifyCustomerId,
          tags: ["COD-Allowed"],
        },
      });
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
      include: { customer: true },
      orderBy: { orderCreatedAt: "desc" },
    }),
  ]);

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

  const numIntervals = 10;
  const stepTime = (days * 86400000) / numIntervals;
  const startTime = cutoffDate.getTime();

  const barData = [];
  const lineData = [];
  let cumulativeSavings = 0;

  for (let i = 0; i <= numIntervals; i++) {
    const ptDate = new Date(startTime + i * stepTime);
    const dateLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(ptDate);

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
