// import * as pulumi from "@pulumi/pulumi";
// import * as aws from "@pulumi/aws";
// import { vpc } from "../vpc";

// const config = new pulumi.Config();
// const publicSubnetCidrBlocks = config.requireObject<string[]>("publicSubnetCidrBlocks");
// const privateSubnetCidrBlocks = config.requireObject<string[]>("privateSubnetCidrBlocks");

// // Using pulumi.Output to handle the results of the promise
// const availabilityZones = aws.getAvailabilityZones({}).then(az => az.names);

// console.log(availabilityZones);

// // Creating public subnets
// export const publicSubnets = publicSubnetCidrBlocks.map((cidrBlock, index) => 
//     new aws.ec2.Subnet(`publicSubnet${index}`, {
//         cidrBlock: cidrBlock,
//         vpcId: vpc.id,
//         availabilityZone: pulumi.output(availabilityZones).apply(az => az[index]),
//         mapPublicIpOnLaunch: true
//     })
// );

// // Creating private subnets
// export const privateSubnets = privateSubnetCidrBlocks.map((cidrBlock, index) => 
//     new aws.ec2.Subnet(`privateSubnet${index}`, {
//         cidrBlock: cidrBlock,
//         vpcId: vpc.id,
//         availabilityZone: pulumi.output(availabilityZones).apply(az => az[index]),
//         mapPublicIpOnLaunch: false
//     })
// );


import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { vpc } from "../vpc";

const config = new pulumi.Config();
const publicSubnetCidrBlocks = config.requireObject<string[]>("publicSubnetCidrBlocks");
const privateSubnetCidrBlocks = config.requireObject<string[]>("privateSubnetCidrBlocks");

// Properly handling Pulumi Output for availability zones
const availabilityZones = pulumi.output(aws.getAvailabilityZones({}).then(az => az.names));

availabilityZones.apply(az => console.log(az));

// Determine number of subnets to create based on availability zones
const subnetCount = availabilityZones.apply(az => az.length <= 2 ? 2 : 3);

// Creating public subnets
export const publicSubnets = pulumi.all([publicSubnetCidrBlocks, subnetCount, availabilityZones])
    .apply(([cidrBlocks, count, az]) => 
        cidrBlocks.slice(0, count).map((cidrBlock, index) => 
            new aws.ec2.Subnet(`publicSubnet${index}`, {
                cidrBlock: cidrBlock,
                vpcId: vpc.id,
                availabilityZone: az[index],
                mapPublicIpOnLaunch: true
            })
        )
    );

// Creating private subnets
export const privateSubnets = pulumi.all([privateSubnetCidrBlocks, subnetCount, availabilityZones])
    .apply(([cidrBlocks, count, az]) => 
        cidrBlocks.slice(0, count).map((cidrBlock, index) => 
            new aws.ec2.Subnet(`privateSubnet${index}`, {
                cidrBlock: cidrBlock,
                vpcId: vpc.id,
                availabilityZone: az[index],
                mapPublicIpOnLaunch: false
            })
        )
    );
