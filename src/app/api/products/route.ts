import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const shopId = user.ownedShop?.id || user.shop?.id;
    if (!shopId) {
      return NextResponse.json({ error: 'No shop associated' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const barcode = searchParams.get('barcode');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      shopId,
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { barcode: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (barcode) {
      where.barcode = barcode;
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      db.product.count({ where }),
    ]);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const shopId = user.ownedShop?.id || user.shop?.id;
    if (!shopId) {
      return NextResponse.json({ error: 'No shop associated' }, { status: 400 });
    }

    const body = await request.json();
    const { name, barcode, purchasePrice, salePrice, stockQuantity, category, description, imageUrl } = body;

    if (!name || purchasePrice === undefined || salePrice === undefined) {
      return NextResponse.json(
        { error: 'Name, purchase price, and sale price are required' },
        { status: 400 }
      );
    }

    // Check if barcode already exists
    if (barcode) {
      const existingProduct = await db.product.findUnique({
        where: { barcode },
      });
      if (existingProduct) {
        return NextResponse.json(
          { error: 'Product with this barcode already exists' },
          { status: 400 }
        );
      }
    }

    const product = await db.product.create({
      data: {
        shopId,
        name,
        barcode,
        purchasePrice: parseFloat(purchasePrice),
        salePrice: parseFloat(salePrice),
        stockQuantity: stockQuantity ? parseInt(stockQuantity) : 0,
        category,
        description,
        imageUrl,
      },
    });

    // Create initial stock movement if stock quantity > 0
    if (product.stockQuantity > 0) {
      await db.stockMovement.create({
        data: {
          productId: product.id,
          type: 'IN',
          quantity: product.stockQuantity,
          reason: 'Initial stock',
          userId: user.id,
        },
      });
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
