import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from '../schemas/company.schema';

export interface QueryCompaniesDto {
  assetClass?: string;
  industry?: string;
  region?: string;
  limit?: number;
  skip?: number;
}

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class CompanyRepository {
  constructor(
    @InjectModel(Company.name)
    private readonly model: Model<CompanyDocument>,
  ) {}

  async upsert(company: Company): Promise<void> {
    await this.model.updateOne(
      { slug: company.slug },
      { $set: company },
      { upsert: true },
    );
  }

  async find(filters: QueryCompaniesDto): Promise<Company[]> {
    const query: Record<string, unknown> = {};
    if (filters.assetClass) {
      query.assetClasses = {
        $regex: `^${escapeRegex(filters.assetClass)}$`,
        $options: 'i',
      };
    }
    if (filters.industry) {
      query.industry = {
        $regex: `^${escapeRegex(filters.industry)}$`,
        $options: 'i',
      };
    }
    if (filters.region) {
      query.region = {
        $regex: `^${escapeRegex(filters.region)}$`,
        $options: 'i',
      };
    }

    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const skip = filters.skip && filters.skip > 0 ? filters.skip : 0;

    return this.model.find(query).limit(limit).skip(skip).exec();
  }

  async count(filters: QueryCompaniesDto): Promise<number> {
    const query: Record<string, unknown> = {};
    if (filters.assetClass) {
      query.assetClasses = {
        $regex: `^${escapeRegex(filters.assetClass)}$`,
        $options: 'i',
      };
    }
    if (filters.industry) {
      query.industry = {
        $regex: `^${escapeRegex(filters.industry)}$`,
        $options: 'i',
      };
    }
    if (filters.region) {
      query.region = {
        $regex: `^${escapeRegex(filters.region)}$`,
        $options: 'i',
      };
    }

    return this.model.countDocuments(query).exec();
  }
}
