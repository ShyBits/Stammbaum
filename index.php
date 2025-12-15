<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stammbaum</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>
<body>
    <div class="container">
        <!-- Navigationsmenü links -->
        <nav class="sidebar">
            <h2 class="nav-title">Navigation</h2>
            <div class="nav-buttons">
                <button class="nav-btn" onclick="showView('overview')">
                    <span class="btn-icon">👥</span>
                    <span class="btn-text">Übersicht</span>
                </button>
                <button class="nav-btn" onclick="showView('add')">
                    <span class="btn-icon">➕</span>
                    <span class="btn-text">Person hinzufügen</span>
                </button>
                <button class="nav-btn" onclick="showView('relationship')">
                    <span class="btn-icon">🔗</span>
                    <span class="btn-text">Beziehung hinzufügen</span>
                </button>
                <button class="nav-btn" onclick="showView('edit')">
                    <span class="btn-icon">✏️</span>
                    <span class="btn-text">Bearbeiten</span>
                </button>
                <button class="nav-btn" onclick="showView('search')">
                    <span class="btn-icon">🔍</span>
                    <span class="btn-text">Suchen</span>
                </button>
                <button class="nav-btn" onclick="showView('export')">
                    <span class="btn-icon">📥</span>
                    <span class="btn-text">Exportieren</span>
                </button>
                <button class="nav-btn" onclick="showView('settings')">
                    <span class="btn-icon">⚙️</span>
                    <span class="btn-text">Einstellungen</span>
                </button>
            </div>
        </nav>

        <!-- Hauptbereich mit Stammbaum -->
        <main class="main-content">
            <header class="header">
                <h1>Familienstammbaum</h1>
            </header>
            
            <div class="tree-container" id="treeContainer" oncontextmenu="showContextMenu(event, null)">
                <!-- Stammbaum wird hier dynamisch eingefügt -->
            </div>
            
            <!-- Context Menu -->
            <div id="contextMenu" class="context-menu" style="display: none;">
                <div class="context-menu-item" onclick="contextMenuAddPerson()">
                    <span class="context-menu-icon">➕</span>
                    <span>Person hinzufügen</span>
                </div>
                <div class="context-menu-item" onclick="contextMenuAddRelationship()">
                    <span class="context-menu-icon">🔗</span>
                    <span>Beziehung hinzufügen</span>
                </div>
                <div class="context-menu-divider"></div>
                <div class="context-menu-item" id="contextMenuEdit" onclick="contextMenuEdit()" style="display: none;">
                    <span class="context-menu-icon">✏️</span>
                    <span>Bearbeiten</span>
                </div>
                <div class="context-menu-item" id="contextMenuDelete" onclick="contextMenuDelete()" style="display: none;">
                    <span class="context-menu-icon">🗑️</span>
                    <span>Löschen</span>
                </div>
                <div class="context-menu-item" id="contextMenuViewDetails" onclick="contextMenuViewDetails()" style="display: none;">
                    <span class="context-menu-icon">👁️</span>
                    <span>Details anzeigen</span>
                </div>
                <div class="context-menu-item" id="contextMenuAddChild" onclick="contextMenuAddChild()" style="display: none;">
                    <span class="context-menu-icon">👶</span>
                    <span>Kind hinzufügen</span>
                </div>
                <div class="context-menu-item" id="contextMenuAddParent" onclick="contextMenuAddParent()" style="display: none;">
                    <span class="context-menu-icon">👴</span>
                    <span>Elternteil hinzufügen</span>
                </div>
            </div>

            <!-- Full Screen Person Form -->
            <div id="personModal" class="fullscreen-form">
                <div class="fullscreen-form-header">
                    <h2 id="modalTitle">Person hinzufügen</h2>
                    <button class="close-fullscreen" onclick="closeModal()">&times;</button>
                </div>
                <div class="fullscreen-form-content">
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
                                            <option value="cousin">Cousin/Cousine von (1. Grades)</option>
                                            <option value="cousin-2">Cousin/Cousine von (2. Grades)</option>
                                            <option value="cousin-3">Cousin/Cousine von (3. Grades)</option>
                                            <option value="cousin-4">Cousin/Cousine von (4. Grades)</option>
                                            <option value="cousin-custom">Cousin/Cousine von (anderer Grad)</option>
                                        </optgroup>
                                    </select>
                                    <div id="cousinGradeInput" class="cousin-grade-input" style="display: none;">
                                        <label for="cousinGrade">Cousin-Grad (z.B. 5, 6, 7...):</label>
                                        <input type="number" id="cousinGrade" name="cousinGrade" min="1" value="5" style="width: 100px; padding: 0.5rem; margin-top: 0.5rem;">
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
                            <button type="button" class="btn-secondary" onclick="closeModal()">Abbrechen</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Person Selection Sidebar -->
            <div id="personSelectionSidebar" class="person-selection-sidebar">
                <div class="sidebar-header">
                    <h3>Person auswählen</h3>
                    <button class="sidebar-close" onclick="closePersonSelectionSidebar()">&times;</button>
                </div>
                <div class="sidebar-search-filter">
                    <input type="text" id="personSearchInput" class="sidebar-search" placeholder="Person suchen..." oninput="filterPersons()">
                    <button class="filter-btn" onclick="openFilterSidebar()">🔍 Filter</button>
                </div>
                <div id="personList" class="person-list">
                    <!-- Personen werden hier eingefügt -->
                </div>
            </div>
            
            <!-- Filter Sidebar (next to person selection sidebar) -->
            <div id="filterSidebar" class="filter-sidebar">
                <div class="sidebar-header">
                    <h3>Filter</h3>
                </div>
                <div class="filter-sidebar-content">
                    <div class="filter-section">
                        <h4 class="filter-section-title">Geschlecht</h4>
                        <div class="filter-options">
                            <label class="filter-checkbox">
                                <input type="checkbox" id="filterGenderM" value="m" onchange="filterPersons()">
                                <span>Männlich</span>
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" id="filterGenderF" value="f" onchange="filterPersons()">
                                <span>Weiblich</span>
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" id="filterGenderD" value="d" onchange="filterPersons()">
                                <span>Divers</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="filter-section">
                        <h4 class="filter-section-title">Geburtsdatum</h4>
                        <div class="filter-range">
                            <div class="range-input-group">
                                <label>Von:</label>
                                <input type="date" id="filterBirthYearFrom" onchange="filterPersons()">
                            </div>
                            <div class="range-input-group">
                                <label>Bis:</label>
                                <input type="date" id="filterBirthYearTo" onchange="filterPersons()">
                            </div>
                        </div>
                    </div>
                    
                    <div class="filter-section">
                        <h4 class="filter-section-title">Status</h4>
                        <div class="filter-options">
                            <label class="filter-checkbox">
                                <input type="checkbox" id="filterAlive" onchange="filterPersons()">
                                <span>Lebend</span>
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" id="filterDeceased" onchange="filterPersons()">
                                <span>Verstorben</span>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="filter-actions">
                    <button class="filter-clear-btn" onclick="clearFilters()">
                        <span>🗑️</span>
                        Filter zurücksetzen
                    </button>
                </div>
            </div>

            <!-- Modal für Beziehungen -->
            <div id="relationshipModal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="closeRelationshipModal()">&times;</span>
                    <h2>Beziehung hinzufügen</h2>
                    <form id="relationshipForm" onsubmit="saveRelationship(event)">
                        <div class="form-group">
                            <label for="person1Id">Person 1:</label>
                            <select id="person1Id" name="person1Id" onchange="showPersonPreview('person1Id', 'preview1')" required>
                                <option value="">Bitte wählen</option>
                            </select>
                            <div id="preview1" class="person-preview"></div>
                        </div>
                        <div class="form-group">
                            <label for="relationshipType">Beziehungstyp:</label>
                            <select id="relationshipType" name="relationshipType" required>
                                <option value="">Bitte wählen</option>
                                <optgroup label="Eltern-Kind">
                                    <option value="parent-child-biological">Biologisch</option>
                                    <option value="parent-child-step">Stiefelternteil</option>
                                    <option value="parent-child-adoptive">Adoptiv</option>
                                </optgroup>
                                <optgroup label="Andere Beziehungen">
                                    <option value="sibling">Geschwister</option>
                                    <option value="spouse">Ehepartner/Partner</option>
                                    <option value="grandparent-grandchild">Großeltern-Enkel</option>
                                    <option value="uncle-aunt-nephew-niece">Onkel/Tante - Neffe/Nichte</option>
                                    <option value="cousin">Cousin/Cousine</option>
                                </optgroup>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="person2Id">Person 2:</label>
                            <select id="person2Id" name="person2Id" onchange="showPersonPreview('person2Id', 'preview2')" required>
                                <option value="">Bitte wählen</option>
                            </select>
                            <div id="preview2" class="person-preview"></div>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn-primary">Beziehung speichern</button>
                            <button type="button" class="btn-secondary" onclick="closeRelationshipModal()">Abbrechen</button>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    </div>

    <script src="script.js"></script>
</body>
</html>

