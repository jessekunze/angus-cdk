import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient({});

export const handler = async (event: any) => {
    const userId = event.pathParameters?.userId;
    const body = JSON.parse(event.body || "{}");
    const newCatCount = body.catCount;

    if (!userId || newCatCount === undefined) {
        return {
            statusCode: 400,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({ error: "Missing userId or catCount in request" }),
        };
    }

    const nowInLA = new Date().toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });

    try {
        const command = new UpdateItemCommand({
            TableName: "CatCountTable",
            Key: marshall({ userId }),
            UpdateExpression: "SET catCount = :count, lastUpdatedDateTime = :timestamp",
            ExpressionAttributeValues: marshall({ ":count": newCatCount, ":timestamp": nowInLA }),
        });

        await client.send(command);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({ message: "Cat count updated successfully", userId, newCatCount }),
        };
    } catch (error) {
        console.error("Error updating cat count:", error);
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