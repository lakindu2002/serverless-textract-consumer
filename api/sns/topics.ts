import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const stage = pulumi.getStack();

export const onTextractProcessingCompleted = new aws.sns.Topic(
  `AmazonTextract-${stage}-on-textract-processing-completed`
);
