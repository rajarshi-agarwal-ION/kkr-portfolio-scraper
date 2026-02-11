import { Injectable, Logger } from '@nestjs/common';
import { CompanyRepository } from '../../companies/repositories/company.repository';
import { KkrClientService } from './kkr-client.service';
import { NormalizerService } from './normalizer.service';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly client: KkrClientService,
    private readonly normalizer: NormalizerService,
    private readonly repository: CompanyRepository,
  ) {}

  async runIngestion(): Promise<{ processed: number; failed: number }> {
    this.logger.log('Starting ingestion');

    const rawCompanies = await this.client.fetchAll();
    let processed = 0;
    let failed = 0;

    for (const raw of rawCompanies) {
      try {
        const company = this.normalizer.normalize(raw);
        await this.repository.upsert(company);
        processed += 1;
        if (processed % 25 === 0) {
          this.logger.log(`Processed ${processed} companies so far`);
        }
      } catch (error) {
        failed += 1;
        this.logger.error(`Failed to process company ${raw.name}`, error as Error);
      }
    }

    this.logger.log(`Ingestion complete. processed=${processed} failed=${failed}`);
    return { processed, failed };
  }
}