import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { vpc } from "../vpc";



const config = new pulumi.Config();
const cidrBlock = config.require("igwcidrBlock");

export const loadBalancerSecurityGroup = new aws.ec2.SecurityGroup("loadbalancer-security-group", {
    description: "Security group for Load Balancer",
    vpcId: vpc.id,
    ingress: [
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
        { protocol: "tcp", fromPort: 443, toPort: 443, cidrBlocks: ["0.0.0.0/0"] },
    ],
    egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
    tags: { Name: "Csye6255-loadbalancer-security-group" },
});

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
        {
            protocol: "tcp",
            fromPort: 9000,
            toPort: 9000,   
            securityGroups: [loadBalancerSecurityGroup.id],
        }
    ],
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
    }]
},{dependsOn: loadBalancerSecurityGroup });




// // Export the security group's ID
// export const securityGroupId = appSecurityGroup.id;
