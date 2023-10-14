import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const stage = pulumi.getStack();

export const bucket = new aws.s3.Bucket(`${stage}-files-bucket`, {
  acl: "private",
  corsRules: [
    {
      allowedOrigins: ["http://localhost:3000"],
      allowedHeaders: ["*"],
      allowedMethods: ["GET", "HEAD", "PUT", "POST", "DELETE"],
      exposeHeaders: [
        "x-amz-server-side-encryption",
        "x-amz-request-id",
        "x-amz-id-2",
        "ETag",
      ],
      maxAgeSeconds: 3000,
    },
  ],
});

const staticOriginAccessIdentity = new aws.cloudfront.OriginAccessIdentity(
  "static-oai",
  {}
);

const bucketPolicy = new aws.s3.BucketPolicy("bucket-policy", {
  bucket: bucket.id,
  policy: pulumi
    .all([bucket.arn, staticOriginAccessIdentity.iamArn])
    .apply(([bucketArn, iamArn]) =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              AWS: iamArn,
            },
            Action: ["s3:GetObject"],
            Resource: `${bucketArn}/*`,
          },
        ],
      })
    ),
});

export const cdn = new aws.cloudfront.Distribution("cdn", {
  enabled: true,
  origins: [
    {
      domainName: bucket.bucketRegionalDomainName,
      originId: bucket.arn,
      s3OriginConfig: {
        originAccessIdentity:
          staticOriginAccessIdentity.cloudfrontAccessIdentityPath,
      },
    },
  ],
  isIpv6Enabled: true,
  viewerCertificate: {
    cloudfrontDefaultCertificate: true,
  },
  defaultCacheBehavior: {
    viewerProtocolPolicy: "redirect-to-https",
    allowedMethods: ["GET", "HEAD", "OPTIONS"],
    cachedMethods: ["GET", "HEAD"],
    targetOriginId: bucket.arn,
    defaultTtl: 3600,
    maxTtl: 86400,
    minTtl: 3600,
    forwardedValues: {
      queryString: true,
      cookies: {
        forward: "none",
      },
    },
  },
  priceClass: "PriceClass_200",
  restrictions: {
    geoRestriction: {
      // // only for SL
      // restrictionType: "whitelist",
      // locations: ["LK"],
      restrictionType: "none",
      locations: [],
    },
  },
  orderedCacheBehaviors: [
    {
      pathPattern: "/analyzer/*",
      allowedMethods: ["GET", "HEAD", "OPTIONS"],
      cachedMethods: ["GET", "HEAD"],
      targetOriginId: bucket.arn,
      forwardedValues: {
        queryString: true,
        cookies: {
          forward: "none",
        },
      },
      viewerProtocolPolicy: "https-only",
      minTtl: 0,
      defaultTtl: 3600,
      maxTtl: 86400,
    },
  ],
});
