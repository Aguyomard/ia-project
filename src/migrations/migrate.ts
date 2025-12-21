/**
 * Script de migration pour les tables qui ne sont pas gérées par Prisma
 * (ex: documents avec pgvector)
 *
 * Usage: pnpm migrate
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

interface MigrationRecord {
  id: number;
  name: string;
  applied_at: Date;
}

async function ensureMigrationsTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(): Promise<string[]> {
  const results = await prisma.$queryRawUnsafe<MigrationRecord[]>(
    'SELECT name FROM _migrations ORDER BY id'
  );
  return results.map((r) => r.name);
}

async function markMigrationApplied(name: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    'INSERT INTO _migrations (name) VALUES ($1)',
    name
  );
}

async function runMigration(filePath: string, fileName: string): Promise<void> {
  console.log(`📦 Running migration: ${fileName}`);

  const sql = readFileSync(filePath, 'utf-8');

  // Séparer les statements SQL (par point-virgule, en ignorant ceux dans les blocs DO)
  const statements = splitSqlStatements(sql);

  try {
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        await prisma.$executeRawUnsafe(trimmed);
      }
    }
    await markMigrationApplied(fileName);
    console.log(`✅ ${fileName} applied successfully`);
  } catch (error) {
    console.error(`❌ ${fileName} failed:`, error);
    throw error;
  }
}

/**
 * Sépare les statements SQL en tenant compte des blocs DO $$ ... $$
 */
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDoBlock = false;

  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Détecter le début d'un bloc DO $$
    if (trimmedLine.startsWith('DO $$') || trimmedLine === 'DO $$') {
      inDoBlock = true;
    }

    current += line + '\n';

    // Détecter la fin d'un bloc DO $$
    if (inDoBlock && trimmedLine.endsWith('$$;')) {
      inDoBlock = false;
      statements.push(current.trim());
      current = '';
      continue;
    }

    // Si on n'est pas dans un bloc DO et la ligne finit par ;
    if (!inDoBlock && trimmedLine.endsWith(';') && !trimmedLine.startsWith('--')) {
      statements.push(current.trim());
      current = '';
    }
  }

  // Ajouter le reste s'il y en a
  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements.filter((s) => s && !s.startsWith('--'));
}

async function migrate(): Promise<void> {
  console.log('🚀 Starting migrations...\n');

  try {
    await ensureMigrationsTable();

    const appliedMigrations = await getAppliedMigrations();
    console.log(`📋 Already applied: ${appliedMigrations.length} migration(s)`);

    // Lister les fichiers de migration
    const migrationFiles = readdirSync(__dirname)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`📂 Found: ${migrationFiles.length} migration file(s)\n`);

    let appliedCount = 0;

    for (const file of migrationFiles) {
      if (!appliedMigrations.includes(file)) {
        await runMigration(join(__dirname, file), file);
        appliedCount++;
      } else {
        console.log(`⏭️  ${file} (already applied)`);
      }
    }

    console.log(`\n✨ Done! Applied ${appliedCount} new migration(s)`);
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();


 * (ex: documents avec pgvector)
 *
 * Usage: pnpm migrate
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

interface MigrationRecord {
  id: number;
  name: string;
  applied_at: Date;
}

async function ensureMigrationsTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(): Promise<string[]> {
  const results = await prisma.$queryRawUnsafe<MigrationRecord[]>(
    'SELECT name FROM _migrations ORDER BY id'
  );
  return results.map((r) => r.name);
}

async function markMigrationApplied(name: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    'INSERT INTO _migrations (name) VALUES ($1)',
    name
  );
}

async function runMigration(filePath: string, fileName: string): Promise<void> {
  console.log(`📦 Running migration: ${fileName}`);

  const sql = readFileSync(filePath, 'utf-8');

  // Séparer les statements SQL (par point-virgule, en ignorant ceux dans les blocs DO)
  const statements = splitSqlStatements(sql);

  try {
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        await prisma.$executeRawUnsafe(trimmed);
      }
    }
    await markMigrationApplied(fileName);
    console.log(`✅ ${fileName} applied successfully`);
  } catch (error) {
    console.error(`❌ ${fileName} failed:`, error);
    throw error;
  }
}

/**
 * Sépare les statements SQL en tenant compte des blocs DO $$ ... $$
 */
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDoBlock = false;

  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Détecter le début d'un bloc DO $$
    if (trimmedLine.startsWith('DO $$') || trimmedLine === 'DO $$') {
      inDoBlock = true;
    }

    current += line + '\n';

    // Détecter la fin d'un bloc DO $$
    if (inDoBlock && trimmedLine.endsWith('$$;')) {
      inDoBlock = false;
      statements.push(current.trim());
      current = '';
      continue;
    }

    // Si on n'est pas dans un bloc DO et la ligne finit par ;
    if (!inDoBlock && trimmedLine.endsWith(';') && !trimmedLine.startsWith('--')) {
      statements.push(current.trim());
      current = '';
    }
  }

  // Ajouter le reste s'il y en a
  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements.filter((s) => s && !s.startsWith('--'));
}

async function migrate(): Promise<void> {
  console.log('🚀 Starting migrations...\n');

  try {
    await ensureMigrationsTable();

    const appliedMigrations = await getAppliedMigrations();
    console.log(`📋 Already applied: ${appliedMigrations.length} migration(s)`);

    // Lister les fichiers de migration
    const migrationFiles = readdirSync(__dirname)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`📂 Found: ${migrationFiles.length} migration file(s)\n`);

    let appliedCount = 0;

    for (const file of migrationFiles) {
      if (!appliedMigrations.includes(file)) {
        await runMigration(join(__dirname, file), file);
        appliedCount++;
      } else {
        console.log(`⏭️  ${file} (already applied)`);
      }
    }

    console.log(`\n✨ Done! Applied ${appliedCount} new migration(s)`);
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();

