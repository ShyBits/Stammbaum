# Stammbaum Website

Eine moderne, clean gestaltete Website zur Verwaltung von Familienstammbäumen.

## Features

- **Navigationsmenü** links mit abgerundeten quadratischen Buttons
- **Stammbaum-Darstellung** rechts (oben ältere Generationen, unten neuere)
- **Personen hinzufügen/bearbeiten** über ein Modal
- **Personen suchen** im Stammbaum
- **Daten exportieren** als JSON
- **Responsive Design** für verschiedene Bildschirmgrößen

## Technologien

- PHP (für Backend-Datenverwaltung)
- HTML5
- CSS3 (modern, ohne Gradients)
- JavaScript (ES6+)

## Installation

1. Stellen Sie sicher, dass Sie einen PHP-Server haben (z.B. XAMPP, WAMP, oder PHP Built-in Server)
2. Kopieren Sie alle Dateien in Ihr Web-Verzeichnis
3. Öffnen Sie `index.php` im Browser

### Mit PHP Built-in Server:

```bash
php -S localhost:8000
```

Dann öffnen Sie `http://localhost:8000` im Browser.

## Verwendung

- **Person hinzufügen**: Klicken Sie auf "Person hinzufügen" im Navigationsmenü
- **Person bearbeiten**: Wählen Sie eine Person im Stammbaum aus und klicken Sie auf "Bearbeiten"
- **Person suchen**: Verwenden Sie die Suchfunktion im Navigationsmenü
- **Daten exportieren**: Exportieren Sie den Stammbaum als JSON-Datei

## Dateistruktur

- `index.php` - Haupt-HTML-Datei
- `style.css` - Styling
- `script.js` - JavaScript-Funktionalität
- `data.php` - PHP-Backend für Datenverwaltung
- `family_data.json` - Wird automatisch erstellt für Datenspeicherung

## Design

- Clean und modern
- Keine Gradients
- Abgerundete Buttons
- Responsive Layout
- Smooth Transitions

