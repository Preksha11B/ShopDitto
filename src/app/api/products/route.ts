// GET /api/products — list products with filters + relations
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_MAP: Array<{ regex: RegExp; url: string }> = [
  // Laptops
  { regex: /macbook/i, url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80' },
  { regex: /ideapad|gaming\s*3/i, url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80' },
  { regex: /vivobook|zenbook|asus/i, url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=600&q=80' },
  { regex: /xps|dell/i, url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=600&q=80' },
  { regex: /pavilion|hp/i, url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80' },
  { regex: /aspire|acer/i, url: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=600&q=80' },
  { regex: /laptop/i, url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=600&q=80' },

  // Headphones / Earbuds
  { regex: /wh-1000xm|headphones/i, url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80' },
  { regex: /wf-1000xm/i, url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80' },
  { regex: /airpods/i, url: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=600&q=80' },
  { regex: /airdopes|boat/i, url: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=600&q=80' },
  { regex: /buds|earbuds/i, url: 'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?auto=format&fit=crop&w=600&q=80' },

  // Phones
  { regex: /iphone/i, url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=600&q=80' },
  { regex: /galaxy\s*s\d+|galaxy\s*a\d+|samsung/i, url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=600&q=80' },
  { regex: /oneplus/i, url: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=600&q=80' },
  { regex: /pixel/i, url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=600&q=80' },
  { regex: /redmi|xiaomi/i, url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02560?auto=format&fit=crop&w=600&q=80' },
  { regex: /vivo/i, url: 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?auto=format&fit=crop&w=600&q=80' },
  { regex: /realme/i, url: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=600&q=80' },
  { regex: /oppo/i, url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=600&q=80' },
  { regex: /phone|5g/i, url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02560?auto=format&fit=crop&w=600&q=80' },

  // TV
  { regex: /oled|c4/i, url: 'https://images.unsplash.com/photo-1461151304267-38535e780c79?auto=format&fit=crop&w=600&q=80' },
  { regex: /crystal|tv|television/i, url: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=600&q=80' },

  // Watches
  { regex: /apple\s*watch/i, url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80' },
  { regex: /galaxy\s*watch/i, url: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=600&q=80' },
  { regex: /fossil/i, url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80' },
  { regex: /watch/i, url: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=600&q=80' },

  // Cameras
  { regex: /alpha|sony.*a\d|camera/i, url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80' },

  // Appliances
  { regex: /air\s*conditioner|\bac\b|cooler/i, url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80' },
  { regex: /washing\s*machine/i, url: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80' },
  { regex: /vacuum|dyson/i, url: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=600&q=80' },
  { regex: /appliance/i, url: 'https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=600&q=80' },

  // Fashion
  { regex: /nike|shoes|sneakers/i, url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80' },
  { regex: /jeans|denim|levi/i, url: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=600&q=80' },
  { regex: /shirt|jacket|fashion|blazer/i, url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=600&q=80' },

  // Beauty
  { regex: /serum|skin|cream|primer|foundation|fit\s*me/i, url: 'https://images.unsplash.com/photo-1608248597359-59754128f731?auto=format&fit=crop&w=600&q=80' },
  { regex: /perfume|sauvage|dior/i, url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=600&q=80' },
  { regex: /beauty/i, url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80' },

  // Home
  { regex: /chair|desk|furniture/i, url: 'https://images.unsplash.com/photo-1580481077195-c3a821a58875?auto=format&fit=crop&w=600&q=80' },
  { regex: /home|lamp|sofa/i, url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80' },
];

function resolveImageUrl(name: string, category: string, brand: string): string {
  const combined = `${name || ''} ${category || ''} ${brand || ''}`;
  for (const item of IMAGE_MAP) {
    if (item.regex.test(combined)) {
      return item.url;
    }
  }
  return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80';
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const brand = url.searchParams.get("brand");
    const search = url.searchParams.get("search");
    const sort = url.searchParams.get("sort");
    const random = url.searchParams.get("random") === "true" || sort === "random";
    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Math.min(100, Math.max(1, parseInt(limitRaw, 10))) : 20;

    const where: any = {};
    if (category) where.category = category;
    if (brand) where.brand = { contains: brand };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { brand: { contains: search } },
        { subcategory: { contains: search } },
      ];
    }

    let products = await db.product.findMany({
      where,
      include: {
        platformPrices: true,
        priceHistory: {
          orderBy: { recordedAt: "desc" },
          take: 8,
        },
      },
      take: 100,
    });

    if (random) {
      // Fisher-Yates shuffle for genuine random variety
      for (let i = products.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [products[i], products[j]] = [products[j], products[i]];
      }
      products = products.slice(0, limit);
    } else if (!search && !category) {
      // Default initial Discover page:
      // Round-robin interleave across categories so user sees laptops, phones, TVs, watches, cameras, appliances, fashion, etc.
      const categoryBuckets = new Map<string, typeof products>();
      for (const p of products) {
        const cat = p.category || 'other';
        if (!categoryBuckets.has(cat)) categoryBuckets.set(cat, []);
        categoryBuckets.get(cat)!.push(p);
      }
      const interleaved: typeof products = [];
      const bucketArrays = Array.from(categoryBuckets.values());
      // Randomize bucket order slightly to provide a fresh feel
      bucketArrays.sort(() => Math.random() - 0.5);
      const maxLen = Math.max(...bucketArrays.map((b) => b.length), 0);
      for (let i = 0; i < maxLen; i++) {
        for (const bucket of bucketArrays) {
          if (bucket[i]) interleaved.push(bucket[i]);
        }
      }
      products = interleaved.slice(0, limit);
    } else {
      products.sort((a, b) => b.rating - a.rating);
      products = products.slice(0, limit);
    }

    const mappedProducts = products.map((p: any) => ({
      ...p,
      imageUrl: p.imageUrl || resolveImageUrl(p.name, p.category, p.brand),
    }));

    return NextResponse.json({ products: mappedProducts, count: mappedProducts.length });
  } catch (err: any) {
    console.error("[api/products GET] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch products", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
