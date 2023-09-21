import { Product } from "../types/product.type";

export const findIdenticalProduct = (
  product: Product,
  existingProducts: Product[],
): Product => {
  return existingProducts.find(
    (oldProduct) =>
      oldProduct.productName === product.productName &&
      oldProduct.currency === product.currency &&
      oldProduct.interestRate === product.interestRate &&
      oldProduct.minAmount === product.minAmount &&
      oldProduct.validUntilDate.getTime() === product.validUntilDate.getTime(),
  );
};
