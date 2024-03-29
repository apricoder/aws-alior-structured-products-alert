import { format as formatDate } from "date-fns";
import { pl } from "date-fns/locale";
import { Product } from "../types/product.type";
import { Config } from "src/common/config/config.type";

export class ProductMessageService {
  constructor(private readonly config: Config) {}

  prepareOfferUpdateMessage(products: Product[]): string {
    return (
      `⚡️ *Zmiany w ofercie produktów strukturyzowanych*:\n\n` +
      products
        .map((product) => {
          return this.getProductSummary(product);
        })
        .join(`\n`) +
      `\n📌 [Pełna oferta](${this.config.url})`
    );
  }

  getProductSummary(p: Product) {
    const formattedDate =
      p.validUntilDate &&
      formatDate(p.validUntilDate, "dd MMMM yyyy", {
        locale: pl,
      });

    const interestText = `${p.interestRate.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}%`;

    const minAmountText = p.minAmount.toLocaleString("fr-FR", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return (
      `▪️ *${p.productName}*\n` +
      `• ${interestText} w ${p.currency}\n` +
      `• Minimalna wartość inwestycji: ${minAmountText} ${p.currency}\n` +
      (formattedDate ? `• Oferta ważna do ${formattedDate}\n` : ``) +
      `• [Zobacz szczegóły](${p.detailsUrl})\n`
    );
  }
}
