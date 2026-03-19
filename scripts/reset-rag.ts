/**
 * Resets all RAG data (documents + chunks) while preserving users and syllabus tree.
 * Run with: npx ts-node scripts/reset-rag.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⚠️  Resetting RAG data (documents + chunks)...');

  const chunkCount = await prisma.ragChunk.count();
  const docCount = await prisma.ragDocument.count();
  const sourceCount = await prisma.generationSource.count();

  console.log(`  Found: ${docCount} documents, ${chunkCount} chunks, ${sourceCount} generation sources`);

  // Delete in dependency order
  await prisma.generationSource.deleteMany({});
  console.log('  ✓ Cleared GenerationSource');

  await prisma.$executeRawUnsafe(`DELETE FROM "RagChunk"`);
  console.log(`  ✓ Cleared ${chunkCount} RagChunks`);

  await prisma.ragDocument.deleteMany({});
  console.log(`  ✓ Cleared ${docCount} RagDocuments`);

  const remainingNodes = await prisma.syllabusNode.count();
  const remainingUsers = await prisma.user.count();
  console.log(`\n✅ Reset complete. Preserved ${remainingNodes} SyllabusNodes and ${remainingUsers} users.`);
}

main()
  .catch((e) => {
    console.error('❌ Reset failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
