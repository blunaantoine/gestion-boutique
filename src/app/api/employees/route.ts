import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET - List employees
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

    const employees = await db.user.findMany({
      where: {
        shopId,
        role: 'EMPLOYEE',
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        shopId: true,
        createdAt: true,
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Get employees error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des employés' },
      { status: 500 }
    );
  }
}

// POST - Create employee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, password, shopId } = body;

    if (!name || !phone || !password || !shopId) {
      return NextResponse.json(
        { error: 'Données incomplètes' },
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

    const employee = await db.user.create({
      data: {
        name,
        phone,
        passwordHash,
        role: 'EMPLOYEE',
        shopId,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        shopId: true,
        createdAt: true,
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Create employee error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'employé' },
      { status: 500 }
    );
  }
}
