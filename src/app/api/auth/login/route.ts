import { NextResponse } from 'next/server';
import { authenticateUser, setCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { phone, password, role } = await request.json();

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Phone and password are required' },
        { status: 400 }
      );
    }

    const user = await authenticateUser(phone, password);

    if (!user) {
      return NextResponse.json(
        { error: 'Numéro de téléphone ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Validate role - l'utilisateur doit avoir le rôle correspondant au type de connexion
    if (role && user.role !== role) {
      const roleLabel = role === 'OWNER' ? 'Gérant' : 'Employé';
      const userRoleLabel = user.role === 'OWNER' ? 'Gérant' : 'Employé';
      return NextResponse.json(
        { error: `Ce compte est un compte ${userRoleLabel}. Veuillez vous connecter via l'espace ${userRoleLabel}.` },
        { status: 403 }
      );
    }

    await setCurrentUser(user.id);

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
