import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { formatJSONResponse } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";

import schema from "./schema";
import * as console from "console";
import { getConnectedMongoClient } from "../../common/mongo/client";
import fetch from "node-fetch";
import { parse as parseHtml } from "node-html-parser";
import { parse as parseDate } from "date-fns";
import { pl } from "date-fns/locale";

const shapshotProducts: ValidatedEventAPIGatewayProxyEvent<
  typeof schema
> = async (event) => {
  const { client, db } = await getConnectedMongoClient();

  const url = process.env.SCRAPE_URL;
  if (!url) {
    throw new Error("Broken config. Setup real SCRAPE_URL env variable");
  }

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Request to scrape url failed with status ${response.status}: ${errorText}`,
    );
  }

  const rawHtml = await response.text();
  const root = parseHtml(rawHtml);
  const scrapedAt = new Date();

  const productsListElements = root.querySelectorAll(".product-list");

  const products = productsListElements.map((productElement) => {
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
      scrapedAt,
    };
  });

  try {
    const insertProductsResult = await db
      .collection("product-snapshots")
      .insertMany(products);

    return formatJSONResponse({
      message: `Scraped ${insertProductsResult.insertedCount} products based on the page state at ${scrapedAt}`,
      event,
    });
  } catch (e) {
    console.dir(e);
  } finally {
    await client.close();
  }
};

export const main = middyfy(shapshotProducts);
