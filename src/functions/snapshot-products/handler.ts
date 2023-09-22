import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { formatJSONResponse } from "@libs/api-gateway";
import fetch from "node-fetch";

import schema from "./schema";
import { getAppConfig } from "src/common/config/config.utils";
import { MongoConnectionService } from "src/common/mongo/mongo-connection.service";
import { TelegramService } from "src/common/telegram/telegram.service";
import { ProductsService } from "./services/products.service";
import { ProductMessageService } from "./services/product-message.service";
import { ScrapeService } from "./services/scrape.service";
import { parseBody } from "./utils/event.utils";

const shapshotProducts: ValidatedEventAPIGatewayProxyEvent<
  typeof schema
> = async (event) => {
  const config = getAppConfig(process.env);
  const telegramService = new TelegramService(config);
  const mongoConnectionService = new MongoConnectionService(
    config,
    telegramService,
  );

  const { db } = await mongoConnectionService.connect();
  const productService = new ProductsService(db, telegramService);
  const productMessageService = new ProductMessageService(config);
  const scrapeService = new ScrapeService(fetch, config, telegramService);

  try {
    const products = await scrapeService.scrapeProducts();
    const scrapedAt = new Date();

    await productService.saveProductsSnapshot({ products, scrapedAt });
    const didProductsChange = await productService.didProductsChangeSinceDate(
      products,
      scrapedAt,
    );

    const { force_notify } = parseBody(event as unknown);
    const notifyOnTelegram = didProductsChange || force_notify === true;
    if (notifyOnTelegram) {
      const message = productMessageService.prepareOfferUpdateMessage(products);
      await telegramService.sendMessage(message);
    }

    const telegramSummary = notifyOnTelegram
      ? ` Sent Telegram notification`
      : ``;
    return formatJSONResponse({
      message: `Scraped ${products.length} products based on the page state at ${scrapedAt}.${telegramSummary}`,
      event,
    });
  } catch (e) {
    console.dir(e);
  } finally {
    await mongoConnectionService.closeConnection();
  }
};

export const main = shapshotProducts;
