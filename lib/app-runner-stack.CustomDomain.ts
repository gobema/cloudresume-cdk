import { AppRunner, Route53 } from "aws-sdk";

const apprunner = new AppRunner();
const route53 = new Route53({ region: "us-east-1" });
const certRecordType: string = "CNAME";
const certRecordTTL: number = 300;
const changeAction: string = "UPSERT";

const addCustomDomain = (subdomain: string, serviceArn: string) =>
  apprunner
    .associateCustomDomain({
      DomainName: subdomain,
      ServiceArn: serviceArn,
      EnableWWWSubdomain: false,
    })
    .promise();

const removeCustomDomain = (subdomain: string, serviceArn: string) =>
  apprunner
    .disassociateCustomDomain({
      DomainName: subdomain,
      ServiceArn: serviceArn,
    })
    .promise();

const describeCustomDomain = (serviceArn: string) =>
  apprunner
    .describeCustomDomains({
      ServiceArn: serviceArn,
    })
    .promise();

const updateRecord = (hostedZoneId: string, name: string, value: string) =>
  route53
    .changeResourceRecordSets({
      HostedZoneId: hostedZoneId,
      ChangeBatch: {
        Changes: [
          {
            Action: changeAction,
            ResourceRecordSet: {
              Name: name,
              Type: certRecordType,
              TTL: certRecordTTL,
              ResourceRecords: [{ Value: value }],
            },
          },
        ],
      },
    })
    .promise();

export async function handler(event: any): Promise<any> {
  const { hostedZoneId, subdomain, serviceArn } = event.ResourceProperties;

  if (event.RequestType === "Delete") {
    await removeCustomDomain(subdomain, serviceArn);
    return;
  }

  const domain = await addCustomDomain(subdomain, serviceArn);
  await updateRecord(hostedZoneId, subdomain, domain.DNSTarget);

  const record = await describeCustomDomain(serviceArn);
  const validationRecords =
    record.CustomDomains?.find(Boolean)?.CertificateValidationRecords;

  validationRecords?.forEach(function (record) {
    updateRecord(hostedZoneId, record.Name as string, record.Value as string);
  });
}
