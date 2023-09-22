import { TelegramService } from "src/common/telegram/telegram.service";
import { ProductsService } from "./products.service";
import { Db } from "mongodb";
import { ProductSnapshot } from "../types/product-snapshot.type";
import { Product } from "../types/product.type";

describe("ProductService", () => {
  let createProductService: (db: Db) => ProductsService;
  let productService: ProductsService;

  let telegramService: TelegramService;
  let db: Db;

  let productSnapshot: ProductSnapshot;
  let plnProduct: Product;
  let usdProduct: Product;
  let date: Date;

  beforeEach(() => {
    date = new Date("2023-09-22");

    telegramService = {
      sendErrorMessage: jest.fn(),
    } as unknown as TelegramService;

    plnProduct = {
      productName: "Legit Deal",
      interestRate: 4.5,
      currency: "PLN",
      minAmount: 5000,
      validUntilDate: new Date("2023-08-21"),
      detailsUrl: "https://bank.com/legit-deal",
    };
    usdProduct = {
      productName: "Bucks Saving",
      interestRate: 3,
      currency: "USD",
      minAmount: 5000,
      validUntilDate: new Date("2023-08-21"),
      detailsUrl: "https://bank.com/bucks-savings",
    };
    productSnapshot = {
      products: [plnProduct],
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

    // allow to override with createProductService
    createProductService = (db) => new ProductsService(db, telegramService);

    // create default productService
    productService = createProductService(db);
  });

  describe("saveProductsSnapshot", () => {
    it("should be defined", () => {
      expect(productService.saveProductsSnapshot).toBeDefined();
    });

    it("should reject and send error message on telegram if failed to save", async () => {
      db.collection = jest.fn().mockReturnValue({
        insertOne: jest.fn().mockRejectedValue(new Error("Query Error")),
      });
      productService = createProductService(db);

      await expect(
        productService.saveProductsSnapshot(productSnapshot),
      ).rejects.toThrow();

      expect(telegramService.sendErrorMessage).toHaveBeenCalledWith(
        `Error saving current products snapshot`,
      );
    });

    it("should resolve if saved successfully", async () => {
      await expect(
        productService.saveProductsSnapshot(productSnapshot),
      ).resolves.not.toThrow();

      expect(telegramService.sendErrorMessage).not.toHaveBeenCalled();
    });
  });

  describe("getLastSnapshotBeforeDate", () => {
    it("should be defined", () => {
      expect(productService.getLastSnapshotBeforeDate).toBeDefined();
    });

    it("should query db with proper params", async () => {
      await expect(
        productService.getLastSnapshotBeforeDate(date),
      ).resolves.not.toThrow();

      expect(db.collection("product-snapshots").find).toHaveBeenCalledWith(
        { scrapedAt: { $lt: date } },
        { sort: { scrapedAt: -1 } },
      );
    });

    it("should return first (and only) query result", async () => {
      const snapshot = await productService.getLastSnapshotBeforeDate(date);
      expect(snapshot).toEqual(productSnapshot);
    });
  });

  describe("getLastProductsBeforeDate", () => {
    it("should be defined", () => {
      expect(productService.getLastProductsBeforeDate).toBeDefined();
    });

    it("should return empty array if no previous snapshot", async () => {
      productService.getLastSnapshotBeforeDate = jest
        .fn()
        .mockResolvedValue(null);

      const products = await productService.getLastProductsBeforeDate(date);
      expect(products).toEqual([]);
    });

    it("should return products of a last snapshot", async () => {
      productService.getLastSnapshotBeforeDate = jest
        .fn()
        .mockResolvedValue(productSnapshot);

      const products = await productService.getLastProductsBeforeDate(date);
      expect(products).toEqual(productSnapshot.products);
    });
  });

  describe("didProductsChangeSinceDate", () => {
    it("should be defined", () => {
      expect(productService.didProductsChangeSinceDate).toBeDefined();
    });

    it("should reject and send error message to telegram if failed to get last products ", async () => {
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
      const didChange = await productService.didProductsChangeSinceDate(
        productSnapshot.products,
        date,
      );
      expect(didChange).toEqual(false);
    });

    it(`should return true if products changed`, async () => {
      const didChange = await productService.didProductsChangeSinceDate(
        [],
        date,
      );
      expect(didChange).toEqual(true);
    });
  });

  describe("findIdenticalProduct", () => {
    let product: Product;
    let existingProducts: Product[];

    beforeEach(() => {
      product = { ...plnProduct };
      existingProducts = [{ ...plnProduct }, { ...usdProduct }];
    });

    it("should be defined", () => {
      expect(productService.findIdenticalProduct).toBeDefined();
    });

    it(`should not match if product name differs`, () => {
      existingProducts[0].productName = "Different Name";
      expect(
        productService.findIdenticalProduct(product, existingProducts),
      ).toBeUndefined();
    });

    it(`should not match if currency differs`, () => {
      existingProducts[0].currency = "USD";
      expect(
        productService.findIdenticalProduct(product, existingProducts),
      ).toBeUndefined();
    });

    it(`should not match if min amount differs`, () => {
      existingProducts[0].minAmount = 4000;
      expect(
        productService.findIdenticalProduct(product, existingProducts),
      ).toBeUndefined();
    });

    it(`should not match if interest rate differs`, () => {
      existingProducts[0].interestRate = 11;
      expect(
        productService.findIdenticalProduct(product, existingProducts),
      ).toBeUndefined();
    });

    it(`should not match if valid until date differs`, () => {
      existingProducts[0].validUntilDate = new Date();
      expect(
        productService.findIdenticalProduct(product, existingProducts),
      ).toBeUndefined();
    });

    it("should match an identical product", () => {
      expect(
        productService.findIdenticalProduct(product, existingProducts),
      ).toEqual(existingProducts[0]);
    });
  });

  describe("areProductsDifferent", () => {
    it("should return false if products are the same", () => {
      const oldProducts = [plnProduct, usdProduct];
      const newProducts = [plnProduct, usdProduct];
      expect(
        productService.areProductsDifferent(oldProducts, newProducts),
      ).toEqual(false);
    });

    it("should return false if only order differs", () => {
      const oldProducts = [plnProduct, usdProduct];
      const newProducts = [usdProduct, plnProduct];
      expect(
        productService.areProductsDifferent(oldProducts, newProducts),
      ).toEqual(false);
    });

    it("should return true if amount of products is less than it was", () => {
      const oldProducts = [plnProduct, usdProduct];
      const newProducts = [usdProduct];
      expect(
        productService.areProductsDifferent(oldProducts, newProducts),
      ).toEqual(true);
    });

    it("should return true if amount of products is bigger than it was", () => {
      const oldProducts = [usdProduct];
      const newProducts = [plnProduct, usdProduct];
      expect(
        productService.areProductsDifferent(oldProducts, newProducts),
      ).toEqual(true);
    });

    it("should return true if some product changed", () => {
      const oldProducts = [plnProduct, usdProduct];
      const newProducts = [plnProduct, { ...usdProduct, currency: "EUR" }];
      expect(
        productService.areProductsDifferent(oldProducts, newProducts),
      ).toEqual(true);
    });
  });
});
