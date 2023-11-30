import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { onTextractProcessingCompleted } from "../sns/topics";
import { textractToSnsRole } from "../iam/roles";
import { resultsTable } from "../dynamodb/results";
import { Result } from "../types/result";
import { ManagedPolicies, ManagedPolicy } from "@pulumi/aws/iam";

const stage = pulumi.getStack();
const config = new pulumi.Config();

const memorySize = config.requireNumber("memory");

const textract = new aws.sdk.Textract({
  region: "us-east-1",
});

export const onImageAddedToBucket = new aws.lambda.CallbackFunction(
  `${stage}-image-uploaded`,
  {
    memorySize,
    role: new aws.iam.Role(`${stage}-image-uploaded-role`, {
      assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
        Service: "lambda.amazonaws.com",
      }),
      managedPolicyArns: [
        ManagedPolicy.AWSXrayFullAccess,
        ManagedPolicy.LambdaFullAccess,
        ManagedPolicy.AmazonDynamoDBFullAccess,
        ManagedPolicy.AWSXrayFullAccess,
        ManagedPolicy.CloudWatchEventsFullAccess,
        ManagedPolicy.AWSLambdaBasicExecutionRole,
        ManagedPolicy.AmazonS3ReadOnlyAccess,
      ],
      inlinePolicies: [
        {
          name: "inline-policies",
          policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Sid: "textractPolicies",
                Effect: "Allow",
                Action: ["textract:StartDocumentAnalysis"],
                Resource: "*",
              },
            ],
          }),
        },
      ],
    }),
    callback: async (event: aws.s3.BucketEvent): Promise<void> => {
      const { Records = [] } = event;
      const documentClient = new aws.sdk.DynamoDB.DocumentClient({
        region: "us-east-1",
      });
      const promises = Records.map(async (record) => {
        const { s3: s3Record } = record;
        const { object, bucket } = s3Record;
        const decodedKey = decodeURIComponent(object.key.replace(/\+/g, " "));
        const itemKey = decodedKey.split("/")[2];
        // key will be PK of results table
        const { Item } = await documentClient
          .get({
            TableName: resultsTable.name.get(),
            Key: { id: itemKey },
          })
          .promise();

        if (!Item) {
          return;
        }

        const { questions, requirements } = Item as Result;

        const { JobId } = await textract
          .startDocumentAnalysis({
            DocumentLocation: {
              S3Object: {
                Bucket: bucket.name,
                Name: decodedKey,
              },
            },
            FeatureTypes: requirements,
            ...(questions.length > 0 &&
              requirements.includes("QUERIES") && {
                QueriesConfig: {
                  Queries: questions.map((question) => ({ Text: question })),
                },
              }),
            ClientRequestToken: itemKey,
            NotificationChannel: {
              SNSTopicArn: onTextractProcessingCompleted.arn.get(),
              RoleArn: textractToSnsRole.arn.get(),
            },
          })
          .promise();

        await documentClient
          .update({
            TableName: resultsTable.name.get(),
            Key: { id: itemKey },
            UpdateExpression: "SET #jobId = :jobId",
            ExpressionAttributeNames: {
              "#jobId": "jobId",
            },
            ExpressionAttributeValues: {
              ":jobId": JobId,
            },
          })
          .promise();
      });

      await Promise.all(promises);
    },
  }
);

export const handleTextractResponse = new aws.lambda.CallbackFunction(
  `${stage}-handle-textract-response`,
  {
    timeout: 20,
    role: new aws.iam.Role(`${stage}-handle-textract-response-role`, {
      assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
        Service: "lambda.amazonaws.com",
      }),
      managedPolicyArns: [
        ManagedPolicy.AWSXrayFullAccess,
        ManagedPolicy.LambdaFullAccess,
        ManagedPolicy.AmazonDynamoDBFullAccess,
        ManagedPolicy.AWSXrayFullAccess,
        ManagedPolicy.CloudWatchEventsFullAccess,
        ManagedPolicy.AWSLambdaBasicExecutionRole,
        ManagedPolicy.AmazonS3ReadOnlyAccess,
      ],
      inlinePolicies: [
        {
          name: "inline-policies",
          policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Sid: "textractPolicies",
                Effect: "Allow",
                Action: ["textract:GetDocumentAnalysis"],
                Resource: "*",
              },
            ],
          }),
        },
      ],
    }),
    memorySize,
    callback: async (event: aws.sqs.QueueEvent): Promise<void> => {
      const documentClient = new aws.sdk.DynamoDB.DocumentClient({
        region: "us-east-1",
      });

      const promises = event.Records.map(async (record) => {
        const { body } = record;
        const message = JSON.parse(JSON.parse(body).Message) as {
          JobId: string;
          Status: string;
          DocumentLocation: {
            S3ObjectName: string;
            S3Bucket: string;
          };
        };

        const { DocumentLocation, JobId, Status } = message;

        const { S3ObjectName } = DocumentLocation;

        if (Status !== "SUCCEEDED") {
          console.log("Job Failed");
          return;
        }

        let nextToken: any = undefined;
        const analyzedBlocks = [];
        do {
          const { Blocks = [], NextToken = undefined } = await textract
            .getDocumentAnalysis({
              JobId,
              ...(nextToken !== undefined && {
                NextToken: nextToken,
              }),
            })
            .promise();
          nextToken = NextToken;
          analyzedBlocks.push(...Blocks);
        } while (nextToken !== undefined);
        const itemKey = decodeURI(S3ObjectName).split("/")[2];
        await documentClient
          .update({
            TableName: resultsTable.name.get(),
            Key: { id: itemKey },
            UpdateExpression:
              "SET #status = :completed, #responses = :responses",
            ExpressionAttributeNames: {
              "#status": "status",
              "#responses": "responses",
            },
            ExpressionAttributeValues: {
              ":completed": "COMPLETED",
              ":responses": analyzedBlocks,
            },
          })
          .promise();
      });
      await Promise.all(promises);
    },
  }
);
