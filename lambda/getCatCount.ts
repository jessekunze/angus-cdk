import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient({});

export const handler = async (event: any) => {
    const userId = event.pathParameters?.userId;

    if (!userId) {
        return {
            statusCode: 400,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({ error: "Missing userId parameter" }),
        };
    }

    try {
        const command = new GetItemCommand({
            TableName: "CatCountTable",
            Key: marshall({ userId }),
        });

        const { Item } = await client.send(command);

        if (!Item) {
            return {
                statusCode: 404,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                body: JSON.stringify({ error: "User not found" }),
            };
        }

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({ count: unmarshall(Item).catCount || 0 }),
        };
    } catch (error) {
        console.error("Error fetching cat count:", error);
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