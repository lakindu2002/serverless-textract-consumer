import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const stage = pulumi.getStack();
const account = aws.getCallerIdentity({});

export const textractToSnsRole = new aws.iam.Role(
  `${stage}-textract-to-sns-role`,
  {
    assumeRolePolicy: {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "AllowTextractToAssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "textract.amazonaws.com",
          },
          Action: "sts:AssumeRole",
          Condition: {
            ArnLike: {
              "aws:SourceArn": account.then(
                (resp) => `arn:aws:textract:*:${resp.accountId}:*`
              ) as any,
            },
            StringEquals: {
              "aws:SourceAccount": account.then(
                (resp) => resp.accountId
              ) as any,
            },
          },
        },
      ],
    },
    managedPolicyArns: [
      "arn:aws:iam::aws:policy/service-role/AmazonTextractServiceRole",
    ],
  }
);
