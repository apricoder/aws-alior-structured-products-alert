import { logProduct } from "./logging.utils";
import { Product } from "../types/product.type";

describe("Logging utils", () => {
  describe("logProduct", () => {
    let plnProduct: Product;

    beforeEach(() => {
      plnProduct = {
        productName: "Legit Deal",
        interestRate: 4.5,
        currency: "PLN",
        minAmount: 5000,
        validUntilDate: new Date("2023-08-21"),
        detailsUrl: "https://bank.com/legit-deal",
      };
    });

    it("should be defined", () => {
      expect(logProduct).toBeDefined();
    });

    it("should not throw", () => {
      expect(() => logProduct(plnProduct)).not.toThrow();
    });
  });
});
