import { Db, MongoClient, ServerApiVersion } from "mongodb";
import { Config } from "../config/config.type";

export const getConnectedMongoClient = async (
  config: Config,
): Promise<{
  client: MongoClient;
  db: Db;
}> => {
  const { mongoUserName, mongoPassword, mongoClusterUrl, mongoDbName } = config;

  const uri = `mongodb+srv://${mongoUserName}:${mongoPassword}@${mongoClusterUrl}/?retryWrites=true&w=majority`;
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // Send a ping to confirm a successful connection
    await client.db(mongoDbName).command({ ping: 1 });

    return { client, db: client.db(mongoDbName) };
  } catch (e) {
    await client.close();
    throw new Error("Error connecting to mongo", e);
  }
};
