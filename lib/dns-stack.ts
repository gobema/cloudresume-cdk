import {
  App,
  aws_lambda_nodejs,
  custom_resources,
  CustomResource,
  Fn,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";

export class DnsStack extends Stack {
  readonly hostedZone: HostedZone;

  constructor(scope: App, id: string, props: StackProps) {
    super(scope, id, props);

    const rootDomain = this.node.tryGetContext("rootDomain") as string;

    this.hostedZone = new HostedZone(this, "HostedZone", {
      zoneName: rootDomain,
    });

    this.updateRegDomain(rootDomain, this.hostedZone);
  }

  /** A Custom Resource to update the Domain registrar with Hosted Zone name servers */
  updateRegDomain(domain: string, hostedZone: HostedZone) {
    const provider = new custom_resources.Provider(this, "Provider", {
      onEventHandler: new aws_lambda_nodejs.NodejsFunction(
        this,
        "UpdateRegDomain",
        {
          initialPolicy: [
            new PolicyStatement({
              actions: ["route53domains:UpdateDomainNameservers"],
              resources: ["*"],
            }),
          ],
        },
      ),
    });
    new CustomResource(this, "CustomResource", {
      serviceToken: provider.serviceToken,
      properties: {
        domain,
        nameServers: Fn.join(",", hostedZone.hostedZoneNameServers!),
      },
    });
  }
}
