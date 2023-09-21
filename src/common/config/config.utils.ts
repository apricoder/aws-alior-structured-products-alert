import { Config } from "./config.type";

const configEnvMap: {
  [key in keyof Config]: string;
} = {
  url: "SCRAPE_URL",
  tgToken: "TG_BOT_TOKEN",
  tgChatId: "TG_CHAT_ID",
  mongoUserName: "MONGO_USERNAME",
  mongoPassword: "MONGO_PASSWORD",
  mongoClusterUrl: "MONGO_CLUSTER_URL",
  mongoDbName: "MONGO_DB_NAME",
};

export const getAppConfig = (env: typeof process.env): Config => {
  const configKeys = Object.keys(configEnvMap) as (keyof Config)[];
  return configKeys.reduce((config, key) => {
    const envVarName = configEnvMap[key];
    const envVarValue = env[envVarName];
    if (!envVarValue) {
      throw new Error(`Broken config. Setup real ${envVarName} env variable`);
    }

    return { ...config, [key]: envVarValue };
  }, {} as Config);
};
