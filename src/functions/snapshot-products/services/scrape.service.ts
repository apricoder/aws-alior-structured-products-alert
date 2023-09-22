import nodeFetch from "node-fetch";
import { HTMLElement, parse as parseHtml } from "node-html-parser";
import { parse as parseDate } from "date-fns";
import { pl } from "date-fns/locale";

import { Config } from "src/common/config/config.type";
import { TelegramService } from "src/common/telegram/telegram.service";
import { Product } from "../types/product.type";
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

        const validUntilDate = this.extractValidUntilDate(featureElements);
        const interestRate = this.extractInterestRate(featureElements);
        const { minAmount, currency } =
          this.extractMinAmountAndCurrency(featureElements);
        const detailsUrl = this.extractOfferDetailsUrl(
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

  extractValidUntilDate(featureElements: HTMLElement[]): Date {
    const validUntilFeatureElement = featureElements.find(
      (fe) => fe.innerText.indexOf("dostępny do") > -1,
    );
    const validUntilPolishDateString =
      validUntilFeatureElement.querySelector("strong").innerText;
    const validUntilDate = parseDate(
      validUntilPolishDateString.replace(" r.", ""),
      "d MMMM yyyy",
      new Date(),
      { locale: pl },
    );

    return validUntilDate;
  }

  extractInterestRate(featureElements: HTMLElement[]): number {
    const interestRateFeatureElement = featureElements.find(
      (fe) => fe.innerText.indexOf("oprocentowanie") > -1,
    );
    const interestRateRegex = /oprocentowanie\s(\d+,\d+)%/;
    const interestRateMatch = interestRateRegex.exec(
      interestRateFeatureElement.innerText.replace(/&nbsp;/g, " "),
    );
    const interestRate = parseFloat(interestRateMatch[1].replace(",", "."));

    return interestRate;
  }

  private extractMinAmountAndCurrency(featureElements: HTMLElement[]): {
    minAmount: number;
    currency: string;
  } {
    const minAmountFeatureElement = featureElements.find(
      (fe) => fe.innerText.indexOf("minimalna wartość") > -1,
    );
    const minAmountString =
      minAmountFeatureElement.querySelector("strong").innerText;
    const minAmountRegex = /([\d\s,.]+)\s+(\w+)/;
    const minAmounMatches = minAmountRegex.exec(minAmountString);
    const minAmount = parseFloat(
      minAmounMatches[1].replace(/\s/g, "").replace(/,/, ""),
    );
    const currency = minAmounMatches[2];
    return { minAmount, currency };
  }

  extractOfferDetailsUrl(
    productElement: HTMLElement,
    url: string,
  ): string {
    const detailsLink = productElement.querySelector("a");
    const detailsRelativeUrl = detailsLink.getAttribute("href");
    const detailsUrl = new URL(url).origin + detailsRelativeUrl;

    return detailsUrl;
  }
}
