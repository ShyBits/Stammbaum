// Stammbaum Daten
let familyTree = [];
let relationships = [];
let selectedPerson = null;
let editingPersonId = null;

// Map variables
let locationMap = null;
let locationMarker = null;

// File upload variables
let profileImageData = null;
let uploadedFiles = [];

// Keine Beispieldaten - Stammbaum startet leer

// Initialisierung
document.addEventListener('DOMContentLoaded', function() {
    // Lösche Dummy-Daten aus localStorage (einmalig beim ersten Start nach Entfernung der Dummy-Daten)
    const hasClearedDummyData = localStorage.getItem('hasClearedDummyData');
    if (!hasClearedDummyData) {
        // Lösche alle Daten, damit der Stammbaum leer startet
        localStorage.removeItem('familyTree');
        localStorage.removeItem('relationships');
        localStorage.setItem('hasClearedDummyData', 'true');
    }
    
    loadFamilyTree();
    loadRelationships();
    
    // Falls noch Dummy-Daten vorhanden sind (z.B. Hans, Maria, Thomas, Anna, Max, Lisa), entferne sie
    if (familyTree.length > 0) {
        const dummyNames = ['Hans', 'Maria', 'Thomas', 'Anna', 'Max', 'Lisa'];
        const dummyLastNames = ['Müller'];
        const hasDummyData = familyTree.some(person => 
            dummyNames.includes(person.firstName) && dummyLastNames.includes(person.lastName)
        );
        
        if (hasDummyData) {
            // Entferne alle Dummy-Daten
            familyTree = [];
            relationships = [];
            localStorage.removeItem('familyTree');
            localStorage.removeItem('relationships');
    saveFamilyTree();
    saveRelationships();
        }
    }
    
    // Stammbaum startet jetzt leer - keine Dummy-Daten mehr
    
    // Erstelle Beispiel-Familie wenn Stammbaum leer ist
    if (familyTree.length === 0) {
        createExampleFamily();
    }
    
    showView('overview'); // Starte mit Übersicht
    populateParentSelect();
    populateRelationshipSelects();
    initLocationMap();
});

// Daten laden (aus localStorage)
function loadFamilyTree() {
    const saved = localStorage.getItem('familyTree');
    if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
            familyTree = parsed;
    } else {
            familyTree = [];
            saveFamilyTree();
        }
    } else {
        familyTree = [];
        saveFamilyTree();
    }
}

// Beziehungen laden
function loadRelationships() {
    const saved = localStorage.getItem('relationships');
    if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
            relationships = parsed;
    } else {
            relationships = [];
            saveRelationships();
        }
    } else {
        relationships = [];
        saveRelationships();
    }
}

// Daten speichern
function saveFamilyTree() {
    localStorage.setItem('familyTree', JSON.stringify(familyTree));
}

// Beziehungen speichern
function saveRelationships() {
    localStorage.setItem('relationships', JSON.stringify(relationships));
}

// Pan/Zoom variables
let treePanX = 0;
let treePanY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;

// Stammbaum rendern
function renderTree() {
    // Stelle sicher, dass alle Personen ohne Eltern Empty Slot Eltern bekommen
    ensureTwoParentsForAllChildren();
    
    const container = document.getElementById('treeContainer');
    
    if (familyTree.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 3rem;">Keine Personen im Stammbaum. Klicken Sie auf "Person hinzufügen" um zu beginnen.</p>';
        return;
    }

    // Positionen basierend auf Beziehungen berechnen
    const positions = calculatePositions();
    
    // SVG für Linien erstellen - sicherstellen dass es groß genug ist
    const svgWidth = Math.max(1200, positions.maxX + 200);
    const svgHeight = Math.max(800, positions.maxY + 200);
    
    let html = `<div class="tree-wrapper" id="treeWrapper">
        <svg class="relationship-lines" width="${svgWidth}" height="${svgHeight}" style="position: absolute; top: 0; left: 0;">
            <g class="relationship-lines-group" style="pointer-events: stroke;">
                ${renderRelationshipLines(positions)}
            </g>
        </svg>
        <div class="tree" style="width: ${svgWidth}px; min-height: ${svgHeight}px; position: relative;">`;
    
    // Personen rendern
    familyTree.forEach(person => {
        const pos = positions.persons[person.id];
        if (!pos) return;
        
        // Überspringe Empty Slots komplett
        if (person.isEmptySlot === true) return;
        const birthYear = person.birthDate ? new Date(person.birthDate).getFullYear() : '';
        const deathYear = person.deathDate ? new Date(person.deathDate).getFullYear() : '';
        const dateStr = birthYear ? (deathYear ? `${birthYear} - ${deathYear}` : `*${birthYear}`) : '';
        const location = person.location || '';
        const profileImage = person.profileImage || '';
        const defaultImage = person.gender === 'f' ? '👩' : person.gender === 'm' ? '👨' : '👤';
        const name = `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Unbekannt';
        
        // Prüfe ob Person adoptive Eltern hat
        const hasAdoptiveParents = relationships.some(rel => 
            rel.person2Id === person.id && 
            (rel.type === 'parent-child-adoptive')
        );
        
        html += `
            <div class="person-card" onclick="selectPerson(${person.id})" oncontextmenu="showContextMenu(event, ${person.id}); return false;" data-id="${person.id}" 
                 style="position: absolute; left: ${pos.x}px; top: ${pos.y}px;">
                <div class="person-image">
                    ${profileImage ? `<img src="${profileImage}" alt="${name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div class="person-image-placeholder" style="display: none;">${defaultImage}</div>` : 
                    `<div class="person-image-placeholder">${defaultImage}</div>`}
                </div>
                <div class="person-name">${name}</div>
                ${dateStr ? `<div class="person-dates">${dateStr}</div>` : ''}
                ${location ? `<div class="person-location">${location}</div>` : ''}
                ${hasAdoptiveParents ? '<div class="adopted-label">Adoptiert</div>' : ''}
                <div class="person-more">click to read more about your ancestor</div>
            </div>
        `;
    });
    
    html += '</div></div>';
    container.innerHTML = html;
    
    // Pan event listeners hinzufügen
    setupTreePanning();
    
    // Hover-Tooltips für Beziehungslinien hinzufügen
    setupRelationshipLineTooltips();
    
    // Scroll zur neuesten Generation (unten)
    scrollToLatestGeneration(positions);
    
    // Ausgewählte Person markieren
    if (selectedPerson) {
        const card = document.querySelector(`.person-card[data-id="${selectedPerson}"]`);
        if (card) {
            card.classList.add('selected');
        }
    }
}

// Hover-Tooltips für Beziehungslinien
function setupRelationshipLineTooltips() {
    // Warte kurz, damit das DOM vollständig gerendert ist
    setTimeout(() => {
        const svg = document.querySelector('.relationship-lines');
        if (!svg) return;
        
        let tooltip = document.getElementById('relationship-tooltip');
        
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'relationship-tooltip';
            tooltip.className = 'relationship-tooltip';
            document.body.appendChild(tooltip);
        }
        
        // Verwende Event Delegation auf dem SVG-Container
        // Entferne alte Event Listener
        const newSvg = svg.cloneNode(true);
        svg.parentNode.replaceChild(newSvg, svg);
        
        // Füge Event Listener zum SVG hinzu (Event Delegation)
        newSvg.addEventListener('mouseover', (e) => {
            // Prüfe ob das Ziel eine relationship-line ist
            const line = e.target.closest('.relationship-line') || e.target;
            if (line && line.classList.contains('relationship-line')) {
                const relationship = line.getAttribute('data-relationship') || 'Beziehung';
                tooltip.textContent = relationship;
                tooltip.style.display = 'block';
            }
        });
        
        newSvg.addEventListener('mousemove', (e) => {
            const line = e.target.closest('.relationship-line') || e.target;
            if (line && line.classList.contains('relationship-line')) {
                tooltip.style.left = (e.clientX + 10) + 'px';
                tooltip.style.top = (e.clientY + 10) + 'px';
            }
        });
        
        newSvg.addEventListener('mouseout', (e) => {
            // Prüfe ob wir wirklich das SVG verlassen haben
            if (!e.relatedTarget || !newSvg.contains(e.relatedTarget)) {
                tooltip.style.display = 'none';
            }
        });
        
        // Stelle sicher, dass alle Linien pointer-events haben
        newSvg.querySelectorAll('.relationship-line').forEach(line => {
            line.style.pointerEvents = 'stroke';
            line.style.cursor = 'pointer';
        });
    }, 100);
}

// Tree Panning Setup
function setupTreePanning() {
    const container = document.getElementById('treeContainer');
    const wrapper = document.getElementById('treeWrapper');
    if (!container || !wrapper) return;
    
    // Reset pan position
    treePanX = 0;
    treePanY = 0;
    updateTreeTransform();
    
    // Mouse events
    container.addEventListener('mousedown', (e) => {
        if (e.target.closest('.person-card')) return; // Don't pan when clicking on cards
        isPanning = true;
        panStartX = e.clientX - treePanX;
        panStartY = e.clientY - treePanY;
        container.style.cursor = 'grabbing';
    });
    
    container.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        e.preventDefault();
        treePanX = e.clientX - panStartX;
        treePanY = e.clientY - panStartY;
        updateTreeTransform();
    });
    
    container.addEventListener('mouseup', () => {
        isPanning = false;
        container.style.cursor = 'grab';
    });
    
    container.addEventListener('mouseleave', () => {
        isPanning = false;
        container.style.cursor = 'grab';
    });
}

// Update tree transform
function updateTreeTransform() {
    const wrapper = document.getElementById('treeWrapper');
    if (wrapper) {
        // Transform auf wrapper anwenden - SVG und tree div sind beide drin
        wrapper.style.transform = `translate(${treePanX}px, ${treePanY}px)`;
        // Stelle sicher, dass SVG sichtbar bleibt
        const svg = wrapper.querySelector('.relationship-lines');
        if (svg) {
            svg.style.transform = 'none'; // SVG sollte nicht zusätzlich transformiert werden
        }
    }
}

// Scroll to latest generation (bottom)
function scrollToLatestGeneration(positions) {
    setTimeout(() => {
        const container = document.getElementById('treeContainer');
        const wrapper = document.getElementById('treeWrapper');
        if (!container || !wrapper) return;
        
        // Find highest Y position (newest generation at bottom)
        let maxY = 0;
        Object.values(positions.persons).forEach(pos => {
            maxY = Math.max(maxY, pos.y);
        });
        
        // Center the view on the bottom
        const containerHeight = container.clientHeight;
        const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
        const targetY = maxY + 200; // Add some padding
        
        // Calculate pan position to show bottom
        treePanY = -(targetY - containerHeight / 2);
        updateTreeTransform();
    }, 100);
}

// Positionen basierend auf Beziehungen berechnen - EINFACHES TOP-TO-BOTTOM LAYOUT
function calculatePositions() {
    const positions = { persons: {}, maxX: 0, maxY: 0 };
    
    // Konstanten
    const CARD_WIDTH = 250;
    const CARD_HEIGHT = 280;
    const HORIZONTAL_SPACING = 60;
    const VERTICAL_SPACING = 400;
    const SPOUSE_SPACING = 30;
    const TOP_MARGIN = 50;
    
    // Filtere Empty Slots komplett heraus
    const realPersons = familyTree.filter(person => !person.isEmptySlot);
    
    if (realPersons.length === 0) return positions;
    
    // 1. Baue Datenstrukturen auf
    const personMap = new Map();
    realPersons.forEach(person => {
        personMap.set(person.id, person);
    });
    
    // Parent-Child Beziehungen (nur echte Personen)
    const parentChildMap = new Map();
    const childParentMap = new Map();
    
    relationships.forEach(rel => {
        if (rel.type === 'parent-child' || rel.type === 'parent-child-biological' || 
            rel.type === 'parent-child-step' || rel.type === 'parent-child-adoptive') {
            const parentId = rel.person1Id;
            const childId = rel.person2Id;
            
            // Nur wenn beide Personen existieren
            if (!personMap.has(parentId) || !personMap.has(childId)) return;
            
            if (!parentChildMap.has(parentId)) {
                parentChildMap.set(parentId, []);
            }
            parentChildMap.get(parentId).push(childId);
            
            if (!childParentMap.has(childId)) {
                childParentMap.set(childId, []);
            }
            childParentMap.get(childId).push(parentId);
        }
    });
    
    // Ehepartner-Beziehungen (nur echte Personen)
    const spouseMap = new Map();
    relationships.forEach(rel => {
        if (rel.type === 'spouse') {
            // Nur wenn beide Personen existieren
            const person1 = personMap.get(rel.person1Id);
            const person2 = personMap.get(rel.person2Id);
            if (!person1 || !person2) return;
            
            if (!spouseMap.has(rel.person1Id)) spouseMap.set(rel.person1Id, []);
            if (!spouseMap.has(rel.person2Id)) spouseMap.set(rel.person2Id, []);
            spouseMap.get(rel.person1Id).push(rel.person2Id);
            spouseMap.get(rel.person2Id).push(rel.person1Id);
        }
    });
    
    // 2. Berechne Generationen (Levels) - nur für echte Personen
    // Level 0 = Älteste Generation (oben), höhere Level = Jüngere Generationen (unten)
    const levels = new Map();
    const visited = new Set();
    
    function calculateLevel(personId, level = 0) {
        if (!personMap.has(personId)) return;
        if (visited.has(personId)) {
            const existingLevel = levels.get(personId) || 0;
            // Verwende immer den niedrigeren Level (ältere Generation = weiter oben)
            if (level < existingLevel) {
                levels.set(personId, level);
                // Rekalkuliere alle Kinder mit neuem Level
                const children = parentChildMap.get(personId) || [];
                children.forEach(childId => {
                    calculateLevel(childId, level + 1);
                });
            }
            return;
        }
        
        visited.add(personId);
        levels.set(personId, level);
        
        // Rekursiv: Kinder sind immer eine Generation tiefer (Level + 1)
        const children = parentChildMap.get(personId) || [];
        children.forEach(childId => {
            calculateLevel(childId, level + 1);
        });
    }
    
    // Finde Wurzeln (Personen ohne Eltern) - diese sind Generation 0 (oben)
    // ABER: Personen, die keine Eltern haben, aber Ehepartner mit Eltern haben, sollten nicht als roots behandelt werden
    const roots = [];
    realPersons.forEach(person => {
        if (!childParentMap.has(person.id) || childParentMap.get(person.id).length === 0) {
            // Prüfe ob diese Person einen Ehepartner mit Eltern hat
            const spouses = spouseMap.get(person.id) || [];
            const spouseHasParents = spouses.some(spouseId => {
                const spouse = personMap.get(spouseId);
                if (!spouse) return false;
                return childParentMap.has(spouseId) && childParentMap.get(spouseId).length > 0;
            });
            
            // Nur als root behandeln, wenn kein Ehepartner Eltern hat
            // Wenn Ehepartner Eltern hat, wird das Level später durch Ehepartner-Anpassung gesetzt
            if (!spouseHasParents) {
                roots.push(person.id);
            }
        }
    });
    
    if (roots.length === 0 && realPersons.length > 0) {
        // Falls keine Wurzeln gefunden, nehme alle Personen als Wurzeln
        roots.push(...realPersons.map(p => p.id));
    }
    
    // Berechne Level für alle Wurzeln (starte bei Level 0 = oben)
    roots.forEach(rootId => {
        calculateLevel(rootId, 0);
    });
    
    // Stelle sicher, dass Ehepartner in der gleichen Generation sind
    // Wiederhole dies mehrmals, um alle Ehepartner-Ketten zu erfassen
    for (let i = 0; i < 10; i++) {
        let changed = false;
        relationships.forEach(rel => {
            if (rel.type === 'spouse') {
                const person1Level = levels.get(rel.person1Id);
                const person2Level = levels.get(rel.person2Id);
                
                if (person1Level !== undefined && person2Level === undefined) {
                    // Person 1 hat Level, Person 2 nicht -> setze Person 2 auf gleiches Level
                    levels.set(rel.person2Id, person1Level);
                    // Rekalkuliere Kinder von Person 2 mit neuem Level
                    const children = parentChildMap.get(rel.person2Id) || [];
                    children.forEach(childId => {
                        calculateLevel(childId, person1Level + 1);
                    });
                    changed = true;
                } else if (person2Level !== undefined && person1Level === undefined) {
                    // Person 2 hat Level, Person 1 nicht -> setze Person 1 auf gleiches Level
                    levels.set(rel.person1Id, person2Level);
                    // Rekalkuliere Kinder von Person 1 mit neuem Level
                    const children = parentChildMap.get(rel.person1Id) || [];
                    children.forEach(childId => {
                        calculateLevel(childId, person2Level + 1);
                    });
                    changed = true;
                } else if (person1Level !== undefined && person2Level !== undefined && person1Level !== person2Level) {
                    // Beide haben Level, aber unterschiedlich
                    // WICHTIG: Wenn eine Person bereits Kinder hat, sollte sie nicht auf ein niedrigeres Level gesetzt werden
                    // Verwende das Level der Person, die bereits Kinder hat, oder das höhere Level (jüngere Generation)
                    const person1HasChildren = parentChildMap.has(rel.person1Id) && parentChildMap.get(rel.person1Id).length > 0;
                    const person2HasChildren = parentChildMap.has(rel.person2Id) && parentChildMap.get(rel.person2Id).length > 0;
                    
                    let targetLevel;
                    if (person1HasChildren && !person2HasChildren) {
                        // Person 1 hat Kinder -> verwende Level von Person 1
                        targetLevel = person1Level;
                    } else if (person2HasChildren && !person1HasChildren) {
                        // Person 2 hat Kinder -> verwende Level von Person 2
                        targetLevel = person2Level;
                    } else {
                        // Beide haben Kinder oder keiner -> verwende das höhere Level (jüngere Generation)
                        // Das stellt sicher, dass Ehepartner nicht über ihre Kinder positioniert werden
                        targetLevel = Math.max(person1Level, person2Level);
                    }
                    
                    if (levels.get(rel.person1Id) !== targetLevel || levels.get(rel.person2Id) !== targetLevel) {
                        // Aktualisiere beide Ehepartner
                        levels.set(rel.person1Id, targetLevel);
                        levels.set(rel.person2Id, targetLevel);
                        // Rekalkuliere Kinder beider Personen mit neuem Level
                        const children1 = parentChildMap.get(rel.person1Id) || [];
                        const children2 = parentChildMap.get(rel.person2Id) || [];
                        const allChildren = [...new Set([...children1, ...children2])];
                        allChildren.forEach(childId => {
                            calculateLevel(childId, targetLevel + 1);
                        });
                        changed = true;
                    }
            }
        }
    });
        if (!changed) break; // Keine Änderungen mehr, abbrechen
    }
    
    // Finale Sicherheit: Alle Personen ohne Level bekommen ein Level
    // Versuche zuerst, basierend auf Ehepartnern oder anderen Beziehungen ein Level zu finden
    realPersons.forEach(person => {
        if (!levels.has(person.id)) {
            // Prüfe ob Ehepartner ein Level hat
            const spouses = spouseMap.get(person.id) || [];
            let foundLevel = undefined;
            
            for (const spouseId of spouses) {
                const spouseLevel = levels.get(spouseId);
                if (spouseLevel !== undefined) {
                    foundLevel = spouseLevel;
                    break;
                }
            }
            
            // Falls kein Level gefunden, prüfe ob Kinder ein Level haben (dann ist diese Person eine Generation höher)
            if (foundLevel === undefined) {
                const children = parentChildMap.get(person.id) || [];
                for (const childId of children) {
                    const childLevel = levels.get(childId);
                    if (childLevel !== undefined && childLevel > 0) {
                        foundLevel = childLevel - 1;
                        break;
                    }
                }
            }
            
            // Falls immer noch kein Level gefunden, setze auf 0 (oben)
            levels.set(person.id, foundLevel !== undefined ? foundLevel : 0);
        }
    });
    
    // 3. Finde maximale Generation
    let maxLevel = 0;
    levels.forEach(level => {
        maxLevel = Math.max(maxLevel, level);
    });
    
    // 4. Gruppiere Personen nach Generationen
    const generationGroups = new Map();
    realPersons.forEach(person => {
        const level = levels.get(person.id) || 0;
        if (!generationGroups.has(level)) {
            generationGroups.set(level, []);
        }
        generationGroups.get(level).push(person.id);
    });
    
    // 5. Positioniere Generation für Generation von oben nach unten
    // Positioniere nur Wurzeln (Personen ohne Eltern) - diese sind die älteste Generation
    // Alle anderen Personen werden in Schritt 6 basierend auf ihren Eltern positioniert
    for (let level = 0; level <= maxLevel; level++) {
        const personsInLevel = generationGroups.get(level) || [];
        if (personsInLevel.length === 0) continue;
        
        // Y-Position: Level 0 ist oben, höhere Level sind weiter unten
        const y = TOP_MARGIN + level * VERTICAL_SPACING;
        let currentX = 0;
        
        // Filtere: Nur Wurzeln positionieren (Personen ohne Eltern)
        // Alle anderen werden in Schritt 6 basierend auf ihren Eltern positioniert
        const rootsToPosition = personsInLevel.filter(personId => {
            // Nur Personen ohne Eltern sind Wurzeln
            return !childParentMap.has(personId) || childParentMap.get(personId).length === 0;
        });
        
        // Positioniere Wurzeln - Ehepartner nebeneinander
        const processed = new Set();
        rootsToPosition.forEach(personId => {
            if (processed.has(personId)) return;
            if (positions.persons[personId]) return; // Bereits positioniert
            
            // Prüfe ob es ein Ehepartner ist
            const spouses = spouseMap.get(personId) || [];
            const spouseInLevel = spouses.find(sid => {
                // Ehepartner muss im gleichen Level sein
                const spouseLevel = levels.get(sid);
                if (spouseLevel !== level) return false;
                // Ehepartner muss auch eine Wurzel sein
                if (childParentMap.has(sid) && childParentMap.get(sid).length > 0) return false;
                // Ehepartner darf noch nicht positioniert sein
                if (positions.persons[sid]) return false;
                // Ehepartner darf noch nicht verarbeitet sein
                if (processed.has(sid)) return false;
                return true;
            });
            
            if (spouseInLevel) {
                // Ehepartner-Paar: Positioniere nebeneinander mit SPOUSE_SPACING
                positions.persons[personId] = { x: currentX, y };
                positions.persons[spouseInLevel] = { x: currentX + CARD_WIDTH + SPOUSE_SPACING, y };
                currentX += CARD_WIDTH * 2 + SPOUSE_SPACING + HORIZONTAL_SPACING;
                processed.add(personId);
                processed.add(spouseInLevel);
            } else {
                // Einzelne Person
                positions.persons[personId] = { x: currentX, y };
                currentX += CARD_WIDTH + HORIZONTAL_SPACING;
                processed.add(personId);
            }
        });
        
        positions.maxX = Math.max(positions.maxX, currentX);
        positions.maxY = Math.max(positions.maxY, y + CARD_HEIGHT);
    }
    
    // 6. Positioniere Kinder unter ihren Eltern
    for (let level = 0; level < maxLevel; level++) {
        const childrenInNextLevel = generationGroups.get(level + 1) || [];
        if (childrenInNextLevel.length === 0) continue;
        
        // Gruppiere Kinder nach ihren Eltern
        const childrenByParents = new Map();
        childrenInNextLevel.forEach(childId => {
            const parents = childParentMap.get(childId) || [];
            if (parents.length === 0) return;
            
            // Filtere nur echte Eltern (keine Empty Slots)
            const realParents = parents.filter(pid => {
                const person = personMap.get(pid);
                return person && !person.isEmptySlot;
            });
            
            if (realParents.length === 0) return;
            
            const parentKey = realParents.sort((a, b) => a - b).join(',');
            if (!childrenByParents.has(parentKey)) {
                childrenByParents.set(parentKey, []);
            }
            childrenByParents.get(parentKey).push(childId);
        });
        
        // Positioniere jede Kindergruppe unter ihren Eltern
        // WICHTIG: Kinder werden IMMER basierend auf ihren Eltern positioniert
        childrenByParents.forEach((childIds, parentKey) => {
            const parentIds = parentKey.split(',').map(id => parseInt(id));
            const parentY = TOP_MARGIN + level * VERTICAL_SPACING;
            
            // Sammle alle Eltern-Positionen (auch die, die bereits positioniert sind)
            const parentPositions = [];
            
            // Positioniere Eltern, die noch nicht positioniert sind
            // IGNORIERE Ehepartner-Beziehungen - Eltern werden einfach nebeneinander positioniert
            let parentStartX = positions.maxX || 0;
            
            parentIds.forEach((pid) => {
                if (!positions.persons[pid]) {
                    // Elternteil noch nicht positioniert -> positioniere ihn
                    positions.persons[pid] = { x: parentStartX, y: parentY };
                    parentStartX += CARD_WIDTH + HORIZONTAL_SPACING;
                }
                parentPositions.push({ id: pid, pos: positions.persons[pid] });
            });
            
            // Sortiere Eltern nach X-Position (links nach rechts)
            parentPositions.sort((a, b) => a.pos.x - b.pos.x);
            
            // Stelle sicher, dass alle Eltern den richtigen Mindestabstand haben
            // Alle Eltern haben den gleichen Mindestabstand HORIZONTAL_SPACING
            const MIN_PARENT_SPACING = HORIZONTAL_SPACING;
            
            for (let i = 1; i < parentPositions.length; i++) {
                const prev = parentPositions[i - 1];
                const curr = parentPositions[i];
                const currentDistance = curr.pos.x - (prev.pos.x + CARD_WIDTH);
                
                if (currentDistance < MIN_PARENT_SPACING) {
                    // Verschiebe den aktuellen Elternteil, um den Mindestabstand zu gewährleisten
                    const newX = prev.pos.x + CARD_WIDTH + MIN_PARENT_SPACING;
                    positions.persons[curr.id].x = newX;
                    curr.pos.x = newX;
                    // Aktualisiere maxX
                    positions.maxX = Math.max(positions.maxX, newX + CARD_WIDTH);
                }
            }
            
            if (parentPositions.length === 0) return;
            
            // Berechne das GENAU zentrierte Zentrum zwischen den Eltern
            // Verwende die tatsächlichen Mittelpunkte der linken und rechten Eltern-Karten
            // Dies funktioniert auch wenn die Eltern weit auseinander sind
            const leftParentCenterX = parentPositions[0].pos.x + CARD_WIDTH / 2;
            const rightParentCenterX = parentPositions[parentPositions.length - 1].pos.x + CARD_WIDTH / 2;
            const exactParentCenterX = (leftParentCenterX + rightParentCenterX) / 2;
            
            // Filtere nur echte Kinder
            const realChildren = childIds.filter(childId => {
                const person = personMap.get(childId);
                return person && !person.isEmptySlot;
            });
            
            if (realChildren.length === 0) return;
            
            // Positioniere Kinder GENAU zentriert zwischen den beiden Eltern
            // WICHTIG: Kinder sind immer eine Generation tiefer (level + 1), also weiter UNTEN
            // Geschwister werden nebeneinander positioniert
            const childrenWidth = realChildren.length * CARD_WIDTH + (realChildren.length - 1) * HORIZONTAL_SPACING;
            
            // Zentriere die Kinder genau unter dem Eltern-Zentrum
            const childrenStartX = exactParentCenterX - childrenWidth / 2;
            const childY = TOP_MARGIN + (level + 1) * VERTICAL_SPACING; // level + 1 = eine Generation tiefer = weiter unten
            
            realChildren.forEach((childId, index) => {
                // WICHTIG: Kinder werden IMMER basierend auf ihren Eltern positioniert
                // Überschreibe jede vorherige Position, damit Kinder immer genau zwischen ihren Eltern zentriert sind
                // Geschwister werden nebeneinander positioniert
                positions.persons[childId] = {
                    x: childrenStartX + index * (CARD_WIDTH + HORIZONTAL_SPACING),
                    y: childY
                };
            });
            
            positions.maxX = Math.max(positions.maxX, parentStartX, childrenStartX + childrenWidth);
            positions.maxY = Math.max(positions.maxY, childY + CARD_HEIGHT);
        });
    }
    
    // 7. Positioniere Ehepartner nebeneinander (NACH der Kinder-Positionierung)
    // WICHTIG: Kinder bleiben an ihrer zentrierten Position, Ehepartner werden einfach daneben positioniert
    relationships.forEach(rel => {
        if (rel.type === 'spouse') {
            const person1 = personMap.get(rel.person1Id);
            const person2 = personMap.get(rel.person2Id);
            if (!person1 || !person2) return;
            
            const pos1 = positions.persons[rel.person1Id];
            const pos2 = positions.persons[rel.person2Id];
            
            if (!pos1 || !pos2) return;
            if (Math.abs(pos1.y - pos2.y) > 10) return; // Nicht in derselben Generation
            
            // Prüfe ob eine Person bereits als Kind positioniert wurde
            // Eine Person ist ein "Kind", wenn sie Eltern in der vorherigen Generation hat
            const person1Level = levels.get(rel.person1Id) || 0;
            const person2Level = levels.get(rel.person2Id) || 0;
            
            const person1IsChild = person1Level > 0 && childParentMap.has(rel.person1Id) && 
                childParentMap.get(rel.person1Id).some(pid => {
                    const parentLevel = levels.get(pid);
                    return parentLevel !== undefined && parentLevel === person1Level - 1;
                });
            
            const person2IsChild = person2Level > 0 && childParentMap.has(rel.person2Id) && 
                childParentMap.get(rel.person2Id).some(pid => {
                    const parentLevel = levels.get(pid);
                    return parentLevel !== undefined && parentLevel === person2Level - 1;
                });
            
            // Wenn beide Kinder sind, sind sie bereits nebeneinander (als Geschwister)
            // Wenn nur eine ein Kind ist, positioniere den Ehepartner daneben
            // WICHTIG: Die Position des Kindes wird NICHT geändert
            if (person1IsChild && !person2IsChild) {
                // Person 1 ist Kind (wurde bereits zentriert unter ihren Eltern positioniert)
                // Person 2 ist Ehepartner ohne Eltern - positioniere ihn rechts daneben
                // Die Position von Person 1 bleibt unverändert (zentriert)
                positions.persons[rel.person2Id] = {
                    x: pos1.x + CARD_WIDTH + SPOUSE_SPACING,
                    y: pos1.y
                };
                positions.maxX = Math.max(positions.maxX, pos1.x + CARD_WIDTH * 2 + SPOUSE_SPACING);
            } else if (person2IsChild && !person1IsChild) {
                // Person 2 ist Kind (wurde bereits zentriert unter ihren Eltern positioniert)
                // Person 1 ist Ehepartner ohne Eltern - positioniere ihn rechts daneben
                // Die Position von Person 2 bleibt unverändert (zentriert)
                positions.persons[rel.person1Id] = {
                    x: pos2.x + CARD_WIDTH + SPOUSE_SPACING,
                    y: pos2.y
                };
                positions.maxX = Math.max(positions.maxX, pos2.x + CARD_WIDTH * 2 + SPOUSE_SPACING);
            }
            // Wenn beide Kinder sind, werden sie bereits als Geschwister nebeneinander positioniert
            // Wenn beide keine Kinder sind, wurden sie bereits in Schritt 5 positioniert
        }
    });
    
    // 7b. Re-Positioniere Kinder, um sicherzustellen, dass sie mittig unter ALLEN ihren Eltern sind
    // Dies ist wichtig, wenn ein Elternteil ein Ehepartner ist, der nach der Kinder-Positionierung hinzugefügt wurde
    for (let level = 0; level < maxLevel; level++) {
        const childrenInNextLevel = generationGroups.get(level + 1) || [];
        if (childrenInNextLevel.length === 0) continue;
        
        // Gruppiere Kinder nach ihren Eltern
        const childrenByParents = new Map();
        childrenInNextLevel.forEach(childId => {
            const parents = childParentMap.get(childId) || [];
            if (parents.length === 0) return;
            
            // Filtere nur echte Eltern (keine Empty Slots)
            const realParents = parents.filter(pid => {
                const person = personMap.get(pid);
                return person && !person.isEmptySlot;
            });
            
            if (realParents.length === 0) return;
            
            const parentKey = realParents.sort((a, b) => a - b).join(',');
            if (!childrenByParents.has(parentKey)) {
                childrenByParents.set(parentKey, []);
            }
            childrenByParents.get(parentKey).push(childId);
        });
        
        // Positioniere jede Kindergruppe unter ihren Eltern
        childrenByParents.forEach((childIds, parentKey) => {
            const parentIds = parentKey.split(',').map(id => parseInt(id));
            const parentY = TOP_MARGIN + level * VERTICAL_SPACING;
            
            // Sammle alle Eltern-Positionen (inklusive Ehepartner, die später hinzugefügt wurden)
            const parentPositions = [];
            parentIds.forEach((pid) => {
                if (positions.persons[pid]) {
                    parentPositions.push({ id: pid, pos: positions.persons[pid] });
                }
            });
            
            if (parentPositions.length === 0) return;
            
            // Sortiere Eltern nach X-Position (links nach rechts)
            parentPositions.sort((a, b) => a.pos.x - b.pos.x);
            
            // Berechne das GENAU zentrierte Zentrum zwischen ALLEN Eltern
            const leftParentCenterX = parentPositions[0].pos.x + CARD_WIDTH / 2;
            const rightParentCenterX = parentPositions[parentPositions.length - 1].pos.x + CARD_WIDTH / 2;
            const exactParentCenterX = (leftParentCenterX + rightParentCenterX) / 2;
            
            // Filtere nur echte Kinder
            const realChildren = childIds.filter(childId => {
                const person = personMap.get(childId);
                return person && !person.isEmptySlot;
            });
            
            if (realChildren.length === 0) return;
            
            // Positioniere Kinder GENAU zentriert zwischen ALLEN ihren Eltern
            const childrenWidth = realChildren.length * CARD_WIDTH + (realChildren.length - 1) * HORIZONTAL_SPACING;
            const childrenStartX = exactParentCenterX - childrenWidth / 2;
            const childY = TOP_MARGIN + (level + 1) * VERTICAL_SPACING;
            
            realChildren.forEach((childId, index) => {
                // WICHTIG: Kinder werden IMMER mittig unter ALLEN ihren Eltern positioniert
                positions.persons[childId] = {
                    x: childrenStartX + index * (CARD_WIDTH + HORIZONTAL_SPACING),
                    y: childY
                };
            });
            
            positions.maxX = Math.max(positions.maxX, childrenStartX + childrenWidth);
            positions.maxY = Math.max(positions.maxY, childY + CARD_HEIGHT);
        });
    }
    
    // 8. Finale Überlappungs-Prüfung
    // Prüfe nur auf Überlappungen, aber verschiebe keine Geschwister oder Ehepartner
    for (let level = 0; level <= maxLevel; level++) {
        const personsInLevel = [];
        Object.entries(positions.persons).forEach(([personId, pos]) => {
            const personLevel = levels.get(parseInt(personId)) || 0;
            if (personLevel === level) {
                personsInLevel.push({ personId: parseInt(personId), x: pos.x, y: pos.y });
            }
        });
        
        personsInLevel.sort((a, b) => a.x - b.x);
        
        for (let i = 1; i < personsInLevel.length; i++) {
            const prev = personsInLevel[i - 1];
            const curr = personsInLevel[i];
            const minDistance = CARD_WIDTH + HORIZONTAL_SPACING;
            
            // Prüfe ob diese Personen Geschwister oder Ehepartner sind
            const areSiblings = relationships.some(rel => 
                rel.type === 'sibling' && 
                ((rel.person1Id === prev.personId && rel.person2Id === curr.personId) ||
                 (rel.person1Id === curr.personId && rel.person2Id === prev.personId))
            );
            
            const areSpouses = relationships.some(rel => 
                rel.type === 'spouse' && 
                ((rel.person1Id === prev.personId && rel.person2Id === curr.personId) ||
                 (rel.person1Id === curr.personId && rel.person2Id === prev.personId))
            );
            
            // Verschiebe nur, wenn sie nicht Geschwister oder Ehepartner sind
            if (!areSiblings && !areSpouses && curr.x < prev.x + minDistance) {
                const newX = prev.x + minDistance;
                positions.persons[curr.personId].x = newX;
                curr.x = newX;
                positions.maxX = Math.max(positions.maxX, newX + CARD_WIDTH);
            }
        }
    }
    
    return positions;
}

// Stelle sicher, dass jedes Kind immer genau 2 Eltern hat (nur wenn nötig)
// DEAKTIVIERT: Empty Slots werden nicht mehr erstellt
function ensureTwoParentsForAllChildren() {
    // Funktion deaktiviert - keine Empty Slots mehr
    return;
}

// Beziehungslinien rendern - NUR ZWISCHEN ECHTEN PERSONEN
function renderRelationshipLines(positions) {
    let lines = '';
    const CARD_WIDTH = 250;
    const CARD_HEIGHT = 280;
    
    // Farbschema
    const getRelationshipColor = (relationshipType) => {
        switch(relationshipType) {
            case 'parent-child-biological':
            case 'parent-child':
                return '#2c3e50';
            case 'parent-child-step':
                return '#3498db';
            case 'parent-child-adoptive':
                return '#9b59b6';
            case 'spouse':
                return '#e74c3c';
            default:
                return '#2c3e50';
        }
    };
    
    // Hilfsfunktion: Erstellt sichtbare Linie + unsichtbare Hover-Linie
    const createLineWithHover = (x1, y1, x2, y2, color, strokeWidth, opacity, relationship, relationshipType) => {
        const visibleLine = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" 
            stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}" 
            data-relationship="${relationship}" data-relationship-type="${relationshipType}" class="relationship-line"/>`;
        const hoverLine = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" 
            stroke="transparent" stroke-width="20" opacity="0" 
            data-relationship="${relationship}" data-relationship-type="${relationshipType}" class="relationship-line relationship-line-hover"/>`;
        return visibleLine + hoverLine;
    };
    
    // Filtere Empty Slots komplett heraus
    const realPersons = familyTree.filter(person => !person.isEmptySlot);
    const personMap = new Map();
    realPersons.forEach(person => personMap.set(person.id, person));
    
    // 1. Ehepartner-Linien: Nur zwischen echten Personen
    relationships.forEach(rel => {
        if (rel.type === 'spouse') {
            const person1 = personMap.get(rel.person1Id);
            const person2 = personMap.get(rel.person2Id);
            
            if (!person1 || !person2) return;
            
            const pos1 = positions.persons[rel.person1Id];
            const pos2 = positions.persons[rel.person2Id];
            
            if (!pos1 || !pos2) return;
            if (Math.abs(pos1.y - pos2.y) > 10) return; // Nicht in derselben Generation
            
            const x1 = pos1.x + CARD_WIDTH / 2;
            const x2 = pos2.x + CARD_WIDTH / 2;
            const y = pos1.y + CARD_HEIGHT / 2;
            
            // Prüfe ob Ehepartner getrennt sind
            const isDivorced = rel.type === 'spouse-divorced' || rel.type === 'spouse-separated';
            const heartX = (x1 + x2) / 2;
            const heartY = y;
            
            // Linie zeichnen
            lines += createLineWithHover(x1, y, x2, y, '#e74c3c', 3, 0.8, 'Ehepartner/Partner', 'spouse');
            
            // Herz-Symbol in der Mitte hinzufügen
            if (isDivorced) {
                // Zerbrochenes Herz (ausgegraut)
                lines += `<g transform="translate(${heartX}, ${heartY})" style="pointer-events: none;">
                    <path d="M-12,-8 C-12,-12 -8,-16 -4,-16 C0,-16 0,-12 0,-8 C0,-12 4,-16 8,-16 C12,-16 12,-12 12,-8 C12,-4 8,0 0,8 C-8,0 -12,-4 -12,-8 Z" 
                        fill="#999" stroke="#999" stroke-width="1" opacity="0.6"/>
                    <line x1="-6" y1="-4" x2="6" y2="4" stroke="#666" stroke-width="2" opacity="0.8"/>
                    <line x1="6" y1="-4" x2="-6" y2="4" stroke="#666" stroke-width="2" opacity="0.8"/>
                </g>`;
            } else {
                // Normales Herz
                lines += `<g transform="translate(${heartX}, ${heartY})" style="pointer-events: none;">
                    <path d="M-12,-8 C-12,-12 -8,-16 -4,-16 C0,-16 0,-12 0,-8 C0,-12 4,-16 8,-16 C12,-16 12,-12 12,-8 C12,-4 8,0 0,8 C-8,0 -12,-4 -12,-8 Z" 
                        fill="#e74c3c" stroke="#c0392b" stroke-width="1" opacity="0.9"/>
                </g>`;
            }
        }
    });
    
    // 2. Parent-Child Linien: Nur zwischen echten Personen
    const childParentMap = new Map();
    relationships.forEach(rel => {
        if (rel.type === 'parent-child' || rel.type === 'parent-child-biological' || 
            rel.type === 'parent-child-step' || rel.type === 'parent-child-adoptive') {
            const parentId = rel.person1Id;
            const childId = rel.person2Id;
            
            // Nur wenn beide Personen existieren
            const parent = personMap.get(parentId);
            const child = personMap.get(childId);
            if (!parent || !child) return;
            
            if (!childParentMap.has(childId)) {
                childParentMap.set(childId, []);
            }
            childParentMap.get(childId).push({ parentId, type: rel.type });
        }
    });
    
    // Gruppiere Kinder nach ihren Eltern (nur echte Eltern)
    const childrenByParents = new Map();
    childParentMap.forEach((parents, childId) => {
        // Filtere nur echte Eltern
        const realParents = parents.filter(p => {
            const person = personMap.get(p.parentId);
            return person && !person.isEmptySlot;
        });
        
        if (realParents.length === 0) return;
        
        const parentIds = realParents.map(p => p.parentId).sort((a, b) => a - b);
        const parentKey = parentIds.join(',');
        
        if (!childrenByParents.has(parentKey)) {
            childrenByParents.set(parentKey, []);
            }
            
            const childPos = positions.persons[childId];
            if (childPos) {
            const dominantType = realParents[0].type || 'parent-child-biological';
            childrenByParents.get(parentKey).push({ 
                id: childId, 
                pos: childPos, 
                type: dominantType 
            });
        }
    });
    
    // Zeichne Linien für jede Eltern-Kind-Gruppe
    childrenByParents.forEach((children, parentKey) => {
        if (children.length === 0) return;
        
        const parentIds = parentKey.split(',').map(id => parseInt(id));
        const parentPositions = parentIds
            .map(pid => ({ id: pid, pos: positions.persons[pid] }))
            .filter(item => item.pos !== undefined)
            .sort((a, b) => a.pos.x - b.pos.x); // WICHTIG: Sortiere nach X-Position
                
        if (parentPositions.length === 0) return;
                
        const parentBottomY = Math.max(...parentPositions.map(p => p.pos.y + CARD_HEIGHT));
        
        // Berechne das GENAU zentrierte Zentrum zwischen den Eltern
        // Verwende die tatsächlichen Mittelpunkte der linken und rechten Eltern-Karten
        const leftParentCenterX = parentPositions[0].pos.x + CARD_WIDTH / 2;
        const rightParentCenterX = parentPositions[parentPositions.length - 1].pos.x + CARD_WIDTH / 2;
        const exactParentCenterX = (leftParentCenterX + rightParentCenterX) / 2;
        
        // Filtere nur echte Kinder
        const realChildren = children.filter(child => {
            const person = personMap.get(child.id);
            return person && !person.isEmptySlot;
        });
        
        if (realChildren.length === 0) return;
        
        // Sortiere Kinder nach X-Position
        realChildren.sort((a, b) => a.pos.x - b.pos.x);
        
        // Berechne horizontale Verbindungslinie zwischen Eltern und Kindern
        const minChildX = realChildren[0].pos.x + CARD_WIDTH / 2;
        const maxChildX = realChildren[realChildren.length - 1].pos.x + CARD_WIDTH / 2;
        const childrenCenterX = (minChildX + maxChildX) / 2;
        const branchY = parentBottomY + 50; // Y-Position der horizontalen Verbindungslinie
        
        const dominantType = realChildren[0].type || 'parent-child-biological';
        const color = getRelationshipColor(dominantType);
        
        // 1. Zeichne vertikale Linien von jedem Elternteil nach unten zur horizontalen Verbindungslinie
        parentPositions.forEach(parentItem => {
            const parentCenterX = parentItem.pos.x + CARD_WIDTH / 2;
            const relationshipLabel = getRelationshipTypeLabel(dominantType);
            lines += createLineWithHover(parentCenterX, parentBottomY, parentCenterX, branchY, color, 3, 0.8, relationshipLabel, dominantType);
        });
        
        // 2. Zeichne horizontale Verbindungslinie zwischen den Eltern-Linien
        if (parentPositions.length > 1) {
            const relationshipLabel = getRelationshipTypeLabel(dominantType);
            lines += createLineWithHover(leftParentCenterX, branchY, rightParentCenterX, branchY, color, 3, 0.8, relationshipLabel, dominantType);
        }
        
        // 3. Zeichne vertikale Linie vom Eltern-Zentrum zu den Kindern
        if (realChildren.length > 1) {
            // Mehrere Kinder: Zeichne horizontale Geschwister-Linie und dann vertikale Linien
            const childrenBranchY = branchY + 30; // Etwas unter der Eltern-Verbindungslinie
            
            // Horizontale Linie zwischen allen Kindern (Geschwister-Linie)
            lines += createLineWithHover(minChildX, childrenBranchY, maxChildX, childrenBranchY, color, 3, 0.8, 'Geschwister', 'sibling');
            
            // Vertikale Linie vom Eltern-Zentrum zur Kinder-Verbindungslinie
            const relationshipLabel = getRelationshipTypeLabel(dominantType);
            lines += createLineWithHover(exactParentCenterX, branchY, childrenCenterX, childrenBranchY, color, 3, 0.8, relationshipLabel, dominantType);
            
            // Vertikale Linien von der Kinder-Verbindungslinie zu jedem Kind
            realChildren.forEach(child => {
                const childX = child.pos.x + CARD_WIDTH / 2;
            const childTopY = child.pos.y;
                
                lines += createLineWithHover(childX, childrenBranchY, childX, childTopY, color, 3, 0.8, 'Kind', dominantType);
            });
        } else if (realChildren.length === 1) {
            // Bei nur einem Kind: Gerade vertikale Linie vom Eltern-Zentrum zum Kind
            // WICHTIG: Das Kind sollte bereits zentriert sein, aber wir verwenden exactParentCenterX
            // um sicherzustellen, dass die Linie immer gerade ist, unabhängig von kleinen Rundungsfehlern
            const childTopY = realChildren[0].pos.y;
            
            // Gerade vertikale Linie vom Eltern-Zentrum direkt zum Kind
            // Verwende exactParentCenterX für beide X-Koordinaten, damit die Linie perfekt gerade ist
            const relationshipLabel = getRelationshipTypeLabel(dominantType);
            lines += createLineWithHover(exactParentCenterX, branchY, exactParentCenterX, childTopY, color, 3, 0.8, relationshipLabel, dominantType);
        }
    });
    
    // 3. Geschwister-Linien: Horizontale Linien zwischen Geschwistern (nur echte Personen)
    relationships.forEach(rel => {
        if (rel.type === 'sibling') {
            const person1 = personMap.get(rel.person1Id);
            const person2 = personMap.get(rel.person2Id);
            
            if (!person1 || !person2) return;
            
            const pos1 = positions.persons[rel.person1Id];
            const pos2 = positions.persons[rel.person2Id];
            
            if (!pos1 || !pos2) return;
            if (Math.abs(pos1.y - pos2.y) > 10) return; // Nicht in derselben Generation
            
            const x1 = pos1.x + CARD_WIDTH / 2;
            const x2 = pos2.x + CARD_WIDTH / 2;
            const y = pos1.y + CARD_HEIGHT / 2;
            
                lines += createLineWithHover(x1, y, x2, y, '#27ae60', 2.5, 0.7, 'Geschwister', 'sibling');
        }
    });
    
    return lines;
}

// Generationen organisieren
function organizeGenerations() {
    const generations = [];
    const personMap = new Map();
    
    // Personen in Map speichern
    familyTree.forEach(person => {
        personMap.set(person.id, { ...person, children: [] });
    });
    
    // Kinder zuordnen
    familyTree.forEach(person => {
        if (person.parentId) {
            const parent = personMap.get(person.parentId);
            if (parent) {
                parent.children.push(person.id);
            }
        }
    });
    
    // Wurzel-Personen finden (keine Eltern)
    const roots = familyTree.filter(p => !p.parentId);
    
    // Generationen rekursiv aufbauen
    function buildGeneration(personIds, level) {
        if (!generations[level]) {
            generations[level] = [];
        }
        
        personIds.forEach(id => {
            const person = personMap.get(id);
            if (person) {
                generations[level].push(person);
                
                if (person.children.length > 0) {
                    buildGeneration(person.children, level + 1);
                }
            }
        });
    }
    
    roots.forEach(root => {
        buildGeneration([root.id], 0);
    });
    
    return generations.filter(gen => gen.length > 0);
}

// Person auswählen
function selectPerson(id) {
    selectedPerson = id;
    renderTree();
}

// View wechseln
function showView(view) {
    // Alle Modals, Sidebars und Views schließen
    document.getElementById('personModal').classList.remove('show');
    document.getElementById('relationshipModal').style.display = 'none';
    closePersonSelectionSidebar();
    closeFilterSidebar();
    closeContextMenu();
    
    // Navigation-Buttons aktualisieren
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeNavBtn = document.getElementById(`nav-${view}`);
    if (activeNavBtn) {
        activeNavBtn.classList.add('active');
    }
    
    // Alle Views ausblenden
    document.querySelectorAll('.view-container').forEach(container => {
        container.style.display = 'none';
    });
    
    // Gewählten View anzeigen
    const selectedView = document.getElementById(`view-${view}`);
    if (selectedView) {
        selectedView.style.display = 'block';
    }
    
    // Spezielle Behandlung für verschiedene Views
    switch(view) {
        case 'overview':
            renderTree();
            break;
        case 'add':
            editingPersonId = null;
            resetAddPersonForm();
            populateParentSelect();
            
            // Scroll zum Vorname-Feld und Fokus setzen
            setTimeout(() => {
                const firstNameInput = document.getElementById('firstName');
                if (firstNameInput) {
                    firstNameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    firstNameInput.focus();
                }
                
                // Map aktualisieren wenn Formular geöffnet wird
                if (locationMap) {
                    locationMap.invalidateSize();
                    updateLocationMap();
                } else {
                    initLocationMap();
                }
            }, 100);
            
            // Event Listener für Vorschau-Updates
            const firstNameEl = document.getElementById('firstName');
            const lastNameEl = document.getElementById('lastName');
            const profileImageEl = document.getElementById('profileImage');
            
            if (firstNameEl) firstNameEl.addEventListener('input', updateNewPersonPreview);
            if (lastNameEl) lastNameEl.addEventListener('input', updateNewPersonPreview);
            if (profileImageEl) {
                profileImageEl.addEventListener('change', function() {
                    setTimeout(updateNewPersonPreview, 100);
                });
            }
            
            // Set default gender
            selectGender('m');
            break;
        case 'relationship':
            populateRelationshipSelects();
            const preview1 = document.getElementById('preview1');
            const preview2 = document.getElementById('preview2');
            if (preview1) preview1.innerHTML = '';
            if (preview2) preview2.innerHTML = '';
            break;
        case 'edit':
            if (selectedPerson) {
                editPersonInSidebar(selectedPerson);
            } else {
                const editContent = document.getElementById('editPersonContent');
                if (editContent) {
                    editContent.innerHTML = '<p style="padding: 2rem; text-align: center; color: #999;">Bitte wählen Sie zuerst eine Person aus dem Stammbaum aus.</p><button class="btn-primary" onclick="showView(\'overview\')" style="width: 100%; margin-top: 1rem;">Zur Übersicht</button>';
                }
            }
            break;
        case 'search':
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        performSearch();
                    }
                });
                searchInput.focus();
            }
            break;
        default:
            break;
    }
}

// Add Person Form zurücksetzen
function resetAddPersonForm() {
    const form = document.getElementById('personForm');
    if (form) {
        form.reset();
    }
    
    // Reset file uploads
    profileImageData = null;
    uploadedFiles = [];
    const profileImagePreview = document.getElementById('profileImagePreview');
    const filesPreview = document.getElementById('filesPreview');
    if (profileImagePreview) profileImagePreview.innerHTML = '';
    if (filesPreview) filesPreview.innerHTML = '';
    
    const profileImage = document.getElementById('profileImage');
    const filesUpload = document.getElementById('filesUpload');
    if (profileImage) profileImage.value = '';
    if (filesUpload) filesUpload.value = '';
    
    // Beziehungsfeld beim Hinzufügen anzeigen
    const relationshipGroup = document.querySelector('#personForm .form-group:first-child');
    if (relationshipGroup) {
        relationshipGroup.style.display = 'block';
    }
    
    // Related Person Preview zurücksetzen
    const relatedPreview = document.getElementById('relatedPersonPreview');
    if (relatedPreview) {
        relatedPreview.classList.remove('has-selection');
        const select = document.getElementById('relatedPersonId');
        if (select) {
            select.value = '';
            const previewCard = relatedPreview.querySelector('.preview-card');
            if (previewCard) {
                previewCard.remove();
            }
        }
    }
    
    const newPersonPreview = document.getElementById('newPersonPreview');
    if (newPersonPreview) {
        newPersonPreview.innerHTML = '<div style="text-align: center; color: #999; padding: 1rem;">Wird hier angezeigt</div>';
    }
    
    // Pfeil-Form zurücksetzen
    const relationshipSelect = document.getElementById('relationshipTypeForPerson');
    if (relationshipSelect) {
        relationshipSelect.value = '';
        relationshipSelect.setAttribute('data-arrow', 'right');
        relationshipSelect.style.color = '#ffffff';
    }
    
    // Cousin Grade Input verstecken
    const cousinGradeInput = document.getElementById('cousinGradeInput');
    if (cousinGradeInput) {
        cousinGradeInput.style.display = 'none';
    }
}

// Relationship Form zurücksetzen
function resetRelationshipForm() {
    const form = document.getElementById('relationshipForm');
    if (form) {
        form.reset();
    }
    const preview1 = document.getElementById('preview1');
    const preview2 = document.getElementById('preview2');
    if (preview1) preview1.innerHTML = '';
    if (preview2) preview2.innerHTML = '';
}

// Right Sidebar schließen (Legacy - nicht mehr verwendet)
function closeRightSidebar() {
    showView('overview');
}

// Search View
function showSearchView() {
    const rightSidebarContent = document.getElementById('rightSidebarContent');
    rightSidebarContent.innerHTML = `
                <form id="personForm" onsubmit="savePerson(event)">
                    <div class="form-group">
                        <label>Beziehung zu bestehender Person:</label>
                        <div class="relationship-form-container">
                            <div class="relationship-item">
                                <label class="relationship-box-label">Neue Person</label>
                                <div id="newPersonPreview" class="person-preview-box clickable-preview-box" onclick="focusNextEmptyField()" style="display: flex; align-items: center; justify-content: center; color: #999;">
                                    Wird hier angezeigt
                                </div>
                            </div>
                            <div class="relationship-arrow">
                                <select id="relationshipTypeForPerson" name="relationshipTypeForPerson" class="relationship-select-arrow" data-arrow="right" onchange="updateArrowIcon(this); toggleCousinGradeInput(this)">
                                    <option value="">Beziehung wählen</option>
                                    <optgroup label="Eltern-Kind">
                                        <option value="parent-child-biological">Biologischer Elternteil von</option>
                                        <option value="parent-child-biological-reverse">Biologisches Kind von</option>
                                        <option value="parent-child-step">Stiefelternteil von</option>
                                        <option value="parent-child-step-reverse">Stiefkind von</option>
                                        <option value="parent-child-adoptive">Adoptivelternteil von</option>
                                        <option value="parent-child-adoptive-reverse">Adoptivkind von</option>
                                    </optgroup>
                                    <optgroup label="Andere Beziehungen">
                                        <option value="sibling">Geschwister von</option>
                                        <option value="spouse">Ehepartner/Partner von</option>
                                        <option value="grandparent-grandchild">Großeltern von</option>
                                        <option value="grandparent-grandchild-reverse">Enkel von</option>
                                        <option value="uncle-aunt-nephew-niece">Onkel/Tante von</option>
                                        <option value="uncle-aunt-nephew-niece-reverse">Neffe/Nichte von</option>
                                        <option value="cousin">Cousin/Cousine von</option>
                                    </optgroup>
                                </select>
                                <div id="cousinGradeInput" class="cousin-grade-input" style="display: none; margin-top: 0.5rem; text-align: center;">
                                    <div class="cousin-grade-controls" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                                        <button type="button" class="cousin-grade-btn" onclick="changeCousinGrade(-1)" style="width: 0; height: 0; border-left: 0; border-right: 8px solid #3498db; border-top: 6px solid transparent; border-bottom: 6px solid transparent; background: none; border-radius: 0; cursor: pointer; padding: 0; margin: 0;"></button>
                                        <span id="cousinGradeDisplay" style="font-size: 16px; font-weight: bold; color: #3498db; min-width: 20px; display: inline-block;">1</span>
                                        <input type="hidden" id="cousinGrade" name="cousinGrade" value="1">
                                        <button type="button" class="cousin-grade-btn" onclick="changeCousinGrade(1)" style="width: 0; height: 0; border-right: 0; border-left: 8px solid #3498db; border-top: 6px solid transparent; border-bottom: 6px solid transparent; background: none; border-radius: 0; cursor: pointer; padding: 0; margin: 0;"></button>
                                    </div>
                                </div>
                            </div>
                            <div class="relationship-item">
                                <label class="relationship-box-label">Bestehende Person auswählen</label>
                                <div id="relatedPersonPreview" class="person-preview-box person-select-box" onclick="openPersonSelectionSidebar('relatedPersonId', 'relatedPersonPreview')">
                                    <select id="relatedPersonId" name="relatedPersonId" class="person-select-full" onchange="showPersonPreview('relatedPersonId', 'relatedPersonPreview')" style="pointer-events: none;">
                                        <option value="">Person wählen</option>
                                    </select>
                                    <div class="person-placeholder">
                                        <div class="person-placeholder-icon">👤</div>
                                        <div class="person-placeholder-text">?</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="form-section">
                        <h3 class="form-section-title">Persönliche Informationen</h3>
                        <div class="personal-info-layout">
                            <div class="profile-image-section">
                                <label for="profileImage">Profilbild</label>
                                <div class="profile-image-drag-drop" id="profileImageDragDrop" ondrop="handleProfileImageDrop(event)" ondragover="handleProfileImageDragOver(event)" ondragleave="handleProfileImageDragLeave(event)">
                                    <input type="file" id="profileImage" name="profileImage" accept="image/*" onchange="handleProfileImageUpload(event)" style="display: none;">
                                    <div class="profile-image-drag-content">
                                        <div class="profile-image-drag-icon">📷</div>
                                        <div class="profile-image-drag-text">Bild hierher ziehen oder <span class="profile-image-drag-link" onclick="document.getElementById('profileImage').click()">klicken zum Auswählen</span></div>
                                    </div>
                                </div>
                                <div id="profileImagePreview" class="image-preview-container"></div>
                            </div>
                            <div class="personal-info-fields">
                                <div class="name-fields-container">
                                    <div class="form-group">
                                        <label for="firstName">Vorname</label>
                                        <input type="text" id="firstName" name="firstName" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="lastName">Nachname</label>
                                        <input type="text" id="lastName" name="lastName" required>
                                    </div>
                                </div>
                                <div class="date-fields-container">
                                    <div class="form-group">
                                        <label for="birthDate">Geburtsdatum</label>
                                        <input type="date" id="birthDate" name="birthDate">
                                    </div>
                                    <div class="date-separator">—</div>
                                    <div class="form-group">
                                        <label for="deathDate">Todesdatum</label>
                                        <input type="date" id="deathDate" name="deathDate">
                                    </div>
                                </div>
                                <div class="form-group gender-buttons-group">
                                    <label>Geschlecht</label>
                                    <div class="gender-buttons">
                                        <button type="button" class="gender-btn" data-gender="m" onclick="selectGender('m')">
                                            <span class="gender-icon gender-icon-male">♂</span>
                                        </button>
                                        <button type="button" class="gender-btn" data-gender="f" onclick="selectGender('f')">
                                            <span class="gender-icon gender-icon-female">♀</span>
                                        </button>
                                    </div>
                                    <input type="hidden" id="gender" name="gender" value="m">
                                </div>
                            </div>
                        </div>
                        <div class="form-group location-group">
                            <label for="location">Geburtsort</label>
                            <input type="text" id="location" name="location" placeholder="z.B. Berlin, Deutschland">
                            <div class="map-container">
                                <button class="map-expand-btn" onclick="toggleMapSize()" title="Karte vergrößern/verkleinern">
                                    <span class="map-expand-icon"></span>
                                </button>
                                <div id="locationMap" class="location-map"></div>
                            </div>
                            <small class="map-hint">Klicken Sie auf die Karte, um einen Geburtsort auszuwählen</small>
                        </div>
                    </div>
                    <div class="form-section">
                        <h3 class="form-section-title">Weitere Informationen</h3>
                        <div class="form-section-content">
                            <div class="form-group files-upload-group">
                                <label for="filesUpload">Dateien hochladen (max. 10)</label>
                                <div class="drag-drop-area" id="dragDropArea" ondrop="handleDrop(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)">
                                    <input type="file" id="filesUpload" name="filesUpload" multiple accept="image/*,application/pdf,.doc,.docx" onchange="handleFilesUpload(event)" style="display: none;">
                                    <div class="drag-drop-content">
                                        <div class="drag-drop-icon">📁</div>
                                        <div class="drag-drop-text">Dateien hierher ziehen oder <span class="drag-drop-link" onclick="document.getElementById('filesUpload').click()">klicken zum Auswählen</span></div>
                                        <div class="drag-drop-hint">Maximal 10 Dateien</div>
                                    </div>
                                </div>
                                <div id="filesPreview" class="files-preview-container"></div>
                            </div>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Speichern</button>
                        <button type="button" class="btn-secondary" onclick="closeRightSidebar()">Abbrechen</button>
                    </div>
                </form>
            `;
            
            // Reset file uploads
            profileImageData = null;
            uploadedFiles = [];
            
            // Beziehungsfeld beim Hinzufügen anzeigen
            const relationshipGroup = rightSidebarContent.querySelector('#personForm .form-group:first-child');
            if (relationshipGroup) {
                relationshipGroup.style.display = 'block';
            }
            
            populateParentSelect();
            
            // Scroll zum Vorname-Feld und Fokus setzen
            setTimeout(() => {
                const firstNameInput = document.getElementById('firstName');
                if (firstNameInput) {
                    firstNameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    firstNameInput.focus();
                }
                
                // Map aktualisieren wenn Formular geöffnet wird
                if (locationMap) {
                    locationMap.invalidateSize();
                    updateLocationMap();
                }
            }, 100);
            
            // Related Person Preview zurücksetzen
            const relatedPreview = document.getElementById('relatedPersonPreview');
            if (relatedPreview) {
                relatedPreview.classList.remove('has-selection');
                const select = document.getElementById('relatedPersonId');
                if (select) {
                    select.value = '';
                    const previewCard = relatedPreview.querySelector('.preview-card');
                    if (previewCard) {
                        previewCard.remove();
                    }
                }
                populateParentSelect();
            }
            
            const newPersonPreview = document.getElementById('newPersonPreview');
            if (newPersonPreview) {
                newPersonPreview.innerHTML = '<div style="text-align: center; color: #999; padding: 1rem;">Wird hier angezeigt</div>';
            }
            
            // Pfeil-Form zurücksetzen
            const relationshipSelect = document.getElementById('relationshipTypeForPerson');
            if (relationshipSelect) {
                relationshipSelect.value = '';
                relationshipSelect.setAttribute('data-arrow', 'right');
                relationshipSelect.style.color = '#ffffff';
            }
            
            // Event Listener für Vorschau-Updates
            const firstNameEl = document.getElementById('firstName');
            const lastNameEl = document.getElementById('lastName');
            const profileImageEl = document.getElementById('profileImage');
            
            if (firstNameEl) firstNameEl.addEventListener('input', updateNewPersonPreview);
            if (lastNameEl) lastNameEl.addEventListener('input', updateNewPersonPreview);
            if (profileImageEl) {
                profileImageEl.addEventListener('change', function() {
                    setTimeout(updateNewPersonPreview, 100);
                });
            }
            
            // Set default gender
            selectGender('m');
            
            // Reset death date
            const deathDateEl = document.getElementById('deathDate');
            if (deathDateEl) deathDateEl.value = '';
}

function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const results = familyTree.filter(person => 
        person.firstName.toLowerCase().includes(searchTerm) || 
        person.lastName.toLowerCase().includes(searchTerm)
    );
    
    const resultsDiv = document.getElementById('searchResults');
    if (!resultsDiv) return;
    
    if (results.length === 0) {
        resultsDiv.innerHTML = '<p>Keine Ergebnisse gefunden.</p>';
        return;
    }
    
    resultsDiv.innerHTML = results.map(person => `
        <div class="person-card" onclick="selectPerson(${person.id}); showView('overview');" style="margin-bottom: 1rem; cursor: pointer; position: relative;">
            <div class="person-name">${person.firstName} ${person.lastName}</div>
        </div>
    `).join('');
}

function exportAsImage() {
    alert('Bild-Export wird in einer zukünftigen Version verfügbar sein.');
}

// Person bearbeiten
function editPersonInSidebar(id) {
    const person = familyTree.find(p => p.id === id);
    if (!person) return;
    
    editingPersonId = id;
    const editContent = document.getElementById('editPersonContent');
    if (!editContent) return;
    
    // Formular mit vorhandenen Daten rendern
    editContent.innerHTML = `
        <form id="personForm" onsubmit="savePerson(event)">
            <div class="form-section">
                <h3 class="form-section-title">Persönliche Informationen</h3>
                <div class="personal-info-layout">
                    <div class="profile-image-section">
                        <label for="profileImage">Profilbild</label>
                        <div class="profile-image-drag-drop" id="profileImageDragDrop" ondrop="handleProfileImageDrop(event)" ondragover="handleProfileImageDragOver(event)" ondragleave="handleProfileImageDragLeave(event)">
                            <input type="file" id="profileImage" name="profileImage" accept="image/*" onchange="handleProfileImageUpload(event)" style="display: none;">
                            <div class="profile-image-drag-content">
                                <div class="profile-image-drag-icon">📷</div>
                                <div class="profile-image-drag-text">Bild hierher ziehen oder <span class="profile-image-drag-link" onclick="document.getElementById('profileImage').click()">klicken zum Auswählen</span></div>
                            </div>
                        </div>
                        <div id="profileImagePreview" class="image-preview-container"></div>
                    </div>
                    <div class="personal-info-fields">
                        <div class="name-fields-container">
                            <div class="form-group">
                                <label for="firstName">Vorname</label>
                                <input type="text" id="firstName" name="firstName" value="${person.firstName || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="lastName">Nachname</label>
                                <input type="text" id="lastName" name="lastName" value="${person.lastName || ''}" required>
                            </div>
                        </div>
                        <div class="date-fields-container">
                            <div class="form-group">
                                <label for="birthDate">Geburtsdatum</label>
                                <input type="date" id="birthDate" name="birthDate" value="${person.birthDate || ''}">
                            </div>
                            <div class="date-separator">—</div>
                            <div class="form-group">
                                <label for="deathDate">Todesdatum</label>
                                <input type="date" id="deathDate" name="deathDate" value="${person.deathDate || ''}">
                            </div>
                        </div>
                        <div class="form-group gender-buttons-group">
                            <label>Geschlecht</label>
                            <div class="gender-buttons">
                                <button type="button" class="gender-btn ${person.gender === 'm' ? 'active' : ''}" data-gender="m" onclick="selectGender('m')">
                                    <span class="gender-icon gender-icon-male">♂</span>
                                </button>
                                <button type="button" class="gender-btn ${person.gender === 'f' ? 'active' : ''}" data-gender="f" onclick="selectGender('f')">
                                    <span class="gender-icon gender-icon-female">♀</span>
                                </button>
                            </div>
                            <input type="hidden" id="gender" name="gender" value="${person.gender || 'm'}">
                        </div>
                    </div>
                </div>
                <div class="form-group location-group">
                    <label for="location">Geburtsort</label>
                    <input type="text" id="location" name="location" value="${person.location || ''}" placeholder="z.B. Berlin, Deutschland">
                    <div class="map-container">
                        <button class="map-expand-btn" onclick="toggleMapSize()" title="Karte vergrößern/verkleinern">
                            <span class="map-expand-icon"></span>
                        </button>
                        <div id="locationMap" class="location-map"></div>
                    </div>
                    <small class="map-hint">Klicken Sie auf die Karte, um einen Geburtsort auszuwählen</small>
                </div>
            </div>
            <div class="form-section">
                <h3 class="form-section-title">Weitere Informationen</h3>
                <div class="form-section-content">
                    <div class="form-group files-upload-group">
                        <label for="filesUpload">Dateien hochladen (max. 10)</label>
                        <div class="drag-drop-area" id="dragDropArea" ondrop="handleDrop(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)">
                            <input type="file" id="filesUpload" name="filesUpload" multiple accept="image/*,application/pdf,.doc,.docx" onchange="handleFilesUpload(event)" style="display: none;">
                            <div class="drag-drop-content">
                                <div class="drag-drop-icon">📁</div>
                                <div class="drag-drop-text">Dateien hierher ziehen oder <span class="drag-drop-link" onclick="document.getElementById('filesUpload').click()">klicken zum Auswählen</span></div>
                                <div class="drag-drop-hint">Maximal 10 Dateien</div>
                            </div>
                        </div>
                        <div id="filesPreview" class="files-preview-container"></div>
                    </div>
                </div>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn-primary">Speichern</button>
                <button type="button" class="btn-secondary" onclick="showView('overview')">Abbrechen</button>
            </div>
        </form>
    `;
    
    // Profile Image laden
    if (person.profileImage) {
        profileImageData = person.profileImage;
        displayProfileImagePreview(person.profileImage);
    } else {
        profileImageData = null;
    }
    
    // Files laden
    if (person.uploadedFiles) {
        uploadedFiles = person.uploadedFiles;
        displayFilesPreview(uploadedFiles);
    } else {
        uploadedFiles = [];
    }
    
    // Map initialisieren
    setTimeout(() => {
        if (locationMap) {
            locationMap.invalidateSize();
            updateLocationMap();
        } else {
            initLocationMap();
        }
    }, 100);
}

function clearAllData() {
    if (confirm('Möchten Sie wirklich alle Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
        // Lösche alle Daten aus localStorage
        localStorage.removeItem('familyTree');
        localStorage.removeItem('relationships');
        
        // Lösche alle Daten aus dem Speicher
        familyTree = [];
        relationships = [];
        selectedPerson = null;
        editingPersonId = null;
        profileImageData = null;
        uploadedFiles = [];
        
        // Speichere leere Arrays
        saveFamilyTree();
        saveRelationships();
        
        // Rendere den leeren Baum neu
        renderTree();
        
        // Aktualisiere alle Selects
        populateParentSelect();
        populateRelationshipSelects();
        
        alert('Alle Daten wurden gelöscht. Der Stammbaum ist jetzt leer.');
    }
}

// Context Menu Functions
let contextMenuPersonId = null;

function showContextMenu(event, personId) {
    event.preventDefault();
    event.stopPropagation();
    
    const contextMenu = document.getElementById('contextMenu');
    if (!contextMenu) return;
    
    contextMenuPersonId = personId;
    
    // Position des Menüs
    contextMenu.style.left = event.clientX + 'px';
    contextMenu.style.top = event.clientY + 'px';
    contextMenu.style.display = 'block';
    
    // Person-spezifische Menüpunkte anzeigen/verstecken
    const editItem = document.getElementById('contextMenuEdit');
    const deleteItem = document.getElementById('contextMenuDelete');
    const viewDetailsItem = document.getElementById('contextMenuViewDetails');
    const addChildItem = document.getElementById('contextMenuAddChild');
    const addParentItem = document.getElementById('contextMenuAddParent');
    
    if (personId) {
        // Person wurde angeklickt
        if (editItem) editItem.style.display = 'flex';
        if (deleteItem) deleteItem.style.display = 'flex';
        if (viewDetailsItem) viewDetailsItem.style.display = 'flex';
        if (addChildItem) addChildItem.style.display = 'flex';
        if (addParentItem) addParentItem.style.display = 'flex';
        selectedPerson = personId;
    } else {
        // Leerer Platz wurde angeklickt
        if (editItem) editItem.style.display = 'none';
        if (deleteItem) deleteItem.style.display = 'none';
        if (viewDetailsItem) viewDetailsItem.style.display = 'none';
        if (addChildItem) addChildItem.style.display = 'none';
        if (addParentItem) addParentItem.style.display = 'none';
    }
    
    // Menü schließen bei Klick außerhalb
    setTimeout(() => {
        document.addEventListener('click', closeContextMenu);
        document.addEventListener('contextmenu', closeContextMenu);
    }, 10);
}

function closeContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    if (contextMenu) {
        contextMenu.style.display = 'none';
    }
    document.removeEventListener('click', closeContextMenu);
    document.removeEventListener('contextmenu', closeContextMenu);
}

function contextMenuAddPerson() {
    closeContextMenu();
    showView('add');
}

function contextMenuAddRelationship() {
    closeContextMenu();
    showView('relationship');
}

function contextMenuEdit() {
    closeContextMenu();
    if (contextMenuPersonId) {
        editPerson(contextMenuPersonId);
    }
}

function contextMenuDelete() {
    closeContextMenu();
    if (contextMenuPersonId) {
        if (confirm('Möchten Sie diese Person wirklich löschen?')) {
            deletePerson(contextMenuPersonId);
        }
    }
}

function contextMenuViewDetails() {
    closeContextMenu();
    if (contextMenuPersonId) {
        selectPerson(contextMenuPersonId);
        // Hier könnte eine Detailansicht geöffnet werden
        alert('Detailansicht wird in einer zukünftigen Version verfügbar sein.');
    }
}

function contextMenuAddChild() {
    closeContextMenu();
    if (contextMenuPersonId) {
        selectedPerson = contextMenuPersonId;
        showView('add');
        // Setze die Beziehung automatisch
        setTimeout(() => {
            const relatedPersonSelect = document.getElementById('relatedPersonId');
            const relationshipSelect = document.getElementById('relationshipTypeForPerson');
            if (relatedPersonSelect && relationshipSelect) {
                relatedPersonSelect.value = contextMenuPersonId;
                relationshipSelect.value = 'parent-child-reverse';
                updateArrowIcon(relationshipSelect);
                showPersonPreview('relatedPersonId', 'relatedPersonPreview');
            }
        }, 100);
    }
}

function contextMenuAddParent() {
    closeContextMenu();
    if (contextMenuPersonId) {
        selectedPerson = contextMenuPersonId;
        showView('add');
        // Setze die Beziehung automatisch
        setTimeout(() => {
            const relatedPersonSelect = document.getElementById('relatedPersonId');
            const relationshipSelect = document.getElementById('relationshipTypeForPerson');
            if (relatedPersonSelect && relationshipSelect) {
                relatedPersonSelect.value = contextMenuPersonId;
                relationshipSelect.value = 'parent-child';
                updateArrowIcon(relationshipSelect);
                showPersonPreview('relatedPersonId', 'relatedPersonPreview');
            }
        }, 100);
    }
}

function deletePerson(personId) {
    // Person aus familyTree entfernen
    familyTree = familyTree.filter(person => person.id !== personId);
    
    // Beziehungen entfernen, die diese Person betreffen
    relationships = relationships.filter(rel => 
        rel.person1Id !== personId && rel.person2Id !== personId
    );
    
    // Speichern
    saveFamilyTree();
    saveRelationships();
    
    // Neu rendern
    selectedPerson = null;
    renderTree();
}

// Person bearbeiten
function editPerson(id) {
    const person = familyTree.find(p => p.id === id);
    if (!person) return;
    
    editingPersonId = id;
    document.getElementById('modalTitle').textContent = 'Person bearbeiten';
    document.getElementById('firstName').value = person.firstName || '';
    document.getElementById('lastName').value = person.lastName || '';
    const birthDate = person.birthDate || '';
    const deathDate = person.deathDate || '';
    document.getElementById('birthDate').value = birthDate;
    document.getElementById('deathDate').value = deathDate;
    const gender = person.gender || 'm';
    document.getElementById('gender').value = gender;
    selectGender(gender);
    document.getElementById('location').value = person.location || '';
    
    // Profile image
    profileImageData = person.profileImage || null;
    if (profileImageData) {
        displayProfileImagePreview(profileImageData);
    } else {
        document.getElementById('profileImagePreview').innerHTML = '';
    }
    
    // Uploaded files
    uploadedFiles = person.uploadedFiles || [];
    displayFilesPreview(uploadedFiles);
    populateParentSelect(id);
    
    // Beziehungsfeld beim Bearbeiten ausblenden
    const relationshipGroup = document.querySelector('#personForm .form-group:first-child');
    if (relationshipGroup) {
        relationshipGroup.style.display = 'none';
    }
    
    // Vorschau aktualisieren
    updateNewPersonPreview();
    
    // Öffne das Modal für Bearbeitung
    const personModal = document.getElementById('personModal');
    personModal.classList.add('show');
    
    // Map aktualisieren wenn Formular geöffnet wird
    setTimeout(() => {
        if (locationMap) {
            locationMap.invalidateSize();
            updateLocationMap();
        } else {
            initLocationMap();
        }
    }, 100);
}

// Parent Select befüllen (für Kompatibilität)
function populateParentSelect(excludeId = null) {
    const select = document.getElementById('relatedPersonId');
    if (!select) return;
    
    const currentOptions = select.querySelectorAll('option:not(:first-child)');
    currentOptions.forEach(opt => opt.remove());
    
    familyTree.forEach(person => {
        if (person.id !== excludeId) {
            const option = document.createElement('option');
            option.value = person.id;
            option.textContent = `${person.firstName} ${person.lastName}`;
            select.appendChild(option);
        }
    });
}

// Vorschau für neue Person aktualisieren
function updateNewPersonPreview() {
    const preview = document.getElementById('newPersonPreview');
    if (!preview) return;
    
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const gender = document.getElementById('gender').value;
    
    if (!firstName && !lastName) {
        preview.innerHTML = '<div style="text-align: center; color: #999; padding: 1rem;">Wird hier angezeigt</div>';
        return;
    }
    
    const defaultImage = gender === 'f' ? '👩' : gender === 'm' ? '👨' : '👤';
    
    preview.innerHTML = `
        <div class="preview-card">
            <div class="preview-image">
                ${profileImageData ? `<img src="${profileImageData}" alt="${firstName} ${lastName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div class="preview-placeholder" style="display: none;">${defaultImage}</div>` : 
                `<div class="preview-placeholder">${defaultImage}</div>`}
            </div>
            <div class="preview-name">${firstName || ''} ${lastName || ''}</div>
        </div>
    `;
}

// Beziehungs-Selects befüllen
function populateRelationshipSelects() {
    const select1 = document.getElementById('person1Id');
    const select2 = document.getElementById('person2Id');
    
    [select1, select2].forEach(select => {
        const currentOptions = select.querySelectorAll('option:not(:first-child)');
        currentOptions.forEach(opt => opt.remove());
        
        familyTree.forEach(person => {
            const option = document.createElement('option');
            option.value = person.id;
            option.textContent = `${person.firstName} ${person.lastName}`;
            select.appendChild(option);
        });
    });
}

// Pfeil-Form basierend auf Beziehungstyp aktualisieren
function updateArrowIcon(selectElement) {
    const value = selectElement.value;
    let arrowType = '';
    
    if (value === '') {
        // Standard: Pfeil nach rechts
        arrowType = 'right';
    } else if (value === 'parent-child' || value === 'parent-child-biological' || value === 'parent-child-step' || value === 'parent-child-adoptive' || 
               value === 'grandparent-grandchild' || value === 'uncle-aunt-nephew-niece') {
        arrowType = 'right';
    } else if (value.includes('-reverse')) {
        arrowType = 'left';
    } else if (value === 'sibling' || value === 'spouse' || value.startsWith('cousin')) {
        arrowType = 'both';
    }
    
    // Entferne alle data-arrow Attribute
    selectElement.removeAttribute('data-arrow');
    
    // Setze neues data-arrow Attribut
    if (arrowType) {
        selectElement.setAttribute('data-arrow', arrowType);
    }
    
    // Text sichtbar lassen
    selectElement.style.color = '#ffffff';
}

// Person Selection Sidebar
let currentSelectId = null;
let currentPreviewId = null;

function openPersonSelectionSidebar(selectId, previewId) {
    currentSelectId = selectId;
    currentPreviewId = previewId;
    const sidebar = document.getElementById('personSelectionSidebar');
    sidebar.classList.add('open');
    populatePersonList();
    // Reset filters
    document.getElementById('personSearchInput').value = '';
    // Close filter sidebar when opening person selection
    const filterSidebar = document.getElementById('filterSidebar');
    if (filterSidebar) {
        filterSidebar.classList.remove('open');
    }
}

function closePersonSelectionSidebar() {
    const sidebar = document.getElementById('personSelectionSidebar');
    const filterSidebar = document.getElementById('filterSidebar');
    sidebar.classList.remove('open');
    // Close filter sidebar when person selection sidebar closes
    if (filterSidebar) {
        filterSidebar.classList.remove('open');
    }
    currentSelectId = null;
    currentPreviewId = null;
}

function populatePersonList() {
    const personList = document.getElementById('personList');
    personList.innerHTML = '';
    
    if (familyTree.length === 0) {
        personList.innerHTML = '<div class="person-list-empty">Keine Personen vorhanden</div>';
        return;
    }
    
    familyTree.forEach(person => {
        const item = document.createElement('div');
        item.className = 'person-list-item';
        item.setAttribute('data-person-id', person.id);
        item.setAttribute('data-gender', person.gender || '');
        item.onclick = () => selectPersonFromSidebar(person.id);
        
        const birthYear = person.birthDate ? new Date(person.birthDate).getFullYear() : '';
        const deathYear = person.deathDate ? new Date(person.deathDate).getFullYear() : '';
        const dateStr = birthYear ? (deathYear ? `${birthYear} - ${deathYear}` : `*${birthYear}`) : '';
        const location = person.location || '';
        const profileImage = person.profileImage || '';
        const defaultImage = person.gender === 'f' ? '👩' : person.gender === 'm' ? '👨' : '👤';
        
        item.innerHTML = `
            <div class="person-list-item-image">
                ${profileImage ? `<img src="${profileImage}" alt="${person.firstName} ${person.lastName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div class="preview-placeholder" style="display: none;">${defaultImage}</div>` : 
                `<div class="preview-placeholder">${defaultImage}</div>`}
            </div>
            <div class="person-list-item-info">
                <div class="person-list-item-name">${person.firstName} ${person.lastName}</div>
                <div class="person-list-item-details">
                    ${dateStr ? `${dateStr}${location ? ' • ' : ''}` : ''}${location}
                </div>
            </div>
        `;
        
        personList.appendChild(item);
    });
}

function selectPersonFromSidebar(personId) {
    if (!currentSelectId) return;
    
    const select = document.getElementById(currentSelectId);
    if (select) {
        select.value = personId;
        showPersonPreview(currentSelectId, currentPreviewId);
    }
    
    closePersonSelectionSidebar();
}

function filterPersons() {
    const searchTerm = document.getElementById('personSearchInput').value.toLowerCase();
    const items = document.querySelectorAll('.person-list-item');
    let visibleCount = 0;
    
    // Get gender filters
    const genderM = document.getElementById('filterGenderM')?.checked || false;
    const genderF = document.getElementById('filterGenderF')?.checked || false;
    const genderD = document.getElementById('filterGenderD')?.checked || false;
    const anyGenderSelected = genderM || genderF || genderD;
    
    // Get birth year filters
    const birthYearFrom = document.getElementById('filterBirthYearFrom')?.value || '';
    const birthYearTo = document.getElementById('filterBirthYearTo')?.value || '';
    
    // Get status filters
    const filterAlive = document.getElementById('filterAlive')?.checked || false;
    const filterDeceased = document.getElementById('filterDeceased')?.checked || false;
    const anyStatusSelected = filterAlive || filterDeceased;
    
    items.forEach(item => {
        const name = item.querySelector('.person-list-item-name').textContent.toLowerCase();
        const details = item.querySelector('.person-list-item-details').textContent.toLowerCase();
        const personGender = item.getAttribute('data-gender');
        const personId = parseInt(item.getAttribute('data-person-id'));
        const person = familyTree.find(p => p.id === personId);
        
        // Search filter
        const matchesSearch = !searchTerm || name.includes(searchTerm) || details.includes(searchTerm);
        
        // Gender filter
        let matchesGender = true;
        if (anyGenderSelected) {
            matchesGender = (genderM && personGender === 'm') || 
                          (genderF && personGender === 'f') || 
                          (genderD && personGender === 'd');
        }
        
        // Birth date filter
        let matchesBirthDate = true;
        if (person && person.birthDate) {
            const personBirthDate = new Date(person.birthDate);
            if (birthYearFrom) {
                const fromDate = new Date(birthYearFrom);
                if (personBirthDate < fromDate) {
                    matchesBirthDate = false;
                }
            }
            if (birthYearTo) {
                const toDate = new Date(birthYearTo);
                // Set to end of day for inclusive comparison
                toDate.setHours(23, 59, 59, 999);
                if (personBirthDate > toDate) {
                    matchesBirthDate = false;
                }
            }
        } else if (birthYearFrom || birthYearTo) {
            matchesBirthDate = false;
        }
        
        // Status filter
        let matchesStatus = true;
        if (anyStatusSelected) {
            const isDeceased = person && person.deathDate && person.deathDate.trim() !== '';
            if (filterAlive && isDeceased) {
                matchesStatus = false;
            }
            if (filterDeceased && !isDeceased) {
                matchesStatus = false;
            }
        }
        
        if (matchesSearch && matchesGender && matchesBirthDate && matchesStatus) {
            item.style.display = 'flex';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Check if list is empty
    const personList = document.getElementById('personList');
    const existingEmpty = personList.querySelector('.person-list-empty');
    
    const hasFilters = searchTerm || anyGenderSelected || (birthYearFrom && birthYearFrom !== '') || (birthYearTo && birthYearTo !== '') || anyStatusSelected;
    
    if (visibleCount === 0 && hasFilters) {
        if (!existingEmpty) {
            const empty = document.createElement('div');
            empty.className = 'person-list-empty';
            empty.textContent = 'Keine Personen gefunden';
            personList.appendChild(empty);
        }
    } else {
        if (existingEmpty) {
            existingEmpty.remove();
        }
    }
}

function openFilterSidebar() {
    const filterSidebar = document.getElementById('filterSidebar');
    const personSidebar = document.getElementById('personSelectionSidebar');
    // Only toggle filter sidebar if person selection sidebar is open
    if (filterSidebar && personSidebar && personSidebar.classList.contains('open')) {
        if (filterSidebar.classList.contains('open')) {
            filterSidebar.classList.remove('open');
        } else {
            filterSidebar.classList.add('open');
        }
    }
}

function closeFilterSidebar() {
    const filterSidebar = document.getElementById('filterSidebar');
    if (filterSidebar) {
        filterSidebar.classList.remove('open');
    }
}

function clearFilters() {
    document.getElementById('personSearchInput').value = '';
    const genderM = document.getElementById('filterGenderM');
    const genderF = document.getElementById('filterGenderF');
    const genderD = document.getElementById('filterGenderD');
    const birthYearFrom = document.getElementById('filterBirthYearFrom');
    const birthYearTo = document.getElementById('filterBirthYearTo');
    const filterAlive = document.getElementById('filterAlive');
    const filterDeceased = document.getElementById('filterDeceased');
    
    if (genderM) genderM.checked = false;
    if (genderF) genderF.checked = false;
    if (genderD) genderD.checked = false;
    if (birthYearFrom) birthYearFrom.value = '';
    if (birthYearTo) birthYearTo.value = '';
    if (filterAlive) filterAlive.checked = false;
    if (filterDeceased) filterDeceased.checked = false;
    
    filterPersons();
}

// Bildvorschau bei Namensauswahl
function showPersonPreview(selectId, previewId) {
    const select = document.getElementById(selectId);
    const preview = document.getElementById(previewId);
    const personId = parseInt(select.value);
    
    if (!personId) {
        // Keine Person ausgewählt - zeige Placeholder
        preview.classList.remove('has-selection');
        // Select befüllen falls leer
        if (select.options.length <= 1) {
            familyTree.forEach(person => {
                const option = document.createElement('option');
                option.value = person.id;
                option.textContent = `${person.firstName} ${person.lastName}`;
                select.appendChild(option);
            });
        }
        return;
    }
    
    const person = familyTree.find(p => p.id === personId);
    if (!person) return;
    
    // Person ausgewählt - zeige Vorschau
    preview.classList.add('has-selection');
    
    const imageUrl = person.imageUrl || '';
    const defaultImage = person.gender === 'f' ? '👩' : person.gender === 'm' ? '👨' : '👤';
    
    // Erstelle Preview-Card falls nicht vorhanden
    let previewCard = preview.querySelector('.preview-card');
    if (!previewCard) {
        previewCard = document.createElement('div');
        previewCard.className = 'preview-card';
        preview.appendChild(previewCard);
    }
    
    previewCard.innerHTML = `
        <div class="preview-image">
            ${imageUrl ? `<img src="${imageUrl}" alt="${person.firstName} ${person.lastName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <div class="preview-placeholder" style="display: none;">${defaultImage}</div>` : 
            `<div class="preview-placeholder">${defaultImage}</div>`}
        </div>
        <div class="preview-name">${person.firstName} ${person.lastName}</div>
    `;
    
    // Select befüllen falls nötig
    if (select.options.length <= 1) {
        familyTree.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = `${p.firstName} ${p.lastName}`;
            if (p.id === personId) option.selected = true;
            select.appendChild(option);
        });
    }
}

// Hilfsfunktion für Beziehungs-Labels
function getRelationshipLabel(relationshipType) {
    switch(relationshipType) {
        case 'parent-child-biological':
        case 'parent-child':
            return 'Biologisch';
        case 'parent-child-step':
            return 'Stiefelternteil';
        case 'parent-child-adoptive':
            return 'Adoptiv';
        case 'spouse':
            return 'Ehepartner/Partner';
        case 'sibling':
            return 'Geschwister';
        case 'grandparent-grandchild':
        case 'grandparent-grandchild-reverse':
            return 'Großeltern-Enkel';
        case 'uncle-aunt-nephew-niece':
        case 'uncle-aunt-nephew-niece-reverse':
            return 'Onkel/Tante - Neffe/Nichte';
        case 'cousin':
        case 'cousin-1':
        case 'cousin-2':
        case 'cousin-3':
        case 'cousin-4':
        case 'cousin-custom':
            return 'Cousin/Cousine';
        default:
            return 'Beziehung';
    }
}

// Hilfsfunktion für Beziehungs-Labels in Tooltips
function getRelationshipTypeLabel(relationshipType) {
    switch(relationshipType) {
        case 'parent-child-biological':
        case 'parent-child':
            return 'Biologischer Elternteil';
        case 'parent-child-step':
            return 'Stiefelternteil';
        case 'parent-child-adoptive':
            return 'Adoptivelternteil';
        case 'spouse':
            return 'Ehepartner/Partner';
        case 'sibling':
            return 'Geschwister';
        default:
            return 'Elternteil';
    }
}

// Validierungsfunktion für Beziehungen
function validateRelationship(person1Id, person2Id, type) {
    const person1 = familyTree.find(p => p.id === person1Id);
    const person2 = familyTree.find(p => p.id === person2Id);
    
    if (!person1 || !person2) {
        return { valid: false, message: 'Eine oder beide Personen existieren nicht.' };
    }
    
    // 1. Selbst-Beziehung
    if (person1Id === person2Id) {
        return { valid: false, message: 'Eine Person kann keine Beziehung zu sich selbst haben.' };
    }
    
    // 2. Prüfe ob Beziehung bereits existiert
    const exists = relationships.some(rel => 
        (rel.person1Id === person1Id && rel.person2Id === person2Id) ||
        (rel.person1Id === person2Id && rel.person2Id === person1Id)
    );
    
    if (exists) {
        return { valid: false, message: 'Diese Beziehung existiert bereits.' };
    }
    
    // 3. Prüfe auf zirkuläre Beziehungen (Parent-Child)
    if (type === 'parent-child' || type === 'parent-child-biological' || 
        type === 'parent-child-step' || type === 'parent-child-adoptive') {
        // Person1 wird Elternteil von Person2
        // Prüfe ob Person2 bereits Elternteil von Person1 ist (direkt)
        const isPerson2ParentOfPerson1 = relationships.some(rel => 
            rel.person1Id === person2Id && rel.person2Id === person1Id &&
            (rel.type === 'parent-child' || rel.type === 'parent-child-biological' || 
             rel.type === 'parent-child-step' || rel.type === 'parent-child-adoptive')
        );
        if (isPerson2ParentOfPerson1) {
            return { valid: false, message: 'Zirkuläre Beziehung: Eine Person kann nicht gleichzeitig Elternteil und Kind derselben Person sein.' };
        }
        
        // Prüfe auf indirekte Zyklen (A ist Elternteil von B, B ist Elternteil von C, dann kann C nicht Elternteil von A sein)
        function isAncestor(ancestorId, descendantId, visited = new Set()) {
            if (visited.has(ancestorId)) return false; // Verhindere Endlosschleifen
            visited.add(ancestorId);
            
            // Direkte Parent-Child Beziehung prüfen
            const directChildren = relationships.filter(rel => 
                rel.person1Id === ancestorId && rel.person2Id === descendantId &&
                (rel.type === 'parent-child' || rel.type === 'parent-child-biological' || 
                 rel.type === 'parent-child-step' || rel.type === 'parent-child-adoptive')
            );
            if (directChildren.length > 0) return true;
            
            // Rekursiv prüfen: Ist einer der Kinder ein Vorfahr?
            const children = relationships.filter(rel => 
                rel.person1Id === ancestorId &&
                (rel.type === 'parent-child' || rel.type === 'parent-child-biological' || 
                 rel.type === 'parent-child-step' || rel.type === 'parent-child-adoptive')
            ).map(rel => rel.person2Id);
            
            for (const childId of children) {
                if (isAncestor(childId, descendantId, new Set(visited))) return true;
            }
            return false;
        }
        
        // Prüfe ob Person2 bereits ein Vorfahr von Person1 ist
        if (isAncestor(person2Id, person1Id)) {
            return { valid: false, message: 'Zirkuläre Beziehung: Diese Beziehung würde einen Zyklus in der Familiengeschichte erzeugen (Person2 ist bereits ein Vorfahr von Person1).' };
        }
        
        // Maximal 2 biologische Eltern
        if (type === 'parent-child-biological' || type === 'parent-child') {
            const biologicalParents = relationships.filter(rel => 
                rel.person2Id === person2Id && 
                (rel.type === 'parent-child-biological' || rel.type === 'parent-child')
            );
            if (biologicalParents.length >= 2) {
                return { valid: false, message: 'Eine Person kann maximal 2 biologische Eltern haben.' };
            }
        }
        
        // Altersvalidierung: Kind sollte nach Eltern geboren sein (wenn Geburtsdaten vorhanden)
        if (person1.birthDate && person2.birthDate) {
            const parentBirth = new Date(person1.birthDate);
            const childBirth = new Date(person2.birthDate);
            // Mindestalter: 13 Jahre (realistisch)
            const minAge = 13;
            const minParentAge = new Date(childBirth);
            minParentAge.setFullYear(minParentAge.getFullYear() - minAge);
            
            if (parentBirth < minParentAge) {
                return { valid: false, message: `Altersvalidierung: Der Elternteil muss mindestens ${minAge} Jahre älter sein als das Kind.` };
            }
        }
    }
    
    // 4. Geschwister-Validierung
    if (type === 'sibling') {
        // Geschwister sollten mindestens einen gemeinsamen biologischen Elternteil haben
        const person1Parents = relationships.filter(rel => 
            rel.person2Id === person1Id &&
            (rel.type === 'parent-child-biological' || rel.type === 'parent-child')
        ).map(rel => rel.person1Id);
        
        const person2Parents = relationships.filter(rel => 
            rel.person2Id === person2Id &&
            (rel.type === 'parent-child-biological' || rel.type === 'parent-child')
        ).map(rel => rel.person1Id);
        
        const commonParents = person1Parents.filter(p => person2Parents.includes(p));
        if (commonParents.length === 0) {
            return { valid: false, message: 'Geschwister müssen mindestens einen gemeinsamen biologischen Elternteil haben.' };
        }
    }
    
    // 5. Ehepartner-Validierung
    if (type === 'spouse') {
        // Ehepartner sollten nicht zu eng verwandt sein
        // Prüfe ob sie bereits in einer Parent-Child Beziehung stehen
        const isParentChild = relationships.some(rel => 
            ((rel.person1Id === person1Id && rel.person2Id === person2Id) ||
             (rel.person1Id === person2Id && rel.person2Id === person1Id)) &&
            (rel.type === 'parent-child' || rel.type === 'parent-child-biological' || 
             rel.type === 'parent-child-step' || rel.type === 'parent-child-adoptive')
        );
        
        if (isParentChild) {
            return { valid: false, message: 'Ehepartner können nicht in einer Parent-Child Beziehung zueinander stehen.' };
        }
        
        // Prüfe ob sie Geschwister sind
        const areSiblings = relationships.some(rel => 
            ((rel.person1Id === person1Id && rel.person2Id === person2Id) ||
             (rel.person1Id === person2Id && rel.person2Id === person1Id)) &&
            rel.type === 'sibling'
        );
        
        if (areSiblings) {
            return { valid: false, message: 'Geschwister können nicht Ehepartner sein.' };
        }
        
        // Prüfe auf andere enge Verwandtschaftsgrade (Großeltern-Enkel, Onkel-Neffe, etc.)
        const person1Parents = relationships.filter(rel => 
            rel.person2Id === person1Id &&
            (rel.type === 'parent-child-biological' || rel.type === 'parent-child')
        ).map(rel => rel.person1Id);
        
        const person2Parents = relationships.filter(rel => 
            rel.person2Id === person2Id &&
            (rel.type === 'parent-child-biological' || rel.type === 'parent-child')
        ).map(rel => rel.person1Id);
        
        // Prüfe ob eine Person Elternteil der anderen ist
        if (person1Parents.includes(person2Id) || person2Parents.includes(person1Id)) {
            return { valid: false, message: 'Ehepartner können nicht in einer direkten Parent-Child Beziehung stehen.' };
        }
        
        // Prüfe ob sie Großeltern-Enkel sind
        const person1Grandparents = [];
        person1Parents.forEach(parentId => {
            const grandParents = relationships.filter(rel => 
                rel.person2Id === parentId &&
                (rel.type === 'parent-child-biological' || rel.type === 'parent-child')
            ).map(rel => rel.person1Id);
            person1Grandparents.push(...grandParents);
        });
        
        if (person1Grandparents.includes(person2Id) || person2Parents.some(p => person1Grandparents.includes(p))) {
            return { valid: false, message: 'Großeltern und Enkel können nicht Ehepartner sein.' };
        }
    }
    
    // 6. Prüfe auf widersprüchliche Beziehungstypen
    const conflictingTypes = relationships.filter(rel => 
        ((rel.person1Id === person1Id && rel.person2Id === person2Id) ||
         (rel.person1Id === person2Id && rel.person2Id === person1Id)) &&
        rel.type !== type
    );
    
    if (conflictingTypes.length > 0) {
        const conflictingType = conflictingTypes[0].type;
        return { valid: false, message: `Widersprüchliche Beziehung: Es existiert bereits eine "${getRelationshipLabel(conflictingType)}" Beziehung zwischen diesen Personen.` };
    }
    
    return { valid: true };
}

// Beziehung speichern
function saveRelationship(event) {
    event.preventDefault();
    
    const person1Id = parseInt(document.getElementById('person1Id').value);
    const person2Id = parseInt(document.getElementById('person2Id').value);
    const type = document.getElementById('relationshipType').value;
    
    // Validierung
    const validation = validateRelationship(person1Id, person2Id, type);
    if (!validation.valid) {
        alert(validation.message);
        return;
    }
    
    // Prüfe ob Beziehung bereits existiert
    const exists = relationships.some(rel => 
        (rel.person1Id === person1Id && rel.person2Id === person2Id && rel.type === type) ||
        (rel.person1Id === person2Id && rel.person2Id === person1Id && rel.type === type)
    );
    
    if (!exists) {
    const newId = relationships.length > 0 ? Math.max(...relationships.map(r => r.id)) + 1 : 1;
    relationships.push({ id: newId, person1Id, person2Id, type });
        
        // Erstelle automatisch umgekehrte Beziehung
        createReverseRelationship(type, person1Id, person2Id);
        
        // Leite alle verwandten Beziehungen ab
        deriveAllRelatedRelationships(person1Id);
        deriveAllRelatedRelationships(person2Id);
    
    saveRelationships();
    }
    
    showView('overview');
}

// Beziehungs-Modal schließen (Legacy - wird nicht mehr verwendet)
function closeRelationshipModal() {
    showView('overview');
}

// Person speichern
function savePerson(event) {
    event.preventDefault();
    
    const formData = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        birthDate: document.getElementById('birthDate').value,
        deathDate: document.getElementById('deathDate').value,
        parentId: null, // Wird durch Beziehungen ersetzt
        gender: document.getElementById('gender').value,
        location: document.getElementById('location').value,
        profileImage: profileImageData,
        uploadedFiles: uploadedFiles
    };
    
    let newPersonId;
    
    if (editingPersonId) {
        // Bearbeiten
        const index = familyTree.findIndex(p => p.id === editingPersonId);
        if (index !== -1) {
            const existingPerson = familyTree[index];
            const updatedPerson = { ...existingPerson, ...formData };
            familyTree[index] = updatedPerson;
            newPersonId = editingPersonId;
        }
    } else {
        // Neu hinzufügen
        newPersonId = familyTree.length > 0 ? Math.max(...familyTree.map(p => p.id)) + 1 : 1;
        familyTree.push({ id: newPersonId, ...formData });
    }
    
    // Beziehung hinzufügen, falls ausgewählt
    const relatedPersonIdEl = document.getElementById('relatedPersonId');
    const relationshipTypeEl = document.getElementById('relationshipTypeForPerson');
    
    if (relatedPersonIdEl && relationshipTypeEl) {
        const relatedPersonId = relatedPersonIdEl.value;
        const relationshipType = relationshipTypeEl.value;
        
        if (relatedPersonId && relationshipType) {
            const relatedId = parseInt(relatedPersonId);
            let finalType = relationshipType;
            let finalPerson1Id = relatedId;
            let finalPerson2Id = newPersonId;
            
            // Reverse-Beziehungen behandeln
            if (relationshipType.endsWith('-reverse')) {
                finalType = relationshipType.replace('-reverse', '');
                finalPerson1Id = newPersonId;
                finalPerson2Id = relatedId;
            }
            
            // Cousin-Grade behandeln - lese Grad aus Eingabefeld
            if (relationshipType === 'cousin') {
                    const gradeInput = document.getElementById('cousinGrade');
                const cousinGrade = gradeInput ? parseInt(gradeInput.value) || 1 : 1;
                finalType = `cousin-${cousinGrade}`;
            }
            
            // Validierung der Beziehung
            const validation = validateRelationship(finalPerson1Id, finalPerson2Id, finalType);
            if (!validation.valid) {
                alert(validation.message);
                saveFamilyTree();
                showView('overview');
                return;
            }
            
            // Prüfe ob Beziehung bereits existiert (zusätzliche Sicherheit)
            const exists = relationships.some(rel => 
                (rel.person1Id === finalPerson1Id && rel.person2Id === finalPerson2Id) ||
                (rel.person1Id === finalPerson2Id && rel.person2Id === finalPerson1Id)
            );
            
            if (!exists) {
                const newRelId = relationships.length > 0 ? Math.max(...relationships.map(r => r.id)) + 1 : 1;
                relationships.push({ id: newRelId, person1Id: finalPerson1Id, person2Id: finalPerson2Id, type: finalType });
                
                // Erstelle automatisch umgekehrte Beziehung
                createReverseRelationship(finalType, finalPerson1Id, finalPerson2Id);
                
                // Leite alle verwandten Beziehungen ab
                deriveAllRelatedRelationships(newPersonId);
                
                saveRelationships();
            }
        }
    }
    
    // Stelle sicher, dass die neue Person 2 Eltern hat (nur wenn sie keine hat)
    if (!editingPersonId) {
        ensureTwoParentsForAllChildren();
    }
    
    saveFamilyTree();
    showView('overview');
}

// Profile Image Upload Handler
function handleProfileImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    processProfileImage(file);
    event.target.value = '';
}

// Process Profile Image
function processProfileImage(file) {
    if (!file.type.startsWith('image/')) {
        alert('Bitte wählen Sie eine Bilddatei aus.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        profileImageData = e.target.result;
        displayProfileImagePreview(profileImageData);
        updateNewPersonPreview();
    };
    reader.readAsDataURL(file);
}

// Gender Selection
function selectGender(gender) {
    document.getElementById('gender').value = gender;
    
    // Update button states
    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-gender') === gender) {
            btn.classList.add('active');
        }
    });
    
    // Update preview
    updateNewPersonPreview();
}

// Focus next empty field when clicking on "Neue Person" box
function focusNextEmptyField() {
    // List of fields to check in order
    const fieldsToCheck = [
        'firstName',
        'lastName',
        'birthDate',
        'deathDate',
        'location'
    ];
    
    // Find first empty field
    for (const fieldId of fieldsToCheck) {
        const field = document.getElementById(fieldId);
        if (field && !field.value.trim()) {
            // Scroll to field
            setTimeout(() => {
                field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Focus after scroll
                setTimeout(() => {
                    field.focus();
                }, 300);
            }, 50);
            return;
        }
    }
    
    // If all fields are filled, focus on first field
    const firstNameField = document.getElementById('firstName');
    if (firstNameField) {
        setTimeout(() => {
            firstNameField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                firstNameField.focus();
            }, 300);
        }, 50);
    }
}

// Profile Image Drag and Drop Handlers
function handleProfileImageDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('drag-over');
}

function handleProfileImageDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('drag-over');
}

function handleProfileImageDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('drag-over');
    
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
        processProfileImage(files[0]);
    }
}

// Display Profile Image Preview
function displayProfileImagePreview(imageData) {
    const previewContainer = document.getElementById('profileImagePreview');
    previewContainer.innerHTML = `
        <div class="image-preview-item">
            <img src="${imageData}" alt="Profilbild Vorschau" class="preview-image">
            <button type="button" class="remove-image-btn" onclick="removeProfileImage()">×</button>
        </div>
    `;
}

// Remove Profile Image
function removeProfileImage() {
    profileImageData = null;
    document.getElementById('profileImagePreview').innerHTML = '';
    document.getElementById('profileImage').value = '';
}

// Files Upload Handler
function handleFilesUpload(event) {
    const files = Array.from(event.target.files);
    processFiles(files);
    event.target.value = '';
}

// Process uploaded files
function processFiles(files) {
    if (uploadedFiles.length + files.length > 10) {
        alert('Sie können maximal 10 Dateien hochladen.');
        return;
    }
    
    let processedCount = 0;
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedFiles.push({
                name: file.name,
                type: file.type,
                size: file.size,
                data: e.target.result
            });
            processedCount++;
            
            if (processedCount === files.length) {
                displayFilesPreview(uploadedFiles);
            }
        };
        reader.readAsDataURL(file);
    });
}

// Drag and Drop Handlers
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('drag-over');
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('drag-over');
    
    const files = Array.from(event.dataTransfer.files);
    processFiles(files);
}

// Display Files Preview
function displayFilesPreview(files) {
    const previewContainer = document.getElementById('filesPreview');
    
    if (files.length === 0) {
        previewContainer.innerHTML = '';
        return;
    }
    
    previewContainer.innerHTML = files.map((file, index) => {
        const isImage = file.type.startsWith('image/');
        const fileSize = (file.size / 1024).toFixed(2);
        
        return `
            <div class="file-preview-item">
                ${isImage ? `<img src="${file.data}" alt="${file.name}" class="file-preview-image">` : `<div class="file-preview-icon">📄</div>`}
                <div class="file-preview-info">
                    <div class="file-preview-name">${file.name}</div>
                    <div class="file-preview-size">${fileSize} KB</div>
                </div>
                <button type="button" class="remove-file-btn" onclick="removeFile(${index})">×</button>
            </div>
        `;
    }).join('');
}

// Remove File
function removeFile(index) {
    uploadedFiles.splice(index, 1);
    displayFilesPreview(uploadedFiles);
    document.getElementById('filesUpload').value = '';
}

// Map Größe umschalten
function toggleMapSize() {
    const map = document.getElementById('locationMap');
    const btn = document.querySelector('.map-expand-btn');
    
    if (map && btn) {
        const isExpanded = map.classList.contains('expanded');
        map.classList.toggle('expanded');
        btn.classList.toggle('expanded');
        
        // Map Größe neu berechnen
        if (locationMap) {
            setTimeout(() => {
                locationMap.invalidateSize();
            }, 100);
        }
    }
}

// Location Map initialisieren
function initLocationMap() {
    const mapContainer = document.getElementById('locationMap');
    if (!mapContainer) return;
    
    // Karte initialisieren (Zentrum: Deutschland)
    locationMap = L.map('locationMap').setView([51.1657, 10.4515], 6);
    
    // OpenStreetMap Tiles hinzufügen
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(locationMap);
    
    // Klick-Event für Marker setzen
    locationMap.on('click', function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        // Marker entfernen falls vorhanden
        if (locationMarker) {
            locationMap.removeLayer(locationMarker);
        }
        
        // Neuen Marker setzen
        locationMarker = L.marker([lat, lng]).addTo(locationMap);
        
        // Reverse Geocoding für Adresse
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
            .then(response => response.json())
            .then(data => {
                let locationText = '';
                if (data.address) {
                    const addr = data.address;
                    const parts = [];
                    if (addr.city || addr.town || addr.village) {
                        parts.push(addr.city || addr.town || addr.village);
                    }
                    if (addr.country) {
                        parts.push(addr.country);
                    }
                    locationText = parts.join(', ');
                }
                
                if (locationText) {
                    document.getElementById('location').value = locationText;
                } else {
                    document.getElementById('location').value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                }
            })
            .catch(error => {
                console.error('Geocoding error:', error);
                document.getElementById('location').value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            });
    });
}

// Location Map aktualisieren wenn Formular geöffnet wird
function updateLocationMap() {
    const locationInput = document.getElementById('location');
    if (!locationInput || !locationMap) return;
    
    const locationValue = locationInput.value.trim();
    if (locationValue) {
        // Geocoding für bestehenden Ort
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationValue)}&limit=1`)
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lon = parseFloat(data[0].lon);
                    
                    locationMap.setView([lat, lon], 10);
                    
                    // Marker setzen
                    if (locationMarker) {
                        locationMap.removeLayer(locationMarker);
                    }
                    locationMarker = L.marker([lat, lon]).addTo(locationMap);
                }
            })
            .catch(error => {
                console.error('Geocoding error:', error);
            });
    }
}

// Modal schließen
function closeModal() {
    const personModal = document.getElementById('personModal');
    personModal.classList.remove('show');
    editingPersonId = null;
    selectedPerson = null;
    // Event Listener entfernen
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const genderSelect = document.getElementById('gender');
    
    if (firstNameInput) {
        firstNameInput.removeEventListener('input', updateNewPersonPreview);
    }
    if (lastNameInput) {
        lastNameInput.removeEventListener('input', updateNewPersonPreview);
    }
    if (genderSelect) {
        genderSelect.removeEventListener('change', updateNewPersonPreview);
    }
    // Profile image event listener is handled in showView function
    
    renderTree();
}

// Person suchen
function searchPerson(term) {
    const found = familyTree.filter(p => 
        p.firstName.toLowerCase().includes(term.toLowerCase()) ||
        p.lastName.toLowerCase().includes(term.toLowerCase())
    );
    
    if (found.length > 0) {
        selectPerson(found[0].id);
        // Scroll zur Person
        setTimeout(() => {
            const card = document.querySelector(`.person-card[data-id="${found[0].id}"]`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    } else {
        alert('Keine Person gefunden.');
    }
}

// Daten exportieren
function exportData() {
    const dataStr = JSON.stringify(familyTree, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'stammbaum.json';
    link.click();
    URL.revokeObjectURL(url);
}

// Sidebar schließen bei Klick außerhalb (aber nicht für Modal)
window.onclick = function(event) {
    const relationshipModal = document.getElementById('relationshipModal');
    const sidebar = document.getElementById('personSelectionSidebar');
    const filterSidebar = document.getElementById('filterSidebar');
    
    // Relationship modal kann noch bei Klick außerhalb geschlossen werden
    if (event.target === relationshipModal) {
        closeRelationshipModal();
    }
    // Sidebar schließen bei Klick außerhalb
    if (sidebar && !sidebar.contains(event.target) && !event.target.closest('.person-select-box')) {
        // Don't close if clicking on filter sidebar or filter button
        if (!filterSidebar || (!filterSidebar.contains(event.target) && !event.target.closest('.filter-btn'))) {
            if (sidebar.classList.contains('open')) {
                closePersonSelectionSidebar();
            }
        }
    }
}

// Toggle Cousin Grade Input - zeigt Eingabefeld wenn Cousin ausgewählt wird
function toggleCousinGradeInput(selectElement) {
    const cousinGradeInput = document.getElementById('cousinGradeInput');
    const gradeDisplay = document.getElementById('cousinGradeDisplay');
    const gradeInput = document.getElementById('cousinGrade');
    
    if (!cousinGradeInput) return;
    
    const value = selectElement.value;
    // Zeige Eingabefeld für Cousin-Beziehungen
    if (value === 'cousin') {
        cousinGradeInput.style.display = 'block';
        // Stelle sicher, dass der Wert korrekt angezeigt wird
        if (gradeDisplay && gradeInput) {
            gradeDisplay.textContent = gradeInput.value || '1';
        }
    } else {
        cousinGradeInput.style.display = 'none';
    }
}

// Cousin-Grad ändern mit +/- Buttons
function changeCousinGrade(delta) {
    const gradeInput = document.getElementById('cousinGrade');
    const gradeDisplay = document.getElementById('cousinGradeDisplay');
    if (!gradeInput) return;
    
    let currentValue = parseInt(gradeInput.value) || 1;
    let newValue = currentValue + delta;
    
    // Mindestwert ist 1
    if (newValue < 1) {
        newValue = 1;
    }
    
    gradeInput.value = newValue;
    if (gradeDisplay) {
        gradeDisplay.textContent = newValue;
    }
}

// DEAKTIVIERT: Empty Slots werden nicht mehr erstellt
function ensureAncestorsExist(personId, targetLevel, currentLevel = 0, relationshipType = 'parent-child-biological') {
    // Funktion deaktiviert - keine Empty Slots mehr
    return personId;
}

// DEAKTIVIERT: Empty Slots werden nicht mehr erstellt
function createEmptySlotsForRelationship(relationshipType, person1Id, person2Id) {
    // Funktion deaktiviert - keine Empty Slots mehr
    return;
}

// Helper: Get ancestors of a person up to a certain generation
function getAncestors(personId, maxGenerations) {
    const ancestors = [];
    const visited = new Set();
    
    function traverse(id, generation) {
        if (generation > maxGenerations || visited.has(id)) return;
        visited.add(id);
        
        const parentRels = relationships.filter(rel => 
            (rel.person2Id === id && (rel.type === 'parent-child' || rel.type === 'parent-child-biological' || 
             rel.type === 'parent-child-step' || rel.type === 'parent-child-adoptive'))
        );
        
        parentRels.forEach(rel => {
            ancestors.push(rel.person1Id);
            traverse(rel.person1Id, generation + 1);
        });
    }
    
    traverse(personId, 0);
    return ancestors;
}

// Generate unique ID
function generateUniqueId() {
    const maxId = Math.max(...familyTree.map(p => p.id || 0), 0);
    return maxId + 1;
}

// Erstelle automatisch umgekehrte Beziehung
function createReverseRelationship(type, person1Id, person2Id) {
    let reverseType = null;
    let reversePerson1Id = person2Id;
    let reversePerson2Id = person1Id;
    
    // Bestimme umgekehrten Beziehungstyp
    switch(type) {
        case 'parent-child-biological':
        case 'parent-child':
            reverseType = 'parent-child-biological-reverse';
            break;
        case 'parent-child-biological-reverse':
            reverseType = 'parent-child-biological';
            break;
        case 'parent-child-step':
            reverseType = 'parent-child-step-reverse';
            break;
        case 'parent-child-step-reverse':
            reverseType = 'parent-child-step';
            break;
        case 'parent-child-adoptive':
            reverseType = 'parent-child-adoptive-reverse';
            break;
        case 'parent-child-adoptive-reverse':
            reverseType = 'parent-child-adoptive';
            break;
        case 'grandparent-grandchild':
            reverseType = 'grandparent-grandchild-reverse';
            break;
        case 'grandparent-grandchild-reverse':
            reverseType = 'grandparent-grandchild';
            break;
        case 'uncle-aunt-nephew-niece':
            reverseType = 'uncle-aunt-nephew-niece-reverse';
            break;
        case 'uncle-aunt-nephew-niece-reverse':
            reverseType = 'uncle-aunt-nephew-niece';
            break;
        case 'spouse':
        case 'sibling':
            // Diese sind symmetrisch, keine Umkehrung nötig
            return;
        default:
            // Für Cousins und andere: keine automatische Umkehrung
            if (type.startsWith('cousin')) {
                return; // Cousins sind symmetrisch
            }
            return;
    }
    
    // Prüfe ob umgekehrte Beziehung bereits existiert
    const exists = relationships.some(rel => 
        rel.person1Id === reversePerson1Id && 
        rel.person2Id === reversePerson2Id && 
        rel.type === reverseType
    );
    
    if (!exists && reverseType) {
        const newRelId = relationships.length > 0 ? Math.max(...relationships.map(r => r.id)) + 1 : 1;
        relationships.push({ 
            id: newRelId, 
            person1Id: reversePerson1Id, 
            person2Id: reversePerson2Id, 
            type: reverseType 
        });
    }
}

// Leite alle verwandten Beziehungen ab
function deriveAllRelatedRelationships(personId) {
    // 1. Finde alle Parent-Child Beziehungen dieser Person
    const parentRels = relationships.filter(rel => 
        rel.person2Id === personId && 
        (rel.type === 'parent-child' || rel.type === 'parent-child-biological' || 
         rel.type === 'parent-child-step' || rel.type === 'parent-child-adoptive')
    );
    
    const childRels = relationships.filter(rel => 
        rel.person1Id === personId && 
        (rel.type === 'parent-child' || rel.type === 'parent-child-biological' || 
         rel.type === 'parent-child-step' || rel.type === 'parent-child-adoptive')
    );
    
    // 2. Finde Geschwister (andere Kinder der gleichen Eltern)
    parentRels.forEach(parentRel => {
        const parentId = parentRel.person1Id;
        // Finde alle anderen Kinder dieses Elternteils
        const siblings = relationships.filter(rel => 
            rel.person1Id === parentId && 
            rel.person2Id !== personId &&
            (rel.type === 'parent-child' || rel.type === 'parent-child-biological' || 
             rel.type === 'parent-child-step' || rel.type === 'parent-child-adoptive')
        );
        
        siblings.forEach(siblingRel => {
            const siblingId = siblingRel.person2Id;
            // Erstelle Geschwister-Beziehung (bidirektional)
            const exists1 = relationships.some(rel => 
                (rel.person1Id === personId && rel.person2Id === siblingId && rel.type === 'sibling') ||
                (rel.person1Id === siblingId && rel.person2Id === personId && rel.type === 'sibling')
            );
            
            if (!exists1) {
                const newRelId = relationships.length > 0 ? Math.max(...relationships.map(r => r.id)) + 1 : 1;
                relationships.push({ 
                    id: newRelId, 
                    person1Id: personId, 
                    person2Id: siblingId, 
                    type: 'sibling' 
                });
            }
        });
    });
    
    // 3. Finde Onkel/Tanten (Geschwister der Eltern)
    parentRels.forEach(parentRel => {
        const parentId = parentRel.person1Id;
        // Finde Geschwister dieses Elternteils
        const parentSiblings = relationships.filter(rel => 
            rel.type === 'sibling' && 
            (rel.person1Id === parentId || rel.person2Id === parentId)
        );
        
        parentSiblings.forEach(siblingRel => {
            const uncleAuntId = siblingRel.person1Id === parentId ? siblingRel.person2Id : siblingRel.person1Id;
            // Erstelle Onkel/Tante - Neffe/Nichte Beziehung
            const exists = relationships.some(rel => 
                (rel.person1Id === uncleAuntId && rel.person2Id === personId && 
                 (rel.type === 'uncle-aunt-nephew-niece' || rel.type === 'uncle-aunt-nephew-niece-reverse')) ||
                (rel.person1Id === personId && rel.person2Id === uncleAuntId && 
                 (rel.type === 'uncle-aunt-nephew-niece' || rel.type === 'uncle-aunt-nephew-niece-reverse'))
            );
            
            if (!exists) {
                const newRelId = relationships.length > 0 ? Math.max(...relationships.map(r => r.id)) + 1 : 1;
                relationships.push({ 
                    id: newRelId, 
                    person1Id: uncleAuntId, 
                    person2Id: personId, 
                    type: 'uncle-aunt-nephew-niece' 
                });
                createReverseRelationship('uncle-aunt-nephew-niece', uncleAuntId, personId);
            }
        });
    });
    
    // 4. Finde Cousins (Kinder der Onkel/Tanten)
    parentRels.forEach(parentRel => {
        const parentId = parentRel.person1Id;
        // Finde Geschwister dieses Elternteils
        const parentSiblings = relationships.filter(rel => 
            rel.type === 'sibling' && 
            (rel.person1Id === parentId || rel.person2Id === parentId)
        );
        
        parentSiblings.forEach(siblingRel => {
            const uncleAuntId = siblingRel.person1Id === parentId ? siblingRel.person2Id : siblingRel.person1Id;
            // Finde Kinder der Onkel/Tanten (Cousins)
            const cousins = relationships.filter(rel => 
                rel.person1Id === uncleAuntId && 
                (rel.type === 'parent-child' || rel.type === 'parent-child-biological' || 
                 rel.type === 'parent-child-step' || rel.type === 'parent-child-adoptive')
            );
            
            cousins.forEach(cousinRel => {
                const cousinId = cousinRel.person2Id;
                // Erstelle Cousin-Beziehung (1. Grades)
                const exists = relationships.some(rel => 
                    (rel.person1Id === personId && rel.person2Id === cousinId && rel.type.startsWith('cousin')) ||
                    (rel.person1Id === cousinId && rel.person2Id === personId && rel.type.startsWith('cousin'))
                );
                
                if (!exists) {
                    const newRelId = relationships.length > 0 ? Math.max(...relationships.map(r => r.id)) + 1 : 1;
                    relationships.push({ 
                        id: newRelId, 
                        person1Id: personId, 
                        person2Id: cousinId, 
                        type: 'cousin-1' 
                    });
                }
            });
        });
    });
    
    // 5. Finde Großeltern (Eltern der Eltern)
    parentRels.forEach(parentRel => {
        const parentId = parentRel.person1Id;
        const grandparentRels = relationships.filter(rel => 
            rel.person2Id === parentId && 
            (rel.type === 'parent-child' || rel.type === 'parent-child-biological' || 
             rel.type === 'parent-child-step' || rel.type === 'parent-child-adoptive')
        );
        
        grandparentRels.forEach(grandparentRel => {
            const grandparentId = grandparentRel.person1Id;
            // Erstelle Großeltern-Enkel Beziehung
            const exists = relationships.some(rel => 
                (rel.person1Id === grandparentId && rel.person2Id === personId && 
                 (rel.type === 'grandparent-grandchild' || rel.type === 'grandparent-grandchild-reverse')) ||
                (rel.person1Id === personId && rel.person2Id === grandparentId && 
                 (rel.type === 'grandparent-grandchild' || rel.type === 'grandparent-grandchild-reverse'))
            );
            
            if (!exists) {
                const newRelId = relationships.length > 0 ? Math.max(...relationships.map(r => r.id)) + 1 : 1;
                relationships.push({ 
                    id: newRelId, 
                    person1Id: grandparentId, 
                    person2Id: personId, 
                    type: 'grandparent-grandchild' 
                });
                createReverseRelationship('grandparent-grandchild', grandparentId, personId);
            }
        });
    });
}

// Erstelle Beispiel-Familie
function createExampleFamily() {
    // Lösche vorhandene Daten
    familyTree = [];
    relationships = [];
    
    // Personen erstellen
    const karl = {
        id: 1,
        firstName: 'Karl',
        lastName: 'Schmidt',
        birthDate: '1940-05-15',
        deathDate: '',
        gender: 'm',
        location: 'Berlin, Deutschland',
        profileImage: '',
        uploadedFiles: []
    };
    
    const helga = {
        id: 2,
        firstName: 'Helga',
        lastName: 'Schmidt',
        birthDate: '1942-08-20',
        deathDate: '',
        gender: 'f',
        location: 'Hamburg, Deutschland',
        profileImage: '',
        uploadedFiles: []
    };
    
    const peter = {
        id: 3,
        firstName: 'Peter',
        lastName: 'Schmidt',
        birthDate: '1970-03-10',
        deathDate: '',
        gender: 'm',
        location: 'München, Deutschland',
        profileImage: '',
        uploadedFiles: []
    };
    
    const sabine = {
        id: 4,
        firstName: 'Sabine',
        lastName: 'Schmidt',
        birthDate: '1972-11-25',
        deathDate: '',
        gender: 'f',
        location: 'Köln, Deutschland',
        profileImage: '',
        uploadedFiles: []
    };
    
    const tim = {
        id: 5,
        firstName: 'Tim',
        lastName: 'Schmidt',
        birthDate: '2000-07-05',
        deathDate: '',
        gender: 'm',
        location: 'München, Deutschland',
        profileImage: '',
        uploadedFiles: []
    };
    
    const emma = {
        id: 6,
        firstName: 'Emma',
        lastName: 'Schmidt',
        birthDate: '2002-12-18',
        deathDate: '',
        gender: 'f',
        location: 'München, Deutschland',
        profileImage: '',
        uploadedFiles: []
    };
    
    // Personen zum Stammbaum hinzufügen
    familyTree.push(karl, helga, peter, sabine, tim, emma);
    
    // Beziehungen erstellen
    let relId = 1;
    
    // Großeltern sind Ehepartner
    relationships.push({
        id: relId++,
        person1Id: karl.id,
        person2Id: helga.id,
        type: 'spouse'
    });
    
    // Peter ist Sohn von Karl und Helga
    relationships.push({
        id: relId++,
        person1Id: karl.id,
        person2Id: peter.id,
        type: 'parent-child-biological'
    });
    createReverseRelationship('parent-child-biological', karl.id, peter.id);
    
    relationships.push({
        id: relId++,
        person1Id: helga.id,
        person2Id: peter.id,
        type: 'parent-child-biological'
    });
    createReverseRelationship('parent-child-biological', helga.id, peter.id);
    
    // Sabine ist auch Tochter von Karl und Helga (Geschwister von Peter)
    relationships.push({
        id: relId++,
        person1Id: karl.id,
        person2Id: sabine.id,
        type: 'parent-child-biological'
    });
    createReverseRelationship('parent-child-biological', karl.id, sabine.id);
    
    relationships.push({
        id: relId++,
        person1Id: helga.id,
        person2Id: sabine.id,
        type: 'parent-child-biological'
    });
    createReverseRelationship('parent-child-biological', helga.id, sabine.id);
    
    // Peter und Sabine sind Ehepartner (und Geschwister)
    relationships.push({
        id: relId++,
        person1Id: peter.id,
        person2Id: sabine.id,
        type: 'spouse'
    });
    // Ehepartner sind symmetrisch, keine Umkehrung nötig
    
    // Peter und Sabine sind auch Geschwister
    relationships.push({
        id: relId++,
        person1Id: peter.id,
        person2Id: sabine.id,
        type: 'sibling'
    });
    // Geschwister sind symmetrisch, keine Umkehrung nötig
    
    // Tim ist Sohn von Peter und Sabine
    relationships.push({
        id: relId++,
        person1Id: peter.id,
        person2Id: tim.id,
        type: 'parent-child-biological'
    });
    createReverseRelationship('parent-child-biological', peter.id, tim.id);
    
    relationships.push({
        id: relId++,
        person1Id: sabine.id,
        person2Id: tim.id,
        type: 'parent-child-biological'
    });
    createReverseRelationship('parent-child-biological', sabine.id, tim.id);
    
    // Emma ist Tochter von Peter und Sabine
    relationships.push({
        id: relId++,
        person1Id: peter.id,
        person2Id: emma.id,
        type: 'parent-child-biological'
    });
    createReverseRelationship('parent-child-biological', peter.id, emma.id);
    
    relationships.push({
        id: relId++,
        person1Id: sabine.id,
        person2Id: emma.id,
        type: 'parent-child-biological'
    });
    createReverseRelationship('parent-child-biological', sabine.id, emma.id);
    
    // Tim und Emma sind Geschwister
    relationships.push({
        id: relId++,
        person1Id: tim.id,
        person2Id: emma.id,
        type: 'sibling'
    });
    // Geschwister sind symmetrisch, keine Umkehrung nötig
    
    // Leite alle verwandten Beziehungen ab (z.B. Großeltern-Enkel, Onkel/Tante, etc.)
    deriveAllRelatedRelationships(karl.id);
    deriveAllRelatedRelationships(helga.id);
    deriveAllRelatedRelationships(peter.id);
    deriveAllRelatedRelationships(sabine.id);
    deriveAllRelatedRelationships(tim.id);
    deriveAllRelatedRelationships(emma.id);
    
    // Daten speichern
    saveFamilyTree();
    saveRelationships();
    
    // Stammbaum neu rendern
    renderTree();
    
    console.log('Beispiel-Familie wurde erstellt!');
}

// Funktion global verfügbar machen
window.createExampleFamily = createExampleFamily;

