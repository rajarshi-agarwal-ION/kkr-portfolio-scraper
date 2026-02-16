import { Command, CommandRunner } from 'nest-commander';
import { IngestionService } from '../services/ingestion.service';

@Command({
  name: 'ingest',
  description: 'Fetch and store KKR portfolio companies',
})
export class IngestCommand extends CommandRunner {
  constructor(private readonly ingestionService: IngestionService) {
    super();
  }

  async run(): Promise<void> {
    console.log('Starting ingestion...');
    const { processed, failed } = await this.ingestionService.runIngestion();
    console.log(`Ingestion complete. processed=${processed} failed=${failed}`);
  }
}
