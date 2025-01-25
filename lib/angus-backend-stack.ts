import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class AngusBackendStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Define the Lambda function resource
        const helloWorldFunction = new lambda.Function(this, 'HelloWorldFunction', {
            runtime: lambda.Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset('lambda'), // Points to the lambda directory
            handler: 'hello.handler', // Points to the 'hello' file in the lambda directory
        });

        // Define the API Gateway resource
        const api = new apigateway.RestApi(this, 'HelloWorldApi', {
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS
            }
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
        });
    }
}