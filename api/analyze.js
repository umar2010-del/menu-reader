export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
 
    const { imageData, mediaType } = req.body;
 
    if (!imageData || !mediaType) {
        return res.status(400).json({ error: 'Missing imageData or mediaType' });
    }
 
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
 
        const prompt = `Analyze this restaurant menu image and return ONLY a JSON array — no markdown, no explanation, no code fences, just raw JSON starting with [ and ending with ].
 
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
- allergens is an array of strings for any allergens mentioned
- If no price is visible, use ""
- If no description is visible, use ""
- If no allergens, use []
- Return ONLY the JSON array, nothing else`;
 
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        {
                            inline_data: {
                                mime_type: mediaType,
                                data: imageData
                            }
                        },
                        { text: prompt }
                    ]
                }],
                generationConfig: {
                    temperature: 0.1,
                    responseMimeType: "application/json"
                }
            })
        });
 
        if (!response.ok) {
            const err = await response.json();
            return res.status(response.status).json({ error: err.error?.message || 'Gemini API error' });
        }
 
        const data = await response.json();
 
        // pull text out of response
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
 
        // aggressive cleanup — strip any markdown fences, leading/trailing whitespace
        let cleaned = raw.trim();
        cleaned = cleaned.replace(/^```json\s*/i, '');
        cleaned = cleaned.replace(/^```\s*/i, '');
        cleaned = cleaned.replace(/```\s*$/i, '');
        cleaned = cleaned.trim();
 
        // find the first [ and last ] to extract just the array
        const start = cleaned.indexOf('[');
        const end = cleaned.lastIndexOf(']');
        if (start !== -1 && end !== -1 && end > start) {
            cleaned = cleaned.substring(start, end + 1);
        }
 
        // validate it's actually parseable before sending back
        try {
            JSON.parse(cleaned);
        } catch (parseErr) {
            console.error('JSON parse failed. Raw response was:', raw);
            return res.status(500).json({ error: 'Could not parse menu data from Gemini response. Raw: ' + raw.substring(0, 200) });
        }
 
        res.status(200).json({ result: cleaned });
 
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
}
 
