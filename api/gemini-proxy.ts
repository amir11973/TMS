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
        
        // Use generateContentStream for a streaming response to avoid timeouts
        const streamResult = await ai.models.generateContentStream({ model, contents, config });
        
        // Create a new ReadableStream to pipe the response to the client
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    // FIX: The `.response` property does not exist on the async generator returned by `generateContentStream`.
                    // Safety checks must be performed by inspecting the streamed chunks.
                    let lastChunkCandidates: any[] | undefined;

                    for await (const chunk of streamResult) {
                        // Check for prompt-level blocking on each chunk, as it can appear early.
                        if (chunk.promptFeedback?.blockReason) {
                            throw new Error(`Content generation blocked due to prompt: ${chunk.promptFeedback.blockReason}`);
                        }

                        // Stream out the text
                        const text = chunk.text;
                        if (text) {
                            controller.enqueue(encoder.encode(text));
                        }
                        
                        // Keep track of the candidates from the latest chunk for the final check.
                        if (chunk.candidates) {
                            lastChunkCandidates = chunk.candidates;
                        }
                    }
                    
                    // After streaming all text chunks, check the final chunk for finishReason issues.
                    if (lastChunkCandidates && lastChunkCandidates[0]?.finishReason && 
                        ['SAFETY', 'RECITATION', 'OTHER'].includes(lastChunkCandidates[0].finishReason)) {
                         throw new Error(`Content generation stopped due to: ${lastChunkCandidates[0].finishReason}`);
                    }
                    
                    controller.close();
                } catch (error) {
                    console.error('Error in stream read loop:', error);
                    // Propagate the error to the client, which will cause the fetch promise to reject
                    controller.error(error);
                }
            },
        });

        return new Response(stream, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });

    } catch (error) {
        console.error("Error in Gemini proxy:", error);
        const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred.';
        return new Response(JSON.stringify({ error: { message: errorMessage } }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}