import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface RawCompany {
  yoi: string;
  sortingName: string;
  name: string;
  logo: string;
  hq: string;
  description: string;
  industry: string;
  assetClass: string;
  region: string;
  url: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  hits: number;
  pages: number;
  startNumber: number;
  endNumber: number;
  results: RawCompany[];
}

@Injectable()
export class KkrClientService {
  private readonly logger = new Logger(KkrClientService.name);
  private readonly apiUrl: string;
  private readonly rateLimitMs: number;
  private readonly requestTimeout: number;
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl =
      this.configService.get<string>('kkr.apiBaseUrl') ||
      'https://www.kkr.com/content/kkr/sites/global/en/invest/portfolio/jcr:content/root/main-par/bioportfoliosearch.bioportfoliosearch.json';
    this.rateLimitMs =
      this.configService.get<number>('kkr.rateLimitMs') || 1000;
    this.requestTimeout =
      this.configService.get<number>('kkr.requestTimeout') || 10000;

    this.client = axios.create({ timeout: this.requestTimeout });
  }

  async fetchPage(page: number): Promise<ApiResponse> {
    await this.delay(this.rateLimitMs);

    try {
      const response = await this.client.get<ApiResponse>(this.apiUrl, {
        params: {
          page,
          sortParameter: 'name',
          sortingOrder: 'asc',
          keyword: '',
          cfnode: '',
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch page ${page}`, error as Error);
      throw error;
    }
  }

  async fetchAll(): Promise<RawCompany[]> {
    const allCompanies: RawCompany[] = [];

    const firstPage = await this.fetchPage(1);
    allCompanies.push(...firstPage.results);

    for (let page = 2; page <= firstPage.pages; page++) {
      this.logger.log(`Fetching page ${page} of ${firstPage.pages}`);
      const pageData = await this.fetchPage(page);
      allCompanies.push(...pageData.results);
    }

    this.logger.log(
      `Fetched ${allCompanies.length} companies across ${firstPage.pages} pages`,
    );
    return allCompanies;
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
