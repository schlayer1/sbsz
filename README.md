# SBSZ IHK-Prüfungsportal (Digitaler Markierungsbogen)

Responsive Web-Applikation für das Staatliche Berufsschulzentrum (SBSZ) zur digitalen Bearbeitung, Auswertung und didaktischen KI-Analyse von IHK-Prüfungsbögen (Muster: *Abschlussprüfung Teil 2, Sommer 2025, Zerspanungsmechaniker/-in, Fertigungstechnik Teil A, Berufs-Nr. 4060*).

---

## 🌟 Kernfunktionen

1. **Split-Screen Prüfungs-Werkbank**:
   - **Aufgabenheft (PDF-Viewer)**: Integrierter hochauflösender PDF-Viewer mit Zoom (60%–200%), Blätterfunktion (Seiten 1–12), Schnellzugriff auf technische Zeichnungen (*Bild a, Seite 10*) und direkter Seitennavigation.
   - **Digitaler IHK-Markierungsbogen**: 28 Aufgaben mit authentischen Kreisen (1–5), IHK-Abwahl-Button `[A]` und Kennzeichnung der 8 gesperrten Aufgaben.
   - **Mobile Optimierung**: Flüssiges Umschalten per Daumen-Tab zwischen *Aufgabenheft* und *Antwortbogen*.

2. **IHK-Regelwerk & Auswertungs-Engine**:
   - 25 von 28 Aufgaben werden gewertet (max. 25 Punkte).
   - 3 Aufgaben können abgewählt werden (`[A]`).
   - 8 Aufgaben dürfen laut IHK-Vorgabe nicht abgewählt werden: `6, 7, 8, 9, 12, 16, 20, 28`.
   - Automatische IHK-Ersatzabwahl: Werden weniger als 3 Aufgaben abgewählt, streicht das System bei der Abgabe automatisch die letzten abwählbaren Aufgaben.
   - Offizieller IHK-Notenschlüssel (1 bis 6).

3. **Schüler-Persistenz & Auto-Save**:
   - Niedrigschwellige Anmeldung mit Name, Vorname und Klasse (z. B. `ZM22A`).
   - Automatisches Speichern im Hintergrund (Auto-Save).
   - Nahtlose Wiederaufnahme laufender Prüfungen auf jedem Endgerät.

4. **Passwortgeschütztes Lehrer-Dashboard (Standard-PIN: `1234`)**:
   - **Prüfungsverwaltung**: Prüfungshefte hinterlegen und für spezifische Klassen oder Schüler freischalten.
   - **Live-Monitor**: Übersicht über alle Schüler, deren Punkte, Noten, Einreichungsstatus und individuelle Antwortbögen.
   - **Klassen-Fehleranalyse (Heatmap)**: Identifiziert pro Aufgabe die Fehlerquote des gesamten Jahrgangs für gezielten Förderunterricht.
   - **Google Gemini KI-Feedback**: Generiert mit einem Klick didaktisch fundierte Auswertungen (Stärken, Fehlerschwerpunkte, gezielte Verweise auf das *Tabellenbuch Metall*, PAL-Handbuch und DIN-Normen), die vor der Freigabe an den Schüler editiert werden können.
   - **Cloud-Speicher Assistent**: Integrierte Schritt-für-Schritt-Anleitung zur Ersteinrichtung des 100% kostenlosen Firebase Spark-Plans (keine Kreditkarte erforderlich).

---

## 🚀 Technologie-Stack

- **Frontend**: Vite, React 19, TypeScript, Tailwind CSS, Lucide Icons, Canvas-Confetti
- **Backend & Cloud**: Firebase Firestore (Datenbank), Firebase Cloud Storage (PDF-Speicher)
- **Offline-First**: Lokaler Fallback via `IndexedDB` & `localStorage`
- **KI-Integration**: Google Gemini API mit automatischer Kaskade (`gemini-flash-lite-latest` $\rightarrow$ `gemini-3-flash-preview`) und Schul-Fallback

---

## 🛠️ Lokale Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev

# Produktions-Build erstellen
npm run build
```

---

## ☁️ Bereitstellung auf Vercel

1. In [Vercel](https://vercel.com) das GitHub-Repository `schlayer1/sbsz` importieren.
2. Framework Preset: **Vite**.
3. Umgebungsvariablen unter **Settings $\rightarrow$ Environment Variables**:
   - `VITE_GEMINI_API_KEY`: Dein persönlicher Google Gemini API-Schlüssel
   - `VITE_FIREBASE_PROJECT_ID`: Deine Firebase Projekt-ID (optional)
   - `VITE_FIREBASE_API_KEY`: Dein Firebase Web-API-Schlüssel (optional)
4. Auf **Deploy** klicken.
