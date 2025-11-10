// Deidentification utility for HIPAA compliance
// Creates a deidentified chart number tied to patient name and DOB locally

class DeidentificationService {
  constructor() {
    this.patientMap = new Map(); // Maps deidentified ID to original patient info
    this.reverseMap = new Map(); // Maps patient identifier to deidentified ID
  }

  /**
   * Creates or retrieves a deidentified chart number for a patient
   * @param {string} patientName - Patient name from context
   * @param {string} patientDOB - Patient date of birth (if available)
   * @returns {string} Deidentified chart number
   */
  getDeidentifiedId(patientName, patientDOB = null) {
    // Create a unique identifier from patient name and DOB
    const patientKey = `${patientName}_${patientDOB || 'unknown'}`;
    
    // Check if we already have a deidentified ID for this patient
    if (this.reverseMap.has(patientKey)) {
      return this.reverseMap.get(patientKey);
    }

    // Generate a new deidentified ID (format: CHART-XXXXX)
    const deidentifiedId = `CHART-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    // Store the mapping
    this.patientMap.set(deidentifiedId, { name: patientName, dob: patientDOB });
    this.reverseMap.set(patientKey, deidentifiedId);
    
    // Persist to chrome.storage for persistence across sessions
    this.saveToStorage();
    
    return deidentifiedId;
  }

  /**
   * Deidentifies text by replacing patient identifiers
   * @param {string} text - Original text
   * @param {string} patientName - Patient name to replace
   * @param {string} deidentifiedId - Deidentified chart number
   * @returns {string} Deidentified text
   */
  deidentifyText(text, patientName, deidentifiedId) {
    if (!text || !patientName) return text;
    
    // Replace patient name with deidentified ID
    const nameRegex = new RegExp(patientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let deidentified = text.replace(nameRegex, deidentifiedId);
    
    // Replace common date patterns (DOB, dates) - be careful not to replace medical dates
    // This is a simple implementation - can be enhanced
    const datePattern = /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g;
    deidentified = deidentified.replace(datePattern, '[DATE]');
    
    return deidentified;
  }

  /**
   * Saves patient mappings to chrome.storage
   */
  async saveToStorage() {
    try {
      const data = {
        patientMap: Array.from(this.patientMap.entries()),
        reverseMap: Array.from(this.reverseMap.entries())
      };
      await chrome.storage.local.set({ deidentificationData: data });
    } catch (error) {
      console.error('Error saving deidentification data:', error);
    }
  }

  /**
   * Loads patient mappings from chrome.storage
   */
  async loadFromStorage() {
    try {
      const result = await chrome.storage.local.get(['deidentificationData']);
      if (result.deidentificationData) {
        const data = result.deidentificationData;
        this.patientMap = new Map(data.patientMap);
        this.reverseMap = new Map(data.reverseMap);
      }
    } catch (error) {
      console.error('Error loading deidentification data:', error);
    }
  }

  /**
   * Gets original patient info from deidentified ID (for local use only)
   * @param {string} deidentifiedId - Deidentified chart number
   * @returns {object|null} Original patient info or null
   */
  getOriginalPatientInfo(deidentifiedId) {
    return this.patientMap.get(deidentifiedId) || null;
  }
}

// Export singleton instance
const deidentificationService = new DeidentificationService();
deidentificationService.loadFromStorage();
