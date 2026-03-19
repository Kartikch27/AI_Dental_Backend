import { Queue } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { SyllabusService } from '../../syllabus/syllabus.service';
export declare class IngestionService {
    private prisma;
    private syllabusService;
    private ingestionQueue?;
    private readonly logger;
    constructor(prisma: PrismaService, syllabusService: SyllabusService, ingestionQueue?: Queue | undefined);
    private resolveScope;
    processDocument(title: string, content: string, metadata: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        sourceType: string;
        inputMethod: string;
        fileUrl: string | null;
        fileName: string | null;
        mimeType: string | null;
        yearId: string | null;
        subjectId: string | null;
        chapterId: string | null;
        conceptId: string | null;
        status: string;
        ingestionStatus: import(".prisma/client").$Enums.IngestionStatus;
        failureReason: string | null;
        processedAt: Date | null;
        nodeId: string | null;
    }>;
    processFile(title: string, file: any, metadata: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        sourceType: string;
        inputMethod: string;
        fileUrl: string | null;
        fileName: string | null;
        mimeType: string | null;
        yearId: string | null;
        subjectId: string | null;
        chapterId: string | null;
        conceptId: string | null;
        status: string;
        ingestionStatus: import(".prisma/client").$Enums.IngestionStatus;
        failureReason: string | null;
        processedAt: Date | null;
        nodeId: string | null;
    }>;
    retryIngestion(documentId: string): Promise<{
        message: string;
    }>;
}
