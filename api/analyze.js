module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
 
    const { images, skipQualityCheck } = req.body;
 
    if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: 'Missing images array' });
    }
 
    try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'OPENROUTER_API_KEY is not set' });
 
        // Step 1: quality check (skipped only if user already confirmed they want to continue)
        if (!skipQualityCheck) {
            const qualityPrompt = `Look at this image. Is it clear enough to read menu text from it?
Reply with ONLY a JSON object in this exact format, nothing else:
{"readable": true, "reason": ""}
or
{"readable": false, "reason": "One sentence explaining why e.g. too blurry, too dark, not a menu"}`;
 
            const qualityContent = [
                { type: 'image_url', image_url: { url: `data:${images[0].mediaType};base64,${images[0].imageData}` } },
                { type: 'text', text: qualityPrompt }
            ];
 
            const qualityResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://menu-reader.vercel.app',
                    'X-Title': 'Menu Reader'
                },
                body: JSON.stringify({
                    model: 'openrouter/auto',
                    messages: [{ role: 'user', content: qualityContent }],
                    temperature: 0.1
                })
            });
 
            if (qualityResponse.ok) {
                const qualityData = await qualityResponse.json();
                const qualityRaw = qualityData.choices?.[0]?.message?.content || '';
                try {
                    let qualityCleaned = qualityRaw.replace(/```json/gi, '').replace(/```/g, '').trim();
                    const qualityResult = JSON.parse(qualityCleaned);
                    if (qualityResult.readable === false) {
                        return res.status(200).json({
                            qualityWarning: true,
                            reason: qualityResult.reason || 'Image may be too blurry or unclear to read accurately.'
                        });
                    }
                } catch (e) {
                    // quality check parse failed, continue to main analysis
                }
            }
        }
 
        // Step 2: full menu analysis
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
 
GROUPING RULES (most important):
- You MUST group all items into logical categories. Never create a section with only one item unless it is truly a unique standalone item.
- Use your knowledge of food to decide the category. Examples: french fries, collard greens, mashed potatoes, asparagus, coleslaw, beans = "Sides". Burgers, steaks, pasta, chicken dishes = "Mains". Cakes, pies, ice cream = "Desserts". Beer, wine, soda, coffee = "Drinks". Soup, salads, small plates = "Appetizers".
- If the physical menu has a separate header for each item, IGNORE those headers completely and re-group everything yourself.
- Aim for 3 to 6 sections total for a typical menu.
 
ALLERGEN RULES:
- Even if the menu does not list allergens, infer and add likely allergens for every item based on its name, description, and how the dish is commonly made.
- Examples: fried items likely contain gluten, cream sauces contain dairy, pasta contains gluten and eggs, aioli contains eggs, mashed potatoes may contain dairy.
- Common allergens: gluten, wheat, dairy, milk, eggs, nuts, peanuts, tree nuts, soy, fish, shellfish, sesame, sulfites.
- If no allergens apply, use [].
 
OTHER RULES:
- If no price is visible, use "".
- If no description is visible, use "".
- Return ONLY the JSON array, nothing else, no extra text.`;
 
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
 
