import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { publicRouteTable } from "../route-tables";
import { internetGateway } from "../igw";

const config = new pulumi.Config();
const cidrBlock = config.require("igwcidrBlock");

export const publicRoute = new aws.ec2.Route("publicRoute", {
    routeTableId: publicRouteTable.id,
    destinationCidrBlock: cidrBlock,
    gatewayId: internetGateway.id
});
