import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { vpc } from "../vpc";


const config = new pulumi.Config();
// const publicSubnetCidrBlocks = config.requireObject<string[]>("publicSubnetCidrBlocks");
// const privateSubnetCidrBlocks = config.requireObject<string[]>("privateSubnetCidrBlocks");
const baseCidrBlock = config.require("cidrBlock");


const availabilityZones = pulumi.output(aws.getAvailabilityZones({}).then(az => az.names));

availabilityZones.apply(az => console.log(az));

const subnetCount = availabilityZones.apply(az => az.length <= 2 ? 2 : 3);


// Function to calculate the new subnet mask
function calculateNewSubnetMask(vpcMask: number, numSubnets: number): number {
    const bitsNeeded = Math.ceil(Math.log2(numSubnets));
    const newSubnetMask = vpcMask + bitsNeeded;
    return newSubnetMask;
}

function ipToInt(ip: string): number {
    const octets = ip.split('.').map(Number);
    return (octets[0] << 24) + (octets[1] << 16) + (octets[2] << 8) + octets[3];
}

function intToIp(int: number): string {
    return [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join('.');
}

function generateSubnetCidrBlocks(baseCidrBlock: string, numSubnets: number): string[] {
    const [baseIp, vpcMask] = baseCidrBlock.split('/');
    console.log(numSubnets)
    const newSubnetMask = calculateNewSubnetMask(Number(vpcMask), numSubnets);
    const subnetSize = Math.pow(2, 32 - newSubnetMask);
    const subnetCidrBlocks: string[]  = [];
 
    for (let i = 0; i < numSubnets; i++) {
        const subnetIpInt = ipToInt(baseIp) + i * subnetSize;
        const subnetIp = intToIp(subnetIpInt);
        subnetCidrBlocks.push(`${subnetIp}/${newSubnetMask}`);
    }
    return subnetCidrBlocks;
}



const subnetCidrBlocks = pulumi.all([baseCidrBlock, subnetCount]).apply(([resolvedBaseCidrBlock, resolvedSubnetCount]) => {
    return generateSubnetCidrBlocks(resolvedBaseCidrBlock, resolvedSubnetCount * 2
        );
});


subnetCidrBlocks.apply(az => console.log(az))

export const publicSubnets = pulumi.all([subnetCidrBlocks, subnetCount, availabilityZones])
    .apply(([cidrBlocks, count, az]) => 
        // Slice the array from the start to the half for public subnets.
        cidrBlocks.slice(0, cidrBlocks.length / 2).map((cidrBlock, index) => 
            new aws.ec2.Subnet(`publicSubnet${index}`, {
                cidrBlock: cidrBlock,
                vpcId: vpc.id,
                availabilityZone: az[index],
                tags: {
                    Name: "Csye6255-gokul-publicsubnet",
                },

                mapPublicIpOnLaunch: true
            })
        )
    );

export const privateSubnets = pulumi.all([subnetCidrBlocks, subnetCount, availabilityZones])
    .apply(([cidrBlocks, count, az]) => 
        // Slice the array from the half to the end for private subnets.
        cidrBlocks.slice(cidrBlocks.length / 2).map((cidrBlock, index) => 
            new aws.ec2.Subnet(`privateSubnet${index}`, {
                cidrBlock: cidrBlock,
                vpcId: vpc.id,
                tags: {
                    Name: "Csye6255-gokul-privatesubnet",
                },
                availabilityZone: az[index],  // Adjust index for AZ
                mapPublicIpOnLaunch: false
            })
        )
    );


//  export   const publicSubnets = availabilityZones.apply(azs =>
//         azs.map((az, index) => {
//             const subnet = new aws.ec2.Subnet(`public-subnet-${az}`, {
//                 vpcId: vpc.id,
//                 cidrBlock: subnetCidrBlocks[index],
//                 availabilityZone: az,
//                 mapPublicIpOnLaunch: true,
//             });
//             return subnet;
//         })
//     );
    
//    export  const privateSubnets = availabilityZones.apply(azs =>
//         azs.map((az, index) => {
//             const subnet = new aws.ec2.Subnet(`private-subnet-${az}`, {
//                 vpcId: vpc.id,
//                 cidrBlock: subnetCidrBlocks[index + 3],  // Offset by 3 to use different CIDR blocks for private subnets
//                 availabilityZone: az,
//             });
//             return subnet;
//         })
//     );
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
