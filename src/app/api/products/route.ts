import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List products
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

    const products = await db.product.findMany({
      where: {
        shopId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des produits' },
      { status: 500 }
    );
  }
}

// POST - Create product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, name, barcode, purchasePrice, salePrice, stockQuantity, category, description, imageUrl } = body;

    if (!shopId || !name || purchasePrice === undefined || salePrice === undefined) {
      return NextResponse.json(
        { error: 'Données incomplètes' },
        { status: 400 }
      );
    }

    const product = await db.product.create({
      data: {
        shopId,
        name,
        barcode: barcode || null,
        purchasePrice,
        salePrice,
        stockQuantity: stockQuantity || 0,
        category: category || null,
        description: description || null,
        imageUrl: imageUrl || null,
        isActive: true,
      },
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du produit' },
      { status: 500 }
    );
  }
}
