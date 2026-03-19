"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyllabusService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let SyllabusService = class SyllabusService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getRoots() {
        return this.prisma.syllabusNode.findMany({
            where: { parentId: null },
            orderBy: { orderIndex: 'asc' },
        });
    }
    async getChildren(parentId) {
        return this.prisma.syllabusNode.findMany({
            where: { parentId },
            orderBy: { orderIndex: 'asc' },
        });
    }
    async getNodeById(id) {
        return this.prisma.syllabusNode.findUnique({
            where: { id },
        });
    }
    async createNode(data) {
        return this.prisma.syllabusNode.create({ data });
    }
    async resolveAncestorScope(nodeId) {
        const scope = { nodeId };
        let current = await this.prisma.syllabusNode.findUnique({
            where: { id: nodeId },
        });
        while (current) {
            switch (current.type) {
                case client_1.NodeType.YEAR:
                    scope.yearId = current.id;
                    break;
                case client_1.NodeType.SUBJECT:
                    scope.subjectId = current.id;
                    break;
                case client_1.NodeType.CHAPTER:
                    scope.chapterId = current.id;
                    break;
                case client_1.NodeType.CONCEPT:
                    scope.conceptId = current.id;
                    break;
            }
            if (!current.parentId)
                break;
            current = await this.prisma.syllabusNode.findUnique({
                where: { id: current.parentId },
            });
        }
        return scope;
    }
    async getNodePath(nodeId) {
        const target = await this.prisma.syllabusNode.findUnique({
            where: { id: nodeId },
        });
        if (!target)
            throw new Error(`SyllabusNode ${nodeId} not found`);
        const path = [];
        let current = target;
        while (current) {
            path.unshift({ id: current.id, name: current.name, type: current.type });
            if (!current.parentId)
                break;
            current = await this.prisma.syllabusNode.findUnique({
                where: { id: current.parentId },
            });
        }
        return { ...target, path };
    }
    async getFullTree(rootId) {
        const roots = rootId
            ? await this.prisma.syllabusNode.findMany({
                where: { id: rootId },
                orderBy: { orderIndex: 'asc' },
            })
            : await this.prisma.syllabusNode.findMany({
                where: { parentId: null },
                orderBy: { orderIndex: 'asc' },
            });
        return this.attachChildren(roots);
    }
    async attachChildren(nodes) {
        return Promise.all(nodes.map(async (node) => {
            const children = await this.prisma.syllabusNode.findMany({
                where: { parentId: node.id },
                orderBy: { orderIndex: 'asc' },
            });
            return {
                ...node,
                children: children.length ? await this.attachChildren(children) : [],
            };
        }));
    }
};
exports.SyllabusService = SyllabusService;
exports.SyllabusService = SyllabusService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SyllabusService);
//# sourceMappingURL=syllabus.service.js.map