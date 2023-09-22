import { TelegramService } from "src/common/telegram/telegram.service";
import { ProductsService } from "./products.service";
import { Db } from "mongodb";
import { ProductSnapshot } from "@functions/snapshot-products/types/product-snapshot.type";

describe("ProductService", () => {
  let createProductService: (db: Db) => ProductsService;

  let telegramService: TelegramService;
  let db: Db;

  let productSnapshot: ProductSnapshot;

  beforeEach(() => {
    telegramService = {
      sendErrorMessage: jest.fn(),
    } as unknown as TelegramService;

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

    db = {
      collection: jest.fn().mockReturnValue({
        find: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([productSnapshot]),
        insertOne: jest.fn().mockResolvedValue({ insertedId: "abc-123" }),
      }),
    } as unknown as Db;

    createProductService = (db) => new ProductsService(db, telegramService);
  });

  describe("saveProductsSnapshot", () => {
    it("should be defined", () => {
      const productService = createProductService(db);
      expect(productService.saveProductsSnapshot).toBeDefined();
    });

    it("should reject and send error message on telegram if failed to save", async () => {
      db.collection = jest.fn().mockReturnValue({
        insertOne: jest.fn().mockRejectedValue(new Error("Query Error")),
      });
      const productService = createProductService(db);

      await expect(
        productService.saveProductsSnapshot(productSnapshot),
      ).rejects.toThrow();

      expect(telegramService.sendErrorMessage).toHaveBeenCalledWith(
        `Error saving current products snapshot`,
      );
    });

    it("should resolve if saved successfully", async () => {
      const productService = createProductService(db);

      await expect(
        productService.saveProductsSnapshot(productSnapshot),
      ).resolves.not.toThrow();

      expect(telegramService.sendErrorMessage).not.toHaveBeenCalled();
    });
  });

  describe("getLastSnapshotBeforeDate", () => {
    let date: Date;

    beforeEach(() => {
      date = new Date("2023-09-22");
    });

    it("should be defined", () => {
      const productService = createProductService(db);
      expect(productService.getLastSnapshotBeforeDate).toBeDefined();
    });

    it("should query db with proper params", async () => {
      const productService = createProductService(db);

      await expect(
        productService.getLastSnapshotBeforeDate(date),
      ).resolves.not.toThrow();

      expect(db.collection("product-snapshots").find).toHaveBeenCalledWith(
        { scrapedAt: { $lt: date } },
        { sort: { scrapedAt: -1 } },
      );
    });

    it("should return first (and only) query result", async () => {
      const productService = createProductService(db);
      const snapshot = await productService.getLastSnapshotBeforeDate(date);
      expect(snapshot).toEqual(productSnapshot);
    });
  });
});
