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
 
        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not set in environment variables' });
        }
 
       const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
 
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
                    temperature: 0.1
                }
            })
        });
 
        if (!response.ok) {
            const err = await response.json();
            console.error('Gemini API error:', JSON.stringify(err));
            return res.status(response.status).json({ error: err.error?.message || 'Gemini API error' });
        }
 
        const data = await response.json();
 
        // pull text out of response
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
 
        if (!raw) {
            console.error('Empty response from Gemini. Full response:', JSON.stringify(data));
            return res.status(500).json({ error: 'Gemini returned an empty response. Full response: ' + JSON.stringify(data).substring(0, 300) });
        }
 
        // aggressive cleanup
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
            console.error('No JSON array found in response. Raw was:', raw);
            return res.status(500).json({ error: 'No JSON array found in Gemini response. Got: ' + raw.substring(0, 200) });
        }
 
        // validate
        try {
            JSON.parse(cleaned);
        } catch (parseErr) {
            console.error('JSON parse failed. Cleaned string was:', cleaned);
            return res.status(500).json({ error: 'JSON parse failed. Got: ' + cleaned.substring(0, 200) });
        }
 
        res.status(200).json({ result: cleaned });
 
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
}
 
