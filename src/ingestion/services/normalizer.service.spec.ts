import { Test, TestingModule } from '@nestjs/testing';
import { NormalizerService } from './normalizer.service';
import { RawCompany } from './kkr-client.service';

describe('NormalizerService', () => {
  let service: NormalizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NormalizerService],
    }).compile();

    service = module.get<NormalizerService>(NormalizerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('normalize', () => {
    it('should normalize a complete raw company object', () => {
      const raw: RawCompany = {
        yoi: '2022',
        sortingName: '+Simple',
        name: '+Simple',
        logo: '/content/dam/kkr/portfolio/resized-logos/simple-logo-raw.png',
        hq: 'Marseille, France',
        description: '<p>Digital insurance brokerage platform</p>\n',
        industry: 'Financials',
        assetClass: 'Tech Growth',
        region: 'Europe, The Middle East And Africa',
        url: 'www.plussimple.fr',
      };

      const result = service.normalize(raw);

      expect(result).toMatchObject({
        name: '+Simple',
        slug: 'simple',
        assetClasses: ['Tech Growth'],
        industry: 'Financials',
        region: 'Europe, The Middle East And Africa',
        yearOfInvestment: '2022',
        headquarters: 'Marseille, France',
        description: 'Digital insurance brokerage platform',
        website: 'www.plussimple.fr',
        logoPath:
          '/content/dam/kkr/portfolio/resized-logos/simple-logo-raw.png',
      });

      expect(result.source).toMatchObject({
        provider: 'kkr',
      });
      expect(result.source.lastFetchedAt).toBeInstanceOf(Date);
      expect(result.raw).toEqual(raw);
    });

    it('should handle comma-separated asset classes', () => {
      const raw: RawCompany = {
        yoi: '2020',
        sortingName: 'Test Company',
        name: 'Test Company',
        logo: '/logo.png',
        hq: 'New York, USA',
        description: 'Test description',
        industry: 'Technology',
        assetClass: 'Private Equity, Growth Equity, Real Estate',
        region: 'Americas',
        url: 'www.test.com',
      };

      const result = service.normalize(raw);

      expect(result.assetClasses).toEqual([
        'Private Equity',
        'Growth Equity',
        'Real Estate',
      ]);
    });

    it('should strip HTML tags from description', () => {
      const raw: RawCompany = {
        yoi: '2021',
        sortingName: 'Test',
        name: 'Test',
        logo: '',
        hq: '',
        description:
          '<div><strong>Bold</strong> text with <a href="#">links</a></div>',
        industry: 'Tech',
        assetClass: 'PE',
        region: 'US',
        url: '',
      };

      const result = service.normalize(raw);

      expect(result.description).toBe('Bold text with links');
    });

    it('should handle empty HTML description', () => {
      const raw: RawCompany = {
        yoi: '2021',
        sortingName: 'Test',
        name: 'Test',
        logo: '',
        hq: '',
        description: '<p></p>',
        industry: 'Tech',
        assetClass: 'PE',
        region: 'US',
        url: '',
      };

      const result = service.normalize(raw);

      expect(result.description).toBeUndefined();
    });

    it('should handle missing optional fields', () => {
      const raw: RawCompany = {
        yoi: '',
        sortingName: 'Test',
        name: 'Test',
        logo: '',
        hq: '',
        description: '',
        industry: 'Tech',
        assetClass: 'PE',
        region: 'US',
        url: '',
      };

      const result = service.normalize(raw);

      expect(result.yearOfInvestment).toBe('');
      expect(result.headquarters).toBeUndefined();
      expect(result.description).toBeUndefined();
      expect(result.website).toBeUndefined();
      expect(result.logoPath).toBe('');
    });

    it('should generate slug from sortingName', () => {
      const raw: RawCompany = {
        yoi: '2020',
        sortingName: 'ABC Corporation',
        name: 'ABC Corporation Inc.',
        logo: '',
        hq: '',
        description: '',
        industry: 'Finance',
        assetClass: 'PE',
        region: 'Americas',
        url: '',
      };

      const result = service.normalize(raw);

      expect(result.slug).toBe('abc-corporation');
    });

    it('should handle special characters in slug generation', () => {
      const raw: RawCompany = {
        yoi: '2020',
        sortingName: '+Simple & Co. (Test)',
        name: '+Simple & Co. (Test)',
        logo: '',
        hq: '',
        description: '',
        industry: 'Finance',
        assetClass: 'PE',
        region: 'Americas',
        url: '',
      };

      const result = service.normalize(raw);

      expect(result.slug).toBe('simple-and-co-test');
    });

    it('should trim whitespace from all string fields', () => {
      const raw: RawCompany = {
        yoi: '  2020  ',
        sortingName: '  Test Company  ',
        name: '  Test Company  ',
        logo: '  /logo.png  ',
        hq: '  New York  ',
        description: '  <p>Description</p>  ',
        industry: '  Technology  ',
        assetClass: '  Private Equity  ',
        region: '  Americas  ',
        url: '  www.test.com  ',
      };

      const result = service.normalize(raw);

      expect(result.name).toBe('Test Company');
      expect(result.headquarters).toBe('New York');
      expect(result.industry).toBe('Technology');
      expect(result.region).toBe('Americas');
    });

    it('should handle empty assetClass string', () => {
      const raw: RawCompany = {
        yoi: '2020',
        sortingName: 'Test',
        name: 'Test',
        logo: '',
        hq: '',
        description: '',
        industry: 'Tech',
        assetClass: '',
        region: 'US',
        url: '',
      };

      const result = service.normalize(raw);

      expect(result.assetClasses).toEqual([]);
    });

    it('should filter out empty asset classes after splitting', () => {
      const raw: RawCompany = {
        yoi: '2020',
        sortingName: 'Test',
        name: 'Test',
        logo: '',
        hq: '',
        description: '',
        industry: 'Tech',
        assetClass: 'Private Equity, , Growth Equity, ,',
        region: 'US',
        url: '',
      };

      const result = service.normalize(raw);

      expect(result.assetClasses).toEqual(['Private Equity', 'Growth Equity']);
    });

    it('should fallback to name if sortingName is missing', () => {
      const raw: RawCompany = {
        yoi: '2020',
        sortingName: '',
        name: 'Test Company',
        logo: '',
        hq: '',
        description: '',
        industry: 'Tech',
        assetClass: 'PE',
        region: 'US',
        url: '',
      };

      const result = service.normalize(raw);

      expect(result.slug).toBe('test-company');
    });

    it('should preserve raw data in normalized output', () => {
      const raw: RawCompany = {
        yoi: '2020',
        sortingName: 'Test',
        name: 'Test',
        logo: '/logo.png',
        hq: 'NYC',
        description: 'Desc',
        industry: 'Tech',
        assetClass: 'PE',
        region: 'US',
        url: 'www.test.com',
      };

      const result = service.normalize(raw);

      expect(result.raw).toEqual(raw);
    });
  });
});
