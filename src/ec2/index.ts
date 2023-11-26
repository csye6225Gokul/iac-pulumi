import * as fs from "fs";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { vpc } from "../vpc";
import { publicSubnets } from "../subnets"; 
import { appSecurityGroup, loadBalancerSecurityGroup } from "../securityGroup";
import {dbEndpoint,dbHost,dbPort} from "../rdsdb"
import {snsTopicArn} from "../lambda"

const config = new pulumi.Config();


export const alb = new aws.lb.LoadBalancer("app-lb", {
    internal: false,
    loadBalancerType: "application",
    securityGroups: [loadBalancerSecurityGroup.id],
    subnets: publicSubnets.apply(subnets => subnets.map(subnet => subnet.id)),
    enableDeletionProtection: false,
});


// Target Group and Listener can be added here


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


const userdata = pulumi.interpolate`#!/bin/bash
# Configure environment variables for the web application
cat << 'EOF' > /opt/webapp/.env
MYSQL_HOST=${dbEndpoint.address}
MYSQL_PORT=${dbEndpoint.port}
MYSQL_DATABASE=${dbEndpoint.dbName}
MYSQL_USER=${dbEndpoint.username}
MYSQL_PASSWORD=${dbEndpoint.password}
SNS_TOPIC=${snsTopicArn}
EOF
echo "CloudWatch config file exists. Starting CloudWatch Agent..."

# Start the CloudWatch Agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a start

sudo chown csye6225:csye6225 -R /opt/webapp

`

const launchTemplate = new aws.ec2.LaunchTemplate("myLaunchTemplate", {
    name: "my-launch-template",
    imageId:amiId,
    description: "My Launch Template",
    blockDeviceMappings: [{
        deviceName: "/dev/xvda",
        ebs: {
            volumeSize: 25,
            volumeType: "gp2",
            deleteOnTermination: 'true',
        },
    }],
    instanceType: "t2.micro",
    keyName: keyPairName,
    networkInterfaces: [{
        deviceIndex: 0,
        associatePublicIpAddress:  'true',
        securityGroups: [appSecurityGroup.id],
        subnetId: publicSubnets[0].id,
    }],
    tagSpecifications: [{
        resourceType: "instance",
        tags: {
            Name: "Csye6255-gokul",
        },
    }],
    userData:  pulumi.interpolate`${userdata.apply((s) =>
        Buffer.from(s).toString("base64")
      )}`,
    iamInstanceProfile: {
        name: instanceProfile.name,
    },
    disableApiTermination:false
},{dependsOn: [keyPair,dbEndpoint]});





// const ec2Instance = new aws.ec2.Instance("myInstance", {
//     ami: amiId,
//     instanceType: "t2.micro",
//     keyName: keyPairName,
//     disableApiTermination: false, 
//     vpcSecurityGroupIds: [appSecurityGroup.id],
//     iamInstanceProfile: instanceProfile.name,
//     rootBlockDevice: {
//         volumeSize: 25,  // 25 GiB
//         volumeType: "gp2",  // General Purpose SSD (GP2)
//         deleteOnTermination: true,
//     },
//     subnetId: publicSubnets[0].id,
//     userData: pulumi.interpolate`#!/bin/bash
//     # Configure environment variables for the web application
//     cat << 'EOF' > /opt/webapp/.env
//     MYSQL_HOST=${dbEndpoint.address}
//     MYSQL_PORT=${dbEndpoint.port}
//     MYSQL_DATABASE=${dbEndpoint.dbName}
//     MYSQL_USER=${dbEndpoint.username}
//     MYSQL_PASSWORD=${dbEndpoint.password}
//     EOF
//     echo "CloudWatch config file exists. Starting CloudWatch Agent..."

//     # Start the CloudWatch Agent
//     sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s
//     sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a start

//     sudo chown csye6225:csye6225 -R /opt/webapp

//     `,
    
//     tags: {
//         Name: "Csye6255-gokul",
//     },
// }, { dependsOn: [keyPair,dbEndpoint] }); // Ensure the key pair is created before the EC2 instance.



const targetGroup = new aws.alb.TargetGroup("targetGroup",{
    port:9000,
    protocol:'HTTP',
    vpcId:vpc.id,
    targetType:'instance',
    healthCheck:{
      enabled:true,
      path:'/healthz',
      protocol:'HTTP',
      port:'9000',
      timeout:25
  
    }
  })

  const listener = new aws.alb.Listener("listener",{
    loadBalancerArn:alb.arn,
    port:80,
    defaultActions:[{
      type:'forward',
      targetGroupArn:targetGroup.arn
    }]
  })



  // Create an Auto Scaling group
const autoScalingGroup = new aws.autoscaling.Group("myAutoScalingGroup", {
    launchTemplate: {
        id: launchTemplate.id,
        version: "$Latest", // Use the latest version of the launch template
    },
    minSize: 1,
    maxSize: 3,
    desiredCapacity: 1,
    targetGroupArns:[targetGroup.arn],
    vpcZoneIdentifiers: [publicSubnets[0].id,publicSubnets[1].id,publicSubnets[2].id], // Subnet IDs where instances will be launched // Get availability zones
    tags: [{
        key: "Name",
        value: "Csye6255-gokul",
        propagateAtLaunch: true,
    }],
    // Add your other properties like cooldown, health check, etc. here
});

// Define scaling policies
const scaleUpPolicy = new aws.autoscaling.Policy("scaleUpPolicy", {
    autoscalingGroupName: autoScalingGroup.name,
    adjustmentType: "ChangeInCapacity",
    policyType: "SimpleScaling",
    scalingAdjustment: 1, // Increment by 1
    cooldown: 60,
});

const scaleDownPolicy = new aws.autoscaling.Policy("scaleDownPolicy", {
    autoscalingGroupName: autoScalingGroup.name,
    adjustmentType: "ChangeInCapacity",
    policyType: "SimpleScaling",
    scalingAdjustment: -1, // Decrement by 1
    cooldown: 120,
});

// CloudWatch Alarm for Scale Up
const scaleUpAlarm = new aws.cloudwatch.MetricAlarm("scaleUpAlarm", {
    comparisonOperator: "GreaterThanOrEqualToThreshold",
    evaluationPeriods: 1,
    metricName: "CPUUtilization",
    namespace: "AWS/EC2",
    period: 60,
    statistic: "Average",
    threshold: 5, // Adjust as needed
    alarmActions: [scaleUpPolicy.arn],
    dimensions: {
        AutoScalingGroupName: autoScalingGroup.name,
    },
});

// CloudWatch Alarm for Scale Down
const scaleDownAlarm = new aws.cloudwatch.MetricAlarm("scaleDownAlarm", {
    comparisonOperator: "LessThanOrEqualToThreshold",
    evaluationPeriods: 1,
    metricName: "CPUUtilization",
    namespace: "AWS/EC2",
    period: 60,
    statistic: "Average",
    threshold: 3, // Adjust as needed
    alarmActions: [scaleDownPolicy.arn],
    dimensions: {
        AutoScalingGroupName: autoScalingGroup.name,
    },
});


// // Attach scaling policies to the Auto Scaling group
// new aws.autoscaling.GroupPolicyAttachment("scaleUpAttachment", {
//     policyArn: scaleUpPolicy.arn,
//     autoscalingGroupName: autoScalingGroup.name,
// });

// new aws.autoscaling.GroupPolicyAttachment("scaleDownAttachment", {
//     policyArn: scaleDownPolicy.arn,
//     autoscalingGroupName: autoScalingGroup.name,
// });



// export const publicIp = ec2Instance.publicIp;
// export const publicDns = ec2Instance.publicDns;