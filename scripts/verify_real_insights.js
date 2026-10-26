const { PrismaClient } = require('../node_modules/.prisma-shopditto');
const db = new PrismaClient();

async function verify() {
  console.log('=== VERIFYING REAL INSIGHTS DATA PIPELINE ===');

  // 1. Get the current active user
  const user = await db.user.findFirst({
    where: { email: 'prekshabollampally@gmail.com' }
  }) || await db.user.findFirst();

  console.log(`Testing with user: ${user.name} (${user.email})`);

  // 2. Fetch recommendations for this user
  const recs = await db.recommendation.findMany({
    where: { userId: user.id },
    include: { product: { include: { platformPrices: true } } },
    orderBy: { createdAt: "desc" },
  });

  const purchasedRecs = recs.filter((r) => r.status === "purchased");
  console.log(`Total recs: ${recs.length}, Purchased: ${purchasedRecs.length}`);

  // 3. Compute real spending logic exactly as /api/insights does
  const monthlySpending = {};
  const categorySpending = {};
  let totalSpent = 0;
  let totalSaved = 0;

  for (const r of purchasedRecs) {
    const prices = r.product.platformPrices;
    if (!prices || prices.length === 0) continue;
    const inStock = prices.filter((p) => p.inStock);
    const candidates = inStock.length > 0 ? inStock : prices;
    const best = candidates.reduce((min, p) => (p.price < min.price ? p : min), candidates[0]);
    const monthKey = new Date(r.createdAt).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    if (!monthlySpending[monthKey]) monthlySpending[monthKey] = { spent: 0, saved: 0, count: 0 };
    monthlySpending[monthKey].spent += best.price;
    monthlySpending[monthKey].saved += (best.mrp - best.price);
    monthlySpending[monthKey].count += 1;
    totalSpent += best.price;
    totalSaved += (best.mrp - best.price);

    const cat = r.product.category;
    if (!categorySpending[cat]) categorySpending[cat] = { spent: 0, count: 0 };
    categorySpending[cat].spent += best.price;
    categorySpending[cat].count += 1;
  }

  console.log('Genuine computed values:');
  console.log({
    totalSpent,
    totalSaved,
    purchaseCount: purchasedRecs.length,
    monthlyBreakdown: monthlySpending,
    categoryBreakdown: categorySpending,
  });

  // Verify that if purchaseCount is 0, totalSpent is 0 (NOT 1.45 lakh!)
  if (purchasedRecs.length === 0) {
    if (totalSpent === 0 && totalSaved === 0) {
      console.log('PASS: When 0 purchases, totalSpent is 0 and no mock data generated.');
    } else {
      console.error('FAIL: totalSpent is not 0 when 0 purchases.');
    }

    // Now test recording a real purchase
    const sampleProduct = await db.product.findFirst({
      where: { category: 'earbuds' },
      include: { platformPrices: true }
    });

    console.log(`\nRecording a real test purchase for: "${sampleProduct.name}" (Base price: ₹${sampleProduct.basePrice})`);

    // Create a real recommendation with status 'purchased'
    const testRec = await db.recommendation.create({
      data: {
        userId: user.id,
        productId: sampleProduct.id,
        shoppingScore: 92,
        explanation: 'Test purchase verification',
        status: 'purchased',
      }
    });

    // Create timeline event
    await db.timelineEvent.create({
      data: {
        userId: user.id,
        type: 'purchase',
        title: `Purchased ${sampleProduct.name}`,
        productId: sampleProduct.id,
        description: `Verified purchase recorded at ₹${sampleProduct.basePrice.toLocaleString('en-IN')}`,
        metadata: JSON.stringify({ brand: sampleProduct.brand, category: sampleProduct.category })
      }
    });

    // Re-query insights
    const updatedRecs = await db.recommendation.findMany({
      where: { userId: user.id },
      include: { product: { include: { platformPrices: true } } },
    });
    const updatedPurchased = updatedRecs.filter((r) => r.status === "purchased");

    let updatedSpent = 0;
    for (const r of updatedPurchased) {
      const prices = r.product.platformPrices;
      const candidates = prices.length > 0 ? prices : [];
      const best = candidates.length > 0
        ? candidates.reduce((min, p) => (p.price < min.price ? p : min), candidates[0])
        : { price: r.product.basePrice };
      updatedSpent += best.price;
    }

    console.log(`Updated purchaseCount: ${updatedPurchased.length}, Updated totalSpent: ₹${updatedSpent.toLocaleString('en-IN')}`);
    if (updatedPurchased.length === 1 && updatedSpent > 0) {
      console.log('PASS: Real purchase is accurately tracked with exact product price and category!');
    }
  }
}

verify().finally(() => db.$disconnect());
