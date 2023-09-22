import nodeFetch from "node-fetch";

import { Config } from "src/common/config/config.type";
import { TelegramService } from "src/common/telegram/telegram.service";
import { ScrapeService } from "./scrape.service";

type Response = {
  text: () => Promise<string>;
  ok: boolean;
  status: number;
};
describe("ScrapeService", () => {
  let createScrapeService: (fetch?: typeof nodeFetch) => ScrapeService;

  let config: Config;
  let telegramService: TelegramService;

  let successResponse: Response;
  let errorResponse: Response;

  beforeEach(() => {
    config = {
      url: "https://some-domain/interesting-page",
    } as Config;

    telegramService = {
      sendErrorMessage: jest.fn(),
    } as unknown as TelegramService;

    successResponse = {
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(`<html><body>Hello</body></html>`),
    };

    errorResponse = {
      ok: false,
      status: 403,
      text: jest.fn().mockResolvedValue(`Error: you are bot`),
    };

    createScrapeService = (fetch: typeof nodeFetch = jest.fn()) =>
      new ScrapeService(fetch, config, telegramService);
  });

  describe("scrapeProducts", () => {
    it("should be defined", () => {
      const scrapeService = createScrapeService();
      expect(scrapeService.scrapeProducts).toBeDefined();
    });

    it("should call fetch with url from config", async () => {
      const fetch = jest.fn().mockResolvedValue(successResponse);
      const scrapeService = createScrapeService(fetch);

      await expect(scrapeService.scrapeProducts()).resolves.not.toThrow();
      expect(fetch).toHaveBeenCalledWith(config.url);
    });

    it("should send error message on telegram if request failed", async () => {
      const fetch = jest.fn().mockResolvedValue(errorResponse);
      const scrapeService = createScrapeService(fetch);

      await expect(scrapeService.scrapeProducts()).rejects.toThrow();
      expect(telegramService.sendErrorMessage).toHaveBeenCalledWith(`Request to scrape url failed with status ${errorResponse.status}`);
    });

    it("should return scraped products if request succeeded", async () => {
      const fetch = jest.fn().mockResolvedValue(successResponse);
      const scrapeService = createScrapeService(fetch);

      await expect(scrapeService.scrapeProducts()).resolves.toEqual([]);
    });
  });
});
