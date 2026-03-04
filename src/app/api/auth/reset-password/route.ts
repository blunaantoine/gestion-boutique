import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, name, newPassword } = body;

    if (!phone || !name || !newPassword) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    // Find user by phone
    const user = await db.user.findUnique({
      where: { phone },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Aucun compte trouvé avec ce numéro' },
        { status: 404 }
      );
    }

    // Verify name matches (case insensitive)
    if (user.name.toLowerCase() !== name.toLowerCase()) {
      return NextResponse.json(
        { error: 'Le nom ne correspond pas au compte' },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Mot de passe réinitialisé avec succès' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la réinitialisation' },
      { status: 500 }
    );
  }
}
