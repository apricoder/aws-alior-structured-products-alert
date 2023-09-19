import schema from "./schema";
import { handlerPath } from "@libs/handler-resolver";
import { FunctionSchema } from "../../common/types/function.schema";

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      http: {
        method: "post",
        path: "hello",
        request: {
          schemas: {
            "application/json": schema,
          },
        },
        private: true,
      },
    },
  ],
} as FunctionSchema;
