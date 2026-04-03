export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
 
    const { imageData, mediaType } = req.body;
 
    if (!imageData || !mediaType) {
        return res.status(400).json({ error: 'Missing imageData or mediaType' });
    }
 
    try {
        const apiKey = process.env.OPENROUTER_API_KEY;
 
        if (!apiKey) {
            return res.status(500).json({ error: 'OPENROUTER_API_KEY is not set in environment variables' });
        }
 
        const prompt = `Analyze this restaurant menu image and return ONLY a JSON array — no markdown, no explanation, no code fences, just raw JSON starting with [ and ending with ].
 
Each element represents a menu section:
[
  {
    "section": "Section Name",
    "items": [
      {
        "name": "Item Name",
        "price": "$12.00",
        "description": "Full description of the dish",
        "allergens": ["gluten", "dairy"]
      }
    ]
  }
]
 
Rules:
- Group items under their correct section header (Appetizers, Mains, Desserts, Drinks, etc.)
- If no section headers exist, use "Menu" as the section name
- allergens is an array of strings for any allergens mentioned
- If no price is visible, use ""
- If no description is visible, use ""
- If no allergens, use []
- Return ONLY the JSON array, nothing else, no extra text`;
 
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://menu-reader.vercel.app',
                'X-Title': 'Menu Reader'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-exp:free',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mediaType};base64,${imageData}`
                                }
                            },
                            {
                                type: 'text',
                                text: prompt
                            }
                        ]
                    }
                ],
                temperature: 0.1
            })
        });
 
        if (!response.ok) {
            const err = await response.json();
            console.error('OpenRouter API error:', JSON.stringify(err));
            return res.status(response.status).json({ error: err.error?.message || 'OpenRouter API error' });
        }
 
        const data = await response.json();
        const raw = data.choices?.[0]?.message?.content || '';
 
        if (!raw) {
            console.error('Empty response. Full response:', JSON.stringify(data));
            return res.status(500).json({ error: 'Empty response from API. Full: ' + JSON.stringify(data).substring(0, 300) });
        }
 
        // clean up any markdown fences
        let cleaned = raw.trim();
        cleaned = cleaned.replace(/^```json\s*/i, '');
        cleaned = cleaned.replace(/^```\s*/i, '');
        cleaned = cleaned.replace(/```\s*$/i, '');
        cleaned = cleaned.trim();
 
        // extract just the array
        const start = cleaned.indexOf('[');
        const end = cleaned.lastIndexOf(']');
        if (start !== -1 && end !== -1 && end > start) {
            cleaned = cleaned.substring(start, end + 1);
        } else {
            return res.status(500).json({ error: 'No JSON array found. Got: ' + raw.substring(0, 200) });
        }
 
        // validate
        try {
            JSON.parse(cleaned);
        } catch (parseErr) {
            return res.status(500).json({ error: 'JSON parse failed. Got: ' + cleaned.substring(0, 200) });
        }
 
        res.status(200).json({ result: cleaned });
 
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
}
 
