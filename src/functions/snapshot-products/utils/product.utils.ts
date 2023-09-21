import { Product } from "../types/product.type";

// todo move to product service

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

export const areProductsDifferent = (
  oldProducts: Product[],
  newProducts: Product[],
): boolean => {
  // if amount of products changed - products changed
  if (oldProducts.length !== newProducts.length) {
    return true;
  }

  // otherwise check if every new product existed before
  for (const newProduct of newProducts) {
    const identicalOldProduct = findIdenticalProduct(newProduct, oldProducts);
    if (!identicalOldProduct) {
      return true;
    }
  }

  return false;
};
