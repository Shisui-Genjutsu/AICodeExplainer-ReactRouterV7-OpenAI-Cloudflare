import type { Route } from "../+types/root";

export const loader = async ({ request }: Route.LoaderArgs) => {
    return Response.json({ message: "OM" });
}

export const action = async ({ request, context }: Route.ActionArgs) => {
    const formData = await request.formData();
    const AI = context.cloudflare.env.AI;

    try {
        const code = formData.get('code');
        const language = formData.get('language') || "";

        if (!code) {
            return Response.json({ error: "Code is required" }, { status: 400 });
        }
        if (!language) {
            return Response.json({ error: "Language is required" }, { status: 400 });
        }

        const response = await AI.run(
            "@cf/openai/gpt-oss-120b", {
            // instructions: 'You are a user',
            role: 'user',
            input: `Please explain this ${language || ""} code in simple terms: \n\n\`\`\`${code}\`\`\``,
            temperature: 0.3,
            max_tokens: 800,
            reasoning: {
                effort: "low",
                summary: "auto" //"auto" | "concise" | "detailed";
            }
        }
        );

        return Response.json({
            explanation: response,
            language: language
        });
    } catch (error) {
        console.error(error);
        return Response.json({ error: "Failed to explain code" }, { status: 500 });
    }
}