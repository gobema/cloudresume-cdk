import { App, Stack, StackProps } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import {
  ContainerImage,
  Cluster,
  Secret as ecsSecret,
} from "aws-cdk-lib/aws-ecs";
import {
  ApplicationLoadBalancedFargateService,
  ApplicationLoadBalancedServiceRecordType,
} from "aws-cdk-lib/aws-ecs-patterns";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

export interface ECSStackProps extends StackProps {
  vpc: Vpc;
  dbSecretArn: string;
  cert: Certificate;
  hostedZone: HostedZone;
}

export class ECSStack extends Stack {
  constructor(scope: App, id: string, props: ECSStackProps) {
    super(scope, id, props);

    const containerPort = this.node.tryGetContext("containerPort") as number;
    const containerImage = this.node.tryGetContext("containerImage") as string;
    const creds = Secret.fromSecretCompleteArn(
      this,
      "dbCreds",
      props.dbSecretArn,
    );
    const subDomain = this.node.tryGetContext("subDomain") as string;

    const cluster = new Cluster(this, "Cluster", {
      vpc: props.vpc,
      clusterName: "fargateCluster",
    });

    const fargateService = new ApplicationLoadBalancedFargateService(
      this,
      "fargateService",
      {
        cluster,
        domainName: subDomain,
        domainZone: props.hostedZone,
        recordType: ApplicationLoadBalancedServiceRecordType.ALIAS,
        desiredCount: 2,
        taskImageOptions: {
          image: ContainerImage.fromRegistry(
            containerImage + `${process.env.RELEASE || "latest"}`,
          ),
          containerPort: containerPort,
          enableLogging: true,
          secrets: {
            DSN: ecsSecret.fromSecretsManager(creds),
          },
        },
        publicLoadBalancer: true,
        assignPublicIp: true,
        serviceName: "fargateService",
        certificate: props.cert,
      },
    );

    fargateService.targetGroup.configureHealthCheck({ path: "/ping" });
  }
}
