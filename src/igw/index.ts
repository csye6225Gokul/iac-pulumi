import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { vpc } from "../vpc";

// Creating an Internet Gateway
export const internetGateway = new aws.ec2.InternetGateway("myInternetGateway", {
    vpcId: vpc.id
});
