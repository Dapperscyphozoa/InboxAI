// api/generate-response.js
// Deploy this to Vercel as a serverless function

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { emailContent, senderName, senderEmail, subject } = req.body;

        if (!emailContent) {
            res.status(400).json({ error: 'Email content is required' });
            return;
        }

        // Call Claude API to generate email responses
        const message = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2000,
            messages: [{
                role: "user",
                content: `You are an AI email assistant. Generate 3 professional email response options with different tones.

Email details:
From: ${senderName} <${senderEmail}>
Subject: ${subject}

Email content:
${emailContent}

Generate 3 response options:
1. Professional & Friendly - warm but business-appropriate
2. Concise & Direct - brief and to the point
3. Detailed & Enthusiastic - comprehensive and energetic

Return ONLY valid JSON in this exact format (no markdown, no explanations):
{
    "responses": [
        {
            "label": "Professional & Friendly",
            "text": "full email response here with greeting and signature"
        },
        {
            "label": "Concise & Direct", 
            "text": "full email response here with greeting and signature"
        },
        {
            "label": "Detailed & Enthusiastic",
            "text": "full email response here with greeting and signature"
        }
    ]
}`
            }]
        });

        // Parse Claude's response
        const responseText = message.content[0].text;
        
        // Extract JSON from response (in case Claude adds markdown)
        let jsonMatch = responseText.match(/\{[\s\S]*\}/);
        let parsedResponse;
        
        if (jsonMatch) {
            parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
            parsedResponse = JSON.parse(responseText);
        }

        // Validate response structure
        if (!parsedResponse.responses || !Array.isArray(parsedResponse.responses)) {
            throw new Error('Invalid response format from AI');
        }

        res.status(200).json({
            success: true,
            responses: parsedResponse.responses,
            metadata: {
                model: "claude-sonnet-4",
                tokens: message.usage.input_tokens + message.usage.output_tokens,
                generated_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('AI generation error:', error);
        res.status(500).json({ 
            error: 'Failed to generate responses',
            details: error.message 
        });
    }
}
