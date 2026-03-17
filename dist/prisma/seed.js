"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
require("dotenv/config");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding initial data...');
    const adminEmail = 'admin@platform.com';
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await prisma.user.create({
            data: {
                email: adminEmail,
                password: hashedPassword,
                fullName: 'Platform Admin',
                role: client_1.Role.ADMIN,
            },
        });
        console.log('Admin account created: admin@platform.com / admin123');
    }
    console.log('Seeding syllabus data...');
    const bds1 = await prisma.syllabusNode.create({
        data: { name: 'BDS 1', type: client_1.NodeType.YEAR, orderIndex: 1 },
    });
    await prisma.syllabusNode.create({
        data: { name: 'BDS 2', type: client_1.NodeType.YEAR, orderIndex: 2 },
    });
    const anatomy = await prisma.syllabusNode.create({
        data: {
            name: 'General Anatomy',
            type: client_1.NodeType.SUBJECT,
            parentId: bds1.id,
            orderIndex: 1,
        },
    });
    const headNeck = await prisma.syllabusNode.create({
        data: {
            name: 'Head and Neck',
            type: client_1.NodeType.CHAPTER,
            parentId: anatomy.id,
            orderIndex: 1,
        },
    });
    await prisma.syllabusNode.create({
        data: {
            name: 'Cranial Nerves',
            type: client_1.NodeType.CONCEPT,
            parentId: headNeck.id,
            orderIndex: 1,
        },
    });
    await prisma.syllabusNode.create({
        data: {
            name: 'Blood Supply',
            type: client_1.NodeType.CONCEPT,
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
//# sourceMappingURL=seed.js.map