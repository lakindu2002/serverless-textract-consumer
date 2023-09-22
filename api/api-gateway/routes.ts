import * as awsx from "@pulumi/awsx";
import * as functions from "./functions";

export const routes: awsx.classic.apigateway.Route[] = [
  {
    eventHandler: functions.insertProcessingEntry,
    method: "POST",
    path: "ai/process",
  },
];
