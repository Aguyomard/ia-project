/**
 * Script de test automatisé pour valider le RAG
 *
 * Usage: pnpm test:rag
 *
 * Ce script pose des questions prédéfinies et vérifie que
 * les bons documents sont retournés par la recherche sémantique.
 */

import { PrismaClient } from '@prisma/client';
import { Mistral } from '@mistralai/mistralai';

const prisma = new PrismaClient();

const mistralApiKey = process.env.MISTRAL_API_KEY;
if (!mistralApiKey) {
  console.error('❌ MISTRAL_API_KEY is required');
  process.exit(1);
}
const mistral = new Mistral({ apiKey: mistralApiKey });

interface TestCase {
  question: string;
  expectedKeywords: string[];
  maxDistance: number;
}

const testCases: TestCase[] = [
  {
    question: 'mot de passe wifi',
    expectedKeywords: ['SecretWifi2024', 'BureauNet'],
    maxDistance: 0.35,
  },
  {
    question: 'horaires ouverture bureau',
    expectedKeywords: ['8h00', '20h00', 'Lundi'],
    maxDistance: 0.35,
  },
  {
    question: 'comment demander des congés',
    expectedKeywords: ['intranet', 'manager', 'congés'],
    maxDistance: 0.25,
  },
  {
    question: 'contact support informatique',
    expectedKeywords: ['4242', 'support@', 'IT'],
    maxDistance: 0.35,
  },
  {
    question: 'note de frais remboursement',
    expectedKeywords: ['justificatifs', '18€', 'frais'],
    maxDistance: 0.35,
  },
  {
    question: 'commandes docker compose',
    expectedKeywords: ['docker', 'compose', 'up'],
    maxDistance: 0.35,
  },
  {
    question: 'architecture clean architecture couches',
    expectedKeywords: ['Domain', 'Application', 'Infrastructure'],
    maxDistance: 0.35,
  },
  {
    question: 'télétravail règles',
    expectedKeywords: ['2 jours', 'manager', 'télétravail'],
    maxDistance: 0.35,
  },
  {
    question: 'réinitialiser mot de passe',
    expectedKeywords: ['reset-password', 'email'],
    maxDistance: 0.4,
  },
  {
    question: 'code parking',
    expectedKeywords: ['4589', 'parking'],
    maxDistance: 0.4,
  },
];

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await mistral.embeddings.create({
    model: 'mistral-embed',
    inputs: [text],
  });
  return response.data[0].embedding as number[];
}

async function searchDocuments(
  query: string,
  limit: number = 3
): Promise<{ content: string; distance: number }[]> {
  const embedding = await generateEmbedding(query);
  const embeddingStr = `[${embedding.join(',')}]`;

  const results = await prisma.$queryRawUnsafe<
    { content: string; distance: number }[]
  >(
    `SELECT content, embedding <=> $1::vector AS distance
     FROM documents
     WHERE embedding IS NOT NULL
     ORDER BY distance
     LIMIT $2`,
    embeddingStr,
    limit
  );

  return results.map((r) => ({
    content: r.content,
    distance: Number(r.distance),
  }));
}

async function runTests(): Promise<void> {
  console.log('🧪 Testing RAG search quality...\n');
  console.log('='.repeat(60) + '\n');

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`📝 Question: "${testCase.question}"`);

    try {
      const results = await searchDocuments(testCase.question, 1);

      if (results.length === 0) {
        console.log('   ❌ No results found');
        failed++;
        continue;
      }

      const topResult = results[0];
      const distance = topResult.distance;
      const content = topResult.content;

      // Vérifier la distance
      const distanceOk = distance <= testCase.maxDistance;

      // Vérifier les mots-clés
      const foundKeywords = testCase.expectedKeywords.filter((kw) =>
        content.toLowerCase().includes(kw.toLowerCase())
      );
      const keywordsOk = foundKeywords.length >= 1;

      if (distanceOk && keywordsOk) {
        console.log(
          `   ✅ PASS (distance: ${distance.toFixed(3)}, found: ${foundKeywords.join(', ')})`
        );
        passed++;
      } else {
        console.log(`   ❌ FAIL`);
        if (!distanceOk) {
          console.log(
            `      Distance ${distance.toFixed(3)} > max ${testCase.maxDistance}`
          );
        }
        if (!keywordsOk) {
          console.log(
            `      Keywords not found: ${testCase.expectedKeywords.join(', ')}`
          );
        }
        console.log(`      Content preview: "${content.substring(0, 100)}..."`);
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error}`);
      failed++;
    }

    // Petit délai pour éviter le rate limiting
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  console.log(
    `   Success rate: ${((passed / testCases.length) * 100).toFixed(0)}%\n`
  );

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

