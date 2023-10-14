import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { routes } from "./routes";

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
