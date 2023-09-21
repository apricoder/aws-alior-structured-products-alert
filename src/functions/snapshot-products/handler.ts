import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { formatJSONResponse } from "@libs/api-gateway";

import schema from "./schema";
import * as console from "console";
import { getConnectedMongoClient } from "../../common/mongo/client";
import fetch from "node-fetch";
import { format as formatDate } from "date-fns";
import { pl } from "date-fns/locale";
import TelegramBot from "node-telegram-bot-api";
import { Db, MongoClient } from "mongodb";
import { scrapeProducts } from "./utils/scrape.utils";
import { getAppConfig } from "../../common/config/config.utils";

const shapshotProducts: ValidatedEventAPIGatewayProxyEvent<
  typeof schema
> = async (event) => {
  const config = getAppConfig(process.env);
  const bot = new TelegramBot(config.tgToken);

  let client: MongoClient, db: Db;
  try {
    ({ client, db } = await getConnectedMongoClient(config));
  } catch (e) {
    await bot.sendMessage(
      config.tgChatId,
      `Fix me 🔧🥲 Error at connecting to the database`,
      { parse_mode: "MarkdownV2" },
    );

    throw e;
  }

  const response = await fetch(config.url);
  if (!response.ok) {
    const errorText = await response.text();

    await bot.sendMessage(
      config.tgChatId,
      `Fix me 🔧🥲 Request to scrape url failed with status ${response.status}`,
      { parse_mode: "MarkdownV2" },
    );

    throw new Error(
      `Request to scrape url failed with status ${response.status}: ${errorText}`,
    );
  }
  const scrapedAt = new Date();

  const html = await response.text();
  const products = await scrapeProducts(html, bot, config.tgChatId);

  try {
    try {
      await db.collection("product-snapshots").insertOne({
        scrapedAt,
        products,
      });
    } catch (e) {
      await bot.sendMessage(
        config.tgChatId,
        `Fix me 🔧🥲 Error saving current products snapshot`,
        { parse_mode: "MarkdownV2" },
      );

      throw e;
    }

    let changesInProductsOffer = false;
    try {
      const [previousSnapshot] = await db
        .collection("product-snapshots")
        .find(
          { scrapedAt: { $lt: scrapedAt } },
          {
            sort: { scrapedAt: -1 },
          },
        )
        .limit(1)
        .toArray();

      const previousProducts = previousSnapshot?.products ?? [];

      for (const newProduct of products) {
        const identicalOldProduct = previousProducts.find(
          (oldProduct) =>
            oldProduct.productName === newProduct.productName &&
            oldProduct.currency === newProduct.currency &&
            oldProduct.interestRate === newProduct.interestRate &&
            oldProduct.minAmount === newProduct.minAmount &&
            oldProduct.validUntilDate.getTime() ===
              newProduct.validUntilDate.getTime(),
        );

        if (!identicalOldProduct) {
          changesInProductsOffer = true;
          break;
        }
      }
    } catch (e) {
      await bot.sendMessage(
        config.tgChatId,
        `Fix me 🔧🥲 Error at analyzing previous snapshot`,
        { parse_mode: "MarkdownV2" },
      );

      throw e;
    }

    const notifyOnTelegram =
      changesInProductsOffer || event.body?.force_notify === true;
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

      await bot.sendMessage(config.tgChatId, message, {
        parse_mode: "MarkdownV2",
      });
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
