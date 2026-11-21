import prisma from "../db.server";

export const DEFAULT_RULES = [
  // High risk
  {
    id: "bad_history",
    title: "Bad history on this phone number",
    descType: "text",
    desc: "An earlier COD order from this number was refused, cancelled by the customer, or marked as fraud.",
    profile: "high",
  },
  {
    id: "blocked_list",
    title: "On your blocked list",
    descType: "text",
    desc: "The phone number or pincode is on the blocked list you manage in Checkout COD control.",
    profile: "high",
  },
  {
    id: "fake_phone",
    title: "Fake looking phone number",
    descType: "text",
    desc: "Not a valid 10 digit Indian mobile number, or repeated digits or a simple sequence.",
    profile: "high",
  },
  {
    id: "gibberish",
    title: "Gibberish or test details",
    descType: "text",
    desc: "Random characters or test words in the name or address.",
    profile: "high",
  },
  {
    id: "pincode_problem",
    title: "Pincode problem",
    descType: "text",
    desc: "The pincode is invalid, or does not match the city and state.",
    profile: "high",
  },
  {
    id: "order_burst",
    title: "Order burst",
    descType: "order_burst",
    orders: "3",
    hours: "24",
    profile: "high",
  },
  {
    id: "stacked_warnings",
    title: "Stacked warnings",
    descType: "text",
    desc: "Two or more medium risk rules match the same order. This rule is always on.",
    profile: "high",
  },

  // Medium risk
  {
    id: "high_value_first",
    title: "High value first order",
    descType: "high_value",
    multiplier: "2",
    profile: "medium",
  },
  {
    id: "weak_address",
    title: "Weak address",
    descType: "text",
    desc: "No house or flat number, or a very short address.",
    profile: "medium",
  },
  {
    id: "repeat_order",
    title: "Repeat order",
    descType: "repeat_order",
    hours: "24",
    profile: "medium",
  },
  {
    id: "mixed_identity",
    title: "Mixed identity",
    descType: "mixed_identity",
    days: "30",
    profile: "medium",
  },
  {
    id: "disposable_email",
    title: "Disposable email",
    descType: "text",
    desc: "The email uses a known throwaway domain.",
    profile: "medium",
  },
  {
    id: "unusual_quantity",
    title: "Unusual quantity",
    descType: "unusual_quantity",
    units: "",
    profile: "medium",
  },
  {
    id: "weak_pincode",
    title: "Weak pincode",
    descType: "weak_pincode",
    orders: "20",
    profile: "medium",
  },

  // Low risk
  {
    id: "trusted_returning",
    title: "Trusted returning customers",
    descType: "text",
    desc: "A repeat customer with at least one delivered COD order skips the medium risk rules that apply to new customers, such as the high value first order. High risk rules still apply.",
    profile: "low",
  },
  {
    id: "complete_address",
    title: "Complete address and valid pincode",
    descType: "text",
    desc: "All required address fields are present and the pincode matches the city and state.",
    profile: "low",
  },
  {
    id: "normal_pattern",
    title: "Order pattern looks normal",
    descType: "text",
    desc: "No burst of recent COD orders and no repeated failed COD history.",
    profile: "low",
  },
];

/**
 * Fetch or initialize risk rules for a given shop
 */
export async function getRulesForShop(shop) {
  const normalizedShop = shop || "default";
  let dbRules = await prisma.riskRule.findMany({
    where: { shop: normalizedShop },
    orderBy: { createdAt: "asc" },
  });

  if (dbRules.length === 0) {
    // Seed default rules for shop
    await prisma.$transaction(
      DEFAULT_RULES.map((rule) =>
        prisma.riskRule.create({
          data: {
            id: `${normalizedShop}_${rule.id}`,
            shop: normalizedShop,
            title: rule.title,
            profile: rule.profile,
            descType: rule.descType || "text",
            desc: rule.desc || null,
            orders: rule.orders || null,
            hours: rule.hours || null,
            multiplier: rule.multiplier || null,
            days: rule.days || null,
            units: rule.units || null,
          },
        })
      )
    );

    dbRules = await prisma.riskRule.findMany({
      where: { shop: normalizedShop },
      orderBy: { createdAt: "asc" },
    });
  }

  // Format rules for frontend
  return dbRules.map((r) => {
    const rawId = r.id.startsWith(`${normalizedShop}_`)
      ? r.id.replace(`${normalizedShop}_`, "")
      : r.id;
    return {
      id: rawId,
      title: r.title,
      profile: r.profile,
      descType: r.descType,
      desc: r.desc || "",
      orders: r.orders || "",
      hours: r.hours || "",
      multiplier: r.multiplier || "",
      days: r.days || "",
      units: r.units || "",
    };
  });
}

/**
 * Update rules for a shop
 */
export async function updateRulesForShop(shop, updatedRules) {
  const normalizedShop = shop || "default";

  await prisma.$transaction(
    updatedRules.map((rule) =>
      prisma.riskRule.upsert({
        where: {
          id: `${normalizedShop}_${rule.id}`,
        },
        update: {
          profile: rule.profile,
          descType: rule.descType || "text",
          desc: rule.desc || null,
          orders: rule.orders ? String(rule.orders) : null,
          hours: rule.hours ? String(rule.hours) : null,
          multiplier: rule.multiplier ? String(rule.multiplier) : null,
          days: rule.days ? String(rule.days) : null,
          units: rule.units ? String(rule.units) : null,
        },
        create: {
          id: `${normalizedShop}_${rule.id}`,
          shop: normalizedShop,
          title: rule.title,
          profile: rule.profile,
          descType: rule.descType || "text",
          desc: rule.desc || null,
          orders: rule.orders ? String(rule.orders) : null,
          hours: rule.hours ? String(rule.hours) : null,
          multiplier: rule.multiplier ? String(rule.multiplier) : null,
          days: rule.days ? String(rule.days) : null,
          units: rule.units ? String(rule.units) : null,
        },
      })
    )
  );

  return getRulesForShop(normalizedShop);
}

/**
 * Reset rules for a shop back to default
 */
export async function resetRulesForShop(shop) {
  const normalizedShop = shop || "default";
  await prisma.riskRule.deleteMany({
    where: { shop: normalizedShop },
  });
  return getRulesForShop(normalizedShop);
}
