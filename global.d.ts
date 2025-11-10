export type AICodeExplainerResponse = {
    id: string;
    created_at: number;
    instructions: string | null;
    metadata: Record<string, any> | null;
    model: string;
    object: "response";
    output: Array<
        | {
            id: string;
            content: Array<{
                text: string;
                type: "reasoning_text";
            }>;
            summary: any[];
            type: "reasoning";
            encrypted_content: string | null;
            status: string | null;
        }
        | {
            id: string;
            content: Array<{
                annotations: any[];
                text: string;
                type: "output_text";
                logprobs: any | null;
            }>;
            role: "assistant";
            status: "completed";
            type: "message";
        }
    >;
    parallel_tool_calls: boolean;
    temperature: number;
    tool_choice: string | null;
    tools: any[];
    top_p: number;
    background: boolean;
    max_output_tokens: number;
    max_tool_calls: number | null;
    previous_response_id: string | null;
    prompt: string | null;
    reasoning: {
        effort: "low" | "medium" | "high";
        generate_summary: string | null;
        summary: string | "auto";
    };
    service_tier: "auto" | string;
    status: "completed" | string;
    text: string | null;
    top_logprobs: number;
    truncation: "disabled" | "enabled";
    usage: {
        input_tokens: number;
        output_tokens: number;
        total_tokens: number;
    };
    user: string | null;
};