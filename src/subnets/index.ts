import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { vpc } from "../vpc";


const config = new pulumi.Config();
const publicSubnetCidrBlocks = config.requireObject<string[]>("publicSubnetCidrBlocks");
const privateSubnetCidrBlocks = config.requireObject<string[]>("privateSubnetCidrBlocks");

const availabilityZones = pulumi.output(aws.getAvailabilityZones({}).then(az => az.names));

availabilityZones.apply(az => console.log(az));

const subnetCount = availabilityZones.apply(az => az.length <= 2 ? 2 : 3);


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


// import * as pulumi from "@pulumi/pulumi";
// import * as aws from "@pulumi/aws";
// import { vpc } from "../vpc";

// // Function to generate subnet CIDR blocks based on the VPC CIDR block.
// function generateSubnetCidrs(vpcCidr: string, count: number): pulumi.Output<string[]> {
//     // Extract the base IP and subnet size from the VPC's CIDR block.
//     const [baseIp, subnetSize] = vpcCidr.split("/");
    
//     // Generate subnet CIDR blocks.
//     return pulumi.output(Array.from({ length: count }, (_, i) => 
//         `${baseIp.slice(0, baseIp.lastIndexOf(".") + 1)}${i * 16}/${subnetSize}`
//     ));
// }

// const config = new pulumi.Config();
// const desiredSubnetCount = config.getNumber("desiredSubnetCount") || 2;

// const cidrBlock = config.require("cidrBlock");

// const availabilityZones = pulumi.output(aws.getAvailabilityZones({}).then(az => az.names));


// // Generate subnet CIDR blocks based on the VPC's CIDR block.
// const publicSubnetCidrBlocks = generateSubnetCidrs(cidrBlock, desiredSubnetCount);
// const privateSubnetCidrBlocks = generateSubnetCidrs(cidrBlock, desiredSubnetCount);

// const subnetCount = availabilityZones.apply(az => Math.min(az.length, desiredSubnetCount));

// export const publicSubnets = pulumi.all([publicSubnetCidrBlocks, subnetCount, availabilityZones])
//     .apply(([cidrBlocks, count, az]) => 
//         cidrBlocks.slice(0, count).map((cidrBlock, index) => 
//             new aws.ec2.Subnet(`publicSubnet${index}`, {
//                 cidrBlock: cidrBlock,
//                 vpcId: vpc.id,
//                 availabilityZone: az[index],
//                 mapPublicIpOnLaunch: true
//             })
//         )
//     );

// export const privateSubnets = pulumi.all([privateSubnetCidrBlocks, subnetCount, availabilityZones])
//     .apply(([cidrBlocks, count, az]) => 
//         cidrBlocks.slice(0, count).map((cidrBlock, index) => 
//             new aws.ec2.Subnet(`privateSubnet${index}`, {
//                 cidrBlock: cidrBlock,
//                 vpcId: vpc.id,
//                 availabilityZone: az[index],
//                 mapPublicIpOnLaunch: false
//             })
//         )
//     );
