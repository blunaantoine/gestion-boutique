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
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Get sales for the month
    const sales = await db.sale.findMany({
      where: {
        shopId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
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

    // Calculate metrics
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);

    // Calculate profit
    let totalProfit = 0;
    for (const sale of sales) {
      for (const item of sale.items) {
        totalProfit += (item.unitPrice - item.product.purchasePrice) * item.quantity;
      }
    }

    // Daily breakdown
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyData: { date: string; revenue: number; sales: number; profit: number }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStart = new Date(year, month - 1, day);
      const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

      const daySales = sales.filter((s) => {
        const saleDate = new Date(s.createdAt);
        return saleDate >= dayStart && saleDate <= dayEnd;
      });

      let dayProfit = 0;
      for (const sale of daySales) {
        for (const item of sale.items) {
          dayProfit += (item.unitPrice - item.product.purchasePrice) * item.quantity;
        }
      }

      dailyData.push({
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        revenue: daySales.reduce((sum, s) => sum + s.totalAmount, 0),
        sales: daySales.length,
        profit: dayProfit,
      });
    }

    // Payment method breakdown
    const cashRevenue = sales
      .filter((s) => s.paymentMethod === 'CASH')
      .reduce((sum, s) => sum + s.totalAmount, 0);
    const mobileRevenue = sales
      .filter((s) => s.paymentMethod === 'MOBILE_MONEY')
      .reduce((sum, s) => sum + s.totalAmount, 0);

    // Top products
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const sale of sales) {
      for (const item of sale.items) {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.product.name,
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.unitPrice * item.quantity;
      }
    }

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return NextResponse.json({
      month: `${year}-${String(month).padStart(2, '0')}`,
      summary: {
        totalSales,
        totalRevenue,
        totalProfit,
        cashRevenue,
        mobileRevenue,
        averageDailyRevenue: totalRevenue / daysInMonth,
      },
      dailyData,
      topProducts,
    });
  } catch (error) {
    console.error('Monthly report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
