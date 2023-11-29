import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

// Create a Google Cloud Storage bucket
const bucket = new gcp.storage.Bucket("webapp-68982", {
    location: "US",
    forceDestroy: true,
});

// Create a Google Service Account
const serviceAccount = new gcp.serviceaccount.Account("csye6225-gokul", {
    accountId: "csye6225-gokul",
    displayName: "csye6225-gokul",
});


const defaultProject = config.require("projectid"); // Replace with your default project ID

// Assign necessary roles to the service account
const storageAdminBinding = new gcp.projects.IAMBinding("storage-admin-binding", {
    project: defaultProject,
    role: "roles/storage.admin",
    members: [serviceAccount.email.apply(email => `serviceAccount:${email}`)],
});

// Create Access Keys for the Service Account
const serviceAccountKey = new gcp.serviceaccount.Key("csye6225-gokul-account-key", {
    serviceAccountId: serviceAccount.name,
    publicKeyType: "TYPE_X509_PEM_FILE",
});

// Export the bucket name and service account key
export const bucketName = bucket.name;
export const serviceAccountKeyEncoded = pulumi.secret(
    serviceAccountKey.privateKey.apply(key => Buffer.from(key, 'base64').toString('utf-8'))
);
