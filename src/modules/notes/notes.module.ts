import { Module } from '@nestjs/common';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { AIModule } from '../ai/ai.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [AIModule, RagModule],
  providers: [NotesService],
  controllers: [NotesController],
})
export class NotesModule {}
