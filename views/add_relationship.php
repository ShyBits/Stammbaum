<div class="view-header">
    <h2>Beziehung hinzufügen</h2>
</div>
<div class="view-content">
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
            <button type="button" class="btn-secondary" onclick="showView('overview')">Abbrechen</button>
        </div>
    </form>
</div>

