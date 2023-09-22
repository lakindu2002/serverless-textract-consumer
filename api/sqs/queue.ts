import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const stage = pulumi.getStack();

export const textractProcessedQueue = new aws.sqs.Queue(
  `${stage}-textract-processed-queue`,
  {
    delaySeconds: 0.1, // assuming 20 requests per second comes to queue, and textract analyze rate limit is 10 per second.
    messageRetentionSeconds: 345600, // 4 seconds
    visibilityTimeoutSeconds: 20, // 20 seconds
  }
);
