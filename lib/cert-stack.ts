import { App, Stack, StackProps } from "aws-cdk-lib";
import {
  Certificate,
  CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";
import { HostedZone } from "aws-cdk-lib/aws-route53";

export interface CertStackProps extends StackProps {
  hostedZone: HostedZone;
}

export class CertStack extends Stack {
  readonly cert: Certificate;

  constructor(scope: App, id: string, props: CertStackProps) {
    super(scope, id, props);

    const rootDomain = this.node.tryGetContext("rootDomain") as string;

    this.cert = new Certificate(this, "Cert", {
      domainName: rootDomain,
      subjectAlternativeNames: ["*." + rootDomain],
      validation: CertificateValidation.fromDns(props.hostedZone),
    });
  }
}
