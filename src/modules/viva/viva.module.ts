import { Module } from '@nestjs/common';
import { VivaService } from './viva.service';
import { VivaController } from './viva.controller';
import { AIModule } from '../ai/ai.module';
import { RagModule } from '../rag/rag.module';
import { SyllabusModule } from '../syllabus/syllabus.module';

@Module({
  imports: [AIModule, RagModule, SyllabusModule],
  providers: [VivaService],
  controllers: [VivaController],
})
export class VivaModule {}
