import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const stage = pulumi.getStack();
const config = new pulumi.Config();
const domain = config.require("domain");
const subDomain = config.require("sub-domain");

export const webDomain = `${subDomain}.${domain}`;
export const appDomain = config.require("web-domain");

export const bucket = new aws.s3.Bucket(`${stage}-files-bucket`, {
  acl: "private",
  corsRules: [
    {
      allowedOrigins: [
        `https://${webDomain}`,
        "http://localhost:3000",
        appDomain,
        `https://${appDomain}`,
      ],
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
  {
    comment: webDomain,
  }
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

const s3OriginId = `${webDomain}-s3-origin`;

const zone = aws.route53.getZoneOutput({ name: domain });

// Provision a new ACM certificate.
const certificate = new aws.acm.Certificate(
  "certificate",
  {
    domainName: webDomain,
    validationMethod: "DNS",
  },
  {
    // ACM certificates must be created in the us-east-1 region.
    provider: new aws.Provider("us-east-provider", {
      region: "us-east-1",
    }),
  }
);

// Validate the ACM certificate with DNS.
const validationOption = certificate.domainValidationOptions[0];

const certificateValidation = new aws.route53.Record("certificate-validation", {
  name: validationOption.resourceRecordName,
  type: validationOption.resourceRecordType,
  records: [validationOption.resourceRecordValue],
  zoneId: zone.zoneId,
  ttl: 60,
});

export const cdn = new aws.cloudfront.Distribution("cdn", {
  enabled: true,
  origins: [
    {
      domainName: bucket.bucketRegionalDomainName,
      originId: s3OriginId,
      s3OriginConfig: {
        originAccessIdentity:
          staticOriginAccessIdentity.cloudfrontAccessIdentityPath,
      },
    },
  ],
  isIpv6Enabled: true,
  comment: webDomain,
  defaultCacheBehavior: {
    targetOriginId: s3OriginId,
    viewerProtocolPolicy: "redirect-to-https",
    allowedMethods: ["GET", "HEAD", "OPTIONS"],
    cachedMethods: ["GET", "HEAD"],
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
      // only for SL
      restrictionType: "whitelist",
      locations: ["LK"],
    },
  },
  aliases: [webDomain],
  viewerCertificate: {
    cloudfrontDefaultCertificate: false,
    acmCertificateArn: certificate.arn,
    sslSupportMethod: "sni-only",
  },
  orderedCacheBehaviors: [
    {
      pathPattern: "/analyzer/*",
      allowedMethods: ["GET", "HEAD", "OPTIONS"],
      cachedMethods: ["GET", "HEAD"],
      targetOriginId: s3OriginId,
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

// Create a DNS A record to point to the CDN.
const record = new aws.route53.Record(
  webDomain,
  {
    name: webDomain,
    zoneId: zone.zoneId,
    type: "A",
    aliases: [
      {
        name: cdn.domainName,
        zoneId: cdn.hostedZoneId,
        evaluateTargetHealth: true,
      },
    ],
  },
  { dependsOn: certificate }
);
