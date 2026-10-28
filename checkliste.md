# Definition of Done (DoD) – Projekt: Join

Bitte erfülle alle Punkte auf dieser Liste, bevor du das Projekt einreichst. Diese DoD dient als verbindlicher Qualitätsleitfaden für die Projektabgabe.

---

## 🚀 Die wichtigsten DoDs auf einen Blick

* **Gemeinsame Datenbasis:** Alle User (einschließlich Gast-Login) nutzen exakt dasselbe Board sowie dieselben Kontakte und Tasks.
* **Testdaten-Pflicht:** Vor der finalen Abgabe müssen mindestens **5 realistische Tasks** und **10 Kontakte** im System hinterlegt sein.
* **Keine HTML5-Standard-Validation:** Für Formulare (Login, Registrierung, Add Task, Kontakte) muss eine eigene Validierung programmiert werden, die sich exakt nach dem Figma-Design richtet.

---

## 🛠️ Technische Kernvorgaben & Code-Qualität

### Architektur & Dateien
* **MPA-Struktur:** Das Projekt ist als Multi-Page-Application (mehrere separate HTML-Seiten) aufzubauen.
* **Startseite:** Die Hauptseite muss zwingend `index.html` heißen.
* **Server-Upload:** Die einzelnen Projektdateien direkt auf den Server laden. Keine Unterordner für das Hauptverzeichnis verwenden (andernfalls kann kein Review stattfinden).
* **Ordnerstruktur:** Assets wie Bilder (`img`) und wiederverwendbare HTML-Templates gehören in separate Ordner.

### JavaScript & Clean Code Rules
* **Längenbegrenzung:** Maximal **400 Zeilen Code (LOC)** pro Datei.
* **Funktionsgröße:** Eine Funktion darf maximal **14 Zeilen** lang sein (ausgenommen reiner HTML-String-Inhalt).
* **Single Responsibility:** Jede Funktion übernimmt exakt eine Aufgabe.
* **Naming Convention:** Variablen, Funktionen und Dateinamen konsequent in `camelCase` benennen (erster Buchstabe klein).
* **Dokumentation:** Alle Funktionen müssen nach dem offiziellen **JSDoc-Standard** dokumentiert werden.
* **Dynamischer Content:** Statischer HTML-Code darf nicht über JavaScript generiert werden. Erstellter Content muss sofort für den User sichtbar sein.
* **Konsole:** Es dürfen keine Konsolenfehler, Fehlermeldungen oder `console.log()`-Ausgaben in der finalen Version vorhanden sein.

### UI & Design (CSS)
* **Interaktions-Feedback:** Hover-Effekte (ohne dass sich Menüpunkte verschieben!), Toast-Messages und Transitions auf Klick-Elementen (Richtwert: zwischen 75ms und 125ms).
* **Reset-Vorgaben:** Buttons benötigen die CSS-Eigenschaft `cursor: pointer;`. Inputs und Buttons dürfen keinen Standard-Rahmen haben (`border: unset;`).
* **Responsiveness:** Volle Funktion bei jeder Auflösung bis zu einer Mindestbreite von **320px**. 
* **Großbild-Begrenzung:** Große Monitore benötigen eine Content-Begrenzung (`max-width: 1440px` oder `1920px` / linksbündig) – dies gilt nicht für reine Design-Elemente. Keine horizontalen Scrollbalken erlauben.
* **Mobile Ansicht:** Standardmäßig ist der Landscape-Modus auf mobilen Geräten zu deaktivieren, außer er ist speziell optimiert.

---

## 📋 Funktionsbereiche & User Stories

### 1. Benutzeraccount & Administration
* **Registrierung:** Formular mit Name, E-Mail und Passwort. Der Registrieren-Button ist gesperrt, bis alle Pflichtfelder ausgefüllt und die Datenschutzerklärung akzeptiert wurden.
* **Login:** Formular für E-Mail und Passwort mit Fehlermeldungen bei Falscheingabe.
* **Gast-Login:** Ermöglicht vollen Testzugriff (inklusive Erstellen, Bearbeiten und Löschen von Daten).
* **Routenschutz:** Nicht angemeldete Besucher werden von geschützten internen Seiten (`summary.html`, `board.html`, `contacts.html` etc.) automatisch auf die Login-Seite zurückgeleitet.
* **Dashboard:** Dynamische, tageszeitabhängige Begrüßung („Good morning, [Name]“) sowie numerische Anzeigen für Task-Status und die nächste anstehende Deadline.

### 2. Kanbanboard & Taskmanagement
* **Board-Layout:** Vier Spalten (`ToDo`, `In Progress`, `Awaiting Feedback`, `Done`). Leere Spalten zeigen einen entsprechenden Hinweistext an.
* **Karten-Details:** Jede Task-Karte zeigt Kategorie, Titel, Beschreibungs-Vorschau, Initialen der zugewiesenen Kontakte und die Priorität. Ein Klick öffnet die vollständige Detailansicht.
* **Suchfunktion:** Echtzeit-Filterung nach Titel und Beschreibung inklusive „Keine Ergebnisse gefunden“-Hinweis.
* **Subtask-Fortschritt:** Tasks mit Unteraufgaben zeigen eine Fortschrittsanzeige (z. B. Balkendiagramm + Text „5 von 7 Subtasks erledigt“) bei Hover oder Klick.
* **Drag & Drop:**
  * Visuelles Feedback während des Verschiebens (z. B. leichte Drehung der Karte).
  * Anzeige einer gestrichelten Box (`dashed box / highlight`) in der Zielspalte, sobald eine Karte darüber gehalten wird.
  * *Mobil-Lösung:* Spalten werden vertikal angeordnet. Da Touch-Drag&Drop unter iOS/Safari Probleme machen kann, wird ein kleiner Pfeil oben rechts auf der Karte empfohlen, der ein Popup-Menü zur Statusänderung öffnet.
* **Task-Formular:**
  * *Pflichtfelder:* Titel, Fälligkeitsdatum (`Due Date`) und Kategorie („Technical Tasks“ oder „User Story“).
  * *Priorität:* Auswahl zwischen „urgent“, „medium“ und „low“ (Standardwert: „Medium“ vorselektiert).
  * *Assigned to:* Dropdown-Menü zur Auswahl von **Kontakten** (wichtig für Arbeitgeber zum Testen). Das Menü muss sich automatisch schließen, wenn der User daneben klickt.
  * *Subtask-Feld:* Drücken der `Enter`-Taste im Subtask-Feld fügt die Unteraufgabe zur Liste hinzu und leert das Feld. Der Haupt-Task darf dabei **nicht** abgesendet werden.

### 3. Verwaltung der Kontakte
* **Listenansicht:** Alphabetisch sortiert und nach Anfangsbuchstaben gruppiert. E-Mail-Adresse steht direkt unter dem Namen.
* **Detailansicht:** Zeigt Name, E-Mail-Adresse und Telefonnummer des Kontakts sowie Optionen zum Bearbeiten und Löschen.
* **Lösch-Logik:** Wird ein Kontakt gelöscht, muss dieser automatisch aus allen Aufgaben entfernt werden, denen er zuvor zugewiesen war.
* **Eigenprofil:** Der eigene Account ist ebenfalls in der Kontaktliste sichtbar und editierbar.

### 4. Sonstiges
* **Rechtliches:** Verlinkung und Bereitstellung einer „Legal Notice“ (Impressum) und „Privacy Policy“ (Datenschutzerklärung).
* **Echte Daten:** Verwendung von realitätsnahen Namen auf den Rechtsschmankerl-Seiten (kein Lorem Ipsum).

---

## 📦 GitHub-Richtlinien
* **Pflicht:** Kontinuierliche Nutzung von Anfang an. Mindestens ein Commit pro Arbeitssitzung und Teilnehmer.
* **Repository-Status:** Das gemeinsame Repository muss auf **public** stehen. After-Projekt-Fork für jedes Gruppenmitglied empfohlen.
* **Commit-Messages:** Aussagekräftige Beschreibungen wählen.
* **Datenschutz:** Eine `.gitignore` nutzen. Sensible Daten (API-Credentials, E-Mail-Passwörter etc.) dürfen unter keinen Umständen im Repository landen.
