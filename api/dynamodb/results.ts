import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const stage = pulumi.getStack();

export const resultsTable = new aws.dynamodb.Table(`${stage}-results-table`, {
  attributes: [
    {
      name: "id",
      type: "S",
    },
    {
      name: "status",
      type: "S",
    },
    {
      name: "createdAt",
      type: "N",
    },
  ],
  hashKey: "id",
  billingMode: "PAY_PER_REQUEST",
  globalSecondaryIndexes: [
    {
      name: "by-status-index",
      hashKey: "status",
      rangeKey: "createdAt",
      projectionType: "ALL",
    },
  ],
  pointInTimeRecovery: {
    enabled: false,
  },
});
