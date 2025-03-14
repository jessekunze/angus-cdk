import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3Deployment from 'aws-cdk-lib/aws-s3-deployment';
import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class AngusCdkStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
        const isCi = process.env.CI;

        // S3 bucket to host the website content
        const bucket = new s3.Bucket(this, 'WebsiteBucket', {
            // Block all public access to the bucket
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        });

        // const rootObject = isCi ? 'dist/index.html' : 'index.html';
        // CloudFront distribution for secure public access
        const distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
            defaultRootObject: 'index.html',
            defaultBehavior: {
                origin: new cloudfrontOrigins.S3Origin(bucket),
            },
        });
        const distPath = isCi ? './dist/dist' : '../angus-demo/dist';

        // Deploy the website build to the S3 bucket
        new s3Deployment.BucketDeployment(this, 'DeployWebsite', {
            sources: [s3Deployment.Source.asset(distPath)],
            destinationBucket: bucket, // Root of the S3 bucket
            distribution, // Invalidate the CloudFront cache on deployment
            distributionPaths: ['/*'], // Clear all paths in CloudFront
        });
        
        // Output the CloudFront distribution URL
        new CfnOutput(this, 'WebsiteURL', {
            value: distribution.distributionDomainName,
        });
    }
} 