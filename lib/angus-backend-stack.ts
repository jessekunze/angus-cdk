import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class AngusBackendStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Define the Lambda function resource
        const helloWorldFunction = new lambda.Function(this, 'HelloWorldFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset('lambda'),
            handler: 'hello.handler',
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

        // Create an API key
        const apiKey = api.addApiKey('ApiKey');

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
    }
}