import { PrismaClient, NodeType, Role } from '@prisma/client';
import "dotenv/config";
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data...');

  // 1. Admin Account
  const adminEmail = 'admin@platform.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        fullName: 'Platform Admin',
        role: Role.ADMIN,
      },
    });
    console.log('Admin account created: admin@platform.com / admin123');
  }

  console.log('Seeding syllabus data...');

  // Years
  const bds1 = await prisma.syllabusNode.create({
    data: { name: 'BDS 1', type: NodeType.YEAR, orderIndex: 1 },
  });
  await prisma.syllabusNode.create({
    data: { name: 'BDS 2', type: NodeType.YEAR, orderIndex: 2 },
  });

  // Subjects for BDS 1
  const anatomy = await prisma.syllabusNode.create({
    data: {
      name: 'General Anatomy',
      type: NodeType.SUBJECT,
      parentId: bds1.id,
      orderIndex: 1,
    },
  });

  // Chapter for Anatomy
  const headNeck = await prisma.syllabusNode.create({
    data: {
      name: 'Head and Neck',
      type: NodeType.CHAPTER,
      parentId: anatomy.id,
      orderIndex: 1,
    },
  });

  // Concepts for Head and Neck
  await prisma.syllabusNode.create({
    data: {
      name: 'Cranial Nerves',
      type: NodeType.CONCEPT,
      parentId: headNeck.id,
      orderIndex: 1,
    },
  });
  await prisma.syllabusNode.create({
    data: {
      name: 'Blood Supply',
      type: NodeType.CONCEPT,
      parentId: headNeck.id,
      orderIndex: 2,
    },
  });

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
