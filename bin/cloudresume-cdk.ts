#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { CertStackDelete } from "../lib/cert-stack-delete";
import { CertStack } from "../lib/cert-stack";
import { DnsStack } from "../lib/dns-stack";
import { ECSStack } from "../lib/ecs-fargate-stack";
import { RdsServerlessStack } from "../lib/rds-serverless-stack";
import { VPCStack } from "../lib/vpc-stack";

const app = new App();

const dnsStack = new DnsStack(app, "DnsStack", {});

const certStack = new CertStack(app, "CertStack", {
  hostedZone: dnsStack.hostedZone
});

const certStackDelete = new CertStackDelete(app, "CertStackDelete", {
  hostedZone: dnsStack.hostedZone
});

certStackDelete.addDependency(certStack);

const vpcStack = new VPCStack(app, "VPCStack", {
  maxAzs: 2
});

const rdsStack = new RdsServerlessStack(app, "RDSStack", {
  vpc: vpcStack.vpc
});

rdsStack.addDependency(vpcStack);

const ecsStack = new ECSStack(app, "ECSStack", {
  vpc: vpcStack.vpc,
  dbSecretArn: rdsStack.dbSecret.secretArn,
  cert: certStack.cert,
  hostedZone: dnsStack.hostedZone
});

ecsStack.addDependency(rdsStack);
ecsStack.addDependency(certStack);
