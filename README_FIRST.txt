MindNest AI — Gemini migration kit

IMPORTANT: This is a standalone starter, not a guaranteed drop-in replacement for your existing app because I have not seen your current server.js or frontend.

Safest steps:
1. Download your current GitHub repository as a ZIP backup before changing anything.
2. This kit contains a simple working Gemini chat website, but it does not preserve your existing upload feature or exact design.
3. Do not replace your whole repository unless you are willing to use this starter's interface.
4. In Render > your service > Environment, add GEMINI_API_KEY with your actual Google AI Studio key. Never put the key in GitHub.
5. This app expects POST /api/chat with JSON {"message":"your question"}.
6. Gemini usage is subject to Google's model, region and quota limits.
