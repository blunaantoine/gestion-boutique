import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Daily report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const dateStr = searchParams.get('date');

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId requis' },
        { status: 400 }
      );
    }

    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get sales for the day
    const sales = await db.sale.findMany({
      where: {
        shopId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
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
    });

    let totalRevenue = 0;
    let totalProfit = 0;
    let cashRevenue = 0;
    let mobileRevenue = 0;
    const salesByHour: Record<number, number> = {};
    const productStats: Record<string, { name: string; quantity: number; revenue: number; profit: number }> = {};

    for (const sale of sales) {
      totalRevenue += sale.totalAmount;

      if (sale.paymentMethod === 'CASH') {
        cashRevenue += sale.totalAmount;
      } else {
        mobileRevenue += sale.totalAmount;
      }

      const hour = new Date(sale.createdAt).getHours();
      salesByHour[hour] = (salesByHour[hour] || 0) + sale.totalAmount;

      for (const item of sale.items) {
        const profit = (item.unitPrice - item.product.purchasePrice) * item.quantity;
        totalProfit += profit;

        if (!productStats[item.productId]) {
          productStats[item.productId] = {
            name: item.product.name,
            quantity: 0,
            revenue: 0,
            profit: 0,
          };
        }
        productStats[item.productId].quantity += item.quantity;
        productStats[item.productId].revenue += item.unitPrice * item.quantity;
        productStats[item.productId].profit += profit;
      }
    }

    const report = {
      totalSales: sales.length,
      totalRevenue,
      totalProfit,
      cashRevenue,
      mobileRevenue,
      sales: sales.map(sale => ({
        id: sale.id,
        shopId: sale.shopId,
        userId: sale.userId,
        totalAmount: sale.totalAmount,
        paymentMethod: sale.paymentMethod,
        customerName: sale.customerName,
        notes: sale.notes,
        createdAt: sale.createdAt.toISOString(),
        items: sale.items.map(item => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        user: sale.user,
      })),
      topProducts: Object.values(productStats).sort((a, b) => b.revenue - a.revenue),
      salesByHour,
    };

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Get daily report error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du rapport' },
      { status: 500 }
    );
  }
}
