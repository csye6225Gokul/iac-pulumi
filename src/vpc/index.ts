import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
const cidrBlock = config.require("cidrBlock");

// Creating a VPC
export const vpc = new aws.ec2.Vpc("myVpc", {
    cidrBlock: cidrBlock
});
