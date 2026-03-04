import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        ownedShop: true,
        shop: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    const userData = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      shopId: user.shopId,
      shop: user.shop ? { id: user.shop.id, name: user.shop.name } : null,
      ownedShop: user.ownedShop ? { id: user.ownedShop.id, name: user.ownedShop.name } : null,
    };

    return NextResponse.json({ user: userData });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'utilisateur' },
      { status: 500 }
    );
  }
}
