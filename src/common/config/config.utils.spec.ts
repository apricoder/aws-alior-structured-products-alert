import { getAppConfig } from "./config.utils";

describe("Config Utils", () => {
  let processEnv: typeof process.env;

  it("should be defined", () => {
    expect(getAppConfig).toBeDefined();
  });

  beforeEach(() => {
    processEnv = {
      SCRAPE_URL: "https://some-domain/interesting-page",
      TG_BOT_TOKEN: "123",
      TG_CHAT_ID: "-100500",
      MONGO_USERNAME: 'user',
      MONGO_PASSWORD: 'pass',
      MONGO_CLUSTER_URL: 'https://mongo.cluster.com/123',
      MONGO_DB_NAME: 'snapshots',
    };
  });

  it("should throw meaningful error if config.url field has env var missing", () => {
    delete processEnv.SCRAPE_URL;

    expect(() => getAppConfig(processEnv)).toThrow(
      "Broken config. Setup real SCRAPE_URL env variable",
    );
  });

  it("should throw meaningful error if config.tgToken field has env var missing", () => {
    delete processEnv.TG_BOT_TOKEN;

    expect(() => getAppConfig(processEnv)).toThrow(
      "Broken config. Setup real TG_BOT_TOKEN env variable",
    );
  });

  it("should return config object if all env variables have values", () => {
    const config = getAppConfig(processEnv);
    expect(config).toEqual({
      url: processEnv.SCRAPE_URL,
      tgToken: processEnv.TG_BOT_TOKEN,
      tgChatId: processEnv.TG_CHAT_ID,
      mongoUserName: processEnv.MONGO_USERNAME,
      mongoPassword: processEnv.MONGO_PASSWORD,
      mongoClusterUrl: processEnv.MONGO_CLUSTER_URL,
      mongoDbName: processEnv.MONGO_DB_NAME,
    });
  });
});
