import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, password, shopName } = body;

    if (!name || !phone || !password) {
      return NextResponse.json(
        { error: 'Nom, numéro de téléphone et mot de passe requis' },
        { status: 400 }
      );
    }

    // Check if phone already exists
    const existing = await db.user.findUnique({
      where: { phone },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Ce numéro de téléphone est déjà utilisé' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user and shop in transaction
    const result = await db.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name,
          phone,
          passwordHash,
          role: 'OWNER',
        },
      });

      // Create shop
      const shop = await tx.shop.create({
        data: {
          name: shopName || 'Ma Boutique',
          ownerId: user.id,
        },
      });

      // Update user with shop
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { shopId: shop.id },
        include: {
          ownedShop: true,
          shop: true,
        },
      });

      return updatedUser;
    });

    // Return user data
    const userData = {
      id: result.id,
      name: result.name,
      phone: result.phone,
      role: result.role,
      shopId: result.shopId,
      shop: result.shop ? { id: result.shop.id, name: result.shop.name } : null,
      ownedShop: result.ownedShop ? { id: result.ownedShop.id, name: result.ownedShop.name } : null,
    };

    return NextResponse.json({ user: userData });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'inscription' },
      { status: 500 }
    );
  }
}
