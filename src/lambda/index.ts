import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as aws from "@pulumi/aws";
import {bucketName, serviceAccountKeyEncoded } from '../gcp/index'



const snsTopic = new aws.sns.Topic("myTopic");

const config = new pulumi.Config();
const accountid = config.require("accountnumber");
const email = config.require("email");

const lambdaRole = new aws.iam.Role("lambdaRole", {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
                Service: "lambda.amazonaws.com",
            },
        }],
    }),
});

const awsRole = new aws.iam.Role("awsRoleForGCP", {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Principal: {
                    // AWS STS AssumeRole principal configuration goes here
                    "Service": "lambda.amazonaws.com"
                },
                Action: "sts:AssumeRole"
            }
        ]
    })
});


const lambdaPolicy = new aws.iam.Policy("lambdaPolicy", {
    policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Action: [
                    "ses:SendEmail",
                    "ses:SendRawEmail"
                ],
                Resource: "*" // Specify your SES resource ARN if you want to restrict to specific resources
            },
            {
                Effect: "Allow",
                Action: [
                    "dynamodb:GetItem",
                    "dynamodb:PutItem",
                    "dynamodb:UpdateItem",
                    "dynamodb:DeleteItem",
                    "dynamodb:Scan",
                    "dynamodb:Query"
                ],
                Resource: "*" // Replace with your DynamoDB table ARN
            },
            {
                Effect: "Allow",
                Action: [
                    "sts:AssumeRole"
                ],
                Resource: "*" // Specify the ARN of the GCP service account role here
            }
        ],
    }),
});


// Attach the policy to the role
const rolePolicyAttachment = new aws.iam.RolePolicyAttachment("rolePolicyAttachment", {
    role: lambdaRole.name,
    policyArn: lambdaPolicy.arn,
});

const snsFullAccessPolicyAttachment = new aws.iam.RolePolicyAttachment("snsFullAccessPolicyAttachment", {
    role: lambdaRole.name,
    policyArn: "arn:aws:iam::aws:policy/AmazonSNSFullAccess",
});

const CloudwatchPolicyAttachment = new aws.iam.RolePolicyAttachment("CloudwatchPolicyAttachment", {
    role: lambdaRole.name,
    policyArn: "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy",
});

//Create DynamoDB instance
const table = new aws.dynamodb.Table("emailWebappTable", {
    attributes: [
        { name: "id", type: "S" }, // Composite primary key (email+timestamp)
        { name: "email", type: "S" },
        { name: "timestamp", type: "S" },
        { name: "status", type: "S" }
    ],
    hashKey: "id",
    billingMode: "PAY_PER_REQUEST",
    globalSecondaryIndexes: [
        {
        name: "EmailIndex",
        hashKey: "email",
        projectionType: "ALL", 
        },
        {
            name: "timestampIndex",
            hashKey: "timestamp",
            projectionType: "ALL", 
        },
        {
            name: "statusIndex",
            hashKey: "status",
            projectionType: "ALL", 
        }
]
     
});



const lambdaZipPath = '/Users/gokuljayavel/Desktop/CloudProject/serverless';

// Create Lambda Function
const lambdaFunction = new aws.lambda.Function("myFunction", {
    code: new pulumi.asset.FileArchive(lambdaZipPath),
    runtime: aws.lambda.Runtime.NodeJS18dX,
    role: lambdaRole.arn,
    handler: "index.handler",
    environment: {
        variables: {
            GCP_SERVICE_ACCOUNT_KEY: serviceAccountKeyEncoded,
            BUCKET_NAME: bucketName,
            AWS_ACCOUNT_ID: accountid,
            ROLE_NAME: awsRole.name,
            TABLE_NAME: table.name,
            SES_SENDER_EMAIL: email
            // Other environment variables like email server configuration
        },
    },
});


const lambdaPermission = new aws.lambda.Permission("lambdaPermission", {
    action: "lambda:InvokeFunction",
    function: lambdaFunction.arn,
    principal: "sns.amazonaws.com",
    sourceArn: snsTopic.arn,
},{dependsOn: [lambdaFunction,snsTopic]});

const lambdaSubscription = new aws.sns.TopicSubscription("lambdaSubscription", {
    topic: snsTopic.arn,
    protocol: "lambda",
    endpoint: lambdaFunction.arn,
});


export const lambdaFunctionName = lambdaFunction.name;
export const dynamoDbTableName = table.name;
export const snsTopicArn = snsTopic.arn;