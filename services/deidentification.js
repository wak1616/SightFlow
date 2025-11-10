// SightFlow De-identification Service
// Handles patient data de-identification for HIPAA compliance

class DeidentificationService {
  constructor() {
    this.storageKey = 'sf_patient_mapping';
    this.counterKey = 'sf_chart_counter';
  }

  /**
   * Generates a de-identified chart number for a patient
   * @param {string} patientContext - Full patient context string (name, DOB, etc.)
   * @returns {Promise<string>} De-identified chart number (e.g., "SF-0001")
   */
  async getDeidentifiedId(patientContext) {
    if (!patientContext) {
      return 'SF-UNKNOWN';
    }

    // Get existing mappings
    const mappings = await this.getMappings();
    
    // Check if this patient already has a de-identified ID
    const existingEntry = Object.entries(mappings).find(
      ([id, context]) => context === patientContext
    );
    
    if (existingEntry) {
      console.log('SightFlow Deident: Using existing ID:', existingEntry[0]);
      return existingEntry[0];
    }

    // Generate new ID
    const counter = await this.getAndIncrementCounter();
    const newId = `SF-${String(counter).padStart(4, '0')}`;
    
    // Store mapping
    mappings[newId] = patientContext;
    await this.saveMappings(mappings);
    
    console.log('SightFlow Deident: Created new ID:', newId);
    return newId;
  }

  /**
   * Gets the real patient context from a de-identified ID
   * @param {string} deidentifiedId - The de-identified chart number
   * @returns {Promise<string|null>} Original patient context or null if not found
   */
  async getOriginalContext(deidentifiedId) {
    const mappings = await this.getMappings();
    return mappings[deidentifiedId] || null;
  }

  /**
   * Gets all stored mappings
   * @returns {Promise<Object>} Object mapping de-identified IDs to patient contexts
   */
  async getMappings() {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.storageKey], (result) => {
        resolve(result[this.storageKey] || {});
      });
    });
  }

  /**
   * Saves mappings to storage
   * @param {Object} mappings - Mappings object to save
   */
  async saveMappings(mappings) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.storageKey]: mappings }, resolve);
    });
  }

  /**
   * Gets current counter value and increments it
   * @returns {Promise<number>} Current counter value (before increment)
   */
  async getAndIncrementCounter() {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.counterKey], (result) => {
        const currentCounter = result[this.counterKey] || 1;
        const nextCounter = currentCounter + 1;
        
        chrome.storage.local.set({ [this.counterKey]: nextCounter }, () => {
          resolve(currentCounter);
        });
      });
    });
  }

  /**
   * Clears all stored mappings (use with caution!)
   */
  async clearAllMappings() {
    return new Promise((resolve) => {
      chrome.storage.local.remove([this.storageKey, this.counterKey], () => {
        console.log('SightFlow Deident: All mappings cleared');
        resolve();
      });
    });
  }

  /**
   * Exports all mappings as JSON (for backup purposes)
   * @returns {Promise<string>} JSON string of all mappings
   */
  async exportMappings() {
    const mappings = await this.getMappings();
    return JSON.stringify(mappings, null, 2);
  }
}

// Create singleton instance
const deidentificationService = new DeidentificationService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = deidentificationService;
}
