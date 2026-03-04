import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Monthly report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const monthStr = searchParams.get('month');
    const yearStr = searchParams.get('year');

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId requis' },
        { status: 400 }
      );
    }

    const month = monthStr ? parseInt(monthStr) : new Date().getMonth() + 1;
    const year = yearStr ? parseInt(yearStr) : new Date().getFullYear();

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

    let totalRevenue = 0;
    let totalProfit = 0;
    let cashRevenue = 0;
    let mobileRevenue = 0;
    const productStats: Record<string, { name: string; quantity: number; revenue: number }> = {};

    // Daily data
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyData: { date: string; revenue: number; sales: number; profit: number }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      dailyData.push({
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        revenue: 0,
        sales: 0,
        profit: 0,
      });
    }

    for (const sale of sales) {
      totalRevenue += sale.totalAmount;

      if (sale.paymentMethod === 'CASH') {
        cashRevenue += sale.totalAmount;
      } else {
        mobileRevenue += sale.totalAmount;
      }

      const saleDate = new Date(sale.createdAt);
      const dayIndex = saleDate.getDate() - 1;
      if (dailyData[dayIndex]) {
        dailyData[dayIndex].revenue += sale.totalAmount;
        dailyData[dayIndex].sales += 1;
      }

      for (const item of sale.items) {
        const profit = (item.unitPrice - item.product.purchasePrice) * item.quantity;
        totalProfit += profit;

        if (dailyData[dayIndex]) {
          dailyData[dayIndex].profit += profit;
        }

        if (!productStats[item.productId]) {
          productStats[item.productId] = {
            name: item.product.name,
            quantity: 0,
            revenue: 0,
          };
        }
        productStats[item.productId].quantity += item.quantity;
        productStats[item.productId].revenue += item.unitPrice * item.quantity;
      }
    }

    const report = {
      totalSales: sales.length,
      totalRevenue,
      totalProfit,
      cashRevenue,
      mobileRevenue,
      averageDailyRevenue: totalRevenue / daysInMonth,
      dailyData,
      topProducts: Object.values(productStats).sort((a, b) => b.revenue - a.revenue),
    };

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Get monthly report error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du rapport' },
      { status: 500 }
    );
  }
}
