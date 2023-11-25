import { App, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Port, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import {
  AuroraCapacityUnit,
  AuroraMysqlEngineVersion,
  Credentials,
  DatabaseClusterEngine,
  DatabaseSecret,
  ParameterGroup,
  ServerlessCluster,
} from "aws-cdk-lib/aws-rds";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";

export interface RdsServerlessStackProps extends StackProps {
  vpc: Vpc;
}

export class RdsServerlessStack extends Stack {
  readonly dbSecret: DatabaseSecret;

  constructor(scope: App, id: string, props: RdsServerlessStackProps) {
    super(scope, id, props);

    const dbName = this.node.tryGetContext("dbName") as string;
    const dbPort = (this.node.tryGetContext("dbPort") as number) || 3306;
    const dbUser = this.node.tryGetContext("dbUser") as string;

    this.dbSecret = new Secret(this, "dbCredentialsSecret", {
      secretName: "snippetbox/aurora",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: dbUser,
        }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: "password",
      },
    });

    const parameterGroup = new ParameterGroup(this, "ParameterGroup", {
      engine: DatabaseClusterEngine.auroraMysql({
        version: AuroraMysqlEngineVersion.VER_2_11_3,
      }),
      parameters: {
        character_set_client: "utf8mb4",
        character_set_connection: "utf8mb4",
        character_set_database: "utf8mb4",
        character_set_results: "utf8mb4",
        character_set_server: "utf8mb4",
        collation_connection: "utf8mb4_unicode_ci",
        collation_server: "utf8mb4_unicode_ci",
      },
    });

    const mysqlRdsServerless = new ServerlessCluster(
      this,
      "mysqlRdsServerless",
      {
        engine: DatabaseClusterEngine.auroraMysql({
          version: AuroraMysqlEngineVersion.VER_2_11_3,
        }),
        parameterGroup: parameterGroup,
        vpc: props.vpc,
        vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
        credentials: Credentials.fromSecret(this.dbSecret, dbUser),
        scaling: {
          minCapacity: AuroraCapacityUnit.ACU_1,
          maxCapacity: AuroraCapacityUnit.ACU_1,
        },
        defaultDatabaseName: dbName,
        deletionProtection: false,
        removalPolicy: RemovalPolicy.DESTROY,
      },
    );

    mysqlRdsServerless.connections.allowFromAnyIpv4(Port.tcp(dbPort));
  }
}
