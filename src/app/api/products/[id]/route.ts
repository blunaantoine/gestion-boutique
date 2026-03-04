import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const product = await db.product.findUnique({
      where: { id },
      include: {
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, barcode, purchasePrice, salePrice, stockQuantity, category, description, imageUrl, isActive } = body;

    const existingProduct = await db.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if barcode is being changed and conflicts
    if (barcode && barcode !== existingProduct.barcode) {
      const barcodeConflict = await db.product.findUnique({
        where: { barcode },
      });
      if (barcodeConflict) {
        return NextResponse.json(
          { error: 'Product with this barcode already exists' },
          { status: 400 }
        );
      }
    }

    const product = await db.product.update({
      where: { id },
      data: {
        name,
        barcode,
        purchasePrice: purchasePrice !== undefined ? parseFloat(purchasePrice) : undefined,
        salePrice: salePrice !== undefined ? parseFloat(salePrice) : undefined,
        stockQuantity: stockQuantity !== undefined ? parseInt(stockQuantity) : undefined,
        category,
        description,
        imageUrl,
        isActive,
      },
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    // Soft delete by setting isActive to false
    const product = await db.product.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
