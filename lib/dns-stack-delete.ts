import {
  App,
  aws_lambda_nodejs,
  custom_resources,
  CustomResource,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";

export interface DnsStackDeleteProps extends StackProps {
  hostedZone: HostedZone;
}

export class DnsStackDelete extends Stack {
  constructor(scope: App, id: string, props: DnsStackDeleteProps) {
    super(scope, id, props);

    const rootDomain = this.node.tryGetContext("rootDomain") as string;

    this.deleteRecord(rootDomain, props.hostedZone);
  }

  deleteRecord(domain: string, hostedZone: HostedZone) {
    const provider = new custom_resources.Provider(this, "Provider", {
      onEventHandler: new aws_lambda_nodejs.NodejsFunction(
        this,
        "DeleteRecord",
        {
          initialPolicy: [
            new PolicyStatement({
              actions: [
                "route53:changeResourceRecordSets",
                "route53:listResourceRecordSets",
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
        hostedZoneId: hostedZone.hostedZoneId,
      },
    });
  }
}
