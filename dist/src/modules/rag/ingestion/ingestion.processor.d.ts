import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { ChunkingService } from './chunking.service';
import { EmbeddingService } from './embedding.service';
export declare class IngestionProcessor extends WorkerHost {
    private prisma;
    private chunkingService;
    private embeddingService;
    private readonly logger;
    constructor(prisma: PrismaService, chunkingService: ChunkingService, embeddingService: EmbeddingService);
    process(job: Job<any>): Promise<any>;
}
