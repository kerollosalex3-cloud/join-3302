# Join

Join ist ein responsives Kanban-Tool zur Aufgaben- und Kontaktverwaltung. Das Projekt entstand als Lernprojekt im Rahmen eines Webentwicklungs-Bootcamps.

## Funktionen

- Anmeldung mit E-Mail-Adresse und Passwort oder als Gast
- Aufgaben erstellen, bearbeiten und löschen
- Aufgaben auf einem Kanban-Board verwalten und per Drag-and-drop verschieben
- Aufgaben nach Titel oder Beschreibung durchsuchen
- Aufgabendetails mit Priorität, Fälligkeitsdatum, Zuständigkeiten und Unteraufgaben anzeigen
- Kontakte erstellen, bearbeiten, löschen und suchen
- Kontakte Aufgaben zuweisen
- Dashboard mit einer Übersicht der Aufgaben
- Responsive Darstellung für Desktop und mobile Geräte

## Technologien

- HTML
- CSS
- JavaScript (ES Modules)
- Firebase Authentication
- Firebase Realtime Database

## Projekt lokal starten

Das Projekt benötigt keinen Paketmanager. Starte es über einen lokalen Webserver, da die Anwendung JavaScript-Module und Firebase verwendet.

1. Repository klonen:

   ```bash
   git clone <REPOSITORY-URL>
   ```

2. Den Projektordner in Visual Studio Code öffnen.

3. `index.html` über eine lokale Server-Erweiterung starten, zum Beispiel **Live Server**.

> Die Anwendung sollte nicht direkt über `file://` geöffnet werden.

## Firebase einrichten

Die Firebase-Konfiguration befindet sich in `scripts/firebase.js`. Für eine eigene Installation:

1. Ein Firebase-Projekt in der [Firebase Console](https://console.firebase.google.com/) erstellen.

2. **Firebase Authentication** und **Realtime Database** aktivieren.

3. Die Firebase-Konfiguration in `scripts/firebase.js` durch die Daten des eigenen Projekts ersetzen.

4. Die gewünschten Anmeldeanbieter aktivieren, darunter gegebenenfalls E-Mail/Passwort und anonymen Login.

5. Sichere Datenbankregeln festlegen.

6. Die verwendete Hosting-Domain in Firebase für die Anmeldung autorisieren.

## Projektstruktur

```text
.
├── assets/       # Icons und Schriftdateien
├── CSS/          # Stylesheets
├── html/         # App-Seiten
├── scripts/      # JavaScript-Module
├── index.html    # Login-Seite
├── script.js     # Gemeinsam verwendete Funktionen
└── style.css     # Globale Styles
```

## Hinweis

Join ist ein Lernprojekt und nicht für den produktiven Einsatz in Unternehmen vorgesehen.
   
