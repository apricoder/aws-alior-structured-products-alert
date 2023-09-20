import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { formatJSONResponse } from "@libs/api-gateway";

import schema from "./schema";
import * as console from "console";
import { getConnectedMongoClient } from "../../common/mongo/client";
import fetch from "node-fetch";
import { parse as parseHtml } from "node-html-parser";
import { format as formatDate, parse as parseDate } from "date-fns";
import { pl } from "date-fns/locale";
import TelegramBot from "node-telegram-bot-api";
import { Db, MongoClient } from "mongodb";

const shapshotProducts: ValidatedEventAPIGatewayProxyEvent<
  typeof schema
> = async (event) => {
  const url = process.env.SCRAPE_URL;
  const tgToken = process.env.TG_BOT_TOKEN;
  const tgChatId = process.env.TG_CHAT_ID;

  if (!url) {
    throw new Error("Broken config. Setup real SCRAPE_URL env variable");
  }

  if (!tgToken) {
    throw new Error("Broken config. Setup real TG_BOT_TOKEN env variable");
  }

  if (!tgChatId) {
    throw new Error("Broken config. Setup real TG_CHAT_ID env variable");
  }

  const bot = new TelegramBot(tgToken);

  let client: MongoClient, db: Db;
  try {
    ({ client, db } = await getConnectedMongoClient());
  } catch (e) {
    await bot.sendMessage(
      tgChatId,
      `Fix me 🔧🥲 Error at connecting to the database`,
      { parse_mode: "MarkdownV2" },
    );

    throw e;
  }

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();

    await bot.sendMessage(
      tgChatId,
      `Fix me 🔧🥲 Request to scrape url failed with status ${response.status}`,
      { parse_mode: "MarkdownV2" },
    );

    throw new Error(
      `Request to scrape url failed with status ${response.status}: ${errorText}`,
    );
  }

  const rawHtml = await response.text();
  const root = parseHtml(rawHtml);
  const scrapedAt = new Date();

  const productsListElements = root.querySelectorAll(".product-list");

  let products: {
    interestRate: number;
    minAmount: number;
    detailsUrl: string;
    currency: string;
    validUntilDate: Date;
    productName: string;
  }[];

  try {
    products = productsListElements.map((productElement) => {
      const productName = productElement.querySelector("h2").innerText.trim();
      const featureElements = productElement.querySelectorAll(
        ".features .row .columns",
      );

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

      const interestRateFeatureElement = featureElements.find(
        (fe) => fe.innerText.indexOf("oprocentowanie") > -1,
      );
      const interestRateRegex = /oprocentowanie\s(\d+,\d+)%/;
      const interestRateMatch = interestRateRegex.exec(
        interestRateFeatureElement.innerText.replace(/&nbsp;/g, " "),
      );
      const interestRate = parseFloat(interestRateMatch[1].replace(",", "."));

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

      const detailsLink = productElement.querySelector("a");
      const detailsRelativeUrl = detailsLink.getAttribute("href");
      const detailsUrl =
        new URL(process.env.SCRAPE_URL).origin + detailsRelativeUrl;

      console.log(Array(15).join("-"));
      console.log(" Product name: ", productName);
      console.log(" Valid until: ", validUntilDate);
      console.log(" Interest rate: ", interestRate);
      console.log(" Min amount: ", minAmount);
      console.log(" Currency: ", currency);
      console.log(" Details Url: ", detailsUrl);

      return {
        productName,
        validUntilDate,
        interestRate,
        minAmount,
        currency,
        detailsUrl,
      };
    });
  } catch (e) {
    await bot.sendMessage(
      tgChatId,
      `Fix me 🔧🥲 Error at parsing products`,
      { parse_mode: "MarkdownV2" },
    );

    throw e;
  }

  try {
    try {
      await db.collection("product-snapshots").insertOne({
        scrapedAt,
        products,
      });
    } catch (e) {
      await bot.sendMessage(
        tgChatId,
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
          {scrapedAt: {$lt: scrapedAt}},
          {
            sort: {scrapedAt: -1},
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
        tgChatId,
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
        `\n📌 [Pełna oferta](${url})`;

      await bot.sendMessage(tgChatId, message, { parse_mode: "MarkdownV2" });
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
