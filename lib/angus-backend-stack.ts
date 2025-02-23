import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

export class AngusBackendStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const lambdaRole = new Role(this, 'LambdaExecutionRole', {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
            ]
        });

        // Get Cat API
        const getCatFunction = new lambda.Function(this, 'getCatFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset('lambda', {
                exclude: ['*.ts', 'node_modules/.cache'],  // Avoid TypeScript files
            }),
            handler: 'getCatCount.handler',
            role: lambdaRole,
        });

        // Get ID API
        const setupCatFunction = new lambda.Function(this, 'setupCatFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset('lambda', {
                exclude: ['*.ts', 'node_modules/.cache'],  // Avoid TypeScript files
            }),
            handler: 'getCatId.handler',
            role: lambdaRole,
        });

        // Create Lambda function for modifying cat count
        const modifyCatFunction = new lambda.Function(this, 'modifyCatFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset('lambda', {
                exclude: ['*.ts', 'node_modules/.cache'],  // Avoid TypeScript files
            }),
            handler: 'putCatCount.handler',
            role: lambdaRole,
        });

        // Define the Lambda function resource
        const helloWorldFunction = new lambda.Function(this, 'HelloWorldFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset('lambda'),
            handler: 'hello.handler',
            role: lambdaRole,
        });

        // Define the API Gateway resource
        const api = new apigateway.RestApi(this, 'HelloWorldApi', {
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
            },
        });

        // Define the '/hello' resource with a GET method
        const helloResource = api.root.addResource('hello');
        helloResource.addMethod('GET', new apigateway.LambdaIntegration(helloWorldFunction), {
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Headers': true,
                        'method.response.header.Access-Control-Allow-Methods': true,
                        'method.response.header.Access-Control-Allow-Origin': true,
                    },
                },
            ],
            apiKeyRequired: true, // Require an API key for this method
        });

        // Define 'getCatCount/{userId} with a GET method which takes in a userId string
        const getCatResource = api.root.addResource('getCatCount')
            .addResource('{userId}');

        getCatResource.addMethod('GET', new apigateway.LambdaIntegration(getCatFunction), {
            requestParameters: {
                'method.request.path.userId': true,
            },
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Headers': true,
                        'method.response.header.Access-Control-Allow-Methods': true,
                        'method.response.header.Access-Control-Allow-Origin': true,
                    },
                },
            ],
            apiKeyRequired: true,
        });

        // Define API resource '/setupCatCount' as a POST request
        const setupCatResource = api.root.addResource('setupCatCount');
        setupCatResource.addMethod('POST', new apigateway.LambdaIntegration(setupCatFunction), {
            methodResponses: [
                {
                    statusCode: '201',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Headers': true,
                        'method.response.header.Access-Control-Allow-Methods': true,
                        'method.response.header.Access-Control-Allow-Origin': true,
                    },
                },
            ],
            apiKeyRequired: true,
        });

        // Define API resource '/modifyCatCount/{userId}' with PUT method
        const modifyCatResource = api.root.addResource('modifyCatCount')
            .addResource('{userId}');

        modifyCatResource.addMethod('PUT', new apigateway.LambdaIntegration(modifyCatFunction), {
            requestParameters: {
                'method.request.path.userId': true,
            },
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Headers': true,
                        'method.response.header.Access-Control-Allow-Methods': true,
                        'method.response.header.Access-Control-Allow-Origin': true,
                    },
                },
            ],
            apiKeyRequired: true,
        });

        new ssm.StringParameter(this, 'ApiGatewayUrlParameter', {
            parameterName: '/angus/api-url',
            stringValue: api.url,
            description: 'API Gateway base URL for Angus backend',
            tier: ssm.ParameterTier.STANDARD,
        });

        // Create an API key
        const apiKeySecret = new Secret(this, 'ApiKeySecret', {
            secretName: 'angus/api-key',
            generateSecretString: {
                generateStringKey: 'api_key',
                secretStringTemplate: JSON.stringify({ username: 'web_user' }),
                excludeCharacters: ' %+~`#$&*()|[]{}:;<>?!\'/@"\\',
            },
        });

        const apiKey = api.addApiKey('ApiKey', {
            apiKeyName: `backend-key`,
            value: apiKeySecret.secretValueFromJson('api_key').unsafeUnwrap(),
        });

        // Create a usage plan with rate limiting
        const usagePlan = api.addUsagePlan('UsagePlan', {
            name: 'BasicUsagePlan',
            throttle: {
                rateLimit: 5, // Allow 5 requests per second
                burstLimit: 2, // Allow a burst of 2 additional requests
            },
            quota: {
                limit: 1000, // Allow 100 requests per month
                period: apigateway.Period.MONTH,
            },
        });

        // Associate the usage plan with the API key
        usagePlan.addApiKey(apiKey);

        // Associate the usage plan with the API stage
        usagePlan.addApiStage({
            stage: api.deploymentStage,
        });

        const catCountTable = new Table(this, 'CatCountTable', {
            tableName: 'CatCountTable',  // Optional: Name the table
            partitionKey: { name: 'userId', type: AttributeType.STRING }, // Primary key
            removalPolicy: cdk.RemovalPolicy.RETAIN, // Keep the table even if stack is deleted
            billingMode: BillingMode.PAY_PER_REQUEST, // On-demand pricing (no need for capacity settings)
        });

        catCountTable.grantReadWriteData(lambdaRole);
    }
}