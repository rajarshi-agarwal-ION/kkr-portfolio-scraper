import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CompanyRepository, QueryCompaniesDto } from './company.repository';
import { Company } from '../schemas/company.schema';

describe('CompanyRepository', () => {
  let repository: CompanyRepository;

  const mockCompany: Company = {
    name: 'Test Company',
    slug: 'test-company',
    assetClasses: ['Private Equity'],
    industry: 'Technology',
    region: 'Americas',
    yearOfInvestment: '2020',
    headquarters: 'New York, USA',
    description: 'A test company',
    website: 'www.test.com',
    logoPath: '/logo.png',
    source: {
      provider: 'kkr',
      lastFetchedAt: new Date(),
    },
    raw: {},
  };

  const mockModelMethods = {
    updateOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyRepository,
        {
          provide: getModelToken(Company.name),
          useValue: {
            updateOne: mockModelMethods.updateOne,
            find: mockModelMethods.find,
            countDocuments: mockModelMethods.countDocuments,
          },
        },
      ],
    }).compile();

    repository = module.get<CompanyRepository>(CompanyRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('upsert', () => {
    it('should upsert a company by slug', async () => {
      mockModelMethods.updateOne.mockResolvedValue({ acknowledged: true });

      await repository.upsert(mockCompany);

      expect(mockModelMethods.updateOne).toHaveBeenCalledWith(
        { slug: 'test-company' },
        { $set: mockCompany },
        { upsert: true },
      );
    });

    it('should handle upsert errors', async () => {
      const error = new Error('Database error');
      mockModelMethods.updateOne.mockRejectedValue(error);

      await expect(repository.upsert(mockCompany)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('find', () => {
    const mockExec = jest.fn();
    const mockLimit = jest.fn(() => ({ skip: mockSkip }));
    const mockSkip = jest.fn(() => ({ exec: mockExec }));

    beforeEach(() => {
      mockModelMethods.find.mockReturnValue({ limit: mockLimit });
      jest.clearAllMocks();
    });

    it('should find companies without filters', async () => {
      const companies = [mockCompany];
      mockExec.mockResolvedValue(companies);

      const filters: QueryCompaniesDto = {};
      const result = await repository.find(filters);

      expect(mockModelMethods.find).toHaveBeenCalledWith({});
      expect(mockLimit).toHaveBeenCalledWith(20); // default limit
      expect(mockSkip).toHaveBeenCalledWith(0); // default skip
      expect(result).toEqual(companies);
    });

    it('should filter by asset class (case-insensitive)', async () => {
      const companies = [mockCompany];
      mockExec.mockResolvedValue(companies);

      const filters: QueryCompaniesDto = { assetClass: 'Private Equity' };
      await repository.find(filters);

      expect(mockModelMethods.find).toHaveBeenCalledWith({
        assetClasses: {
          $regex: '^Private Equity$',
          $options: 'i',
        },
      });
    });

    it('should filter by industry (case-insensitive)', async () => {
      const companies = [mockCompany];
      mockExec.mockResolvedValue(companies);

      const filters: QueryCompaniesDto = { industry: 'Technology' };
      await repository.find(filters);

      expect(mockModelMethods.find).toHaveBeenCalledWith({
        industry: {
          $regex: '^Technology$',
          $options: 'i',
        },
      });
    });

    it('should filter by region (case-insensitive)', async () => {
      const companies = [mockCompany];
      mockExec.mockResolvedValue(companies);

      const filters: QueryCompaniesDto = { region: 'Americas' };
      await repository.find(filters);

      expect(mockModelMethods.find).toHaveBeenCalledWith({
        region: {
          $regex: '^Americas$',
          $options: 'i',
        },
      });
    });

    it('should filter by multiple criteria', async () => {
      const companies = [mockCompany];
      mockExec.mockResolvedValue(companies);

      const filters: QueryCompaniesDto = {
        assetClass: 'Private Equity',
        industry: 'Technology',
        region: 'Americas',
      };
      await repository.find(filters);

      expect(mockModelMethods.find).toHaveBeenCalledWith({
        assetClasses: {
          $regex: '^Private Equity$',
          $options: 'i',
        },
        industry: {
          $regex: '^Technology$',
          $options: 'i',
        },
        region: {
          $regex: '^Americas$',
          $options: 'i',
        },
      });
    });

    it('should apply custom limit', async () => {
      const companies = [mockCompany];
      mockExec.mockResolvedValue(companies);

      const filters: QueryCompaniesDto = { limit: 50 };
      await repository.find(filters);

      expect(mockLimit).toHaveBeenCalledWith(50);
    });

    it('should apply custom skip', async () => {
      const companies = [mockCompany];
      mockExec.mockResolvedValue(companies);

      const filters: QueryCompaniesDto = { skip: 10 };
      await repository.find(filters);

      expect(mockSkip).toHaveBeenCalledWith(10);
    });

    it('should use default limit for zero or negative limit', async () => {
      const companies = [mockCompany];
      mockExec.mockResolvedValue(companies);

      const filters: QueryCompaniesDto = { limit: 0 };
      await repository.find(filters);

      expect(mockLimit).toHaveBeenCalledWith(20);
    });

    it('should use default skip for zero or negative skip', async () => {
      const companies = [mockCompany];
      mockExec.mockResolvedValue(companies);

      const filters: QueryCompaniesDto = { skip: -5 };
      await repository.find(filters);

      expect(mockSkip).toHaveBeenCalledWith(0);
    });

    it('should escape special regex characters in filters', async () => {
      const companies = [mockCompany];
      mockExec.mockResolvedValue(companies);

      const filters: QueryCompaniesDto = {
        assetClass: 'Tech (Growth)',
      };
      await repository.find(filters);

      expect(mockModelMethods.find).toHaveBeenCalledWith({
        assetClasses: {
          $regex: '^Tech \\(Growth\\)$',
          $options: 'i',
        },
      });
    });

    it('should handle empty result set', async () => {
      mockExec.mockResolvedValue([]);

      const filters: QueryCompaniesDto = { region: 'NonExistent' };
      const result = await repository.find(filters);

      expect(result).toEqual([]);
    });
  });

  describe('count', () => {
    const mockExec = jest.fn();

    beforeEach(() => {
      mockModelMethods.countDocuments.mockReturnValue({ exec: mockExec });
      jest.clearAllMocks();
    });

    it('should count all companies without filters', async () => {
      mockExec.mockResolvedValue(296);

      const filters: QueryCompaniesDto = {};
      const result = await repository.count(filters);

      expect(mockModelMethods.countDocuments).toHaveBeenCalledWith({});
      expect(result).toBe(296);
    });

    it('should count companies by asset class', async () => {
      mockExec.mockResolvedValue(50);

      const filters: QueryCompaniesDto = { assetClass: 'Private Equity' };
      const result = await repository.count(filters);

      expect(mockModelMethods.countDocuments).toHaveBeenCalledWith({
        assetClasses: {
          $regex: '^Private Equity$',
          $options: 'i',
        },
      });
      expect(result).toBe(50);
    });

    it('should count companies by industry', async () => {
      mockExec.mockResolvedValue(30);

      const filters: QueryCompaniesDto = { industry: 'Healthcare' };
      const result = await repository.count(filters);

      expect(mockModelMethods.countDocuments).toHaveBeenCalledWith({
        industry: {
          $regex: '^Healthcare$',
          $options: 'i',
        },
      });
      expect(result).toBe(30);
    });

    it('should count companies by region', async () => {
      mockExec.mockResolvedValue(100);

      const filters: QueryCompaniesDto = { region: 'Americas' };
      const result = await repository.count(filters);

      expect(mockModelMethods.countDocuments).toHaveBeenCalledWith({
        region: {
          $regex: '^Americas$',
          $options: 'i',
        },
      });
      expect(result).toBe(100);
    });

    it('should count companies by multiple filters', async () => {
      mockExec.mockResolvedValue(15);

      const filters: QueryCompaniesDto = {
        assetClass: 'Tech Growth',
        industry: 'Technology',
        region: 'Americas',
      };
      const result = await repository.count(filters);

      expect(mockModelMethods.countDocuments).toHaveBeenCalledWith({
        assetClasses: {
          $regex: '^Tech Growth$',
          $options: 'i',
        },
        industry: {
          $regex: '^Technology$',
          $options: 'i',
        },
        region: {
          $regex: '^Americas$',
          $options: 'i',
        },
      });
      expect(result).toBe(15);
    });

    it('should return zero for no matches', async () => {
      mockExec.mockResolvedValue(0);

      const filters: QueryCompaniesDto = { region: 'NonExistent' };
      const result = await repository.count(filters);

      expect(result).toBe(0);
    });

    it('should escape special regex characters in count filters', async () => {
      mockExec.mockResolvedValue(5);

      const filters: QueryCompaniesDto = {
        industry: 'Tech & Innovation',
      };
      await repository.count(filters);

      expect(mockModelMethods.countDocuments).toHaveBeenCalledWith({
        industry: {
          $regex: '^Tech & Innovation$',
          $options: 'i',
        },
      });
    });
  });
});
