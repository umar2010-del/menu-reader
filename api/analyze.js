xport default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
 
    const { images } = req.body;
 
    if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: 'Missing images array' });
    }
 
    try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'OPENROUTER_API_KEY is not set' });
 
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
 
IMPORTANT ALLERGEN RULES:
- Even if the menu does not list allergens, you MUST infer and add likely allergens for every single item based on its name, description, and common knowledge of how the dish is made.
- For example: pasta likely contains gluten and eggs, fried items likely contain gluten, cream sauces contain dairy, etc.
- Be thorough — it is better to over-report allergens than miss them.
- Common allergens to check for: gluten, wheat, dairy, milk, eggs, nuts, peanuts, tree nuts, soy, fish, shellfish, sesame, sulfites
- If no price is visible, use ""
- If no description is visible, use ""
- Return ONLY the JSON array, nothing else`;
 
        const content = [];
        for (const img of images) {
            content.push({ type: 'image_url', image_url: { url: `data:${img.mediaType};base64,${img.imageData}` } });
        }
        content.push({ type: 'text', text: prompt });
 
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://menu-reader.vercel.app',
                'X-Title': 'Menu Reader'
            },
            body: JSON.stringify({
                model: 'openrouter/auto',
                messages: [{ role: 'user', content }],
                temperature: 0.1
            })
        });
 
        if (!response.ok) {
            const err = await response.json();
            return res.status(response.status).json({ error: err.error?.message || 'OpenRouter API error' });
        }
 
        const data = await response.json();
        const raw = data.choices?.[0]?.message?.content || '';
 
        if (!raw) return res.status(500).json({ error: 'Empty response. Full: ' + JSON.stringify(data).substring(0, 300) });
 
        let cleaned = raw.trim();
        cleaned = cleaned.replace(/```json/gi, '');
        cleaned = cleaned.replace(/```/g, '');
        cleaned = cleaned.trim();
 
        const start = cleaned.indexOf('[');
        const end = cleaned.lastIndexOf(']');
        if (start !== -1 && end !== -1 && end > start) {
            cleaned = cleaned.substring(start, end + 1);
        } else {
            return res.status(500).json({ error: 'No JSON array found. Got: ' + raw.substring(0, 200) });
        }
 
        try { JSON.parse(cleaned); } catch (e) {
            return res.status(500).json({ error: 'JSON parse failed. Got: ' + cleaned.substring(0, 200) });
        }
 
        res.status(200).json({ result: cleaned });
 
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
}
 
