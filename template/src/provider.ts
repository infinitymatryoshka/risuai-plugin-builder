/// <reference types="../../types/risu-plugin" />

/**
 * AI Provider implementation (API v3.0)
 * This file shows how to add a custom AI provider to RisuAI
 */

export async function createProvider(apiKey: string, temperature: number) {
    await Risuai.addProvider(
        'ExampleAI',
        async (arg, abortSignal) => {
            console.log('ExampleAI: Generating response...');

            // Example: Call your AI API
            try {
                const response = await Risuai.nativeFetch('https://api.example.com/v1/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        messages: arg.prompt_chat,
                        temperature: temperature / 100, // Convert 0-100 to 0-1
                        max_tokens: arg.max_tokens || 1000
                    }),
                    signal: abortSignal
                });

                if (!response.ok) {
                    console.log(`ExampleAI: API error ${response.status}`);
                    return {
                        success: false,
                        content: `Error: ${response.status} ${response.statusText}`
                    };
                }

                const data = await response.json();

                return {
                    success: true,
                    content: data.choices[0].message.content
                };

            } catch (error) {
                console.log(`ExampleAI: Request failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
                return {
                    success: false,
                    content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                };
            }
        },
        {
            // Optional: Specify tokenizer for token counting
            tokenizer: 'tiktoken'
        }
    );

    console.log('Example Plugin: Provider "ExampleAI" registered');
}
