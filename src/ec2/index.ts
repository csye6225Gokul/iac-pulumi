import * as fs from "fs";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { vpc } from "../vpc";
import { publicSubnets } from "../subnets"; 
import { appSecurityGroup } from "../securityGroup";
import {dbEndpoint,dbHost,dbPort} from "../rdsdb"

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

// const dbHost = dbEndpoint.endpoint.apply(endpoint => endpoint.split(':')[0]);
// const dbPort = dbEndpoint.endpoint.apply(endpoint => endpoint.split(':')[1]);\\\

// Create an IAM Role for the EC2 instance
const role = new aws.iam.Role("instance-log-role", {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
                Service: "ec2.amazonaws.com",
            },
        }],
    }),
});

// Attach the AWS managed policy for CloudWatchAgentServer to the role
const policyAttachment = new aws.iam.RolePolicyAttachment("my-cloudwatch-policy-attachment", {
    role: role.name,
    policyArn: "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy",
});


// Create an Instance Profile to associate the role with EC2 instances
const instanceProfile = new aws.iam.InstanceProfile("my-instance-profile", {
    role: role.name,
});


const userDataInputs = pulumi.all([dbHost, dbPort]);

const ec2UserData = userDataInputs.apply(([host, port]) => {
    return`#!/bin/bash
    sudo echo "MYSQL_USER='csye6225'" | sudo tee -a /home/admin/webapp/.env
    sudo echo "MYSQL_PASSWORD='msdIndu99'" | sudo tee -a /home/admin/webapp/.env
    sudo echo "MYSQL_HOST='${host}'" | sudo tee /home/admin/webapp/.env
    sudo echo "MYSQL_PORT='${port}'" | sudo tee /home/admin/webapp/.env
    sudo echo "MYSQL_DATABASE='csye6225'" | sudo tee -a /home/admin/webapp/.env
    
    # Give csye6225 user permissions to read files
    chmod +r /home/admin/webapp/*
    
    # Enable and start the service
    cd /etc/systemd/system
    cloud-init status --wait
    sudo systemctl enable csye6225.service
    sudo systemctl start csye6225.service
    echo "Script stop..."
`});






const ec2Instance = new aws.ec2.Instance("myInstance", {
    ami: amiId,
    instanceType: "t2.micro",
    keyName: keyPairName,
    disableApiTermination: false, 
    vpcSecurityGroupIds: [appSecurityGroup.id],
    iamInstanceProfile: instanceProfile.name,
    rootBlockDevice: {
        volumeSize: 25,  // 25 GiB
        volumeType: "gp2",  // General Purpose SSD (GP2)
        deleteOnTermination: true,
    },
    subnetId: publicSubnets[0].id,
    userData: pulumi.interpolate`#!/bin/bash
    # Configure environment variables for the web application
    cat << 'EOF' > /opt/webapp/.env
    MYSQL_HOST=${dbEndpoint.address}
    MYSQL_PORT=${dbEndpoint.port}
    MYSQL_DATABASE=${dbEndpoint.dbName}
    MYSQL_USER=${dbEndpoint.username}
    MYSQL_PASSWORD=${dbEndpoint.password}
    EOF
    if [ -f /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-config.json ]; then
    echo "CloudWatch config file exists. Starting CloudWatch Agent..."
    # Start the CloudWatch Agent
    /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-config.json -s
    else
    echo "CloudWatch config file does not exist. Exiting..."
    exit 1
    fi
    `,
    
    tags: {
        Name: "Csye6255-gokul",
    },
}, { dependsOn: [keyPair,dbEndpoint] }); // Ensure the key pair is created before the EC2 instance.

export const publicIp = ec2Instance.publicIp;
export const publicDns = ec2Instance.publicDns;
