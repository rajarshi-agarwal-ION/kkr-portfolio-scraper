import { Command, CommandRunner, Option } from 'nest-commander';
import { promises as fs } from 'fs';
import {
  CompanyRepository,
  QueryCompaniesDto,
} from '../../companies/repositories/company.repository';
import { Company } from '../../companies/schemas/company.schema';

type OutputFormat = 'table' | 'json';

interface QueryOptions extends QueryCompaniesDto {
  format?: string;
  output?: string;
}

@Command({ name: 'query', description: 'Query portfolio companies' })
export class QueryCommand extends CommandRunner {
  constructor(private readonly repository: CompanyRepository) {
    super();
  }

  async run(_passedParams: string[], options: QueryOptions): Promise<void> {
    const companies = await this.repository.find({
      assetClass: options.assetClass,
      industry: options.industry,
      region: options.region,
      limit: options.limit,
      skip: options.skip,
    });

    const format = (options.format?.toLowerCase() || 'table') as OutputFormat;
    const output = this.formatOutput(companies, format);

    if (options.output) {
      await fs.writeFile(options.output, output, 'utf-8');
      console.log(`Results written to ${options.output}`);
    } else {
      console.log(output);
    }
  }

  private formatOutput(companies: Company[], format: OutputFormat): string {
    if (format === 'json') {
      return JSON.stringify(companies, null, 2);
    }

    const rows = companies.map((c) => ({
      Name: c.name,
      'Asset Class': c.assetClasses?.join(', ') ?? '',
      Industry: c.industry ?? '',
      Region: c.region ?? '',
    }));

    if (rows.length === 0) {
      return 'No results found.';
    }

    // Simple table formatting for file output
    const headers = Object.keys(rows[0]) as Array<keyof (typeof rows)[0]>;
    const lines = [
      headers.join('\t'),
      ...rows.map((r) => headers.map((h) => r[h]).join('\t')),
    ];
    return lines.join('\n');
  }

  @Option({
    flags: '--assetClass <assetClass>',
    description: 'Filter by asset class',
  })
  parseAssetClass(val: string): string {
    return val;
  }

  @Option({
    flags: '--industry <industry>',
    description: 'Filter by industry',
  })
  parseIndustry(val: string): string {
    return val;
  }

  @Option({
    flags: '--region <region>',
    description: 'Filter by region',
  })
  parseRegion(val: string): string {
    return val;
  }

  @Option({
    flags: '--format <format>',
    description: 'Output format: table|json (default: table)',
  })
  parseFormat(val: string): string {
    return val;
  }

  @Option({
    flags: '--output <path>',
    description: 'Write results to file',
  })
  parseOutput(val: string): string {
    return val;
  }

  @Option({
    flags: '--limit <limit>',
    description: 'Limit number of results',
  })
  parseLimit(val: string): number {
    return Number(val);
  }

  @Option({
    flags: '--skip <skip>',
    description: 'Skip number of results',
  })
  parseSkip(val: string): number {
    return Number(val);
  }
}
