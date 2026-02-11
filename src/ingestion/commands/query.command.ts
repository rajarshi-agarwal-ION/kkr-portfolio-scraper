import { Command, CommandRunner, Option } from 'nest-commander';
import { CompanyRepository, QueryCompaniesDto } from '../../companies/repositories/company.repository';

type OutputFormat = 'table' | 'json';

@Command({ name: 'query', description: 'Query portfolio companies' })
export class QueryCommand extends CommandRunner {
  constructor(private readonly repository: CompanyRepository) {
    super();
  }

  async run(_: string[], options: QueryCompaniesDto & { format?: OutputFormat }): Promise<void> {
    const companies = await this.repository.find(options);

    if ((options.format || 'table') === 'json') {
      console.log(JSON.stringify(companies, null, 2));
      return;
    }

    console.table(
      companies.map((c) => ({
        Name: c.name,
        'Asset Class': c.assetClasses?.join(', '),
        Industry: c.industry,
        Region: c.region,
      })),
    );
  }

  @Option({ flags: '--assetClass <assetClass>', description: 'Filter by asset class' })
  parseAssetClass(val: string): string {
    return val;
  }

  @Option({ flags: '--industry <industry>', description: 'Filter by industry' })
  parseIndustry(val: string): string {
    return val;
  }

  @Option({ flags: '--region <region>', description: 'Filter by region' })
  parseRegion(val: string): string {
    return val;
  }

  @Option({ flags: '--format <format>', description: 'Output format: table|json', defaultValue: 'table' })
  parseFormat(val: OutputFormat): OutputFormat {
    return val;
  }
}