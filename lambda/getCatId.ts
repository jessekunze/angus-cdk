import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({});

export const handler = async () => {
    const userId = randomUUID();

    try {
        const command = new PutItemCommand({
            TableName: "CatCountTable",
            Item: marshall({
                userId,
                catCount: 0,
            }),
        });

        await client.send(command);

        return {
            statusCode: 201,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            },
            body: JSON.stringify({ userId }),
        };
    } catch (error) {
        console.error("Error creating new user:", error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
};