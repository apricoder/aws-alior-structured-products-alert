import { scrapeOfferDetailsUrl } from "./scrape.utils";
import { parse as parseHtml } from "node-html-parser";

describe("Scrape Utils", () => {
  describe("scrapeOfferDetailsUrl", () => {
    it("should be defined", () => {
      expect(scrapeOfferDetailsUrl).toBeDefined();
    });

    it("should scrape details url from a link button", () => {
      const url = "https://origin.com/current-path";
      const productElement = parseHtml(`
        <section class="product-list">
          <div class="features">
            <div class="rows">
              <div class="columns">
                <a href="/some-relative-path"></a>
              </div>
            </div>
          </div>
        </section>
      `);

      const result = scrapeOfferDetailsUrl(productElement, url);
      expect(result).toEqual("https://origin.com/some-relative-path");
    });
  });
});
