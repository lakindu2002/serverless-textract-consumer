import * as aws from "@pulumi/aws";
import { bucket, cdn } from "./s3/bucket";
import { onTextractProcessingCompleted } from "./sns/topics";
import { textractProcessedQueue } from "./sqs/queue";
import { apigateway } from "./api-gateway";
import {
  onImageAddedToBucket,
  handleTextractResponse,
} from "./triggers/functions";
import { resultsTable } from "./dynamodb/results";
import { apiDomainName } from "./dns";
import { auth } from "./auth";

bucket.onObjectCreated("onObjectCreated", onImageAddedToBucket);

// Grant the SNS topic the permission to send messages to the SQS queue
const topicPolicy: aws.iam.PolicyDocument = {
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Principal: {
        Service: "sns.amazonaws.com",
      },
      Action: "sqs:SendMessage",
      Resource: textractProcessedQueue.arn,
    },
  ],
};

const snsPublishToSqs = new aws.sqs.QueuePolicy("snsPublishToSqs", {
  queueUrl: textractProcessedQueue.url,
  policy: topicPolicy,
});

const topicSubscription = new aws.sns.TopicSubscription(
  "TextractTopicQueueSubscription",
  {
    protocol: "sqs",
    topic: onTextractProcessingCompleted.arn.apply((arn) => arn),
    endpoint: textractProcessedQueue.arn.apply((arn) => arn),
  },
  { dependsOn: snsPublishToSqs }
);

/**
 * queue event
 */
textractProcessedQueue.onEvent(
  "onTextractProcessingQueueEvent",
  handleTextractResponse,
  {
    batchSize: 5,
  }
);

export const bucketName = bucket.bucket;
export const bucketArn = bucket.arn;
export const resultsTableName = resultsTable.name;
export const apiUrl = apigateway.url;
export const webDomain = cdn.domainName;
export const apiDomain = apiDomainName.domainName;
export const clientId = auth.userPoolClientId;
export const userPoolId = auth.userPoolId;
export const identityPoolId = auth.identityPoolId;
