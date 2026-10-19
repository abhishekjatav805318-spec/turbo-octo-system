GOOGLE LOGIN SETUP (Hindi)

1) console.cloud.google.com -> naya project -> APIs & Services -> OAuth consent screen (External) bharein.
2) Credentials -> Create credentials -> OAuth client ID:
   a) "Web application"  -> Client ID copy karein  (yahi GOOGLE_WEB_CLIENT_ID hai)
   b) "Android" -> Package name: com.mahi.aiassistant, SHA-1: aapki build key ka SHA-1
      (AndroidIDE/Android Studio: ./gradlew signingReport  ya  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android)
3) app/src/main/res/values/strings.xml mein PASTE_WEB_CLIENT_ID_HERE ki jagah Web Client ID daalein.
4) Server (Render) Environment Variables:
   GEMINI_API_KEY, GOOGLE_WEB_CLIENT_ID (wahi Web Client ID), SESSION_SECRET (koi lamba random text)
5) www/modules/live/config.js mein MAHI_SERVER_URL apna https server URL likhein (ya app ke Settings mein).
6) OAuth consent screen "Testing" mode mein ho to Test users mein apni Gmail add karein.
