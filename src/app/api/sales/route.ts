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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { shopId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt = { ...where.createdAt, lte: end };
      }
    }

    const [sales, total] = await Promise.all([
      db.sale.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, barcode: true } },
            },
          },
        },
      }),
      db.sale.count({ where }),
    ]);

    return NextResponse.json({
      sales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get sales error:', error);
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
    const { items, paymentMethod, customerName, notes } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Sale must have at least one item' }, { status: 400 });
    }

    // Validate and get products
    const productIds = items.map((item: { productId: string }) => item.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json({ error: 'Some products not found' }, { status: 400 });
    }

    // Check stock availability
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (product && product.stockQuantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}` },
          { status: 400 }
        );
      }
    }

    // Calculate total
    let totalAmount = 0;
    const saleItems = items.map((item: { productId: string; quantity: number }) => {
      const product = products.find((p) => p.id === item.productId)!;
      const unitPrice = product.salePrice;
      totalAmount += unitPrice * item.quantity;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
      };
    });

    // Create sale with items and update stock in transaction
    const sale = await db.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          shopId,
          userId: user.id,
          totalAmount,
          paymentMethod: paymentMethod || 'CASH',
          customerName,
          notes,
          items: {
            create: saleItems,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // Update stock and create stock movements
      for (const item of newSale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { decrement: item.quantity },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'OUT',
            quantity: item.quantity,
            reason: `Sale ${newSale.id}`,
            userId: user.id,
          },
        });
      }

      return newSale;
    });

    return NextResponse.json({ sale }, { status: 201 });
  } catch (error) {
    console.error('Create sale error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
