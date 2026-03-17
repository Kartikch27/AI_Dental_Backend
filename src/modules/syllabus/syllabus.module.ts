import { Module } from '@nestjs/common';
import { SyllabusService } from './syllabus.service';
import { SyllabusController } from './syllabus.controller';

@Module({
  providers: [SyllabusService],
  controllers: [SyllabusController],
  exports: [SyllabusService],
})
export class SyllabusModule {}
