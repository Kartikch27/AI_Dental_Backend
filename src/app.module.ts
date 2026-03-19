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
import type { ConnectionOptions } from 'bullmq';

function getRedisConnection(): ConnectionOptions | null {
  if (process.env.REDIS_URL) {
    try {
      const u = new URL(process.env.REDIS_URL);
      const dbFromPath = u.pathname?.replace('/', '');
      const db = dbFromPath ? Number.parseInt(dbFromPath, 10) : undefined;

      return {
        host: u.hostname,
        port: u.port ? Number.parseInt(u.port, 10) : 6379,
        username: u.username || undefined,
        password: u.password || undefined,
        db: Number.isFinite(db) ? db : undefined,
        ...(u.protocol === 'rediss:' ? { tls: {} } : {}),
      };
    } catch {
      return null;
    }
  }

  if (process.env.REDIS_HOST) {
    return {
      host: process.env.REDIS_HOST,
      port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
    };
  }

  return null;
}

const redisConnection = getRedisConnection();
const enableRagQueue =
  process.env.ENABLE_RAG_QUEUE === 'true' ||
  process.env.ENABLE_QUEUES === 'true' ||
  process.env.ENABLE_BULLMQ === 'true';

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
    ...(enableRagQueue && redisConnection
      ? [
          BullModule.forRoot({
            connection: redisConnection,
          }),
          RagModule,
        ]
      : []),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
