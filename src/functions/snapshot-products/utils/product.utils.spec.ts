import { findIdenticalProduct } from "./product.utils";
import { Product } from "../types/product.type";

describe("Product Utils", () => {
  describe("findIdenticalProduct", () => {
    let product: Product;
    let existingProducts: Product[];

    beforeEach(() => {
      product = {
        productName: "Legit Deal",
        interestRate: 4.5,
        currency: "PLN",
        minAmount: 5000,
        validUntilDate: new Date("2023-08-21"),
        detailsUrl: "https://bank.com/legit-deal",
      };

      existingProducts = [
        {
          ...product,
        },
        {
          productName: "Bucks Saving",
          interestRate: 3,
          currency: "USD",
          minAmount: 5000,
          validUntilDate: new Date("2023-08-21"),
          detailsUrl: "https://bank.com/bucks-savings",
        },
      ];
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
});
