import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// PUT - Modifier un employé
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Accès non autorisé. Seul le gérant peut modifier les employés.' },
        { status: 403 }
      );
    }

    const { name, phone, password } = await request.json();

    // Vérifier que l'employé existe et appartient à la boutique du gérant
    const shop = await db.shop.findUnique({
      where: { ownerId: user.id },
      include: {
        employees: {
          where: { id }
        }
      }
    });

    if (!shop || shop.employees.length === 0) {
      return NextResponse.json(
        { error: 'Employé non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier si le téléphone est déjà utilisé par un autre utilisateur
    if (phone) {
      const existingUser = await db.user.findFirst({
        where: {
          phone,
          NOT: { id }
        }
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Ce numéro de téléphone est déjà utilisé' },
          { status: 400 }
        );
      }
    }

    // Préparer les données à mettre à jour
    const updateData: { name?: string; phone?: string; passwordHash?: string } = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // Mettre à jour l'employé
    const employee = await db.user.update({
      where: { id },
      data: updateData,
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
    console.error('Update employee error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modification de l\'employé' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un employé
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Accès non autorisé. Seul le gérant peut supprimer les employés.' },
        { status: 403 }
      );
    }

    // Vérifier que l'employé existe et appartient à la boutique du gérant
    const shop = await db.shop.findUnique({
      where: { ownerId: user.id },
      include: {
        employees: {
          where: { id }
        }
      }
    });

    if (!shop || shop.employees.length === 0) {
      return NextResponse.json(
        { error: 'Employé non trouvé' },
        { status: 404 }
      );
    }

    // Supprimer l'employé
    await db.user.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Employé supprimé avec succès' });
  } catch (error) {
    console.error('Delete employee error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'employé' },
      { status: 500 }
    );
  }
}
