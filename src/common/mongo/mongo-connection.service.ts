import { Config } from "../config/config.type";
import { Db, MongoClient, ServerApiVersion } from "mongodb";
import { TelegramService } from "../telegram/telegram.service";

export class MongoConnectionService {
  private client: MongoClient;
  constructor(
    private readonly config: Config,
    private readonly telegramService: TelegramService,
  ) {}

  async connect(): Promise<{
    db: Db;
  }> {
    const { mongoUserName, mongoPassword, mongoClusterUrl, mongoDbName } =
      this.config;

    const uri = `mongodb+srv://${mongoUserName}:${mongoPassword}@${mongoClusterUrl}/?retryWrites=true&w=majority`;
    this.client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    try {
      // Connect the client to the server	(optional starting in v4.7)
      await this.client.connect();

      // Send a ping to confirm a successful connection
      await this.client.db(mongoDbName).command({ ping: 1 });

      return { db: this.client.db(mongoDbName) };
    } catch (cause) {
      await this.client.close();

      const errorText = "Error connecting to the database";
      await this.telegramService.sendErrorMessage(errorText);
      throw new Error(errorText, cause);
    }
  }

  closeConnection() {
    return this.client.close();
  }
}
