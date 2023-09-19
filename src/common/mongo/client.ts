import { Db, MongoClient, ServerApiVersion } from "mongodb";

export const getConnectedMongoClient = async (): Promise<{
  client: MongoClient;
  db: Db;
}> => {
  const mongoUserName = process.env.MONGO_USERNAME;
  const mongoPassword = process.env.MONGO_PASSWORD;
  const mongoClusterUrl = process.env.MONGO_CLUSTER_URL;
  const mongoDbName = process.env.MONGO_DB_NAME;

  if (!mongoUserName) {
    throw new Error("Broken config. Setup real MONGO_USERNAME env variable");
  }

  if (!mongoPassword) {
    throw new Error("Broken config. Setup real MONGO_PASSWORD env variable");
  }

  if (!mongoClusterUrl) {
    throw new Error("Broken config. Setup real MONGO_CLUSTER_URL env variable");
  }

  if (!mongoDbName) {
    throw new Error("Broken config. Setup real MONGO_DB_NAME env variable");
  }

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
