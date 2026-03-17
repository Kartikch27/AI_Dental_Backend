import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { SyllabusModule } from './modules/syllabus/syllabus.module';
import { AIModule } from './modules/ai/ai.module';
import { NotesModule } from './modules/notes/notes.module';
import { TestPapersModule } from './modules/test-papers/test-papers.module';
import { VivaModule } from './modules/viva/viva.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { BullModule } from '@nestjs/bullmq';
import { RagModule } from './modules/rag/rag.module';

@Module({
  imports: [
    PrismaModule,
    AIModule,
    AuthModule,
    SyllabusModule,
    NotesModule,
    TestPapersModule,
    VivaModule,
    PdfModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    RagModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
