import nodeFetch from "node-fetch";

import { Config } from "src/common/config/config.type";
import { TelegramService } from "src/common/telegram/telegram.service";
import { Product } from "../types/product.type";
import {
  scrapeInterestRate,
  scrapeMinAmountAndCurrency,
  scrapeOfferDetailsUrl,
  scrapeValidUntilDate,
} from "../utils/scrape.utils";
import { parse as parseHtml } from "node-html-parser";
import { logProduct } from "../utils/logging.utils";

export class ScrapeService {
  constructor(
    private readonly fetch: typeof nodeFetch,
    private readonly config: Config,
    private readonly telegramService: TelegramService,
  ) {}

  async scrapeProducts(): Promise<Product[]> {
    const response = await this.fetch(this.config.url);
    if (!response.ok) {
      const responseErrorText = await response.text();
      const errorText = `Request to scrape url failed with status ${response.status}`;
      await this.telegramService.sendErrorMessage(errorText);

      throw new Error(`${errorText}: ${responseErrorText}`);
    }

    const html = await response.text();

    // todo move scrapeProducts util inside this service
    return await this.extractProductsFromHtml(html);
  }

  public async extractProductsFromHtml(html: string) {
    const root = parseHtml(html);

    const productsListElements = root.querySelectorAll(".product-list");

    try {
      return productsListElements.map((productElement) => {
        const productName = productElement.querySelector("h2").innerText.trim();
        const featureElements = productElement.querySelectorAll(
          ".features .row .columns",
        );

        const validUntilDate = scrapeValidUntilDate(featureElements);
        const interestRate = scrapeInterestRate(featureElements);
        const { minAmount, currency } =
          scrapeMinAmountAndCurrency(featureElements);
        const detailsUrl = scrapeOfferDetailsUrl(
          productElement,
          this.config.url,
        );

        const product = {
          productName,
          validUntilDate,
          interestRate,
          minAmount,
          currency,
          detailsUrl,
        };

        logProduct(product);

        return product;
      });
    } catch (e) {
      await this.telegramService.sendErrorMessage(`Error at parsing products`);
      throw e;
    }
  }
}
