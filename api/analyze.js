export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { imageData, mediaType } = req.body;

    if (!imageData || !mediaType) {
        return res.status(400).json({ error: 'Missing imageData or mediaType' });
    }

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 2000,
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: { type: 'base64', media_type: mediaType, data: imageData }
                        },
                        {
                            type: 'text',
                            text: `Analyze this restaurant menu image and return ONLY a JSON array — no markdown, no explanation, just raw JSON.

Each element represents a menu section:
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

Rules:
- Group items under their correct section header (Appetizers, Mains, Desserts, Drinks, etc.)
- If no section headers exist, use "Menu" as the section name
- allergens is an array of strings for any allergens mentioned (nuts, dairy, gluten, shellfish, eggs, soy, fish, sesame, etc.)
- If no price is visible, use ""
- If no description is visible, use ""
- If no allergens, use []`
                        }
                    ]
                }]
            })
        });

        if (!response.ok) {
            const err = await response.json();
            return res.status(response.status).json({ error: err.error?.message || 'Anthropic API error' });
        }

        const data = await response.json();
        const raw = data.content.map(b => b.text || '').join('').trim();
        const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

        res.status(200).json({ result: cleaned });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
}
