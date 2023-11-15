#!/usr/bin/env node
import { AppRunnerStack } from "../lib/app-runner-stack";
import { App } from "aws-cdk-lib";
import { DnsStack } from "../lib/dns-stack";
import { RDSStack } from "../lib/rds-stack";
import { VPCStack } from "../lib/vpc-stack";
import { DnsStackDelete } from "../lib/dns-stack-delete";

const app = new App();

const dnsStack = new DnsStack(app, "DnsStack", {});

const dnsStackDelete = new DnsStackDelete(app, "DnsDeleteStack", {
  hostedZone: dnsStack.hostedZone
});

dnsStackDelete.addDependency(dnsStack);

const vpcStack = new VPCStack(app, "VPCStack", {
  maxAzs: 2
});

const rdsStack = new RDSStack(app, "RDSStack", {
  vpc: vpcStack.vpc
});

rdsStack.addDependency(vpcStack);

const appRunnerStack = new AppRunnerStack(app, "AppRunnerStack", {
  dbSecret: rdsStack.dbSecret,
  hostedZone: dnsStack.hostedZone,
  vpc: vpcStack.vpc
});

appRunnerStack.addDependency(rdsStack);