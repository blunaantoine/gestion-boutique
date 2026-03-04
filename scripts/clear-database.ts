import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearDatabase() {
  console.log('🗑️ Vidage de la base de données en cours...\n')

  try {
    // Supprimer dans l'ordre pour respecter les contraintes de clés étrangères
    console.log('Suppression des éléments de vente...')
    const saleItems = await prisma.saleItem.deleteMany()
    console.log(`  ✓ ${saleItems.count} éléments de vente supprimés`)

    console.log('Suppression des mouvements de stock...')
    const stockMovements = await prisma.stockMovement.deleteMany()
    console.log(`  ✓ ${stockMovements.count} mouvements de stock supprimés`)

    console.log('Suppression des ventes...')
    const sales = await prisma.sale.deleteMany()
    console.log(`  ✓ ${sales.count} ventes supprimées`)

    console.log('Suppression des produits...')
    const products = await prisma.product.deleteMany()
    console.log(`  ✓ ${products.count} produits supprimés`)

    console.log('Suppression des utilisateurs...')
    const users = await prisma.user.deleteMany()
    console.log(`  ✓ ${users.count} utilisateurs supprimés`)

    console.log('Suppression des boutiques...')
    const shops = await prisma.shop.deleteMany()
    console.log(`  ✓ ${shops.count} boutiques supprimées`)

    console.log('Suppression des catégories...')
    const categories = await prisma.category.deleteMany()
    console.log(`  ✓ ${categories.count} catégories supprimées`)

    console.log('\n✅ Base de données vidée avec succès!')
  } catch (error) {
    console.error('❌ Erreur lors du vidage de la base de données:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

clearDatabase()
