/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "@google/genai";

// Vercel Edge functions are fast and simple.
export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: { message: 'Method Not Allowed' } }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { model, contents, config } = await request.json();
        const apiKey = process.env.API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: { message: 'API key is not configured on the server.' } }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const ai = new GoogleGenAI({ apiKey });
        const responseStream = await ai.models.generateContentStream({ model, contents, config });
            
        // Create a new ReadableStream to send back to the client
        const readableStream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                for await (const chunk of responseStream) {
                    const text = chunk.text;
                    if (text) {
                        controller.enqueue(encoder.encode(text));
                    }
                }
                controller.close();
            },
        });

        return new Response(readableStream, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });

    } catch (error) {
        console.error("Error in Gemini proxy:", error);
        return new Response(JSON.stringify({ error: { message: 'An internal server error occurred while streaming.' } }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}