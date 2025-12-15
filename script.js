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

// Beispieldaten beim Laden
const sampleData = [
    { id: 1, firstName: 'Max', lastName: 'Mustermann', birthDate: '1950-01-15', deathDate: '', parentId: null, gender: 'm', location: 'Berlin, Deutschland', imageUrl: '' },
    { id: 2, firstName: 'Anna', lastName: 'Mustermann', birthDate: '1952-03-20', deathDate: '', parentId: null, gender: 'f', location: 'Hamburg, Deutschland', imageUrl: '' },
    { id: 3, firstName: 'Peter', lastName: 'Mustermann', birthDate: '1975-06-10', deathDate: '', parentId: 1, gender: 'm', location: 'München, Deutschland', imageUrl: '' },
    { id: 4, firstName: 'Maria', lastName: 'Mustermann', birthDate: '1978-09-25', deathDate: '', parentId: 1, gender: 'f', location: 'Köln, Deutschland', imageUrl: '' },
    { id: 5, firstName: 'Lisa', lastName: 'Schmidt', birthDate: '2000-12-05', deathDate: '', parentId: 3, gender: 'f', location: 'Frankfurt, Deutschland', imageUrl: '' },
    { id: 6, firstName: 'Tom', lastName: 'Schmidt', birthDate: '2003-04-18', deathDate: '', parentId: 3, gender: 'm', location: 'Stuttgart, Deutschland', imageUrl: '' }
];

const sampleRelationships = [
    { id: 1, person1Id: 1, person2Id: 2, type: 'spouse' },
    { id: 2, person1Id: 3, person2Id: 4, type: 'sibling' },
    { id: 3, person1Id: 5, person2Id: 6, type: 'sibling' }
];

// Initialisierung
document.addEventListener('DOMContentLoaded', function() {
    loadFamilyTree();
    loadRelationships();
    renderTree();
    populateParentSelect();
    populateRelationshipSelects();
    initLocationMap();
});

// Daten laden (aus localStorage oder Beispieldaten)
function loadFamilyTree() {
    const saved = localStorage.getItem('familyTree');
    if (saved) {
        familyTree = JSON.parse(saved);
    } else {
        familyTree = [...sampleData];
        saveFamilyTree();
    }
}

// Beziehungen laden
function loadRelationships() {
    const saved = localStorage.getItem('relationships');
    if (saved) {
        relationships = JSON.parse(saved);
    } else {
        relationships = [...sampleRelationships];
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
    const container = document.getElementById('treeContainer');
    
    if (familyTree.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 3rem;">Keine Personen im Stammbaum. Klicken Sie auf "Person hinzufügen" um zu beginnen.</p>';
        return;
    }

    // Positionen basierend auf Beziehungen berechnen
    const positions = calculatePositions();
    
    // SVG für Linien erstellen
    const svgWidth = Math.max(1200, positions.maxX + 100);
    const svgHeight = Math.max(800, positions.maxY + 100);
    
    let html = `<div class="tree-wrapper" id="treeWrapper">
        <svg class="relationship-lines" width="${svgWidth}" height="${svgHeight}">
            ${renderRelationshipLines(positions)}
        </svg>
        <div class="tree">`;
    
    // Personen rendern
    familyTree.forEach(person => {
        const pos = positions.persons[person.id];
        if (!pos) return;
        
        const birthYear = person.birthDate ? new Date(person.birthDate).getFullYear() : '';
        const deathYear = person.deathDate ? new Date(person.deathDate).getFullYear() : '';
        const dateStr = birthYear ? (deathYear ? `${birthYear} - ${deathYear}` : `*${birthYear}`) : '';
        const location = person.location || '';
        const profileImage = person.profileImage || '';
        const defaultImage = person.gender === 'f' ? '👩' : person.gender === 'm' ? '👨' : '👤';
        
        html += `
            <div class="person-card" onclick="selectPerson(${person.id})" oncontextmenu="showContextMenu(event, ${person.id}); return false;" data-id="${person.id}" 
                 style="position: absolute; left: ${pos.x}px; top: ${pos.y}px;">
                <div class="person-image">
                    ${profileImage ? `<img src="${profileImage}" alt="${person.firstName} ${person.lastName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div class="person-image-placeholder" style="display: none;">${defaultImage}</div>` : 
                    `<div class="person-image-placeholder">${defaultImage}</div>`}
                </div>
                <div class="person-name">${person.firstName} ${person.lastName}</div>
                ${dateStr ? `<div class="person-dates">${dateStr}</div>` : ''}
                ${location ? `<div class="person-location">${location}</div>` : ''}
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
    const lines = document.querySelectorAll('.relationship-line');
    let tooltip = document.getElementById('relationship-tooltip');
    
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'relationship-tooltip';
        tooltip.className = 'relationship-tooltip';
        document.body.appendChild(tooltip);
    }
    
    lines.forEach(line => {
        line.addEventListener('mouseenter', (e) => {
            const relationship = e.target.getAttribute('data-relationship') || 'Beziehung';
            tooltip.textContent = relationship;
            tooltip.style.display = 'block';
        });
        
        line.addEventListener('mousemove', (e) => {
            tooltip.style.left = (e.clientX + 10) + 'px';
            tooltip.style.top = (e.clientY + 10) + 'px';
        });
        
        line.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    });
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
        wrapper.style.transform = `translate(${treePanX}px, ${treePanY}px)`;
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

// Positionen basierend auf Beziehungen berechnen - mit richtiger Verzweigung und Empty Slots
function calculatePositions() {
    const positions = { persons: {}, maxX: 0, maxY: 0, emptySlots: [] };
    const personMap = new Map();
    let nextEmptySlotId = -1; // Negative IDs für Empty Slots
    
    // Personen-Map erstellen
    familyTree.forEach(person => {
        personMap.set(person.id, person);
    });
    
    // Empty Slots für fehlende Personen in der Kette erstellen
    function createEmptySlotsForMissingChain(personId, relationshipType) {
        const slots = [];
        
        // Für Neffe/Nichte: Braucht Onkel/Tante -> dessen Eltern (2 Slots)
        if (relationshipType === 'uncle-aunt-nephew-niece' || relationshipType === 'uncle-aunt-nephew-niece-reverse') {
            const uncleAuntId = relationshipType.includes('-reverse') ? personId : 
                relationships.find(r => r.person1Id === personId && r.type === relationshipType)?.person2Id ||
                relationships.find(r => r.person2Id === personId && r.type === relationshipType)?.person1Id;
            
            if (uncleAuntId) {
                const uncleAunt = personMap.get(uncleAuntId);
                if (uncleAunt) {
                    // Prüfe ob Onkel/Tante Eltern hat
                    const hasParents = relationships.some(r => 
                        (r.type === 'parent-child' || r.type === 'parent-child-biological') &&
                        r.person2Id === uncleAuntId
                    );
                    
                    if (!hasParents) {
                        // Erstelle 2 Empty Slots für die Eltern
                        const parent1Id = nextEmptySlotId--;
                        const parent2Id = nextEmptySlotId--;
                        slots.push(
                            { id: parent1Id, type: 'empty', level: null, name: 'Unbekannter Elternteil' },
                            { id: parent2Id, type: 'empty', level: null, name: 'Unbekannter Elternteil' }
                        );
                        // Erstelle Beziehungen
                        relationships.push(
                            { id: relationships.length + 1, person1Id: parent1Id, person2Id: uncleAuntId, type: 'parent-child-biological' },
                            { id: relationships.length + 2, person1Id: parent2Id, person2Id: uncleAuntId, type: 'parent-child-biological' },
                            { id: relationships.length + 3, person1Id: parent1Id, person2Id: parent2Id, type: 'spouse' }
                        );
                    }
                }
            }
        }
        
        return slots;
    }
    
    // Parent-Child Beziehungen extrahieren (unterstützt mehrere Eltern)
    const parentChildMap = new Map(); // parentId -> [{childId, subtype}]
    const childParentMap = new Map(); // childId -> [{parentId, subtype}]
    const siblingGroups = new Map(); // groupId -> [siblingIds]
    
    relationships.forEach(rel => {
        if (rel.type === 'parent-child' || rel.type === 'parent-child-biological' || 
            rel.type === 'parent-child-step' || rel.type === 'parent-child-adoptive') {
            const parentId = rel.person1Id;
            const childId = rel.person2Id;
            const subtype = rel.type.replace('parent-child-', '') || 'biological'; // Default: biological
            
            if (!parentChildMap.has(parentId)) {
                parentChildMap.set(parentId, []);
            }
            parentChildMap.get(parentId).push({ childId, subtype });
            
            if (!childParentMap.has(childId)) {
                childParentMap.set(childId, []);
            }
            childParentMap.get(childId).push({ parentId, subtype });
        }
    });
    
    // Geschwister-Gruppen finden (Personen mit gleichen Eltern)
    const siblingMap = new Map();
    childParentMap.forEach((parents, childId) => {
        // Geschwister haben mindestens einen gemeinsamen biologischen Elternteil
        const biologicalParents = parents
            .filter(p => p.subtype === 'biological' || !p.subtype)
            .map(p => p.parentId)
            .sort();
        const key = biologicalParents.join(',');
        if (key && !siblingMap.has(key)) {
            siblingMap.set(key, []);
        }
        if (key) {
            siblingMap.get(key).push(childId);
        }
    });
    
    // Wurzeln finden (Personen ohne Eltern)
    const roots = [];
    familyTree.forEach(person => {
        if (!childParentMap.has(person.id) || childParentMap.get(person.id).length === 0) {
            roots.push(person.id);
        }
    });
    
    // Wenn keine Wurzeln gefunden, nehme alle Personen als Level 0
    if (roots.length === 0) {
        roots.push(...familyTree.map(p => p.id));
    }
    
    // Level für jede Person berechnen (0 = älteste Generation oben)
    // Berücksichtige auch Empty Slots
    const levels = new Map();
    const visited = new Set();
    const allPersonIds = new Set([...familyTree.map(p => p.id), ...positions.emptySlots.map(s => s.id)]);
    
    function calculateLevel(personId, currentLevel = 0) {
        if (visited.has(personId)) return;
        visited.add(personId);
        levels.set(personId, currentLevel);
        
        const children = parentChildMap.get(personId) || [];
        children.forEach(({ childId }) => {
            if (allPersonIds.has(childId)) {
                calculateLevel(childId, currentLevel + 1);
            }
        });
    }
    
    roots.forEach(rootId => {
        if (allPersonIds.has(rootId)) {
            calculateLevel(rootId, 0);
        }
    });
    
    // Personen nach Level gruppieren (inkl. Empty Slots)
    const levelGroups = new Map();
    let maxLevel = 0;
    
    allPersonIds.forEach(personId => {
        const level = levels.get(personId) || 0;
        maxLevel = Math.max(maxLevel, level);
        if (!levelGroups.has(level)) {
            levelGroups.set(level, []);
        }
        levelGroups.get(level).push(personId);
    });
    
    // Positionen berechnen - von oben nach unten (ältere Generationen oben)
    const cardWidth = 250;
    const cardHeight = 280;
    const horizontalSpacing = 50; // Abstand zwischen Geschwistern
    const verticalSpacing = 350; // Abstand zwischen Generationen
    
    // Für jede Generation von oben nach unten
    for (let level = 0; level <= maxLevel; level++) {
        const personsInLevel = levelGroups.get(level) || [];
        
        // Geschwister-Gruppen für diese Generation
        const siblingGroupsInLevel = new Map();
        const processed = new Set();
        
        personsInLevel.forEach(personId => {
            if (processed.has(personId)) return;
            
            const parents = childParentMap.get(personId) || [];
            const biologicalParents = parents
                .filter(p => p.subtype === 'biological' || !p.subtype)
                .map(p => p.parentId)
                .sort();
            const siblingKey = biologicalParents.join(',');
            const siblings = siblingMap.get(siblingKey) || [personId];
            
            // Nur Geschwister in dieser Generation
            const siblingsInLevel = siblings.filter(id => personsInLevel.includes(id));
            
            if (siblingsInLevel.length > 0) {
                siblingGroupsInLevel.set(siblingKey, siblingsInLevel);
                siblingsInLevel.forEach(id => processed.add(id));
            }
        });
        
        // Positionen für diese Generation berechnen
        let currentX = 0;
        const siblingGroupArray = Array.from(siblingGroupsInLevel.values());
        
        siblingGroupArray.forEach((siblingGroup, groupIndex) => {
            const groupWidth = siblingGroup.length * cardWidth + (siblingGroup.length - 1) * horizontalSpacing;
            const groupStartX = currentX;
            
            // Geschwister nebeneinander positionieren
            siblingGroup.forEach((personId, index) => {
                const x = groupStartX + index * (cardWidth + horizontalSpacing);
                const y = level * verticalSpacing + 50;
                
                positions.persons[personId] = { x, y };
                positions.maxX = Math.max(positions.maxX, x + cardWidth);
            });
            
            currentX += groupWidth + 100; // Abstand zwischen Geschwister-Gruppen
        });
        
        // Einzelne Personen (ohne Geschwister) positionieren
        personsInLevel.forEach(personId => {
            if (!positions.persons[personId]) {
                const x = currentX;
                const y = level * verticalSpacing + 50;
                positions.persons[personId] = { x, y };
                positions.maxX = Math.max(positions.maxX, x + cardWidth);
                currentX += cardWidth + 100;
            }
        });
        
        positions.maxY = Math.max(positions.maxY, level * verticalSpacing + cardHeight + 50);
    }
    
    // Kinder zwischen ihren Eltern positionieren und Eltern über Kindern zentrieren
    const childParentGroups = new Map(); // childId -> [parentIds]
    childParentMap.forEach((parents, childId) => {
        const parentIds = parents.map(p => p.parentId);
        childParentGroups.set(childId, parentIds);
    });
    
    // Für jedes Kind: Positioniere es zwischen seinen Eltern
    childParentGroups.forEach((parentIds, childId) => {
        const childPos = positions.persons[childId];
        if (!childPos || parentIds.length === 0) return;
        
        const parentPositions = parentIds
            .map(pid => positions.persons[pid])
            .filter(pos => pos !== undefined);
        
        if (parentPositions.length > 0) {
            // Berechne die Mitte zwischen allen Eltern
            const minParentX = Math.min(...parentPositions.map(p => p.x));
            const maxParentX = Math.max(...parentPositions.map(p => p.x + cardWidth));
            const centerX = (minParentX + maxParentX) / 2 - cardWidth / 2;
            
            // Positioniere Kind in der Mitte zwischen Eltern
            childPos.x = centerX;
            positions.maxX = Math.max(positions.maxX, centerX + cardWidth);
        }
    });
    
    // Eltern über ihren Kindern zentrieren (nachdem Kinder positioniert sind)
    parentChildMap.forEach((children, parentId) => {
        const parentPos = positions.persons[parentId];
        if (!parentPos) return;
        
        const childrenPositions = children
            .map(({ childId }) => positions.persons[childId])
            .filter(pos => pos !== undefined);
        
        if (childrenPositions.length > 0) {
            // Zentriere Eltern über Kindern
            const minChildX = Math.min(...childrenPositions.map(p => p.x));
            const maxChildX = Math.max(...childrenPositions.map(p => p.x + cardWidth));
            const centerX = (minChildX + maxChildX) / 2 - cardWidth / 2;
            
            // Aktualisiere Eltern-Position
            parentPos.x = centerX;
            positions.maxX = Math.max(positions.maxX, centerX + cardWidth);
        }
    });
    
    // Ehepartner auf gleiche Y-Position setzen
    relationships.forEach(rel => {
        if (rel.type === 'spouse') {
            const pos1 = positions.persons[rel.person1Id];
            const pos2 = positions.persons[rel.person2Id];
            
            if (pos1 && pos2) {
                // Setze beide auf die gleiche Y-Position (höhere Y = weiter unten)
                const maxY = Math.max(pos1.y, pos2.y);
                pos1.y = maxY;
                pos2.y = maxY;
            }
        }
    });
    
    return positions;
}

// Beziehungslinien rendern - nur direkte Parent-Child und Ehepartner
function renderRelationshipLines(positions) {
    let lines = '';
    const cardWidth = 250;
    const cardHeight = 280;
    
    // Parent-Child Linien mit Verzweigung sammeln (mit Subtypen)
    const parentChildGroups = new Map(); // parentId -> [{childId, subtype}]
    
    relationships.forEach(rel => {
        if (rel.type === 'parent-child' || rel.type === 'parent-child-biological' || 
            rel.type === 'parent-child-step' || rel.type === 'parent-child-adoptive') {
            const parentId = rel.person1Id;
            const childId = rel.person2Id;
            const subtype = rel.type.replace('parent-child-', '') || 'biological';
            
            if (!parentChildGroups.has(parentId)) {
                parentChildGroups.set(parentId, []);
            }
            parentChildGroups.get(parentId).push({ childId, subtype });
        }
    });
    
    // Parent-Child Linien zeichnen (von oben nach unten verzweigt) mit Hover-Tooltips
    parentChildGroups.forEach((children, parentId) => {
        const parentPos = positions.persons[parentId];
        if (!parentPos) return;
        
        const parentX = parentPos.x + cardWidth / 2;
        const parentY = parentPos.y + cardHeight;
        
        const childPositions = children
            .map(({ childId, subtype }) => {
                const pos = positions.persons[childId];
                return pos ? { id: childId, x: pos.x + cardWidth / 2, y: pos.y, subtype } : null;
            })
            .filter(pos => pos !== null);
        
        if (childPositions.length === 0) return;
        
        // Linien-Farben basierend auf Subtyp
        const getLineColor = (subtype) => {
            switch(subtype) {
                case 'biological': return '#2c3e50';
                case 'step': return '#3498db';
                case 'adoptive': return '#9b59b6';
                default: return '#2c3e50';
            }
        };
        
        const getLineLabel = (subtype) => {
            switch(subtype) {
                case 'biological': return 'Biologisch';
                case 'step': return 'Stiefelternteil';
                case 'adoptive': return 'Adoptiv';
                default: return 'Elternteil';
            }
        };
        
        if (childPositions.length === 1) {
            // Einfache Linie von Eltern zu Kind
            const child = childPositions[0];
            const color = getLineColor(child.subtype);
            const label = getLineLabel(child.subtype);
            const lineId = `line-${parentId}-${child.id}`;
            lines += `<line id="${lineId}" x1="${parentX}" y1="${parentY}" x2="${child.x}" y2="${child.y}" 
                stroke="${color}" stroke-width="2.5" opacity="0.6" 
                data-relationship="${label}" class="relationship-line"/>`;
        } else {
            // Verzweigung: Linie von Eltern nach unten, dann horizontal zu Kindern
            const minChildX = Math.min(...childPositions.map(c => c.x));
            const maxChildX = Math.max(...childPositions.map(c => c.x));
            const branchY = parentY + 50; // Y-Position der Verzweigung
            
            // Vertikale Linie von Eltern nach Verzweigung
            lines += `<line x1="${parentX}" y1="${parentY}" x2="${parentX}" y2="${branchY}" 
                stroke="#2c3e50" stroke-width="2.5" opacity="0.6" class="relationship-line"/>`;
            
            // Horizontale Linie zwischen Kindern
            lines += `<line x1="${minChildX}" y1="${branchY}" x2="${maxChildX}" y2="${branchY}" 
                stroke="#2c3e50" stroke-width="2.5" opacity="0.6" class="relationship-line"/>`;
            
            // Vertikale Linien von Verzweigung zu jedem Kind
            childPositions.forEach(child => {
                const color = getLineColor(child.subtype);
                const label = getLineLabel(child.subtype);
                const lineId = `line-${parentId}-${child.id}`;
                lines += `<line id="${lineId}" x1="${child.x}" y1="${branchY}" x2="${child.x}" y2="${child.y}" 
                    stroke="${color}" stroke-width="2.5" opacity="0.6" 
                    data-relationship="${label}" class="relationship-line"/>`;
            });
        }
    });
    
    // Ehepartner-Linien (horizontale Verbindung)
    relationships.forEach(rel => {
        if (rel.type === 'spouse') {
            const pos1 = positions.persons[rel.person1Id];
            const pos2 = positions.persons[rel.person2Id];
            
            if (!pos1 || !pos2) return;
            
            const x1 = pos1.x + cardWidth / 2;
            const y1 = pos1.y + cardHeight;
            const x2 = pos2.x + cardWidth / 2;
            const y2 = pos2.y + cardHeight;
            
            // Horizontale Linie für Ehepartner
            const midY = (y1 + y2) / 2;
            lines += `<path d="M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}" 
                stroke="#e74c3c" stroke-width="3" fill="none" opacity="0.6"/>`;
        }
    });
    
    // Geschwister werden nicht explizit verbunden, da sie bereits nebeneinander stehen
    
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
    
    // Tree Container anzeigen für overview
    if (view === 'overview') {
        document.getElementById('treeContainer').style.display = 'block';
        renderTree();
    }
    
    switch(view) {
        case 'overview':
            // Stammbaum wird bereits oben gerendert
            break;
        case 'add':
            editingPersonId = null;
            document.getElementById('modalTitle').textContent = 'Person hinzufügen';
            document.getElementById('personForm').reset();
            
            // Reset file uploads
            profileImageData = null;
            uploadedFiles = [];
            document.getElementById('profileImagePreview').innerHTML = '';
            document.getElementById('filesPreview').innerHTML = '';
            document.getElementById('profileImage').value = '';
            document.getElementById('filesUpload').value = '';
            
            // Beziehungsfeld beim Hinzufügen anzeigen
            const relationshipGroup = document.querySelector('#personForm .form-group:first-child');
            if (relationshipGroup) {
                relationshipGroup.style.display = 'block';
            }
            
            const personModal = document.getElementById('personModal');
            personModal.classList.add('show');
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
                    // Entferne Preview-Card falls vorhanden
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
            document.getElementById('firstName').addEventListener('input', updateNewPersonPreview);
            document.getElementById('lastName').addEventListener('input', updateNewPersonPreview);
            document.getElementById('profileImage').addEventListener('change', function() {
                setTimeout(updateNewPersonPreview, 100);
            });
            
            // Set default gender
            selectGender('m');
            
            // Reset death date
            document.getElementById('deathDate').value = '';
            break;
        case 'relationship':
            document.getElementById('relationshipForm').reset();
            document.getElementById('relationshipModal').style.display = 'block';
            populateRelationshipSelects();
            document.getElementById('preview1').innerHTML = '';
            document.getElementById('preview2').innerHTML = '';
            break;
        case 'edit':
            if (selectedPerson) {
                editPerson(selectedPerson);
            } else {
                alert('Bitte wählen Sie zuerst eine Person aus.');
            }
            break;
        case 'search':
            showSearchView();
            break;
        case 'export':
            showExportView();
            break;
        case 'settings':
            showSettingsView();
            break;
        default:
            // Übersicht - nichts zu tun
            break;
    }
}

// Search View
function showSearchView() {
    const container = document.getElementById('treeContainer');
    container.style.display = 'block';
    container.innerHTML = `
        <div class="view-container" style="display: block; padding: 2rem; background: white; margin: 2rem; border-radius: 12px;">
            <h2>Suchen</h2>
            <div class="form-group" style="margin-top: 2rem;">
                <input type="text" id="searchInput" placeholder="Name eingeben..." style="width: 100%; padding: 1rem; font-size: 1rem; border: 2px solid #e0e0e0; border-radius: 8px;">
            </div>
            <button onclick="performSearch()" class="btn-primary" style="margin-top: 1rem;">Suchen</button>
            <div id="searchResults" style="margin-top: 2rem;"></div>
        </div>
    `;
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
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

// Export View
function showExportView() {
    const container = document.getElementById('treeContainer');
    container.style.display = 'block';
    container.innerHTML = `
        <div class="view-container" style="display: block; padding: 2rem; background: white; margin: 2rem; border-radius: 12px;">
            <h2>Exportieren</h2>
            <div style="margin-top: 2rem;">
                <button onclick="exportData()" class="btn-primary" style="margin-right: 1rem;">Als JSON exportieren</button>
                <button onclick="exportAsImage()" class="btn-primary">Als Bild exportieren</button>
            </div>
        </div>
    `;
}

function exportAsImage() {
    alert('Bild-Export wird in einer zukünftigen Version verfügbar sein.');
}

// Settings View
function showSettingsView() {
    const container = document.getElementById('treeContainer');
    container.style.display = 'block';
    container.innerHTML = `
        <div class="view-container" style="display: block; padding: 2rem; background: white; margin: 2rem; border-radius: 12px;">
            <h2>Einstellungen</h2>
            <div style="margin-top: 2rem;">
                <button onclick="clearAllData()" class="btn-secondary" style="background-color: #e74c3c; color: white;">Alle Daten löschen</button>
            </div>
        </div>
    `;
}

function clearAllData() {
    if (confirm('Möchten Sie wirklich alle Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
        localStorage.clear();
        familyTree = [];
        relationships = [];
        selectedPerson = null;
        renderTree();
        alert('Alle Daten wurden gelöscht.');
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
    document.getElementById('firstName').value = person.firstName;
    document.getElementById('lastName').value = person.lastName;
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
    
    const personModal = document.getElementById('personModal');
    personModal.classList.add('show');
    
    // Map aktualisieren wenn Formular geöffnet wird
    setTimeout(() => {
        if (locationMap) {
            locationMap.invalidateSize();
            updateLocationMap();
        }
    }, 100);
    
    // Map aktualisieren wenn Formular geöffnet wird
    setTimeout(() => {
        if (locationMap) {
            locationMap.invalidateSize();
            updateLocationMap();
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
    
    // Setze data-arrow basierend auf arrowType
    if (arrowType) {
        selectElement.setAttribute('data-arrow', arrowType);
    }
}

// Cousin-Grade Input anzeigen/verstecken
function toggleCousinGradeInput(selectElement) {
    const value = selectElement.value;
    const cousinGradeInput = document.getElementById('cousinGradeInput');
    
    if (cousinGradeInput) {
        if (value === 'cousin-custom') {
            cousinGradeInput.style.display = 'block';
        } else {
            cousinGradeInput.style.display = 'none';
        }
    }
}
    
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

// Beziehung speichern
function saveRelationship(event) {
    event.preventDefault();
    
    const person1Id = parseInt(document.getElementById('person1Id').value);
    const person2Id = parseInt(document.getElementById('person2Id').value);
    const type = document.getElementById('relationshipType').value;
    
    if (person1Id === person2Id) {
        alert('Eine Person kann keine Beziehung zu sich selbst haben.');
        return;
    }
    
    // Prüfe ob Beziehung bereits existiert
    const exists = relationships.some(rel => 
        (rel.person1Id === person1Id && rel.person2Id === person2Id) ||
        (rel.person1Id === person2Id && rel.person2Id === person1Id)
    );
    
    if (exists) {
        alert('Diese Beziehung existiert bereits.');
        return;
    }
    
    const newId = relationships.length > 0 ? Math.max(...relationships.map(r => r.id)) + 1 : 1;
    relationships.push({ id: newId, person1Id, person2Id, type });
    
    saveRelationships();
    renderTree();
    closeRelationshipModal();
}

// Beziehungs-Modal schließen
function closeRelationshipModal() {
    document.getElementById('relationshipModal').style.display = 'none';
    document.getElementById('relationshipForm').reset();
    document.getElementById('preview1').innerHTML = '';
    document.getElementById('preview2').innerHTML = '';
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
            familyTree[index] = { ...familyTree[index], ...formData };
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
            
            // Prüfe ob Beziehung bereits existiert
            const exists = relationships.some(rel => 
                (rel.person1Id === finalPerson1Id && rel.person2Id === finalPerson2Id) ||
                (rel.person1Id === finalPerson2Id && rel.person2Id === finalPerson1Id)
            );
            
            if (!exists) {
                const newRelId = relationships.length > 0 ? Math.max(...relationships.map(r => r.id)) + 1 : 1;
                relationships.push({ id: newRelId, person1Id: finalPerson1Id, person2Id: finalPerson2Id, type: finalType });
                saveRelationships();
            }
        }
    }
    
    saveFamilyTree();
    renderTree();
    populateRelationshipSelects();
    closeModal();
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

