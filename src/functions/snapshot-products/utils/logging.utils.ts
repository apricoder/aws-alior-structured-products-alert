import { Product } from "@functions/snapshot-products/types/product.type";

export const logProduct = (product: Product) => {
  console.log(Array(15).join("-"));
  console.log(" Product name: ", product.productName);
  console.log(" Valid until: ", product.validUntilDate);
  console.log(" Interest rate: ", product.interestRate);
  console.log(" Min amount: ", product.minAmount);
  console.log(" Currency: ", product.currency);
  console.log(" Details Url: ", product.detailsUrl);
};
