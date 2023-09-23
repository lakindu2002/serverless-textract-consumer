import * as awsx from "@pulumi/awsx";
import * as functions from "./functions";

export const routes: awsx.classic.apigateway.Route[] = [
  {
    eventHandler: functions.insertProcessingEntry,
    method: "POST",
    path: "ai/process",
  },
  {
    eventHandler: functions.getAllCompletedAnalysis,
    method: "GET",
    path: "ai/analyzed",
  },
  {
    eventHandler: functions.pollAnalysis,
    method: "POST",
    path: "ai/poll",
  },
];
