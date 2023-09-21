import { didProductsChange, findIdenticalProduct } from "./product.utils";
import { Product } from "../types/product.type";

describe("Product Utils", () => {
  let plnProduct: Product;
  let usdProduct: Product;

  beforeEach(() => {
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
  });

  describe("findIdenticalProduct", () => {
    let product: Product;
    let existingProducts: Product[];

    beforeEach(() => {
      product = { ...plnProduct };
      existingProducts = [{ ...plnProduct }, { ...usdProduct }];
    });

    it("should be defined", () => {
      expect(findIdenticalProduct).toBeDefined();
    });

    it(`should not match if product name differs`, () => {
      existingProducts[0].productName = "Different Name";
      expect(findIdenticalProduct(product, existingProducts)).toBeUndefined();
    });

    it(`should not match if currency differs`, () => {
      existingProducts[0].currency = "USD";
      expect(findIdenticalProduct(product, existingProducts)).toBeUndefined();
    });

    it(`should not match if min amount differs`, () => {
      existingProducts[0].minAmount = 4000;
      expect(findIdenticalProduct(product, existingProducts)).toBeUndefined();
    });

    it(`should not match if interest rate differs`, () => {
      existingProducts[0].interestRate = 11;
      expect(findIdenticalProduct(product, existingProducts)).toBeUndefined();
    });

    it(`should not match if valid until date differs`, () => {
      existingProducts[0].validUntilDate = new Date();
      expect(findIdenticalProduct(product, existingProducts)).toBeUndefined();
    });

    it("should match an identical product", () => {
      expect(findIdenticalProduct(product, existingProducts)).toEqual(
        existingProducts[0],
      );
    });
  });

  describe("didProductsChange", () => {
    it("should return false if products are the same", () => {
      const oldProducts = [plnProduct, usdProduct];
      const newProducts = [plnProduct, usdProduct];
      expect(didProductsChange(oldProducts, newProducts)).toBeFalsy();
    });

    it("should return false if only order differs", () => {
      const oldProducts = [plnProduct, usdProduct];
      const newProducts = [usdProduct, plnProduct];
      expect(didProductsChange(oldProducts, newProducts)).toBeFalsy();
    });

    it("should return true if amount of products is less than it was", () => {
      const oldProducts = [plnProduct, usdProduct];
      const newProducts = [usdProduct];
      expect(didProductsChange(oldProducts, newProducts)).toBeTruthy();
    });

    it("should return true if amount of products is bigger than it was", () => {
      const oldProducts = [usdProduct];
      const newProducts = [plnProduct, usdProduct];
      expect(didProductsChange(oldProducts, newProducts)).toBeTruthy();
    });

    it("should return true if some product changed", () => {
      const oldProducts = [plnProduct, usdProduct];
      const newProducts = [plnProduct, { ...usdProduct, currency: "EUR" }];
      expect(didProductsChange(oldProducts, newProducts)).toBeTruthy();
    });
  });
});
