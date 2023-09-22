import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import { Result } from "../../types/result";
import { resultsTable } from "../../dynamodb/results";
import { nanoid } from "nanoid";

const stage = pulumi.getStack();
const config = new pulumi.Config();

const memorySize = config.requireNumber("memory");

export const insertProcessingEntry = new aws.lambda.CallbackFunction(
  `${stage}-insert-processing-entry`,
  {
    memorySize,
    timeout: 10,
    callback: async (
      event: awsx.classic.apigateway.Request
    ): Promise<awsx.classic.apigateway.Response> => {
      const documentClient = new aws.sdk.DynamoDB.DocumentClient({
        region: "us-east-1",
      });

      const id = nanoid();
      const { questions = [], requirements = [] } = JSON.parse(
        event.body || "{}"
      ) as Partial<Result>;

      if (requirements.includes("QUERIES") && questions.length === 0) {
        return {
          body: JSON.stringify({ message: "Questions are needed" }),
          statusCode: 400,
        };
      }

      const item: Result = {
        id,
        questions,
        requirements,
        status: "PENDING",
      };

      await documentClient
        .put({
          Item: item,
          TableName: resultsTable.name.get(),
        })
        .promise();

      return {
        body: JSON.stringify({ id }),
        statusCode: 200,
      };
    },
  }
);
