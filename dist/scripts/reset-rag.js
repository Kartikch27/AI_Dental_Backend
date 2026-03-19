"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('⚠️  Resetting RAG data (documents + chunks)...');
    const chunkCount = await prisma.ragChunk.count();
    const docCount = await prisma.ragDocument.count();
    const sourceCount = await prisma.generationSource.count();
    console.log(`  Found: ${docCount} documents, ${chunkCount} chunks, ${sourceCount} generation sources`);
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
//# sourceMappingURL=reset-rag.js.map