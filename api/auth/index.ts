import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as s3 from "../s3/bucket";

const stage = pulumi.getStack();

const cognitoUserPool = new aws.cognito.UserPool(`${stage}-user-pool`, {
  usernameAttributes: ["email"],
  autoVerifiedAttributes: ["email"],
  accountRecoverySetting: {
    recoveryMechanisms: [{ name: "verified_email", priority: 1 }],
  },
});

const client = new aws.cognito.UserPoolClient(`${stage}-web-userpool-client`, {
  userPoolId: cognitoUserPool.id,
  callbackUrls: ["http://localhost:3000"],
  logoutUrls: ["http://localhost:3000"],
  allowedOauthFlows: ["code"],
});

const cognitoIdentityPool = new aws.cognito.IdentityPool(
  `${stage}-identityPool`,
  {
    identityPoolName: `${stage}_identitypool`,
    allowUnauthenticatedIdentities: false,
    cognitoIdentityProviders: [
      {
        clientId: client.id,
        providerName: cognitoUserPool.endpoint,
        serverSideTokenCheck: false,
      },
    ],
  }
);

const auuthenticatedRole = new aws.iam.Role(`${stage}-authenticated-role`, {
  assumeRolePolicy: pulumi.all([cognitoIdentityPool.id]).apply(([cognitoId]) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: {
            Federated: "cognito-identity.amazonaws.com",
          },
          Action: ["sts:AssumeRoleWithWebIdentity", "sts:TagSession"],
          Condition: {
            StringEquals: {
              "cognito-identity.amazonaws.com:aud": `${cognitoId}`,
            },
            "ForAnyValue:StringLike": {
              "cognito-identity.amazonaws.com:amr": "authenticated",
            },
          },
        },
      ],
    })
  ),
});

const unAuthenticatedRole = new aws.iam.Role(`${stage}-unauthenticated-role`, {
  assumeRolePolicy: pulumi.all([cognitoIdentityPool.id]).apply(([cognitoId]) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: {
            Federated: "cognito-identity.amazonaws.com",
          },
          Action: ["sts:AssumeRoleWithWebIdentity", "sts:TagSession"],
          Condition: {
            StringEquals: {
              "cognito-identity.amazonaws.com:aud": `${cognitoId}`,
            },
            "ForAnyValue:StringLike": {
              "cognito-identity.amazonaws.com:amr": "unauthenticated",
            },
          },
        },
      ],
    })
  ),
});

const unAuthenticatedRolePolicy = new aws.iam.RolePolicy(
  `${stage}-unauthenticated-role-policy`,
  {
    role: unAuthenticatedRole.id,
    policy: pulumi.all([s3.bucket.arn]).apply(([bucketArn]) =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Action: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
            Resource: [`${bucketArn}/public/analyze/*`],
            Effect: "Allow",
          },
          {
            Action: ["s3:PutObject"],
            Resource: [`${bucketArn}/public/analyze/*`],
            Effect: "Allow",
          },
          {
            Action: ["s3:GetObject"],
            Resource: [`${bucketArn}/public/analyze/*`],
            Effect: "Allow",
          },
          {
            Condition: {
              StringLike: {
                "s3:prefix": ["public/analyze/", "public/analyze/*"],
              },
            },
            Action: ["s3:ListBucket"],
            Resource: [`${bucketArn}/analyze/*`],
            Effect: "Allow",
          },
        ],
      })
    ),
  }
);

const identityPoolRoleAttachment = new aws.cognito.IdentityPoolRoleAttachment(
  `${stage}-identity-pool-role-attachment`,
  {
    identityPoolId: cognitoIdentityPool.id,
    roles: {
      unauthenticated: unAuthenticatedRole.arn,
      authenticated: auuthenticatedRole.arn,
    },
  }
);

export const auth = {
  userPoolId: cognitoUserPool.id,
  userPoolClientId: client.id,
  identityPoolId: cognitoIdentityPool.id,
  userPoolName: cognitoUserPool.name,
  userPoolArn: cognitoUserPool.arn,
};
