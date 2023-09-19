import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { formatJSONResponse } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";

import schema from "./schema";
import * as console from "console";
import { getConnectedMongoClient } from "../../common/mongo/client";

const shapshotProducts: ValidatedEventAPIGatewayProxyEvent<
  typeof schema
> = async (event) => {
  const { client, db } = await getConnectedMongoClient();
  let docCount: number = 0;

  try {
    docCount = await db.collection("product-snapshots").countDocuments();
  } catch (e) {
    console.dir(e);
  } finally {
    await client.close();
  }

  return formatJSONResponse({
    message: `Hello, there are ${docCount} docs in mongo currently`,
    event,
  });
};

export const main = middyfy(shapshotProducts);
