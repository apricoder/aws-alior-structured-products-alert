import { TelegramService } from "src/common/telegram/telegram.service";
import { ProductsService } from "./products.service";
import { Db } from "mongodb";
import { ProductSnapshot } from "@functions/snapshot-products/types/product-snapshot.type";

describe("ProductService", () => {
  let createProductService: (db: Db) => ProductsService;

  let telegramService: TelegramService;
  let db: Db;

  let productSnapshot: ProductSnapshot;
  let date: Date;

  beforeEach(() => {});

  beforeEach(() => {
    date = new Date("2023-09-22");

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

  describe("getLastProductsBeforeDate", () => {
    it("should be defined", () => {
      const productService = createProductService(db);
      expect(productService.getLastProductsBeforeDate).toBeDefined();
    });

    it("should return empty array if no previous snapshot", async () => {
      const productService = createProductService(db);
      productService.getLastSnapshotBeforeDate = jest
        .fn()
        .mockResolvedValue(null);

      const products = await productService.getLastProductsBeforeDate(date);
      expect(products).toEqual([]);
    });

    it("should return products of a last snapshot", async () => {
      const productService = createProductService(db);
      productService.getLastSnapshotBeforeDate = jest
        .fn()
        .mockResolvedValue(productSnapshot);

      const products = await productService.getLastProductsBeforeDate(date);
      expect(products).toEqual(productSnapshot.products);
    });
  });

  describe("didProductsChangeSinceDate", () => {
    it("should be defined", () => {
      const productService = createProductService(db);
      expect(productService.didProductsChangeSinceDate).toBeDefined();
    });

    it("should reject and send error message to telegram if failed to get last products ", async () => {
      const productService = createProductService(db);

      const error = new Error("Query Error");
      productService.getLastProductsBeforeDate = jest
        .fn()
        .mockRejectedValue(error);

      await expect(
        productService.didProductsChangeSinceDate(
          productSnapshot.products,
          date,
        ),
      ).rejects.toThrow(error);

      expect(telegramService.sendErrorMessage).toHaveBeenCalledWith(
        `Error at analyzing previous snapshot`,
      );
    });

    it(`should return false if products didn't change`, async () => {
      const productService = createProductService(db);
      const didChange = await productService.didProductsChangeSinceDate(
        productSnapshot.products,
        date,
      );
      expect(didChange).toEqual(false);
    });

    it(`should return true if products changed`, async () => {
      const productService = createProductService(db);
      const didChange = await productService.didProductsChangeSinceDate(
        [],
        date,
      );
      expect(didChange).toEqual(true);
    });
  });
});
