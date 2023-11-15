import { App, Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  Port,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import {
  Credentials,
  DatabaseInstance,
  DatabaseInstanceEngine,
  DatabaseSecret,
  MariaDbEngineVersion,
  ParameterGroup,
  StorageType,
} from "aws-cdk-lib/aws-rds";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";

export interface RDSStackProps extends StackProps {
  vpc: Vpc;
}

export class RDSStack extends Stack {
  readonly dbSecret: DatabaseSecret;

  constructor(scope: App, id: string, props: RDSStackProps) {
    super(scope, id, props);

    const dbName = this.node.tryGetContext("dbName") as string;
    const dbPort = (this.node.tryGetContext("dbPort") as number) || 3306;
    const dbUser = this.node.tryGetContext("dbUser") as string;

    this.dbSecret = new Secret(this, "dbCredentialsSecret", {
      secretName: "test/snippetbox/mariadb",
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
      engine: DatabaseInstanceEngine.mariaDb({
        version: MariaDbEngineVersion.VER_10_6_14,
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

    const mariadbRDS = new DatabaseInstance(this, "db-instance", {
      engine: DatabaseInstanceEngine.mariaDb({
        version: MariaDbEngineVersion.VER_10_6_14,
      }),
      parameterGroup: parameterGroup,
      vpc: props.vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
      credentials: Credentials.fromSecret(this.dbSecret, dbUser),
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO),
      multiAz: false,
      storageType: StorageType.GP3,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: Duration.days(0),
      deleteAutomatedBackups: true,
      removalPolicy: RemovalPolicy.DESTROY,
      deletionProtection: false,
      databaseName: dbName,
      publiclyAccessible: false,
    });

    mariadbRDS.connections.allowFromAnyIpv4(Port.tcp(dbPort));
  }
}
