import { NextResponse } from 'next/server';
import { createUser, setCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, password, role, shopName } = body;

    if (!name || !phone || !password) {
      return NextResponse.json(
        { error: 'Name, phone, and password are required' },
        { status: 400 }
      );
    }

    // Check if phone already exists
    const existingUser = await db.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 400 }
      );
    }

    // If registering as OWNER, create a shop
    if (role === 'OWNER') {
      if (!shopName) {
        return NextResponse.json(
          { error: 'Shop name is required for owners' },
          { status: 400 }
        );
      }

      // Create user and shop in transaction
      const user = await createUser({
        name,
        phone,
        password,
        role: 'OWNER',
      });

      const shop = await db.shop.create({
        data: {
          name: shopName,
          ownerId: user.id,
        },
      });

      // Update user with shopId
      const updatedUser = await db.user.update({
        where: { id: user.id },
        data: { shopId: shop.id },
        include: { shop: true, ownedShop: true },
      });

      await setCurrentUser(user.id);

      const { passwordHash, ...userWithoutPassword } = updatedUser;
      return NextResponse.json({ user: userWithoutPassword, shop });
    }

    // Register as employee
    const user = await createUser({
      name,
      phone,
      password,
      role: 'EMPLOYEE',
    });

    await setCurrentUser(user.id);

    const { passwordHash, ...userWithoutPassword } = user;
    return NextResponse.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
