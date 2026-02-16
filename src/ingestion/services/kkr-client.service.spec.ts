import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import {
  KkrClientService,
  ApiResponse,
  RawCompany,
} from './kkr-client.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('KkrClientService', () => {
  let service: KkrClientService;
  let configService: ConfigService;
  let mockAxiosInstance: {
    get: jest.Mock;
    defaults: Record<string, unknown>;
    interceptors: {
      request: { use: jest.Mock; eject: jest.Mock; clear: jest.Mock };
      response: { use: jest.Mock; eject: jest.Mock; clear: jest.Mock };
    };
  };

  const mockApiResponse: ApiResponse = {
    success: true,
    message: 'Success',
    hits: 296,
    pages: 20,
    startNumber: 1,
    endNumber: 15,
    results: [
      {
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
      },
    ] as RawCompany[],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();

    mockAxiosInstance = {
      get: jest.fn(),
      defaults: {},
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    mockedAxios.create = jest.fn(() => mockAxiosInstance) as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KkrClientService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                'kkr.apiBaseUrl':
                  'https://www.kkr.com/content/kkr/sites/global/en/invest/portfolio/jcr:content/root/main-par/bioportfoliosearch.bioportfoliosearch.json',
                'kkr.rateLimitMs': 0, // Set to 0 to avoid delays in tests
                'kkr.requestTimeout': 10000,
              };
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<KkrClientService>(KkrClientService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchPage', () => {
    it('should fetch a single page successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: mockApiResponse,
      });

      const result = await service.fetchPage(1);

      expect(result).toEqual(mockApiResponse);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('kkr.com'),
        expect.objectContaining({
          params: {
            page: 1,
            sortParameter: 'name',
            sortingOrder: 'asc',
            keyword: '',
            cfnode: '',
          },
        }),
      );
    });

    it('should include correct query parameters', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: mockApiResponse,
      });

      await service.fetchPage(5);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('kkr.com'),
        {
          params: {
            page: 5,
            sortParameter: 'name',
            sortingOrder: 'asc',
            keyword: '',
            cfnode: '',
          },
        },
      );
    });

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('Network error');
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(service.fetchPage(1)).rejects.toThrow('Network error');
    });
  });

  describe('fetchAll', () => {
    it('should fetch all pages correctly', async () => {
      const page1Response: ApiResponse = {
        ...mockApiResponse,
        pages: 3,
        results: [
          {
            name: 'Company 1',
            sortingName: 'Company 1',
          } as RawCompany,
        ],
      };

      const page2Response: ApiResponse = {
        ...mockApiResponse,
        pages: 3,
        results: [
          {
            name: 'Company 2',
            sortingName: 'Company 2',
          } as RawCompany,
        ],
      };

      const page3Response: ApiResponse = {
        ...mockApiResponse,
        pages: 3,
        results: [
          {
            name: 'Company 3',
            sortingName: 'Company 3',
          } as RawCompany,
        ],
      };

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: page1Response })
        .mockResolvedValueOnce({ data: page2Response })
        .mockResolvedValueOnce({ data: page3Response });

      const result = await service.fetchAll();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Company 1');
      expect(result[1].name).toBe('Company 2');
      expect(result[2].name).toBe('Company 3');
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    });

    it('should handle single page response', async () => {
      const singlePageResponse: ApiResponse = {
        ...mockApiResponse,
        pages: 1,
        results: [
          {
            name: 'Only Company',
            sortingName: 'Only Company',
          } as RawCompany,
        ],
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: singlePageResponse,
      });

      const result = await service.fetchAll();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Only Company');
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    it('should handle errors during multi-page fetch', async () => {
      const page1Response: ApiResponse = {
        ...mockApiResponse,
        pages: 2,
        results: [{ name: 'Company 1' } as RawCompany],
      };

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: page1Response })
        .mockRejectedValueOnce(new Error('Failed to fetch page 2'));

      await expect(service.fetchAll()).rejects.toThrow(
        'Failed to fetch page 2',
      );
    });
  });

  describe('configuration', () => {
    it('should use default values when config is not provided', async () => {
      const newMockInstance = {
        get: jest.fn(),
        defaults: {},
        interceptors: {
          request: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
          response: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      mockedAxios.create = jest.fn(() => newMockInstance) as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          KkrClientService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const testService = module.get<KkrClientService>(KkrClientService);

      expect(testService).toBeDefined();
    });

    it('should use custom configuration values', () => {
      expect(service).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(configService.get).toHaveBeenCalledWith('kkr.apiBaseUrl');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(configService.get).toHaveBeenCalledWith('kkr.rateLimitMs');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(configService.get).toHaveBeenCalledWith('kkr.requestTimeout');
    });
  });
});
