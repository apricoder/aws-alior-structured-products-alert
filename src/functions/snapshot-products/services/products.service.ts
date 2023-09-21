import { Db } from "mongodb";
import { TelegramService } from "src/common/telegram/telegram.service";
import { ProductSnapshot } from "../types/product-snapshot.type";
import { Product } from "../types/product.type";
import { areProductsDifferent } from "../utils/product.utils";

export class ProductsService {
  private readonly collectionName = "product-snapshots";

  constructor(
    private readonly db: Db,
    private readonly telegramService: TelegramService,
  ) {}

  async saveProductsSnapshot(snapshot: ProductSnapshot): Promise<void> {
    try {
      await this.db.collection(this.collectionName).insertOne(snapshot);
    } catch (e) {
      await this.telegramService.sendErrorMessage(
        `Error saving current products snapshot`,
      );
      throw e;
    }
  }

  async didProductsChangeSinceDate(
    newProducts: Product[],
    date: Date,
  ): Promise<boolean> {
    try {
      const previousProducts = await this.getLastProductsBeforeDate(date);
      return areProductsDifferent(previousProducts, newProducts);
    } catch (e) {
      await this.telegramService.sendErrorMessage(
        `Error at analyzing previous snapshot`,
      );

      throw e;
    }
  }

  async getLastProductsBeforeDate(date: Date): Promise<Product[]> {
    const previousSnapshot = await this.getLastSnapshotBeforeDate(date);
    return previousSnapshot?.products ?? [];
  }

  async getLastSnapshotBeforeDate(date: Date): Promise<ProductSnapshot> {
    const [previousSnapshot] = await this.db
      .collection(this.collectionName)
      .find({ scrapedAt: { $lt: date } }, { sort: { scrapedAt: -1 } })
      .limit(1)
      .toArray();

    return previousSnapshot as unknown as ProductSnapshot;
  }
}
