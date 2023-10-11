import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { publicRouteTable } from "../route-tables";
import { internetGateway } from "../igw";

// Creating a public route
export const publicRoute = new aws.ec2.Route("publicRoute", {
    routeTableId: publicRouteTable.id,
    destinationCidrBlock: "0.0.0.0/0",
    gatewayId: internetGateway.id
});
