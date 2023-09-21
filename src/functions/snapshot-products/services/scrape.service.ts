import nodeFetch from "node-fetch";

import { Config } from "src/common/config/config.type";
import { TelegramService } from "src/common/telegram/telegram.service";
import { Product } from "../types/product.type";
import { scrapeProducts } from "../utils/scrape.utils";

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
    return await scrapeProducts(html, this.config, this.telegramService);
  }
}
