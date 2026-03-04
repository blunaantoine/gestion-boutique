import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { db } from './db';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(data: {
  name: string;
  phone: string;
  password: string;
  role?: 'OWNER' | 'EMPLOYEE';
  shopId?: string;
}) {
  const passwordHash = await hashPassword(data.password);
  
  const user = await db.user.create({
    data: {
      name: data.name,
      phone: data.phone,
      passwordHash,
      role: data.role || 'EMPLOYEE',
      shopId: data.shopId,
    },
  });

  return user;
}

export async function authenticateUser(phone: string, password: string) {
  const user = await db.user.findUnique({
    where: { phone },
    include: { shop: true, ownedShop: true },
  });

  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;

  if (!userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { shop: true, ownedShop: true },
  });

  if (!user) {
    return null;
  }

  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function setCurrentUser(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set('userId', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });
}

export async function clearCurrentUser() {
  const cookieStore = await cookies();
  cookieStore.delete('userId');
}

export type UserWithoutPassword = Awaited<ReturnType<typeof getCurrentUser>>;
