import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

const apiDomain = config.require("api-domain");
const hostedZone = config.require("domain");

// Get the DNS zone for custom domain
const dnsZone = aws.route53.getZoneOutput({
  name: hostedZone,
});

// Provision an SSL certificate to enable SSL -- ensuring to do so in us-east-1.
const awsUsEast1 = new aws.Provider("usEast1", { region: "us-east-1" });
const sslCert = new aws.acm.Certificate(
  "sslCert",
  {
    domainName: apiDomain,
    validationMethod: "DNS",
  },
  { provider: awsUsEast1 }
);

// Create the necessary DNS records for ACM to validate ownership, and wait for it.
const sslCertValidationRecord = new aws.route53.Record(
  "sslCertValidationRecord",
  {
    zoneId: dnsZone.id,
    name: sslCert.domainValidationOptions[0].resourceRecordName,
    type: sslCert.domainValidationOptions[0].resourceRecordType,
    records: [sslCert.domainValidationOptions[0].resourceRecordValue],
    ttl: 10 * 60, // 10 minutes
  }
);
const sslCertValidationIssued = new aws.acm.CertificateValidation(
  "sslCertValidationIssued",
  {
    certificateArn: sslCert.arn,
    validationRecordFqdns: [sslCertValidationRecord.fqdn],
  },
  { provider: awsUsEast1 }
);

// Configure an edge-optimized domain for the API Gateway. This will configure a Cloudfront CDN
// distribution behind the scenes and serve the API Gateway at a custom domain name over SSL.
export const apiDomainName = new aws.apigateway.DomainName("webCdn", {
  certificateArn: sslCertValidationIssued.certificateArn,
  domainName: apiDomain,
});

// Create an A record for our domain that directs to our custom domain.
const webDnsRecord = new aws.route53.Record(
  "webDnsRecord",
  {
    name: apiDomainName.domainName,
    type: "A",
    zoneId: dnsZone.id,
    aliases: [
      {
        evaluateTargetHealth: true,
        name: apiDomainName.cloudfrontDomainName,
        zoneId: apiDomainName.cloudfrontZoneId,
      },
    ],
  },
  { dependsOn: sslCertValidationIssued }
);
