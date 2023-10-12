import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
const cidrBlock = config.require("cidrBlock");


export const vpc = new aws.ec2.Vpc("csye6225-vpc", {
    cidrBlock: cidrBlock
});
