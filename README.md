To setup AWS Command Line Interface (CLI)

1. Install AWS CLI package using the GUI installer
2. aws --version command to check if package is installed
3. Create an alias account with a root account email
4. Create an IAM user, with AdministratorAccess policy attached to the user
5. In the aws console, generate Access Key and Secret Access Key for the above IAM user.

To setup profile in AWS CLI

1. In the terminal, provide command aws configure --profile <profile_name>
2. Enter the Access Key and Secret Access Key Information
3. Set the region
4. Set the output format
5. In the ~/.aws location, config and credentials file will be created that will will store the config information for all profiles

aws configure list --profile <profile_name> - to list given profile
aws configure list-profiles - to list all profiles

Pulumi Installation and setup

1. To install pulumi, use command brew install pulumi/tap/pulumi
2. pulumi version , to check pulumi version after installation
3. pulumi login --local command, to store credentials in local instead of pulumi cloud
4. Go to the project directory and provide command pulumi new. This will prompt to choose the stack for the preferred programming language. Set passphrase to access pulumi

To set region from command line for aws, pulumi config set aws:region <region_name>

To run pulumi
1. Run tsc to compile the typescript code
2. update your latest amiid in your stack yaml file
3. pulumi up command, to run pulumi. After this command, will be prompted to enter the secrect passphrase for pulumi
4. To destroy created resources or update, give pulumi destroy/ pulumi up

# Comment to import certificate

aws acm import-certificate --certificate fileb:///Users/gokuljayavel/Downloads/demo_gokul.cloud/demo_gokul_cloud.crt --private-key fileb:///Users/gokuljayavel/Downloads/demo_gokul.cloud/privatekey.pem --certificate-chain fileb:///Users/gokuljayavel/Downloads/demo_gokul.cloud/demo_gokul_cloud.ca-bundle