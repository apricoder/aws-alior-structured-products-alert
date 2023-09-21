import fetch from "node-fetch";

import { Config } from "src/common/config/config.type";
import { TelegramService } from "src/common/telegram/telegram.service";
import { Product } from "../types/product.type";
import { scrapeProducts } from "../utils/scrape.utils";

export class ScrapeService {
  constructor(
    private readonly config: Config,
    private readonly telegramService: TelegramService,
  ) {}

  async scrapeProducts(): Promise<Product[]> {
    const response = await fetch(this.config.url);
    if (!response.ok) {
      const errorText = await response.text();
      await this.telegramService.sendErrorMessage(
        `Request to scrape url failed with status ${response.status}`,
      );

      throw new Error(
        `Request to scrape url failed with status ${response.status}: ${errorText}`,
      );
    }

    const html = await response.text();

    // todo move scrapeProducts util inside this service
    return await scrapeProducts(html, this.telegramService);
  }
}
