import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { formatJSONResponse } from "@libs/api-gateway";

import schema from "./schema";
import * as console from "console";
import { getConnectedMongoClient } from "../../common/mongo/client";
import fetch from "node-fetch";
import { format as formatDate } from "date-fns";
import { pl } from "date-fns/locale";
import { Db, MongoClient } from "mongodb";
import { scrapeProducts } from "./utils/scrape.utils";
import { getAppConfig } from "../../common/config/config.utils";
import { TelegramService } from "../../common/telegram/telegram.service";
import { ProductsService } from "./services/products.service";

const shapshotProducts: ValidatedEventAPIGatewayProxyEvent<
  typeof schema
> = async (event) => {
  const config = getAppConfig(process.env);
  const telegramService = new TelegramService(config);

  // todo extract to util
  const body = typeof event.body === 'string' ? JSON.parse(event.body) : undefined;
  const forceNotify = body?.force_notify;

  let client: MongoClient;
  let db: Db;
  try {
    ({ client, db } = await getConnectedMongoClient(config));
  } catch (e) {
    await telegramService.sendErrorMessage(
      `Error at connecting to the database`,
    );
    throw e;
  }

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
  const scrapedAt = new Date();

  const html = await response.text();
  const products = await scrapeProducts(html, telegramService);

  try {
    await productService.saveProductsSnapshot({ products, scrapedAt });
    const didProductsChange = await productService.didProductsChangeSinceDate(
      products,
      scrapedAt,
    );

    const notifyOnTelegram = didProductsChange || forceNotify === true;
    if (notifyOnTelegram) {
      const message =
        `⚡️ *Zmiany w ofercie produktów strukturyzowanych*:\n\n` +
        products
          .map((p) => {
            const formattedDate = formatDate(p.validUntilDate, "dd MMMM yyyy", {
              locale: pl,
            });

            const interestText = `${p.interestRate.toLocaleString("fr-FR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}%`;

            const minAmountText = p.minAmount.toLocaleString("fr-FR", {
              style: "decimal",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });

            return (
              `▪️ *${p.productName}*\n` +
              `• ${interestText} w ${p.currency}\n` +
              `• Minimalna wartość inwestycji: ${minAmountText} ${p.currency}\n` +
              `• Oferta ważna do ${formattedDate}\n` +
              `• [Zobacz szczegóły](${p.detailsUrl})\n`
            );
          })
          .join(`\n`) +
        `\n📌 [Pełna oferta](${config.url})`;

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
    await client.close();
  }
};

export const main = shapshotProducts;
