import { Config } from "../config/config.type";
import TelegramBot, { Message } from "node-telegram-bot-api";

export class TelegramService {
  private bot: TelegramBot;

  constructor(private readonly config: Config) {
    this.bot = new TelegramBot(this.config.tgToken);
  }

  sendMessage(text: string): Promise<Message> {
    return this.bot.sendMessage(this.config.tgChatId, text, {
      parse_mode: "MarkdownV2",
    });
  }

  sendErrorMessage(text: string): Promise<Message> {
    return this.sendMessage(`Fix me 🔧🥲 ${text}`);
  }
}
