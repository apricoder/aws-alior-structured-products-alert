import { Product } from "./product.type";

export type ProductSnapshot = {
  products: Product[];
  scrapedAt: Date;
};
