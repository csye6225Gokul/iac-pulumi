import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { vpc } from "../vpc";

const config = new pulumi.Config();
const publicSubnetCidrBlocks = config.requireObject<string[]>("publicSubnetCidrBlocks");
const privateSubnetCidrBlocks = config.requireObject<string[]>("privateSubnetCidrBlocks");

// Using pulumi.Output to handle the results of the promise
const availabilityZones = aws.getAvailabilityZones({}).then(az => az.names);

// Creating public subnets
export const publicSubnets = publicSubnetCidrBlocks.map((cidrBlock, index) => 
    new aws.ec2.Subnet(`publicSubnet${index}`, {
        cidrBlock: cidrBlock,
        vpcId: vpc.id,
        availabilityZone: pulumi.output(availabilityZones).apply(az => az[index]),
        mapPublicIpOnLaunch: true
    })
);

// Creating private subnets
export const privateSubnets = privateSubnetCidrBlocks.map((cidrBlock, index) => 
    new aws.ec2.Subnet(`privateSubnet${index}`, {
        cidrBlock: cidrBlock,
        vpcId: vpc.id,
        availabilityZone: pulumi.output(availabilityZones).apply(az => az[index]),
        mapPublicIpOnLaunch: false
    })
);
