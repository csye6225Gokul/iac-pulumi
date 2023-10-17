import * as fs from "fs";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { vpc } from "../vpc";
import { publicSubnets } from "../subnets"; 
import { appSecurityGroup } from "../securityGroup";

const config = new pulumi.Config();

let amiId: string;
try {
    amiId = config.require("amiId");
} catch (error) {
    pulumi.log.error("AMI ID not set in Pulumi config.");
    throw error;
}

let rawKeyContent: string;
try {
    rawKeyContent = fs.readFileSync("/Users/gokuljayavel/.ssh/myawskey.pub", 'utf8').trim();
} catch (error) {
    pulumi.log.error("Error reading the public key file.");
    throw error;
}

const keyParts = rawKeyContent.split(" ");
const publicKeyContent = keyParts.length > 1 ? `${keyParts[0]} ${keyParts[1]}` : rawKeyContent;

const keyPair = new aws.ec2.KeyPair("mykeypair", {
    publicKey: publicKeyContent,
}, { dependsOn: [vpc, appSecurityGroup] }); // Ensure dependencies are created before the key pair.


const keyPairName = keyPair.id.apply(id => id);

const ec2Instance = new aws.ec2.Instance("myInstance", {
    ami: amiId,
    instanceType: "t2.micro",
    keyName: keyPairName,
    disableApiTermination: false, 
    vpcSecurityGroupIds: [appSecurityGroup.id],
    rootBlockDevice: {
        volumeSize: 25,  // 25 GiB
        volumeType: "gp2",  // General Purpose SSD (GP2)
        deleteOnTermination: true,
    },
    subnetId: publicSubnets[0].id,
    tags: {
        Name: "Csye6255-gokul",
    },
}, { dependsOn: [keyPair] }); // Ensure the key pair is created before the EC2 instance.

export const publicIp = ec2Instance.publicIp;
export const publicDns = ec2Instance.publicDns;
