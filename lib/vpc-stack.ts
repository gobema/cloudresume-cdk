import { Construct } from "constructs";
import { Stack, StackProps } from "aws-cdk-lib";
import { IpAddresses, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";

export interface VpcProps extends StackProps {
  maxAzs: number;
}

export class VPCStack extends Stack {
  readonly vpc: Vpc;

  constructor(scope: Construct, id: string, props: VpcProps) {
    super(scope, id, props);

    if (props.maxAzs !== undefined && props.maxAzs <= 1) {
      throw new Error("maxAzs must be at least 2.");
    }

    this.vpc = new Vpc(this, "appRunnerVPC", {
      ipAddresses: IpAddresses.cidr("10.0.0.0/16"),
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "private",
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });
  }
}
