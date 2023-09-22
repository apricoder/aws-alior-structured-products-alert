import type { AWS } from "@serverless/typescript";
import { snapshotProducts } from "@functions/index";

const serverlessConfiguration: AWS = {
  service: "aws-alior-structured-products-alert",
  frameworkVersion: "3",
  plugins: [
    "serverless-esbuild",
    "serverless-add-api-key",
    "serverless-offline",
    "serverless-dotenv-plugin",
  ],
  provider: {
    name: "aws",
    runtime: "nodejs14.x",
    stage: "dev",
    region: "eu-west-1",
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      NODE_OPTIONS: "--enable-source-maps --stack-trace-limit=1000",
      REGION: "${self:custom.region}",
      STAGE: "${self:custom.stage}",
    },
  },
  // import the function via paths
  functions: { snapshotProducts },
  package: { individually: true },
  custom: {
    region: "${opt:region, self:provider.region}",
    stage: "${opt:stage, self:provider.stage}",
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ["aws-sdk"],
      target: "node14",
      define: { "require.resolve": undefined },
      platform: "node",
      concurrency: 10,
    },
    ["serverless-offline"]: {
      httpPort: 3000,
      babelOptions: {
        presets: ["env"],
      },
    },
    apiKeys: [
      {
        name: "api-key",
        value: "x11HjN12FVvL3nRequgo",
      },
    ],
  },
};

module.exports = serverlessConfiguration;
