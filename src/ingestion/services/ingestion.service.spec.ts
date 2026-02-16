import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { KkrClientService, RawCompany } from './kkr-client.service';
import { NormalizerService } from './normalizer.service';
import { CompanyRepository } from '../../companies/repositories/company.repository';
import { Company } from '../../companies/schemas/company.schema';

describe('IngestionService', () => {
  let service: IngestionService;
  let kkrClient: KkrClientService;
  let normalizer: NormalizerService;
  let repository: CompanyRepository;

  const mockRawCompanies: RawCompany[] = [
    {
      yoi: '2022',
      sortingName: 'Company A',
      name: 'Company A',
      logo: '/logo-a.png',
      hq: 'New York, USA',
      description: '<p>Description A</p>',
      industry: 'Technology',
      assetClass: 'Private Equity',
      region: 'Americas',
      url: 'www.companya.com',
    },
    {
      yoi: '2021',
      sortingName: 'Company B',
      name: 'Company B',
      logo: '/logo-b.png',
      hq: 'London, UK',
      description: '<p>Description B</p>',
      industry: 'Healthcare',
      assetClass: 'Growth Equity',
      region: 'Europe, The Middle East And Africa',
      url: 'www.companyb.com',
    },
    {
      yoi: '2020',
      sortingName: 'Company C',
      name: 'Company C',
      logo: '/logo-c.png',
      hq: 'Tokyo, Japan',
      description: '<p>Description C</p>',
      industry: 'Financials',
      assetClass: 'Real Estate',
      region: 'Asia Pacific',
      url: 'www.companyc.com',
    },
  ];

  const mockNormalizedCompanies: Company[] = mockRawCompanies.map(
    (raw, index) =>
      ({
        name: raw.name,
        slug: `company-${String.fromCharCode(97 + index)}`,
        assetClasses: [raw.assetClass],
        industry: raw.industry,
        region: raw.region,
        yearOfInvestment: raw.yoi,
        headquarters: raw.hq,
        description: `Description ${String.fromCharCode(65 + index)}`,
        website: raw.url,
        logoPath: raw.logo,
        source: {
          provider: 'kkr',
          lastFetchedAt: new Date(),
        },
        raw,
      }) as Company,
  );

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        {
          provide: KkrClientService,
          useValue: {
            fetchAll: jest.fn(),
          },
        },
        {
          provide: NormalizerService,
          useValue: {
            normalize: jest.fn(),
          },
        },
        {
          provide: CompanyRepository,
          useValue: {
            upsert: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<IngestionService>(IngestionService);
    kkrClient = module.get<KkrClientService>(KkrClientService);
    normalizer = module.get<NormalizerService>(NormalizerService);
    repository = module.get<CompanyRepository>(CompanyRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runIngestion', () => {
    it('should successfully ingest all companies', async () => {
      jest.spyOn(kkrClient, 'fetchAll').mockResolvedValue(mockRawCompanies);

      mockRawCompanies.forEach((raw, index) => {
        jest
          .spyOn(normalizer, 'normalize')
          .mockReturnValueOnce(mockNormalizedCompanies[index]);
      });

      jest.spyOn(repository, 'upsert').mockResolvedValue(undefined);

      const result = await service.runIngestion();

      expect(result).toEqual({
        processed: 3,
        failed: 0,
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(kkrClient.fetchAll).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(normalizer.normalize).toHaveBeenCalledTimes(3);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.upsert).toHaveBeenCalledTimes(3);

      mockRawCompanies.forEach((raw, index) => {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(normalizer.normalize).toHaveBeenCalledWith(raw);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(repository.upsert).toHaveBeenCalledWith(
          mockNormalizedCompanies[index],
        );
      });
    });

    it('should handle normalization errors gracefully', async () => {
      jest.spyOn(kkrClient, 'fetchAll').mockResolvedValue(mockRawCompanies);

      jest
        .spyOn(normalizer, 'normalize')
        .mockReturnValueOnce(mockNormalizedCompanies[0])
        .mockImplementationOnce(() => {
          throw new Error('Normalization failed');
        })
        .mockReturnValueOnce(mockNormalizedCompanies[2]);

      jest.spyOn(repository, 'upsert').mockResolvedValue(undefined);

      const result = await service.runIngestion();

      expect(result).toEqual({
        processed: 2,
        failed: 1,
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(kkrClient.fetchAll).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(normalizer.normalize).toHaveBeenCalledTimes(3);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.upsert).toHaveBeenCalledTimes(2);
    });

    it('should handle repository errors gracefully', async () => {
      jest.spyOn(kkrClient, 'fetchAll').mockResolvedValue(mockRawCompanies);

      mockRawCompanies.forEach((raw, index) => {
        jest
          .spyOn(normalizer, 'normalize')
          .mockReturnValueOnce(mockNormalizedCompanies[index]);
      });

      jest
        .spyOn(repository, 'upsert')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce(undefined);

      const result = await service.runIngestion();

      expect(result).toEqual({
        processed: 2,
        failed: 1,
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(kkrClient.fetchAll).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(normalizer.normalize).toHaveBeenCalledTimes(3);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.upsert).toHaveBeenCalledTimes(3);
    });

    it('should handle empty result set', async () => {
      jest.spyOn(kkrClient, 'fetchAll').mockResolvedValue([]);

      const result = await service.runIngestion();

      expect(result).toEqual({
        processed: 0,
        failed: 0,
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(kkrClient.fetchAll).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(normalizer.normalize).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.upsert).not.toHaveBeenCalled();
    });

    it('should continue processing after encountering errors', async () => {
      const largeCompanySet: RawCompany[] = Array.from(
        { length: 100 },
        (_, i) => ({
          ...mockRawCompanies[0],
          name: `Company ${i}`,
          sortingName: `Company ${i}`,
        }),
      );

      jest.spyOn(kkrClient, 'fetchAll').mockResolvedValue(largeCompanySet);

      let normalizeCallCount = 0;
      jest.spyOn(normalizer, 'normalize').mockImplementation(() => {
        normalizeCallCount++;
        // Fail every 10th company
        if (normalizeCallCount % 10 === 0) {
          throw new Error('Normalization failed');
        }
        return mockNormalizedCompanies[0];
      });

      jest.spyOn(repository, 'upsert').mockResolvedValue(undefined);

      const result = await service.runIngestion();

      expect(result.processed).toBe(90);
      expect(result.failed).toBe(10);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(normalizer.normalize).toHaveBeenCalledTimes(100);
    });

    it('should handle client fetch errors', async () => {
      jest
        .spyOn(kkrClient, 'fetchAll')
        .mockRejectedValue(new Error('Network error'));

      await expect(service.runIngestion()).rejects.toThrow('Network error');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(kkrClient.fetchAll).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(normalizer.normalize).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.upsert).not.toHaveBeenCalled();
    });

    it('should process companies in order', async () => {
      jest.spyOn(kkrClient, 'fetchAll').mockResolvedValue(mockRawCompanies);

      const normalizedOrder: string[] = [];
      let normalizeCallIndex = 0;
      jest.spyOn(normalizer, 'normalize').mockImplementation((raw) => {
        normalizedOrder.push(raw.name);
        return mockNormalizedCompanies[normalizeCallIndex++];
      });

      const upsertedOrder: string[] = [];
      jest.spyOn(repository, 'upsert').mockImplementation((company) => {
        upsertedOrder.push(company.name);
        return Promise.resolve(undefined);
      });

      await service.runIngestion();

      expect(normalizedOrder).toEqual(['Company A', 'Company B', 'Company C']);
      expect(upsertedOrder).toEqual(['Company A', 'Company B', 'Company C']);
    });

    it('should handle all companies failing normalization', async () => {
      jest.spyOn(kkrClient, 'fetchAll').mockResolvedValue(mockRawCompanies);

      jest.spyOn(normalizer, 'normalize').mockImplementation(() => {
        throw new Error('All normalizations fail');
      });

      const result = await service.runIngestion();

      expect(result).toEqual({
        processed: 0,
        failed: 3,
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(normalizer.normalize).toHaveBeenCalledTimes(3);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.upsert).not.toHaveBeenCalled();
    });

    it('should handle all companies failing upsert', async () => {
      jest.spyOn(kkrClient, 'fetchAll').mockResolvedValue(mockRawCompanies);

      mockRawCompanies.forEach((raw, index) => {
        jest
          .spyOn(normalizer, 'normalize')
          .mockReturnValueOnce(mockNormalizedCompanies[index]);
      });

      jest.spyOn(repository, 'upsert').mockRejectedValue(new Error('DB down'));

      const result = await service.runIngestion();

      expect(result).toEqual({
        processed: 0,
        failed: 3,
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(normalizer.normalize).toHaveBeenCalledTimes(3);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.upsert).toHaveBeenCalledTimes(3);
    });
  });
});
