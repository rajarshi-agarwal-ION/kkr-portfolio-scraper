import { Module } from '@nestjs/common';
import { CompaniesModule } from '../companies/companies.module';
import { IngestCommand } from './commands/ingest.command';
import { QueryCommand } from './commands/query.command';
import { IngestionService } from './services/ingestion.service';
import { KkrClientService } from './services/kkr-client.service';
import { NormalizerService } from './services/normalizer.service';

@Module({
  imports: [CompaniesModule],
  providers: [KkrClientService, NormalizerService, IngestionService, IngestCommand, QueryCommand],
  exports: [IngestionService],
})
export class IngestionModule {}