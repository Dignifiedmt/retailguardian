// ai.js
// IMPORTANT: Replace with your own Gemini API key.
// Get one from https://aistudio.google.com/app/apikey
const GEMINI_API_KEY = 'AIzaSyCFbde8SvnxiF_zjeLDXV3OMxnENEZj0ms'; // <-- PUT YOUR KEY HERE
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Ask Gemini a business question, tailored for small retailers.
 * @param {string} userQuestion
 * @returns {Promise<string>} AI response
 */
export async function askGemini(userQuestion) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
    throw new Error('Missing Gemini API key. Set it in ai.js');
  }

  const prompt = `
You are a friendly, patient business assistant for small retail shop owners in Nigeria.
The user may have limited education. Use very simple English. Avoid jargon.
Give practical, step-by-step advice. Be encouraging.

User question: "${userQuestion}"

Answer in 2-3 short paragraphs max.
`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API error');
  }

  const data = await response.json();
  const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return aiText || "I'm sorry, I couldn't generate a response. Please try again.";
}
