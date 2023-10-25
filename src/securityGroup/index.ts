import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { vpc } from "../vpc";



const config = new pulumi.Config();
const cidrBlock = config.require("igwcidrBlock");
// Create a new security group
export const appSecurityGroup = new aws.ec2.SecurityGroup("application-security-group", {
    description: "Enable access to application",
    tags: {
        Name: "Csye6255-gokul-security group",
    },
    vpcId: vpc.id,
    ingress: [
        // SSH access
        {
            protocol: "tcp",
            fromPort: 22,
            toPort: 22,
            cidrBlocks: [cidrBlock]

        },
        // HTTP access
        {
            protocol: "tcp",
            fromPort: 80,
            toPort: 80,
            cidrBlocks: [cidrBlock]

        },
        // HTTPS access
        {
            protocol: "tcp",
            fromPort: 443,
            toPort: 443,
            cidrBlocks: [cidrBlock]
        },
        // Application access (assume it's running on port 5000)
        {
            protocol: "tcp",
            fromPort: 9000,
            toPort: 9000,
            cidrBlocks: [cidrBlock]
        }
    ],
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
    }]
});

// // Export the security group's ID
// export const securityGroupId = appSecurityGroup.id;
