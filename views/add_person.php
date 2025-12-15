<div class="view-header">
    <h2>Person hinzufügen</h2>
</div>
<div class="view-content">
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
            <button type="button" class="btn-secondary" onclick="showView('overview')">Abbrechen</button>
        </div>
    </form>
</div>

