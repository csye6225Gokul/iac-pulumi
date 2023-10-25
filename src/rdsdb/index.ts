import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { vpc } from "../vpc";
import { appSecurityGroup } from "../securityGroup";
import { privateSubnets } from "../subnets"; 

const config = new pulumi.Config();

// Database Security Group for RDS
export const dbSecurityGroup = new aws.ec2.SecurityGroup("database-security-group", {
    description: "Database security group for RDS",
    vpcId: vpc.id,
    ingress: [{
        protocol: "tcp",
        fromPort: 3306, // Use 5432 for PostgreSQL.
        toPort: 3306,   // Use 5432 for PostgreSQL.
        securityGroups: [appSecurityGroup.id],
    }],
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
    }],
},{ dependsOn: [appSecurityGroup] });



const subnetIds = privateSubnets.apply(subnets => subnets.map(subnet => subnet.id));

const dbSubnetGroup = new aws.rds.SubnetGroup("my-db-subnet-group", {
    subnetIds: subnetIds,
    tags: {
        Name: "My DB Subnet Group",
    },
});

// RDS Parameter Group
const dbParameterGroup = new aws.rds.ParameterGroup("db-parameter-group", {
    family: "mysql8.0", // Adjust this according to your MySQL version.
    description: "Database parameter group",
    // Add specific parameters if needed.
});


// RDS Instance
const dbInstance = new aws.rds.Instance("db-instance", {
    engine: "mysql",  // Change to "mariadb" or "postgres" as needed.
    instanceClass: "db.t3.micro",
    allocatedStorage: 20, // Adjust as needed.
    multiAz: false,
    identifier: "csye6225",
    dbName: "csye6225",
    username: "csye6225",
    password: "msdIndu99",
    parameterGroupName: dbParameterGroup.name,
    skipFinalSnapshot: true,
    vpcSecurityGroupIds: [dbSecurityGroup.id],
    dbSubnetGroupName: dbSubnetGroup.name,
    publiclyAccessible: false,
});

// Pass DB configuration to EC2 as User Data


// Export the database endpoint
export const dbEndpoint = dbInstance;
export const dbHost = dbInstance.endpoint.apply(endpoint => endpoint.split(':')[0]);
export const dbPort = dbInstance.endpoint.apply(endpoint => endpoint.split(':')[1]);
