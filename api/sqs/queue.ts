import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const stage = pulumi.getStack();

export const deadLetterQueue = new aws.sqs.Queue(`${stage}-dead-letter-queue`, {
  messageRetentionSeconds: 1209600, // 14 days,
});

export const textractProcessedQueue = new aws.sqs.Queue(
  `${stage}-textract-processed-queue`,
  {
    delaySeconds: 0.1, // assuming 20 requests per second comes to queue, and textract analyze rate limit is 10 per second.
    messageRetentionSeconds: 345600, // 4 seconds
    visibilityTimeoutSeconds: 20, // 20 seconds
    redrivePolicy: deadLetterQueue.arn.apply((arn) =>
      JSON.stringify({
        maxReceiveCount: 5, // if consumer fails to process message 5 times, move to DLQ and remove from client
        deadLetterTargetArn: arn,
      })
    ),
  }
);
