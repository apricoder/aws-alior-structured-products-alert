import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { formatJSONResponse } from "@libs/api-gateway";
import fetch from "node-fetch";

import schema from "./schema";
import { scrapeProducts } from "./utils/scrape.utils";
import { getAppConfig } from "src/common/config/config.utils";
import { TelegramService } from "src/common/telegram/telegram.service";
import { ProductsService } from "./services/products.service";
import { ProductMessageService } from "./services/product-message.service";
import { MongoConnectionService } from "src/common/mongo/mongo-connection.service";

const shapshotProducts: ValidatedEventAPIGatewayProxyEvent<
  typeof schema
> = async (event) => {
  const config = getAppConfig(process.env);
  const telegramService = new TelegramService(config);
  const productMessageService = new ProductMessageService(config);
  const mongoConnectionService = new MongoConnectionService(
    config,
    telegramService,
  );

  // todo extract to util
  const body =
    typeof event.body === "string" ? JSON.parse(event.body) : undefined;
  const forceNotify = body?.force_notify;

  const { db } = await mongoConnectionService.connect();
  const productService = new ProductsService(db, telegramService);

  const response = await fetch(config.url);
  if (!response.ok) {
    const errorText = await response.text();
    await telegramService.sendErrorMessage(
      `Request to scrape url failed with status ${response.status}`,
    );

    throw new Error(
      `Request to scrape url failed with status ${response.status}: ${errorText}`,
    );
  }

  const html = await response.text();
  const products = await scrapeProducts(html, telegramService);
  const scrapedAt = new Date();

  try {
    await productService.saveProductsSnapshot({ products, scrapedAt });
    const didProductsChange = await productService.didProductsChangeSinceDate(
      products,
      scrapedAt,
    );

    const notifyOnTelegram = didProductsChange || forceNotify === true;
    if (notifyOnTelegram) {
      const message = productMessageService.prepareOfferUpdateMessage(products);
      await telegramService.sendMessage(message);
    }

    const telegramText = notifyOnTelegram ? ` Sent Telegram notification` : ``;
    return formatJSONResponse({
      message: `Scraped ${products.length} products based on the page state at ${scrapedAt}.${telegramText}`,
      event,
    });
  } catch (e) {
    console.dir(e);
  } finally {
    await mongoConnectionService.closeConnection();
  }
};

export const main = shapshotProducts;
