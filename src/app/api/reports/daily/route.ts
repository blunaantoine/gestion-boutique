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
    const dateParam = searchParams.get('date');

    const targetDate = dateParam ? new Date(dateParam) : new Date();
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
        user: { select: { id: true, name: true } },
      },
    });

    // Calculate metrics
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const cashSales = sales.filter((s) => s.paymentMethod === 'CASH');
    const mobileMoneySales = sales.filter((s) => s.paymentMethod === 'MOBILE_MONEY');
    const cashRevenue = cashSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const mobileRevenue = mobileMoneySales.reduce((sum, s) => sum + s.totalAmount, 0);

    // Calculate profit (sales price - purchase price for each item)
    let totalProfit = 0;
    const productSales: Record<string, { name: string; quantity: number; revenue: number; profit: number }> = {};

    for (const sale of sales) {
      for (const item of sale.items) {
        const profit = (item.unitPrice - item.product.purchasePrice) * item.quantity;
        totalProfit += profit;

        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.product.name,
            quantity: 0,
            revenue: 0,
            profit: 0,
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.unitPrice * item.quantity;
        productSales[item.productId].profit += profit;
      }
    }

    // Top selling products
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Sales by hour
    const salesByHour: Record<number, number> = {};
    for (let i = 0; i < 24; i++) {
      salesByHour[i] = 0;
    }
    for (const sale of sales) {
      const hour = new Date(sale.createdAt).getHours();
      salesByHour[hour] += sale.totalAmount;
    }

    return NextResponse.json({
      date: startOfDay.toISOString().split('T')[0],
      summary: {
        totalSales,
        totalRevenue,
        totalProfit,
        cashRevenue,
        mobileRevenue,
        cashSalesCount: cashSales.length,
        mobileSalesCount: mobileMoneySales.length,
      },
      topProducts,
      salesByHour,
      sales: sales.map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        totalAmount: s.totalAmount,
        paymentMethod: s.paymentMethod,
        customerName: s.customerName,
        user: s.user,
        itemCount: s.items.length,
      })),
    });
  } catch (error) {
    console.error('Daily report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
