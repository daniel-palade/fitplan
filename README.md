# FitPlan 💪

Aplicație de fitness, nutriție și sală cu AI (Google Gemini) — build către APK.

## Ce face

- Calculează BMR / TDEE / necesar caloric și macro în funcție de profil.
- **Pozezi mâncarea sau eticheta** → Gemini (AI) îți spune caloriile/macro, dacă e ok și ce ți-a mai rămas de mâncat.
- Bară de progres zilnică + recomandări de alimente.
- Plan de antrenament pe 5 zile (Push / Pull / Legs / Upper / Legs+Core) + fotbal marțea + cardio duminica.
- Urmărirea greutății și istoricul meselor.

## Cum obții APK-ul (gratuit, prin GitHub Actions)

1. **Crează un repo GitHub nou** (public sau privat) numit de exemplu `fitplan`.
2. **Încarcă tot conținutul folderului `fitness-app/`** în repo (fișierele din rădăcină, nu folderul în sine):
   - `www/` (index.html, style.css, app.js)
   - `package.json`, `capacitor.config.json`
   - `.github/workflows/build-apk.yml`
   - `README.md`, `.gitignore`
3. Du-te la tab-ul **Actions** → workflow-ul **„Build APK"** rulează automat la primul push.
4. Când se termină (verde), deschide run-ul și descarcă artefactul **`fitplan-apk`**.
5. Dezarhivează și instalează **`app-debug.apk`** pe telefon (permite „surse necunoscute" la prima instalare).

> Poți rula build-ul manual oricând din Actions → Build APK → „Run workflow".

## Cheia API Gemini (gratuită)

1. Intră pe https://aistudio.google.com
2. Autentifică-te cu contul Google.
3. **Get API key** → **Create API key** → copiază cheia.
4. La prima pornire a aplicației, lipește cheia (se salvează doar pe telefon).

## Personalizare model AI

Modelul implicit e `gemini-2.5-flash`. Îl poți schimba în `www/app.js` (const `model`) dacă Google introduce un model nou.

## Note

- APK-ul rezultat e **debug** (semnat cu cheie de test) — se instalează și funcționează normal, dar e pentru uz personal.
- Toate datele (profil, mese, greutate) se salvează local, pe dispozitiv. Nu se trimit către niciun server, în afară de request-urile directe către API-ul Gemini (doar poza și instrucțiunea).
