MAYRA AI - API SERVER SETUP (Hindi)

Android project mein ab Gemini aur OpenAI ChatGPT ke liye backend connection code hai.
API keys ko APK/HTML mein hardcode NA karein. Keys sirf server ke environment variables mein rakhein.

SERVER START:
1. Node.js 20+ wale server/hosting par server/ folder upload karein.
2. server/.env.example ko .env banayein aur asli keys server ke environment variables mein set karein.
3. server folder mein `npm install` phir `npm start` chalayein.
4. `https://YOUR-SERVER/health` open karke {"ok":true,...} check karein.
5. Mayra AI app kholkar Backend server URL field mein `https://YOUR-SERVER` likhein, AI provider chunein aur Save dabayein.

API PROVIDERS:
- Google Gemini aur "Gemini API" ek hi generative AI service ko refer karte hain; isliye GEMINI_API_KEY Gemini option ko chalati hai.
- ChatGPT ke liye OpenAI API key (OPENAI_API_KEY) alag chahiye. ChatGPT subscription aur API billing alag ho sakte hain.
- "Google API" bahut broad naam hai. General Google API key se koi bhi Google service automatically nahi chalti. Yahan GOOGLE_API_KEY sirf fallback hai aur tabhi Gemini ke liye kaam karegi jab Gemini API enabled ho. Agar aapko Maps/YouTube/Search API chahiye, us service ka naam batana hoga.
- Default Gemini model GEMINI_MODEL=gemini-3.8-flash rakha hai, kyunki aapke error mein yahi model diya tha. Agar API kahe model unavailable, server par GEMINI_MODEL ko Google AI ke available model name se replace karein.
- OpenAI default model gpt-4.1-mini hai; zarurat par OPENAI_MODEL badal sakte hain.

IMPORTANT:
- Sirf app mein API key bhar dene se server apne-aap host nahi hota. Server ko internet par deploy karna aur uska HTTPS URL app mein set karna zaroori hai.
- Local Android phone par `localhost` phone ko hi refer karta hai, remote server ko nahi.
- Keys chat mein share na karein. Agar koi asli key pehle public/share ho chuki hai to provider dashboard se rotate/revoke karein.
- Is environment mein server ko deploy nahi kiya gaya aur APK/device par build/test nahi hua.


MAYRA AI MODULE FOLDERS:
- app/src/main/assets/www/modules/api/ : API client
- app/src/main/assets/www/modules/message-box/ : chat message box
- app/src/main/assets/www/modules/reader/ : Hindi/English text reader
In files ke use ka tarika modules/README_HINDI.txt mein hai. API keys server/.env mein hi rakhein.
