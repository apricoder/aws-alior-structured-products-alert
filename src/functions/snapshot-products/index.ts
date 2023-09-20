import schema from "./schema";
import { handlerPath } from "@libs/handler-resolver";
import { FunctionSchema } from "../../common/types/function.schema";

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      http: {
        method: "post",
        path: "/snapshot-products",
        request: {
          schemas: {
            "application/json": schema,
          },
        },
        private: true,
      },
    },
    {
      schedule: {
        rate: "cron(30 17 * * ? *)"
      }
    }
  ],
} as FunctionSchema;
