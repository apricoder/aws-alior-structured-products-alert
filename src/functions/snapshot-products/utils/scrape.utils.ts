import { HTMLElement } from "node-html-parser";
import { parse as parseDate } from "date-fns";
import { pl } from "date-fns/locale";

export const scrapeValidUntilDate = (featureElements: HTMLElement[]): Date => {
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
};

export const scrapeInterestRate = (featureElements: HTMLElement[]): number => {
  const interestRateFeatureElement = featureElements.find(
    (fe) => fe.innerText.indexOf("oprocentowanie") > -1,
  );
  const interestRateRegex = /oprocentowanie\s(\d+,\d+)%/;
  const interestRateMatch = interestRateRegex.exec(
    interestRateFeatureElement.innerText.replace(/&nbsp;/g, " "),
  );
  const interestRate = parseFloat(interestRateMatch[1].replace(",", "."));

  return interestRate;
};

export const scrapeMinAmountAndCurrency = (
  featureElements: HTMLElement[],
): { minAmount: number; currency: string } => {
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
};

export const scrapeAndCombineOfferDetailsUrl = (
  productElement: HTMLElement,
  url: string,
): string => {
  const detailsLink = productElement.querySelector("a");
  const detailsRelativeUrl = detailsLink.getAttribute("href");
  const detailsUrl = new URL(url).origin + detailsRelativeUrl;

  return detailsUrl;
};
