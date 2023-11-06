import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { publicIp } from "../ec2";
// Your existing hosted zone ID


const config = new pulumi.Config();
const hostedZoneId = config.require("zone-id");

// Create a new A record
const aRecord = new aws.route53.Record("myARecord", {
    zoneId: hostedZoneId,
    name: "demo.gokul.cloud", // The desired record name
    type: "A",
    ttl: 300, // Time to live for the record set
    records: [publicIp], // The EC2 instance's public IP
});
