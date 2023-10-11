import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { vpc } from "../vpc";
import { publicSubnets, privateSubnets } from "../subnets";
import { internetGateway } from "../igw";

// Creating a public route table
export const publicRouteTable = new aws.ec2.RouteTable("publicRouteTable", {
    vpcId: vpc.id
});

// Associate public subnets with public route table
publicSubnets.forEach((subnet, index) => {
    new aws.ec2.RouteTableAssociation(`publicRouteTableAssociation${index}`, {
        subnetId: subnet.id,
        routeTableId: publicRouteTable.id
    });
});

// Creating a private route table
export const privateRouteTable = new aws.ec2.RouteTable("privateRouteTable", {
    vpcId: vpc.id
});

// Associate private subnets with private route table
privateSubnets.forEach((subnet, index) => {
    new aws.ec2.RouteTableAssociation(`privateRouteTableAssociation${index}`, {
        subnetId: subnet.id,
        routeTableId: privateRouteTable.id
    });
});
