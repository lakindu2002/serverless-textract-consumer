import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { routes } from "./routes";
import { apiDomainName } from "../dns";

const stage = pulumi.getStack();

export const apigateway = new awsx.classic.apigateway.API(
  `${stage}-meetup-api-gateway`,
  {
    routes,
    restApiArgs: {
      binaryMediaTypes: [],
    },
  }
);

export const webDomainMapping = new aws.apigateway.BasePathMapping(
  "webDomainMapping",
  {
    restApi: apigateway.restAPI,
    stageName: apigateway.stage.stageName,
    domainName: apiDomainName.domainName,
  }
);
