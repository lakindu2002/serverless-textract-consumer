import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import { Result } from "../../types/result";
import { resultsTable } from "../../dynamodb/results";
import { nanoid } from "nanoid";

const stage = pulumi.getStack();
const config = new pulumi.Config();

const memorySize = config.requireNumber("memory");

const parseResult = (result: any) => {
  const queriesAndResults = (result.responses || []).filter(
    (response: { BlockType: string }) =>
      response.BlockType === "QUERY" || response.BlockType === "QUERY_RESULT"
  );
  const mappedResponses = queriesAndResults
    .map(
      (queryAndResult: {
        BlockType: string;
        Relationships: any;
        Query: { Text: any };
      }) => {
        if (queryAndResult.BlockType === "QUERY") {
          const resultIds: string[] = (queryAndResult.Relationships || [])
            .map((relationship: { Type: string; Ids: any }) =>
              relationship.Type === "ANSWER"
                ? relationship.Ids
                : ([] as string[])
            )
            .reduce(
              (prev: string[], current: string[]) => [...prev, ...current],
              []
            );

          const result = queriesAndResults.find(
            (resp: { BlockType: string; Id: string }) =>
              resp.BlockType === "QUERY_RESULT" && resultIds.includes(resp.Id)
          );

          if (!result) {
            return undefined;
          }

          const { Text, Confidence } = result;

          return {
            answer: Text,
            confidence: Confidence,
            query: queryAndResult.Query.Text,
          };
        }
        return undefined;
      }
    )
    .filter((resp: undefined) => resp !== undefined);

  return { ...result, responses: mappedResponses };
};

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
        createdAt: Date.now(),
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

export const getAllCompletedAnalysis = new aws.lambda.CallbackFunction(
  `${stage}-get-all-completed`,
  {
    memorySize,
    timeout: 10,
    callback: async (): Promise<awsx.classic.apigateway.Response> => {
      let nextKey: any;
      const documentClient = new aws.sdk.DynamoDB.DocumentClient({
        region: "us-east-1",
      });
      const results: Result[] = [];
      do {
        const { Items = [], LastEvaluatedKey } = await documentClient
          .query({
            TableName: resultsTable.name.get(),
            KeyConditionExpression: "#status = :status",
            IndexName: "by-status-index",
            ExpressionAttributeNames: {
              "#status": "status",
            },
            ExpressionAttributeValues: {
              ":status": "COMPLETED",
            },
            ExclusiveStartKey: nextKey,
            ScanIndexForward: false,
          })
          .promise();
        results.push(...(Items as Result[]));
        nextKey = LastEvaluatedKey;
      } while (nextKey !== undefined);

      const mappedResults = results.map((result) => parseResult(result));

      return {
        statusCode: 200,
        body: JSON.stringify({ results: mappedResults }),
      };
    },
  }
);

export const pollAnalysis = new aws.lambda.CallbackFunction(
  `${stage}-poll-analysis`,
  {
    memorySize,
    timeout: 10,
    callback: async (
      event: awsx.classic.apigateway.Request
    ): Promise<awsx.classic.apigateway.Response> => {
      const { id } = JSON.parse(event.body || "{}");

      const documentClient = new aws.sdk.DynamoDB.DocumentClient({
        region: "us-east-1",
      });

      const { Item } = await documentClient
        .get({
          TableName: resultsTable.name.get(),
          Key: { id },
        })
        .promise();

      return {
        statusCode: 200,
        body: JSON.stringify({ result: parseResult(Item) }),
      };
    },
  }
);
