import { Module } from '@nestjs/common';
import { VivaService } from './viva.service';
import { VivaController } from './viva.controller';
import { AIModule } from '../ai/ai.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [AIModule, RagModule],
  providers: [VivaService],
  controllers: [VivaController],
})
export class VivaModule {}
