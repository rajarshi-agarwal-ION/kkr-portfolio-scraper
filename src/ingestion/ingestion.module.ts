import { Module } from '@nestjs/common';
import { CompaniesModule } from '../companies/companies.module';
import { IngestionService } from './services/ingestion.service';
import { KkrClientService } from './services/kkr-client.service';
import { NormalizerService } from './services/normalizer.service';

@Module({
  imports: [CompaniesModule],
  providers: [KkrClientService, NormalizerService, IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}