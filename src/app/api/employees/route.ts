import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET - Liste des employés
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Accès non autorisé. Seul le gérant peut voir les employés.' },
        { status: 403 }
      );
    }

    const shop = await db.shop.findUnique({
      where: { ownerId: user.id },
      include: {
        employees: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
            createdAt: true,
            _count: {
              select: { sales: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!shop) {
      return NextResponse.json(
        { error: 'Boutique non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({ employees: shop.employees });
  } catch (error) {
    console.error('Get employees error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des employés' },
      { status: 500 }
    );
  }
}

// POST - Créer un nouvel employé
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Accès non autorisé. Seul le gérant peut créer des employés.' },
        { status: 403 }
      );
    }

    const { name, phone, password } = await request.json();

    if (!name || !phone || !password) {
      return NextResponse.json(
        { error: 'Nom, téléphone et mot de passe sont requis' },
        { status: 400 }
      );
    }

    // Vérifier si le téléphone existe déjà
    const existingUser = await db.user.findUnique({
      where: { phone }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Ce numéro de téléphone est déjà utilisé' },
        { status: 400 }
      );
    }

    // Récupérer la boutique du gérant
    const shop = await db.shop.findUnique({
      where: { ownerId: user.id }
    });

    if (!shop) {
      return NextResponse.json(
        { error: 'Boutique non trouvée' },
        { status: 404 }
      );
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    // Créer l'employé
    const employee = await db.user.create({
      data: {
        name,
        phone,
        passwordHash,
        role: 'EMPLOYEE',
        shopId: shop.id
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true
      }
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
