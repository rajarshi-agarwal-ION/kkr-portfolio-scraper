import { Injectable } from '@nestjs/common';
import slugify from 'slugify';
import { Company } from '../../companies/schemas/company.schema';
import { RawCompany } from './kkr-client.service';

@Injectable()
export class NormalizerService {
  normalize(raw: RawCompany): Company {
    const cleanRegion = this.cleanString(raw.region);
    const cleanIndustry = this.cleanString(raw.industry);
    return {
      name: this.cleanString(raw.name) || raw.name,
      slug: slugify(raw.sortingName || raw.name, { lower: true, strict: true }),
      assetClasses: this.splitAssetClasses(raw.assetClass),
      industry: cleanIndustry,
      region: cleanRegion,
      yearOfInvestment: raw.yoi,
      headquarters: this.cleanString(raw.hq),
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

  private cleanString(value?: string): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
}