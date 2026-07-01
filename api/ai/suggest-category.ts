import { GoogleGenAI } from '@google/genai';
// ... باقی امپورٹس وہی رہیں گی

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { query } = req.body;

  try {
    // 1. ڈیٹا بیس سے کچھ شاپس کا ڈیٹا لائیں
    const snapshot = await db.collection('shops').limit(10).get();
    let shopsData = snapshot.docs.map(doc => doc.data());

    // 2. جدید ماڈل کا استعمال کریں (gemini-2.0-flash)
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      You are 'Zunex Booking Assistant', a friendly, energetic, and helpful human-like assistant.
      Here is the available shop data: ${JSON.stringify(shopsData)}
      
      User's query: "${query}"
      
      Instructions:
      - Talk to the user like a friend. Be conversational and helpful.
      - If they ask for a service, find it from the shop list provided.
      - If you don't have exactly what they asked, suggest the closest alternative from the list.
      - Use emojis! Be fun! 😊
      - DO NOT just say 'Contact Us' unless they are really angry or report a technical bug.
      - If they just say 'Hi', keep the conversation going by asking: "What service can I help you book today?"
    `;

    const result = await model.generateContent(prompt);
    res.status(200).json({ reply: result.response.text() });

  } catch (error) {
    // اب یہاں بھی اسے دوستانہ رکھیں
    res.status(200).json({ reply: "I'm still here! I had a small hiccup. What service were we talking about? 🛠️" });
  }
}
