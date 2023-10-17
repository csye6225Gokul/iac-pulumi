import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { vpc } from "../vpc";


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
            cidrBlocks: ["0.0.0.0/0"]
        },
        // HTTP access
        {
            protocol: "tcp",
            fromPort: 80,
            toPort: 80,
            cidrBlocks: ["0.0.0.0/0"]
        },
        // HTTPS access
        {
            protocol: "tcp",
            fromPort: 443,
            toPort: 443,
            cidrBlocks: ["0.0.0.0/0"]
        },
        // Application access (assume it's running on port 5000)
        {
            protocol: "tcp",
            fromPort: 9000,
            toPort: 9000,
            cidrBlocks: ["0.0.0.0/0"]
        }
    ]
});

// // Export the security group's ID
// export const securityGroupId = appSecurityGroup.id;
