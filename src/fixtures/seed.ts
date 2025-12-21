/**
 * Script de seeding pour peupler la base avec des données de test
 *
 * Usage: pnpm seed
 *
 * Options:
 *   --clean : Supprime tous les documents avant d'insérer
 *   --dry-run : Affiche ce qui serait inséré sans exécuter
 */

import { PrismaClient } from '@prisma/client';
import { Mistral } from '@mistralai/mistralai';
import documentFixtures from './documents.js';

const prisma = new PrismaClient();

// Configuration Mistral
const mistralApiKey = process.env.MISTRAL_API_KEY;
if (!mistralApiKey) {
  console.error('❌ MISTRAL_API_KEY is required');
  process.exit(1);
}
const mistral = new Mistral({ apiKey: mistralApiKey });

interface SeedOptions {
  clean: boolean;
  dryRun: boolean;
}

function parseArgs(): SeedOptions {
  const args = process.argv.slice(2);
  return {
    clean: args.includes('--clean'),
    dryRun: args.includes('--dry-run'),
  };
}

/**
 * Génère un embedding pour un texte
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await mistral.embeddings.create({
    model: 'mistral-embed',
    inputs: [text],
  });
  return response.data[0].embedding as number[];
}

/**
 * Génère des embeddings en batch
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await mistral.embeddings.create({
    model: 'mistral-embed',
    inputs: texts,
  });
  return response.data.map((d) => d.embedding as number[]);
}

/**
 * Découpe un texte en chunks avec overlap
 */
function chunkText(
  text: string,
  chunkSize: number,
  overlap: number
): string[] {
  const cleanedText = text.trim();
  if (cleanedText.length <= chunkSize) {
    return [cleanedText];
  }

  const chunks: string[] = [];
  let currentPosition = 0;

  while (currentPosition < cleanedText.length) {
    const endPosition = Math.min(
      currentPosition + chunkSize,
      cleanedText.length
    );
    const chunk = cleanedText.slice(currentPosition, endPosition).trim();

    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    currentPosition += chunkSize - overlap;

    if (currentPosition >= cleanedText.length - 1) {
      break;
    }
  }

  return chunks;
}

/**
 * Insère un document simple (sans chunking)
 */
async function insertDocument(
  content: string,
  title: string,
  dryRun: boolean
): Promise<number> {
  if (dryRun) {
    console.log(`  [DRY-RUN] Would insert: "${title}" (${content.length} chars)`);
    return 0;
  }

  const embedding = await generateEmbedding(content);
  const embeddingStr = `[${embedding.join(',')}]`;

  const result = await prisma.$queryRawUnsafe<{ id: number }[]>(
    `INSERT INTO documents (content, embedding)
     VALUES ($1, $2::vector)
     RETURNING id`,
    content,
    embeddingStr
  );

  return Number(result[0].id);
}

/**
 * Insère un document avec chunking
 */
async function insertDocumentWithChunking(
  content: string,
  title: string,
  chunkSize: number,
  overlap: number,
  dryRun: boolean
): Promise<{ sourceId: number; chunkCount: number }> {
  const chunks = chunkText(content, chunkSize, overlap);

  if (dryRun) {
    console.log(
      `  [DRY-RUN] Would insert: "${title}" → ${chunks.length} chunks`
    );
    return { sourceId: 0, chunkCount: chunks.length };
  }

  // 1. Créer le document source (sans embedding)
  const sourceResult = await prisma.$queryRawUnsafe<{ id: number }[]>(
    `INSERT INTO documents (content, embedding)
     VALUES ($1, NULL)
     RETURNING id`,
    content
  );
  const sourceId = Number(sourceResult[0].id);

  // 2. Générer les embeddings pour tous les chunks
  const embeddings = await generateEmbeddings(chunks);

  // 3. Insérer chaque chunk avec référence au source
  for (let i = 0; i < chunks.length; i++) {
    const embeddingStr = `[${embeddings[i].join(',')}]`;
    await prisma.$queryRawUnsafe(
      `INSERT INTO documents (content, embedding, source_id, chunk_index)
       VALUES ($1, $2::vector, $3, $4)`,
      chunks[i],
      embeddingStr,
      sourceId,
      i
    );
  }

  return { sourceId, chunkCount: chunks.length };
}

/**
 * Nettoie tous les documents
 */
async function cleanDocuments(dryRun: boolean): Promise<void> {
  if (dryRun) {
    const count = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      'SELECT COUNT(*) as count FROM documents'
    );
    console.log(`[DRY-RUN] Would delete ${count[0].count} documents`);
    return;
  }

  await prisma.$queryRawUnsafe('DELETE FROM documents');
  console.log('🗑️  All documents deleted');
}

/**
 * Fonction principale de seeding
 */
async function seed(): Promise<void> {
  const options = parseArgs();

  console.log('🌱 Starting seed...\n');

  if (options.dryRun) {
    console.log('📋 DRY-RUN mode - no changes will be made\n');
  }

  // Nettoyage si demandé
  if (options.clean) {
    await cleanDocuments(options.dryRun);
    console.log('');
  }

  let totalDocuments = 0;
  let totalChunks = 0;

  for (const fixture of documentFixtures) {
    console.log(`📄 Processing: ${fixture.title}`);

    try {
      if (fixture.useChunking) {
        const { chunkCount } = await insertDocumentWithChunking(
          fixture.content,
          fixture.title,
          fixture.chunkSize || 500,
          fixture.overlap || 100,
          options.dryRun
        );
        totalDocuments++;
        totalChunks += chunkCount;
        console.log(`   ✅ Inserted with ${chunkCount} chunks`);
      } else {
        await insertDocument(fixture.content, fixture.title, options.dryRun);
        totalDocuments++;
        console.log(`   ✅ Inserted as single document`);
      }

      // Petit délai pour éviter le rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✨ Seed complete!`);
  console.log(`   Documents: ${totalDocuments}`);
  console.log(`   Total chunks: ${totalChunks}`);
  console.log('='.repeat(50));
}

// Exécution
seed()
  .catch((error) => {
    console.error('💥 Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

 * Script de seeding pour peupler la base avec des données de test
 *
 * Usage: pnpm seed
 *
 * Options:
 *   --clean : Supprime tous les documents avant d'insérer
 *   --dry-run : Affiche ce qui serait inséré sans exécuter
 */

import { PrismaClient } from '@prisma/client';
import { Mistral } from '@mistralai/mistralai';
import documentFixtures from './documents.js';

const prisma = new PrismaClient();

// Configuration Mistral
const mistralApiKey = process.env.MISTRAL_API_KEY;
if (!mistralApiKey) {
  console.error('❌ MISTRAL_API_KEY is required');
  process.exit(1);
}
const mistral = new Mistral({ apiKey: mistralApiKey });

interface SeedOptions {
  clean: boolean;
  dryRun: boolean;
}

function parseArgs(): SeedOptions {
  const args = process.argv.slice(2);
  return {
    clean: args.includes('--clean'),
    dryRun: args.includes('--dry-run'),
  };
}

/**
 * Génère un embedding pour un texte
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await mistral.embeddings.create({
    model: 'mistral-embed',
    inputs: [text],
  });
  return response.data[0].embedding as number[];
}

/**
 * Génère des embeddings en batch
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await mistral.embeddings.create({
    model: 'mistral-embed',
    inputs: texts,
  });
  return response.data.map((d) => d.embedding as number[]);
}

/**
 * Découpe un texte en chunks avec overlap
 */
function chunkText(
  text: string,
  chunkSize: number,
  overlap: number
): string[] {
  const cleanedText = text.trim();
  if (cleanedText.length <= chunkSize) {
    return [cleanedText];
  }

  const chunks: string[] = [];
  let currentPosition = 0;

  while (currentPosition < cleanedText.length) {
    const endPosition = Math.min(
      currentPosition + chunkSize,
      cleanedText.length
    );
    const chunk = cleanedText.slice(currentPosition, endPosition).trim();

    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    currentPosition += chunkSize - overlap;

    if (currentPosition >= cleanedText.length - 1) {
      break;
    }
  }

  return chunks;
}

/**
 * Insère un document simple (sans chunking)
 */
async function insertDocument(
  content: string,
  title: string,
  dryRun: boolean
): Promise<number> {
  if (dryRun) {
    console.log(`  [DRY-RUN] Would insert: "${title}" (${content.length} chars)`);
    return 0;
  }

  const embedding = await generateEmbedding(content);
  const embeddingStr = `[${embedding.join(',')}]`;

  const result = await prisma.$queryRawUnsafe<{ id: number }[]>(
    `INSERT INTO documents (content, embedding)
     VALUES ($1, $2::vector)
     RETURNING id`,
    content,
    embeddingStr
  );

  return Number(result[0].id);
}

/**
 * Insère un document avec chunking
 */
async function insertDocumentWithChunking(
  content: string,
  title: string,
  chunkSize: number,
  overlap: number,
  dryRun: boolean
): Promise<{ sourceId: number; chunkCount: number }> {
  const chunks = chunkText(content, chunkSize, overlap);

  if (dryRun) {
    console.log(
      `  [DRY-RUN] Would insert: "${title}" → ${chunks.length} chunks`
    );
    return { sourceId: 0, chunkCount: chunks.length };
  }

  // 1. Créer le document source (sans embedding)
  const sourceResult = await prisma.$queryRawUnsafe<{ id: number }[]>(
    `INSERT INTO documents (content, embedding)
     VALUES ($1, NULL)
     RETURNING id`,
    content
  );
  const sourceId = Number(sourceResult[0].id);

  // 2. Générer les embeddings pour tous les chunks
  const embeddings = await generateEmbeddings(chunks);

  // 3. Insérer chaque chunk avec référence au source
  for (let i = 0; i < chunks.length; i++) {
    const embeddingStr = `[${embeddings[i].join(',')}]`;
    await prisma.$queryRawUnsafe(
      `INSERT INTO documents (content, embedding, source_id, chunk_index)
       VALUES ($1, $2::vector, $3, $4)`,
      chunks[i],
      embeddingStr,
      sourceId,
      i
    );
  }

  return { sourceId, chunkCount: chunks.length };
}

/**
 * Nettoie tous les documents
 */
async function cleanDocuments(dryRun: boolean): Promise<void> {
  if (dryRun) {
    const count = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      'SELECT COUNT(*) as count FROM documents'
    );
    console.log(`[DRY-RUN] Would delete ${count[0].count} documents`);
    return;
  }

  await prisma.$queryRawUnsafe('DELETE FROM documents');
  console.log('🗑️  All documents deleted');
}

/**
 * Fonction principale de seeding
 */
async function seed(): Promise<void> {
  const options = parseArgs();

  console.log('🌱 Starting seed...\n');

  if (options.dryRun) {
    console.log('📋 DRY-RUN mode - no changes will be made\n');
  }

  // Nettoyage si demandé
  if (options.clean) {
    await cleanDocuments(options.dryRun);
    console.log('');
  }

  let totalDocuments = 0;
  let totalChunks = 0;

  for (const fixture of documentFixtures) {
    console.log(`📄 Processing: ${fixture.title}`);

    try {
      if (fixture.useChunking) {
        const { chunkCount } = await insertDocumentWithChunking(
          fixture.content,
          fixture.title,
          fixture.chunkSize || 500,
          fixture.overlap || 100,
          options.dryRun
        );
        totalDocuments++;
        totalChunks += chunkCount;
        console.log(`   ✅ Inserted with ${chunkCount} chunks`);
      } else {
        await insertDocument(fixture.content, fixture.title, options.dryRun);
        totalDocuments++;
        console.log(`   ✅ Inserted as single document`);
      }

      // Petit délai pour éviter le rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✨ Seed complete!`);
  console.log(`   Documents: ${totalDocuments}`);
  console.log(`   Total chunks: ${totalChunks}`);
  console.log('='.repeat(50));
}

// Exécution
seed()
  .catch((error) => {
    console.error('💥 Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

