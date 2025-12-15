<?php
header('Content-Type: application/json');

// Datenbankverbindung (optional - für spätere Erweiterung)
// Für jetzt verwenden wir JSON-Dateien

$dataFile = 'family_data.json';

// GET - Daten laden
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($dataFile)) {
        $data = file_get_contents($dataFile);
        echo $data;
    } else {
        // Keine Beispieldaten - starte mit leerem Array
        echo json_encode([]);
    }
    exit;
}

// POST - Daten speichern
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if ($data !== null) {
        file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT));
        echo json_encode(['success' => true]);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Ungültige Daten']);
    }
    exit;
}

// PUT - Person aktualisieren
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $input = file_get_contents('php://input');
    $personData = json_decode($input, true);
    
    if (file_exists($dataFile)) {
        $data = json_decode(file_get_contents($dataFile), true);
        $index = array_search($personData['id'], array_column($data, 'id'));
        
        if ($index !== false) {
            $data[$index] = $personData;
            file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT));
            echo json_encode(['success' => true]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Person nicht gefunden']);
        }
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Keine Daten gefunden']);
    }
    exit;
}

// DELETE - Person löschen
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $input = file_get_contents('php://input');
    $params = json_decode($input, true);
    $personId = $params['id'] ?? null;
    
    if ($personId && file_exists($dataFile)) {
        $data = json_decode(file_get_contents($dataFile), true);
        $data = array_filter($data, function($person) use ($personId) {
            return $person['id'] != $personId;
        });
        $data = array_values($data); // Indizes neu nummerieren
        file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT));
        echo json_encode(['success' => true]);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Ungültige Anfrage']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Methode nicht erlaubt']);
?>

