# 🍽️ Menu Reader

🔗 **Live App:** [menu-reader-ochre.vercel.app](https://menu-reader-ochre.vercel.app)  
📂 **Repository:** [github.com/DestroyerUmar/menu-reader](https://github.com/DestroyerUmar/menu-reader)  
📱 **Problem it solves:** People with visual impairments, reading difficulties, or food allergies often struggle to read restaurant menus — especially ones with small text, poor lighting, or no allergen information. Menu Reader makes any menu instantly accessible to everyone.

---

## What It Does

Menu Reader lets you photograph or upload a restaurant menu and instantly get a clean, readable, organized version of it — with allergen warnings, accessibility options, and the ability to build your order.

---

## Features

### Accessibility
- **Text size slider** — increase or decrease all text across the entire app
- **Dark mode** — reduces eye strain in low-light environments
- **High contrast mode** — for users with visual impairments
- **Dyslexia-friendly font** — uses OpenDyslexic font to improve readability
- **Read aloud** — uses text-to-speech to read your order out loud to a waiter

### Allergen Safety
- **AI-inferred allergens** — even if the menu doesn't list allergens, the AI identifies likely allergens in every dish based on its ingredients and how it's commonly prepared
- **Personal allergy selection** — users can select from 10 common allergens (gluten, dairy, eggs, nuts, shellfish, etc.)
- **Custom ingredient input** — type any specific ingredient you're allergic to (e.g. avocado, garlic)
- **Red warning highlights** — any menu item containing your allergens is highlighted in red with a clear warning banner

### Menu Reading
- **Upload multiple photos** — scan a multi-page menu by uploading several images at once
- **Camera support** — take a photo directly in the app (uses rear camera on phones)
- **Smart grouping** — AI groups items into logical sections (Mains, Sides, Desserts, Drinks) even if the physical menu doesn't
- **Allergen filter** — tap any allergen to highlight all items containing it

### Ordering
- **Favorites / order builder** — tap the heart on any item to add it to your order
- **Estimated total** — automatically calculates your order total
- **Copy order** — copy your order to clipboard to show a waiter
- **Read order aloud** — speaks your order out loud

---

## How It Works

1. User uploads a photo (or multiple photos) of a restaurant menu
2. The image is sent to a **Vercel serverless function** (`api/analyze.js`)
3. The function calls the **OpenRouter API** with the image and a detailed prompt
4. The AI reads the menu, groups items into sections, and infers allergens for every dish
5. The result is returned as structured JSON and rendered in the app
6. The user sets their personal allergies on a dedicated screen before viewing results
7. Any items matching their allergies are highlighted in red with a warning

---

## Tech Stack

| Part | Technology |
|------|-----------|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Backend | Vercel Serverless Functions (Node.js) |
| AI | OpenRouter API (auto-selects best available free model) |
| Hosting | Vercel |
| Font | OpenDyslexic (Google Fonts) |

---

## File Structure

```
menu-reader/
├── api/
│   └── analyze.js        # Serverless function — handles image analysis via OpenRouter
├── public/
│   └── index.html        # Full frontend — all screens, logic, and styles in one file
├── vercel.json           # Vercel deployment config
├── package.json          # Sets module type for Node.js
└── README.md             # This file
```

---

## Key Code Explained

### `api/analyze.js`
The backend serverless function that:
- Receives base64-encoded images from the frontend
- Builds a prompt instructing the AI to extract menu items, group them logically, and infer allergens
- Calls the OpenRouter API with the images and prompt
- Cleans and validates the JSON response before returning it

### `public/index.html`
The entire frontend in a single file with 5 screens:
- **Home** — landing page with how-it-works steps
- **Upload** — drag/drop or camera capture for menu photos
- **Allergy Selection** — user picks their allergens before viewing results
- **Results** — full menu with allergen highlighting and favorites
- **Order Summary** — selected items with total, read-aloud, and copy features

---

## How to Run Locally

1. Clone the repo
2. Create a free account at [openrouter.ai](https://openrouter.ai) and get an API key
3. Create a `.env` file in the root with:
   ```
   OPENROUTER_API_KEY=your_key_here
   ```
4. Install Vercel CLI: `npm i -g vercel`
5. Run `vercel dev` to start locally

Or just use the live app — no setup needed!

---

## Why I Built This

Reading menus can be genuinely difficult — small fonts, dim restaurant lighting, and the complete absence of allergen information make dining out stressful or even dangerous for many people. Menu Reader was built to make any menu instantly accessible to anyone, regardless of vision, reading ability, or dietary restrictions.
