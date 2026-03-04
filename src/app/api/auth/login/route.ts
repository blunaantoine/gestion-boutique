import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password, role } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Numéro de téléphone et mot de passe requis' },
        { status: 400 }
      );
    }

    // Find user by phone
    const user = await db.user.findUnique({
      where: { phone },
      include: {
        ownedShop: true,
        shop: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Numéro de téléphone ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Numéro de téléphone ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Validate role if specified
    if (role && user.role !== role) {
      const roleLabel = user.role === 'OWNER' ? 'Gérant' : 'Employé';
      return NextResponse.json(
        { error: `Ce compte est un compte ${roleLabel}. Veuillez vous connecter via l'espace ${roleLabel}.` },
        { status: 403 }
      );
    }

    // Return user data (without password)
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
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la connexion' },
      { status: 500 }
    );
  }
}
