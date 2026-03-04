import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const name = searchParams.get('name');

    if (!phone || !name) {
      return NextResponse.json(
        { error: 'Numéro de téléphone et nom requis' },
        { status: 400 }
      );
    }

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

    return NextResponse.json({ 
      success: true, 
      user: { 
        name: user.name, 
        phone: user.phone 
      } 
    });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification' },
      { status: 500 }
    );
  }
}
