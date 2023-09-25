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
      url: "https://bank.com/interesting-page",
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

  describe("extracting data from hmtl", () => {
    const detailsLinkFeatureElement = parseHtml(`
      <div class="columns">
        <a href="/some-relative-path"></a>
      </div>
    `);

    describe("extractProductsFromHtml", () => {
      it("should be defined", () => {
        expect(scrapeService.extractProductsFromHtml).toBeDefined();
      });

      it("should reject and send error message to telegram in case of extracting error", async () => {
        const html = `
          <html>
            <body>
              <div class="product-list"></div>
              <div class="product-list"></div>
            </body>
          </html>
        `;

        scrapeService.extractValidUntilDate = jest
          .fn()
          .mockImplementation(() => {
            throw new Error("Some error during extracting");
          });

        await expect(
          scrapeService.extractProductsFromHtml(html),
        ).rejects.toThrow();

        expect(telegramService.sendErrorMessage).toHaveBeenCalledWith(
          `Error at extracting products`,
        );
      });

      it("should extract products from html", async () => {
        const html = `
          <html>
            <body>
              <!-- PLN 4.6% product -->
              <section class="product-list">
                <h2>Legit Deal</h2>
                <div class="features">
                  <div class="row">
                    <div class="columns">
                      dostępny do<br>
                      <strong>29 września 2023 r.</strong>
                    </div>
                    <div class="columns">
                      <strong>100% ochrony kapitału</strong> w Dniu Wykupu oraz oprocentowanie <strong>4,60%</strong> w skali roku.  
                    </div>
                    <div class="columns">
                      minimalna wartość początkowa inwestycji:<br>
                      <strong>5 000 PLN</strong>:<br>
                      (50 szt. BPW)
                    </div>
                  </div>
                  <div class="row">
                    <div class="columns">
                      <a href="/legit-deal"></a>
                    </div>
                  </div>  
                </div>
              </section>
              <section class="product-list">
                <h2>Bucks Saving</h2>
                <div class="features">
                  <div class="row">
                    <div class="columns">
                      dostępny do<br>
                      <strong>20 października 2023 r.</strong>
                    </div>
                    <div class="columns">
                      <strong>100% ochrony kapitału</strong> w Dniu Wykupu oraz oprocentowanie <strong>3,00%</strong> w skali roku.  
                    </div>
                    <div class="columns">
                      minimalna wartość początkowa inwestycji:<br>
                      <strong>5 000 USD</strong>:<br>
                      (50 szt. BPW)
                    </div>
                  </div>
                  <div class="row">
                    <div class="columns">
                      <a href="/bucks-savings"></a>
                    </div>
                  </div>  
                </div>
              </section>
            </body>
          </html>
        `;

        const productsFromHtml =
          await scrapeService.extractProductsFromHtml(html);
        expect(productsFromHtml).toEqual([
          {
            productName: "Legit Deal",
            interestRate: 4.6,
            currency: "PLN",
            minAmount: 5000,
            validUntilDate: new Date("2023-09-29"),
            detailsUrl: "https://bank.com/legit-deal",
          },
          {
            productName: "Bucks Saving",
            interestRate: 3,
            currency: "USD",
            minAmount: 5000,
            validUntilDate: new Date("2023-10-20"),
            detailsUrl: "https://bank.com/bucks-savings",
          },
        ]);
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

        const result = scrapeService.extractOfferDetailsUrl(
          productElement,
          url,
        );
        expect(result).toEqual("https://origin.com/some-relative-path");
      });
    });

    describe("extractInterestRate", () => {
      it("should be defined", () => {
        expect(scrapeService.extractInterestRate).toBeDefined();
      });

      it("should extract interest rate", () => {
        const featureElements = [
          detailsLinkFeatureElement,
          parseHtml(`
            <div class="columns">
              <strong>100% ochrony kapitału</strong> w Dniu Wykupu oraz oprocentowanie <strong>4,60%</strong> w skali roku.  
            </div>
          `),
          detailsLinkFeatureElement,
        ];

        const interestRate = scrapeService.extractInterestRate(featureElements);
        expect(interestRate).toEqual(4.6);
      });

      it("should extract interest rate after &nbsp;", () => {
        const featureElements = [
          detailsLinkFeatureElement,
          parseHtml(`
            <div class="columns">
              <strong>100% ochrony kapitału</strong> w Dniu Wykupu oraz oprocentowanie&nbsp;<strong>3,00%</strong> w skali roku.  
            </div>
          `),
          detailsLinkFeatureElement,
        ];

        const interestRate = scrapeService.extractInterestRate(featureElements);
        expect(interestRate).toEqual(3);
      });
    });

    describe("extractMinAmountAndCurrency", () => {
      it("should be defined", () => {
        expect(scrapeService.extractMinAmountAndCurrency).toBeDefined();
      });

      it("should extract min amount = 5 000 and currency = PLN", () => {
        const featureElements = [
          detailsLinkFeatureElement,
          parseHtml(`
            <div class="columns">
              minimalna wartość początkowa inwestycji:<br>
              <strong>5 000 PLN</strong>:<br>
              (50 szt. BPW)
            </div>
          `),
        ];
        expect(
          scrapeService.extractMinAmountAndCurrency(featureElements),
        ).toEqual({
          currency: "PLN",
          minAmount: 5000,
        });
      });

      it("should extract min amount = 12 500 000 and currency = EUR", () => {
        const featureElements = [
          detailsLinkFeatureElement,
          parseHtml(`
            <div class="columns">
              minimalna wartość początkowa inwestycji:<br>
              <strong>12 500 000 EUR</strong>:<br>
              (50 szt. BPW)
            </div>
          `),
        ];
        expect(
          scrapeService.extractMinAmountAndCurrency(featureElements),
        ).toEqual({
          currency: "EUR",
          minAmount: 12500000,
        });
      });

      it("should extract min amount = 100 and currency = USD", () => {
        const featureElements = [
          detailsLinkFeatureElement,
          parseHtml(`
            <div class="columns">
              minimalna wartość początkowa inwestycji:<br>
              <strong>100 USD</strong>:<br>
              (50 szt. BPW)
            </div>
          `),
        ];
        expect(
          scrapeService.extractMinAmountAndCurrency(featureElements),
        ).toEqual({
          currency: "USD",
          minAmount: 100,
        });
      });
    });

    describe("extractValidUntilDate", () => {
      it("should be defined", () => {
        expect(scrapeService.extractValidUntilDate).toBeDefined();
      });

      it("should extract date from a html containing string date in polish", () => {
        const featureElements = [
          detailsLinkFeatureElement,
          parseHtml(`
            <div class="columns">
              dostępny do<br>
              <strong>29 września 2023 r.</strong>
            </div>
          `),
        ];

        const expectedDate = new Date("2023-09-29");
        const date = scrapeService.extractValidUntilDate(featureElements);
        expect(date).toEqual(expectedDate);
      });
    });
  });
});
