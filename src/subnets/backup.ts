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