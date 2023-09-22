import { TelegramService } from "src/common/telegram/telegram.service";
import { ProductsService } from "./products.service";
import { Db } from "mongodb";
import { ProductSnapshot } from "@functions/snapshot-products/types/product-snapshot.type";

describe("ProductService", () => {
  let createProductService: (db: Db) => ProductsService;

  let telegramService: TelegramService;

  beforeEach(() => {
    telegramService = {
      sendErrorMessage: jest.fn(),
    } as unknown as TelegramService;

    createProductService = (db) => new ProductsService(db, telegramService);
  });

  describe("saveProductsSnapshot", () => {
    let productSnapshot: ProductSnapshot;

    beforeEach(() => {
      productSnapshot = {
        products: [
          {
            productName: "Legit Deal",
            interestRate: 4.5,
            currency: "PLN",
            minAmount: 5000,
            validUntilDate: new Date("2023-08-21"),
            detailsUrl: "https://bank.com/legit-deal",
          },
        ],
        scrapedAt: new Date("2023-09-22"),
      };
    });

    it("should be defined", () => {
      const db = {} as Db;
      const productService = createProductService(db);
      expect(productService.saveProductsSnapshot).toBeDefined();
    });

    it("should reject and send error message on telegram if failed to save", async () => {
      const db = {
        collection: jest.fn().mockReturnValue({
          insertOne: jest.fn().mockRejectedValue(new Error("Query Error")),
        }),
      } as unknown as Db;
      const productService = createProductService(db);

      await expect(
        productService.saveProductsSnapshot(productSnapshot),
      ).rejects.toThrow();

      expect(telegramService.sendErrorMessage).toHaveBeenCalledWith(
        `Error saving current products snapshot`,
      );
    });

    it("should resolve if saved successfully", async () => {
      const db = {
        collection: jest.fn().mockReturnValue({
          insertOne: jest.fn().mockResolvedValue({ insertedId: "abc-123" }),
        }),
      } as unknown as Db;
      const productService = createProductService(db);

      await expect(
        productService.saveProductsSnapshot(productSnapshot),
      ).resolves.not.toThrow();

      expect(telegramService.sendErrorMessage).not.toHaveBeenCalled();
    });
  });
});
