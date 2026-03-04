import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, type, quantity, reason } = body;

    if (!productId || !type || !quantity) {
      return NextResponse.json(
        { error: 'Product ID, type, and quantity are required' },
        { status: 400 }
      );
    }

    if (!['IN', 'OUT', 'ADJUSTMENT'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be IN, OUT, or ADJUSTMENT' },
        { status: 400 }
      );
    }

    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Update stock
    let newQuantity = product.stockQuantity;
    if (type === 'IN') {
      newQuantity += quantity;
    } else if (type === 'OUT') {
      if (product.stockQuantity < quantity) {
        return NextResponse.json(
          { error: 'Insufficient stock' },
          { status: 400 }
        );
      }
      newQuantity -= quantity;
    } else {
      // ADJUSTMENT - set to the exact quantity
      newQuantity = quantity;
    }

    const [stockMovement, updatedProduct] = await db.$transaction([
      db.stockMovement.create({
        data: {
          productId,
          type,
          quantity,
          reason,
          userId: user.id,
        },
      }),
      db.product.update({
        where: { id: productId },
        data: { stockQuantity: newQuantity },
      }),
    ]);

    return NextResponse.json({ stockMovement, product: updatedProduct });
  } catch (error) {
    console.error('Stock movement error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const productId = searchParams.get('productId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (productId) {
      where.productId = productId;
    } else {
      // Get all products for this shop
      const products = await db.product.findMany({
        where: { shopId },
        select: { id: true },
      });
      where.productId = { in: products.map((p) => p.id) };
    }

    const [movements, total] = await Promise.all([
      db.stockMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          product: { select: { id: true, name: true, barcode: true } },
        },
      }),
      db.stockMovement.count({ where }),
    ]);

    return NextResponse.json({
      movements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get stock movements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
