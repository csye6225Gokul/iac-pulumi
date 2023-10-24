import * as fs from "fs";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { vpc } from "../vpc";
import { publicSubnets } from "../subnets"; 
import { appSecurityGroup } from "../securityGroup";
import {dbEndpoint} from "../rdsdb"

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

// const [host, port] = dbEndpoint.split(':');

const dbHost = dbEndpoint.apply(endpoint => endpoint.split(':')[0]);
const dbPort = dbEndpoint.apply(endpoint => endpoint.split(':')[1]);

const ec2UserData =  `#!/bin/bash
    cloud-init status --wait

    echo "Starting custom userData script after cloud-init at $(date)" >> /var/log/userdata_execution.log


    sudo echo "MYSQL_HOST='${dbHost}'" | sudo tee /home/admin/webapp/.env
    sudo echo "MYSQL_PORT='${dbPort}'" | sudo tee /home/admin/webapp/.env
    sudo echo "MYSQL_USER='csye6225'" | sudo tee -a /home/admin/webapp/.env
    sudo echo "MYSQL_PASSWORD='msdIndu99'" | sudo tee -a /home/admin/webapp/.env
    sudo echo "MYSQL_DATABASE='csye6225'" | sudo tee -a /home/admin/webapp/.env
    
    # Give csye6225 user permissions to read files
    chmod +r /home/admin/webapp/*
    
    # Enable and start the service
    cd /etc/systemd/system
    systemctl enable csye6225.service
    systemctl start csye6225.service
    echo "Script stop..."
    `;


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
    userData: ec2UserData, 
    tags: {
        Name: "Csye6255-gokul",
    },
}, { dependsOn: [keyPair] }); // Ensure the key pair is created before the EC2 instance.

export const publicIp = ec2Instance.publicIp;
export const publicDns = ec2Instance.publicDns;
