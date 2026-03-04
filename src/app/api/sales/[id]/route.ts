import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const sale = await db.sale.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        shop: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    return NextResponse.json({ sale });
  } catch (error) {
    console.error('Get sale error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
