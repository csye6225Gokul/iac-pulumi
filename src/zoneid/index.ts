import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { alb } from "../ec2";
// Your existing hosted zone ID


const config = new pulumi.Config();
const hostedZoneId = config.require("zone-id");
const dnsname = config.require("zone-name");

// Create a new A record
const aRecord = new aws.route53.Record("myARecord", {
    zoneId: hostedZoneId,
    name: dnsname, // The desired record name
    type: "A",
   // ttl: 60, // Time to live for the record set
    aliases:[
        {
          name:alb.dnsName,
          zoneId:alb.zoneId,
          evaluateTargetHealth:true
        }
      ] // The EC2 instance's public IP
});
