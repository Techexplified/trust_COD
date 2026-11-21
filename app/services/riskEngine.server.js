/**
 * Risk Assessment Engine for Shopify COD orders
 */

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "sharklasers.com",
  "trashmail.com",
  "yopmail.com",
]);

function cleanPhone(rawPhone) {
  if (!rawPhone) return "";
  const digits = String(rawPhone).replace(/\D/g, "");
  // Remove country code 91 if 12 digits
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  // Remove leading 0 if 11 digits
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  return digits;
}

function isSequentialOrRepeated(digits) {
  if (!digits || digits.length < 10) return true;
  // All same digit e.g. 9999999999
  if (/^(\d)\1+$/.test(digits)) return true;
  // Common test numbers
  const testPatterns = ["1234567890", "0123456789", "9876543210", "1122334455", "1212121212"];
  if (testPatterns.includes(digits)) return true;
  return false;
}

function hasGibberish(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  const testWords = ["asdf", "test", "qwerty", "fake", "sample", "demo", "null", "undefined"];
  for (const word of testWords) {
    if (lower.includes(word)) return true;
  }
  return false;
}

/**
 * Evaluates an order and returns risk assessment
 * @param {Object} order - Order fields (totalPrice, customerPhone, shippingAddress, pincode, etc.)
 * @param {Array} rules - Active rules for the shop
 * @param {Object} context - { pastCustomerOrders, blockedPhones, blockedPincodes }
 */
export function evaluateOrderRisk(order, rules = [], context = {}) {
  const { pastCustomerOrders = [], blockedPhones = [], blockedPincodes = [] } = context;

  const phone = cleanPhone(order.customerPhone || "");
  const address = (order.shippingAddress || "").trim();
  const pincode = (order.pincode || "").trim();
  const email = (order.customerEmail || "").trim().toLowerCase();
  const emailDomain = email.split("@")[1] || "";
  const totalPrice = parseFloat(order.totalPrice || 0);

  // Map of rule id to rule configuration
  const ruleMap = new Map();
  for (const r of rules) {
    ruleMap.set(r.id, r);
  }

  const triggeredHigh = [];
  const triggeredMedium = [];
  const triggeredLow = [];

  // 1. Blocked list
  const rBlocked = ruleMap.get("blocked_list");
  if (rBlocked && rBlocked.profile !== "disabled") {
    if (
      (phone && blockedPhones.includes(phone)) ||
      (pincode && blockedPincodes.includes(pincode))
    ) {
      const target = rBlocked.profile === "medium" ? triggeredMedium : triggeredHigh;
      target.push({
        id: "blocked_list",
        title: "On your blocked list",
        reason: "Customer phone or pincode is on the blocked list",
      });
    }
  }

  // 2. Bad history on phone
  const rBadHistory = ruleMap.get("bad_history");
  if (rBadHistory && rBadHistory.profile !== "disabled") {
    const hasPriorCancelled = pastCustomerOrders.some(
      (o) => o.status === "Cancelled" || o.action === "Cancelled"
    );
    if (hasPriorCancelled) {
      const target = rBadHistory.profile === "medium" ? triggeredMedium : triggeredHigh;
      target.push({
        id: "bad_history",
        title: "Bad history on this phone number",
        reason: "COD refused or cancelled previously",
      });
    }
  }

  // 3. Fake looking phone number
  const rFakePhone = ruleMap.get("fake_phone");
  if (rFakePhone && rFakePhone.profile !== "disabled") {
    if (!phone || phone.length !== 10 || isSequentialOrRepeated(phone)) {
      const target = rFakePhone.profile === "medium" ? triggeredMedium : triggeredHigh;
      target.push({
        id: "fake_phone",
        title: "Fake looking phone number",
        reason: "Invalid or suspicious phone number",
      });
    }
  }

  // 4. Gibberish or test details
  const rGibberish = ruleMap.get("gibberish");
  if (rGibberish && rGibberish.profile !== "disabled") {
    if (hasGibberish(order.customerName) || hasGibberish(address)) {
      const target = rGibberish.profile === "medium" ? triggeredMedium : triggeredHigh;
      target.push({
        id: "gibberish",
        title: "Gibberish or test details",
        reason: "Test or gibberish words in name or address",
      });
    }
  }

  // 5. Pincode problem
  const rPincode = ruleMap.get("pincode_problem");
  if (rPincode && rPincode.profile !== "disabled") {
    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode) || pincode === "000000") {
      const target = rPincode.profile === "medium" ? triggeredMedium : triggeredHigh;
      target.push({
        id: "pincode_problem",
        title: "Pincode problem",
        reason: "Invalid or incomplete pincode",
      });
    }
  }

  // 6. Order burst
  const rBurst = ruleMap.get("order_burst");
  if (rBurst && rBurst.profile !== "disabled") {
    const burstThreshold = parseInt(rBurst.orders || "3", 10);
    const burstHours = parseInt(rBurst.hours || "24", 10);
    const windowStart = new Date(Date.now() - burstHours * 60 * 60 * 1000);
    const recentOrders = pastCustomerOrders.filter(
      (o) => new Date(o.orderCreatedAt) >= windowStart
    );
    if (recentOrders.length >= burstThreshold - 1) {
      const target = rBurst.profile === "medium" ? triggeredMedium : triggeredHigh;
      target.push({
        id: "order_burst",
        title: "Order burst",
        reason: `Repeat orders from same phone within ${burstHours}h`,
      });
    }
  }

  // 7. Weak address
  const rWeakAddr = ruleMap.get("weak_address");
  if (rWeakAddr && rWeakAddr.profile !== "disabled") {
    const hasHouseNo = /\d+/.test(address) || /flat|plot|house|shop|room|floor/i.test(address);
    if (address.length < 15 || !hasHouseNo) {
      const target = rWeakAddr.profile === "high" ? triggeredHigh : triggeredMedium;
      target.push({
        id: "weak_address",
        title: "Weak address",
        reason: "Incomplete address or missing flat/house number",
      });
    }
  }

  // 8. High value first order
  const rHighVal = ruleMap.get("high_value_first");
  if (rHighVal && rHighVal.profile !== "disabled") {
    const multiplier = parseFloat(rHighVal.multiplier || "2");
    const baseline = 1000;
    const isFirstTime = pastCustomerOrders.length === 0;
    if (isFirstTime && totalPrice >= baseline * multiplier) {
      const target = rHighVal.profile === "high" ? triggeredHigh : triggeredMedium;
      target.push({
        id: "high_value_first",
        title: "High value first order",
        reason: "First-time customer with high cart value",
      });
    }
  }

  // 9. Disposable email
  const rEmail = ruleMap.get("disposable_email");
  if (rEmail && rEmail.profile !== "disabled") {
    if (emailDomain && DISPOSABLE_DOMAINS.has(emailDomain)) {
      const target = rEmail.profile === "high" ? triggeredHigh : triggeredMedium;
      target.push({
        id: "disposable_email",
        title: "Disposable email",
        reason: "Customer used disposable email",
      });
    }
  }

  // 10. Repeat order
  const rRepeat = ruleMap.get("repeat_order");
  if (rRepeat && rRepeat.profile !== "disabled") {
    const hours = parseInt(rRepeat.hours || "24", 10);
    const windowStart = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recent = pastCustomerOrders.filter((o) => new Date(o.orderCreatedAt) >= windowStart);
    if (recent.length >= 1) {
      const target = rRepeat.profile === "high" ? triggeredHigh : triggeredMedium;
      target.push({
        id: "repeat_order",
        title: "Repeat order",
        reason: "Multiple orders placed within 24 hours",
      });
    }
  }

  // 11. Trusted returning customer (Low risk mitigation)
  const rTrusted = ruleMap.get("trusted_returning");
  const hasSuccessfulOrder = pastCustomerOrders.some(
    (o) => o.status === "Confirmed" || o.action === "Confirmed"
  );
  if (rTrusted && hasSuccessfulOrder && triggeredHigh.length === 0) {
    // Downgrade medium risk to low risk if customer has prior confirmed orders
    triggeredMedium.length = 0;
    triggeredLow.push({
      id: "trusted_returning",
      title: "Trusted returning customer",
      reason: "Verified repeat buyer with delivered history",
    });
  }

  // Stacked warnings: 2 or more medium risks escalate to High
  const rStacked = ruleMap.get("stacked_warnings");
  if (rStacked && triggeredMedium.length >= 2 && triggeredHigh.length === 0) {
    triggeredHigh.push({
      id: "stacked_warnings",
      title: "Stacked warnings",
      reason: "Multiple medium risk warnings matched",
    });
  }

  // Determine final risk profile and reason
  let risk = "Low";
  let reason = "Order pattern looks normal";
  let riskScore = 15;
  const matchedRules = [];

  if (triggeredHigh.length > 0) {
    risk = "High";
    reason = triggeredHigh[0].reason;
    riskScore = 85 + Math.min(15, triggeredHigh.length * 5);
    matchedRules.push(...triggeredHigh.map((r) => r.id));
  } else if (triggeredMedium.length > 0) {
    risk = "Medium";
    reason = triggeredMedium[0].reason;
    riskScore = 50 + Math.min(25, triggeredMedium.length * 10);
    matchedRules.push(...triggeredMedium.map((r) => r.id));
  } else {
    risk = "Low";
    if (triggeredLow.length > 0) {
      reason = triggeredLow[0].reason;
    } else {
      reason = "Verified complete address and valid phone";
    }
    riskScore = 15;
    matchedRules.push(...triggeredLow.map((r) => r.id));
  }

  return {
    risk,
    riskScore,
    reason,
    matchedRules,
  };
}
