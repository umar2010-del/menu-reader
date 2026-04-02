export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
 
    const { imageData, mediaType } = req.body;
 
    if (!imageData || !mediaType) {
        return res.status(400).json({ error: 'Missing imageData or mediaType' });
    }
 
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
 
    const prompt = `Analyze this restaurant menu image and return ONLY a JSON array — no markdown, no explanation, just raw JSON.
 
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
- If no allergens, use []`;
 
    try {
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
                    maxOutputTokens: 2000
                }
            })
        });
 
        if (!response.ok) {
            const err = await response.json();
            return res.status(response.status).json({ error: err.error?.message || 'Gemini API error' });
        }
 
        const data = await response.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
 
        // strip markdown fences then grab just the JSON array
        let cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
        const start = cleaned.indexOf('[');
        const end = cleaned.lastIndexOf(']');
        if (start === -1 || end === -1) {
            return res.status(500).json({ error: 'Could not find JSON in Gemini response' });
        }
        cleaned = cleaned.slice(start, end + 1);
 
        res.status(200).json({ result: cleaned });
 
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
}
 
