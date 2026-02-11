import { Injectable } from '@nestjs/common';
import slugify from 'slugify';
import { Company } from '../../companies/schemas/company.schema';
import { RawCompany } from './kkr-client.service';

@Injectable()
export class NormalizerService {
  normalize(raw: RawCompany): Company {
    return {
      name: raw.name,
      slug: slugify(raw.sortingName || raw.name, { lower: true, strict: true }),
      assetClasses: this.splitAssetClasses(raw.assetClass),
      industry: raw.industry,
      region: raw.region,
      yearOfInvestment: raw.yoi,
      headquarters: raw.hq,
      description: this.stripHtml(raw.description),
      website: raw.url || undefined,
      logoPath: raw.logo,
      source: {
        provider: 'kkr',
        lastFetchedAt: new Date(),
      },
      raw,
    } as Company;
  }

  private splitAssetClasses(assetClass: string): string[] {
    if (!assetClass) return [];
    return assetClass
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private stripHtml(html?: string): string | undefined {
    if (!html) return undefined;
    return html.replace(/<[^>]*>/g, '').trim() || undefined;
  }
}