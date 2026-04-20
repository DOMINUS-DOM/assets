/**
 * Seed script: Migrate static menu data → relational Prisma models.
 *
 * Run with:  npx tsx prisma/seed-menu.ts
 *
 * This script is idempotent: it clears existing menu catalog data
 * before inserting, so it can be run multiple times safely.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Static menu data (inline to avoid TS path alias issues) ───

interface SizeVariant { sizeKey: string; price: number }
interface StaticItem {
  id: string; name: string; price?: number; currency?: string;
  sizes?: SizeVariant[]; tags?: string[]; allergens?: number[];
  subcategory?: string; priceLabel?: string; descriptionKey?: string;
  unavailable?: boolean;
}
interface StaticCategory {
  id: string; slug: string; nameKey: string; icon: string;
  items: StaticItem[]; note?: string; builder?: boolean;
  flatPrice?: { price: number; labelKey: string };
  subcategories?: string[];
}

// Import the categories from data file at runtime
// We'll read it dynamically to avoid TS compilation issues
const { categories } = require('../src/data/menu') as { categories: StaticCategory[] };

async function main() {
  console.log('🌱 Seeding menu catalog...\n');

  // ─── 1. Clear existing catalog data (in correct order for FK) ───
  await prisma.builderConfig.deleteMany();
  await prisma.productModifierGroup.deleteMany();
  await prisma.modifier.deleteMany();
  await prisma.modifierGroup.deleteMany();
  await prisma.productSize.deleteMany();
  await prisma.menuProduct.deleteMany();
  await prisma.menuCategory.deleteMany();
  console.log('  ✓ Cleared existing catalog data');

  // ─── 2. Insert categories and products ───
  const categoryMap = new Map<string, string>(); // old slug → new id
  const productMap = new Map<string, string>();   // old item id → new product id

  for (let catIdx = 0; catIdx < categories.length; catIdx++) {
    const cat = categories[catIdx];
    const dbCat = await prisma.menuCategory.create({
      data: {
        slug: cat.slug,
        nameKey: cat.nameKey,
        icon: cat.icon,
        sortOrder: catIdx,
        builder: cat.builder || false,
        note: cat.note || null,
        flatPrice: cat.flatPrice?.price || null,
        // locationId: null → global (all locations)
      },
    });
    categoryMap.set(cat.id, dbCat.id);
    console.log(`  ✓ Category: ${cat.icon} ${cat.nameKey} (${cat.items.length} items)`);

    // Insert products
    for (let itemIdx = 0; itemIdx < cat.items.length; itemIdx++) {
      const item = cat.items[itemIdx];
      const dbProduct = await prisma.menuProduct.create({
        data: {
          categoryId: dbCat.id,
          name: item.name,
          nameKey: item.id,  // The item.id IS the i18n key
          descKey: item.descriptionKey || null,
          price: item.price || null,
          sortOrder: itemIdx,
          tags: JSON.stringify(item.tags || []),
          allergens: JSON.stringify(item.allergens || []),
          subcategory: item.subcategory || null,
          priceLabel: item.priceLabel || null,
          active: !item.unavailable,
        },
      });
      productMap.set(item.id, dbProduct.id);

      // Insert sizes if any
      if (item.sizes && item.sizes.length > 0) {
        for (let sizeIdx = 0; sizeIdx < item.sizes.length; sizeIdx++) {
          const size = item.sizes[sizeIdx];
          await prisma.productSize.create({
            data: {
              productId: dbProduct.id,
              sizeKey: size.sizeKey,
              price: size.price,
              sortOrder: sizeIdx,
            },
          });
        }
      }
    }
  }

  console.log(`\n  Total: ${categoryMap.size} categories, ${productMap.size} products\n`);

  // ─── 3. Create Modifier Groups from existing categories ───
  // Sauces, Viandes, and Supplements are used as modifier groups in builders

  const saucesCatId = categoryMap.get('sauces');
  const viandesCatId = categoryMap.get('viandes');
  const supplementsCatId = categoryMap.get('supplements');

  // Helper: create a ModifierGroup from an existing category's products
  async function createModifierGroupFromCategory(
    name: string, nameKey: string, catId: string | undefined,
    minSelect: number, maxSelect: number, sortOrder: number
  ) {
    if (!catId) return null;

    const group = await prisma.modifierGroup.create({
      data: { name, nameKey, minSelect, maxSelect, sortOrder },
    });

    // Get all products in that category and create modifiers
    const products = await prisma.menuProduct.findMany({
      where: { categoryId: catId },
      orderBy: { sortOrder: 'asc' },
    });

    for (let i = 0; i < products.length; i++) {
      await prisma.modifier.create({
        data: {
          groupId: group.id,
          name: products[i].name,
          nameKey: products[i].nameKey,
          price: products[i].price || 0,
          sortOrder: i,
        },
      });
    }

    console.log(`  ✓ Modifier Group: ${name} (${products.length} modifiers)`);
    return group;
  }

  const saucesGroup = await createModifierGroupFromCategory(
    'Sauces', 'sauces', saucesCatId, 0, 2, 0
  );
  const viandesGroup = await createModifierGroupFromCategory(
    'Viandes', 'viandes', viandesCatId, 0, 2, 1
  );
  const supplementsGroup = await createModifierGroupFromCategory(
    'Supplements', 'supplements', supplementsCatId, 0, 10, 2
  );

  // ─── 4. Create Builder Configs ───

  // Pain-frites builder: the category itself is a builder (no product items)
  // We need a "virtual" product for it
  const painFritesCatId = categoryMap.get('pain_frites');
  if (painFritesCatId) {
    // Create a product for the builder
    const pfProduct = await prisma.menuProduct.create({
      data: {
        categoryId: painFritesCatId,
        name: 'Pain-frites',
        nameKey: 'pain_frites',
        price: 5.00,
        sortOrder: 0,
        tags: JSON.stringify(['popular']),
      },
    });
    productMap.set('pain_frites_builder', pfProduct.id);

    // Link modifier groups
    if (viandesGroup) {
      await prisma.productModifierGroup.create({
        data: { productId: pfProduct.id, groupId: viandesGroup.id, sortOrder: 0 },
      });
    }
    if (saucesGroup) {
      await prisma.productModifierGroup.create({
        data: { productId: pfProduct.id, groupId: saucesGroup.id, sortOrder: 1 },
      });
    }
    if (supplementsGroup) {
      await prisma.productModifierGroup.create({
        data: { productId: pfProduct.id, groupId: supplementsGroup.id, sortOrder: 2 },
      });
    }

    // Builder config
    await prisma.builderConfig.create({
      data: {
        productId: pfProduct.id,
        basePrice: 5.00,
        steps: JSON.stringify([
          { key: 'frites', label: 'Vos frites', type: 'options', options: ['salt', 'spice'] },
          { key: 'meat', label: 'Viande (max 2)', groupId: viandesGroup?.id, maxSelect: 2 },
          { key: 'sauce', label: 'Sauce (max 2)', groupId: saucesGroup?.id, maxSelect: 2 },
          { key: 'toppings', label: 'Garnitures', groupId: supplementsGroup?.id, maxSelect: 10 },
        ]),
        options: JSON.stringify({ hasSalt: true, hasSpice: true }),
      },
    });
    console.log('  ✓ Builder: Pain-frites (4 steps)');
  }

  // Link modifier groups to pains ronds products (sauce + supplements)
  const painsRondsCatId = categoryMap.get('pains_ronds');
  if (painsRondsCatId && saucesGroup && supplementsGroup) {
    const prProducts = await prisma.menuProduct.findMany({
      where: { categoryId: painsRondsCatId },
    });
    for (const pr of prProducts) {
      await prisma.productModifierGroup.createMany({
        data: [
          { productId: pr.id, groupId: saucesGroup.id, sortOrder: 0 },
          { productId: pr.id, groupId: supplementsGroup.id, sortOrder: 1 },
        ],
      });
    }
    console.log(`  ✓ Linked sauces+supplements to ${prProducts.length} pains ronds`);
  }

  // Magic Box builder configs
  const magicBoxCatId = categoryMap.get('magic_box');
  if (magicBoxCatId && saucesGroup) {
    const mbProducts = await prisma.menuProduct.findMany({
      where: { categoryId: magicBoxCatId },
    });

    for (const mb of mbProducts) {
      const isExtra = mb.nameKey === 'magic_box_extra';

      // Link sauce group
      await prisma.productModifierGroup.create({
        data: { productId: mb.id, groupId: saucesGroup.id, sortOrder: 0 },
      });
      if (isExtra && viandesGroup) {
        await prisma.productModifierGroup.create({
          data: { productId: mb.id, groupId: viandesGroup.id, sortOrder: 1 },
        });
      }

      await prisma.builderConfig.create({
        data: {
          productId: mb.id,
          basePrice: mb.price || 7.50,
          steps: JSON.stringify([
            isExtra
              ? { key: 'snack', label: 'Choix du snack', groupId: viandesGroup?.id, maxSelect: 1 }
              : { key: 'snack', label: 'Choix du snack', type: 'options', options: ['fricadelle', 'hamburger'] },
            { key: 'frites', label: 'Vos frites', type: 'options', options: ['salt', 'spice'] },
            { key: 'sauce', label: 'Sauce', groupId: saucesGroup.id, maxSelect: 1 },
            { key: 'boisson', label: 'Boisson', type: 'options', options: ['capri_sun', 'eau_plate'] },
            { key: 'jouet', label: 'Jouet', type: 'options', options: ['jouet_fille', 'jouet_garcon'] },
          ]),
          options: JSON.stringify({ isExtra }),
        },
      });
    }
    console.log(`  ✓ Builder: Magic Box (${mbProducts.length} variants)`);
  }

  // ─── 5. Summary ───
  const catCount = await prisma.menuCategory.count();
  const prodCount = await prisma.menuProduct.count();
  const sizeCount = await prisma.productSize.count();
  const groupCount = await prisma.modifierGroup.count();
  const modCount = await prisma.modifier.count();
  const builderCount = await prisma.builderConfig.count();
  const linkCount = await prisma.productModifierGroup.count();

  console.log('\n═══════════════════════════════════════');
  console.log('  Menu Catalog Seed Complete');
  console.log('═══════════════════════════════════════');
  console.log(`  Categories:       ${catCount}`);
  console.log(`  Products:         ${prodCount}`);
  console.log(`  Product Sizes:    ${sizeCount}`);
  console.log(`  Modifier Groups:  ${groupCount}`);
  console.log(`  Modifiers:        ${modCount}`);
  console.log(`  Product-Group Links: ${linkCount}`);
  console.log(`  Builder Configs:  ${builderCount}`);
  console.log('═══════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
