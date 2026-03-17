import { Module } from '@nestjs/common';
import { TestPapersService } from './test-papers.service';
import { TestPapersController } from './test-papers.controller';
import { AIModule } from '../ai/ai.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [AIModule, RagModule],
  providers: [TestPapersService],
  controllers: [TestPapersController],
})
export class TestPapersModule {}
