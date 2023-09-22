import nodeFetch from "node-fetch";
import { parse as parseHtml } from "node-html-parser";

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
  let scrapeService: ScrapeService;

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

    scrapeService = createScrapeService();
  });

  describe("scrapeProducts", () => {
    it("should be defined", () => {
      expect(scrapeService.scrapeProducts).toBeDefined();
    });

    it("should call fetch with url from config", async () => {
      const fetch = jest.fn().mockResolvedValue(successResponse);
      scrapeService = createScrapeService(fetch);

      await expect(scrapeService.scrapeProducts()).resolves.not.toThrow();
      expect(fetch).toHaveBeenCalledWith(config.url);
    });

    it("should send error message on telegram if request failed", async () => {
      const fetch = jest.fn().mockResolvedValue(errorResponse);
      scrapeService = createScrapeService(fetch);

      await expect(scrapeService.scrapeProducts()).rejects.toThrow();
      expect(telegramService.sendErrorMessage).toHaveBeenCalledWith(
        `Request to scrape url failed with status ${errorResponse.status}`,
      );
    });

    it("should return scraped products if request succeeded", async () => {
      const fetch = jest.fn().mockResolvedValue(successResponse);
      scrapeService = createScrapeService(fetch);

      await expect(scrapeService.scrapeProducts()).resolves.toEqual([]);
    });
  });

  describe("extractOfferDetailsUrl", () => {
    it("should be defined", () => {
      expect(scrapeService.extractOfferDetailsUrl).toBeDefined();
    });

    it("should scrape details url from a link button", () => {
      const url = "https://origin.com/current-path";
      const productElement = parseHtml(`
        <section class="product-list">
          <div class="features">
            <div class="rows">
              <div class="columns">
                <a href="/some-relative-path"></a>
              </div>
            </div>
          </div>
        </section>
      `);

      const result = scrapeService.extractOfferDetailsUrl(productElement, url);
      expect(result).toEqual("https://origin.com/some-relative-path");
    });
  });

  describe("extractInterestRate", () => {
    const irrelevantFeatureElement = parseHtml(`
      <div class="columns">
        <a href="/some-relative-path"></a>
      </div>
    `);

    it("should be defined", () => {
      expect(scrapeService.extractInterestRate).toBeDefined();
    });

    it("should extract interest rate", () => {
      const featureElements = [
        irrelevantFeatureElement,
        parseHtml(`
          <div class="columns">
            <strong>100% ochrony kapitału</strong> w Dniu Wykupu oraz oprocentowanie <strong>4,60%</strong> w skali roku.  
          </div>
        `),
        irrelevantFeatureElement,
      ];

      const interestRate = scrapeService.extractInterestRate(featureElements);
      expect(interestRate).toEqual(4.6);
    });

    it("should extract interest rate after &nbsp;", () => {
      const featureElements = [
        irrelevantFeatureElement,
        parseHtml(`
          <div class="columns">
            <strong>100% ochrony kapitału</strong> w Dniu Wykupu oraz oprocentowanie&nbsp;<strong>3,00%</strong> w skali roku.  
          </div>
        `),
        irrelevantFeatureElement,
      ];

      const interestRate = scrapeService.extractInterestRate(featureElements);
      expect(interestRate).toEqual(3);
    });
  });
});
