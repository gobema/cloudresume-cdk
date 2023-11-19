import { Route53 } from "aws-sdk";

const route53 = new Route53({ region: "us-east-1" });
const certRecordType: string = "CNAME";
const certRecordTTL: number = 300;
const changeAction: string = "DELETE";

/**
 * AWS Certificate Manager creates a CNAME resource record set for certificate validation through DNS.
 * Currently, ACM cannot delete this record, which blocks the deletion of the stack's hosted zone:
 * https://github.com/aws-cloudformation/cloudformation-coverage-roadmap/issues/837.
 * This function deletes the CNAME record created by ACM.
 */
const deleteCertificateRecord = (
  hostedZoneId: string,
  name: string,
  value: string,
) =>
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

const listResourceRecordSets = (hostedZoneId: string) =>
  route53.listResourceRecordSets({ HostedZoneId: hostedZoneId }).promise();

export async function handler(event: any): Promise<any> {
  const { hostedZoneId } = event.ResourceProperties;

  if (event.RequestType !== "Delete") {
    return;
  }

  const recordSetsList = await listResourceRecordSets(hostedZoneId);

  if (recordSetsList.ResourceRecordSets.length < 3) {
    return;
  }

  const certRecord = recordSetsList.ResourceRecordSets.find(
    (r) => r.Type === certRecordType,
  );
  const certRecordName = certRecord?.Name as string;
  const value = certRecord?.ResourceRecords?.find(Boolean)?.Value as string;

  await deleteCertificateRecord(hostedZoneId, certRecordName, value);
}
