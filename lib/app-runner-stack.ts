import * as AppRunnerAlpha from "@aws-cdk/aws-apprunner-alpha";
import {
  App,
  aws_lambda_nodejs,
  custom_resources,
  CustomResource,
  Duration,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { ISecret } from "aws-cdk-lib/aws-secretsmanager";
import { SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";

export interface AppRunnerStackProps extends StackProps {
  dbSecret: ISecret;
  vpc: Vpc;
  hostedZone: HostedZone;
}

export class AppRunnerStack extends Stack {
  // readonly serviceArn: string;

  constructor(scope: App, id: string, props: AppRunnerStackProps) {
    super(scope, id, props);

    const containerPort = this.node.tryGetContext("containerPort") as string;
    const subDomain = this.node.tryGetContext("subDomain") as string;

    const vpcConnector = new AppRunnerAlpha.VpcConnector(this, "VpcConnector", {
      vpc: props.vpc,
      vpcSubnets: props.vpc.selectSubnets({ subnetType: SubnetType.PUBLIC }),
      vpcConnectorName: "VpcConnector",
    });

    const serv = new AppRunnerAlpha.Service(this, "Service", {
      cpu: AppRunnerAlpha.Cpu.QUARTER_VCPU,
      memory: AppRunnerAlpha.Memory.HALF_GB,
      source: AppRunnerAlpha.Source.fromGitHub({
        repositoryUrl: "https://github.com/gobema/cloudresume",
        branch: "main",
        configurationSource: AppRunnerAlpha.ConfigurationSourceType.API,
        codeConfigurationValues: {
          runtime: AppRunnerAlpha.Runtime.GO_1,
          port: containerPort,
          environmentSecrets: {
            DSN: AppRunnerAlpha.Secret.fromSecretsManager(props.dbSecret),
          },
          buildCommand: "go build ./cmd/web/",
          startCommand: "./web",
        },
        connection: AppRunnerAlpha.GitHubConnection.fromConnectionArn(
          `${process.env.CONNECTION || ""}`,
        ),
      }),
      vpcConnector,
    });

    Duration.seconds(30);

    this.customDomain(subDomain, serv.serviceArn, props.hostedZone);
  }

  customDomain(subdomain: string, serviceArn: string, hostedZone: HostedZone) {
    const provider = new custom_resources.Provider(this, "Provider", {
      onEventHandler: new aws_lambda_nodejs.NodejsFunction(
        this,
        "CustomDomain",
        {
          initialPolicy: [
            new PolicyStatement({
              actions: [
                "route53:changeResourceRecordSets",
                "apprunner:AssociateCustomDomain",
                "apprunner:DescribeCustomDomains",
                "apprunner:DisassociateCustomDomain",
              ],
              resources: ["*"],
            }),
          ],
        },
      ),
    });
    new CustomResource(this, "CustomResource", {
      serviceToken: provider.serviceToken,
      properties: {
        subdomain,
        serviceArn,
        hostedZoneId: hostedZone.hostedZoneId,
      },
    });
  }
}
