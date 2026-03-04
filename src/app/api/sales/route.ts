import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List sales
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId requis' },
        { status: 400 }
      );
    }

    const sales = await db.sale.findMany({
      where: { shopId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ sales });
  } catch (error) {
    console.error('Get sales error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des ventes' },
      { status: 500 }
    );
  }
}

// POST - Create sale
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, userId, totalAmount, paymentMethod, customerName, notes, items } = body;

    if (!shopId || !userId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Données incomplètes' },
        { status: 400 }
      );
    }

    // Create sale with items in transaction
    const sale = await db.$transaction(async (tx) => {
      // Create sale
      const newSale = await tx.sale.create({
        data: {
          shopId,
          userId,
          totalAmount,
          paymentMethod: paymentMethod || 'CASH',
          customerName,
          notes,
        },
      });

      // Create sale items and update stock
      for (const item of items) {
        await tx.saleItem.create({
          data: {
            saleId: newSale.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          },
        });

        // Update product stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      return newSale;
    });

    // Return sale with items
    const saleWithItems = await db.sale.findUnique({
      where: { id: sale.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json({ sale: saleWithItems });
  } catch (error) {
    console.error('Create sale error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la vente' },
      { status: 500 }
    );
  }
}
