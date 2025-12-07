// SightFlow AI Assistant - Sidebar Script

// API Configuration (TODO: Move to chrome.storage.sync)
let OPENAI_API_KEY = ''; // TODO: Get from chrome.storage.sync
const OPENAI_API_URL = 'https://api.openai.com/v1';

// DOM Elements
const requestMicButton = document.getElementById('request-mic-button');
const listenButton = document.getElementById('listen-button');
const inputTextarea = document.getElementById('input-textarea');
const sendToAIButton = document.getElementById('send-to-ai');
const planCardsContainer = document.getElementById('plan-cards-container');
const executePlanButton = document.getElementById('execute-plan');
const statusMessage = document.getElementById('status-message');

// State
let mediaRecorder = null;
let audioChunks = [];
let currentPlan = null;
let isRecording = false;

// System prompt for GPT-5-mini
const SYSTEM_PROMPT = `You are a medical charting assistant that converts free text (from speech or typing) into a structured Plan of changes to a Nextech EMR chart.

Output ONLY valid JSON matching this exact structure:
{
  "source": "speech" or "text",
  "raw_input": "the original user input",
  "items": [
    {
      "target_section": "one of: History, PSFH/ROS, V & P, Exam, Diagnostics, Imp/Plan, Follow Up",
      "subsection": "optional: CC, HPI, Extended HPI, Mental Status Exam, or PMHx",
      "selected": true,
      "actions": [{"type": "add_condition", "condition": "condition name"}],
      "commands": [
        {"name": "command-name", "params": {"key": "value"}}
      ]
    }
  ]
}

VALID COMMANDS (exact format required):
- {"name": "sf-insert-CCs", "params": {"finding": "string", "location": "string (optional, e.g. OD, OS, OU)"}}
- {"name": "sf-insert-extended-hpi", "params": {"text": "string"}}
- {"name": "sf-insert-mental-status", "params": {"text": "string"}}
- {"name": "sf-insert-psfhros", "params": {"conditionsToSelect": ["array", "of", "strings"]}}
- {"name": "sf-insert-vision", "params": {"odWithGlasses": "string (e.g. 20/20)", "osWithGlasses": "string", "odWithoutGlasses": "string", "osWithoutGlasses": "string"}} (all params optional, include only those mentioned)
- {"name": "sf-insert-iop", "params": {"od": "string (e.g. 12)", "os": "string"}} (include only eyes mentioned)
- {"name": "sf-insert-refraction", "params": {"od": {"sphere": "string", "cylinder": "string", "axis": "string", "add": "string (optional)"}, "os": {"sphere": "string", "cylinder": "string", "axis": "string", "add": "string (optional)"}}} (MR Dry refraction - sphere e.g. "-1.00", "Plano"; cylinder e.g. "-0.50"; axis e.g. "090"; add e.g. "+2.50")
- {"name": "sf-exam-external-defaults", "params": {}} (sets External exam to normal/defaults - use when external exam is normal, no APD, motility normal, ortho, CVF full)
- {"name": "sf-exam-anterior-defaults", "params": {}} (sets Anterior Segment exam to defaults - lids, conjunctiva, sclera, cornea, AC, iris normal)
- {"name": "sf-exam-anterior-lens", "params": {"od": "string", "os": "string"}} (lens/cataract/IOL findings - e.g. "2+ NS", "PCIOL well-centered", "clear", "PSC", "cortical changes")
- {"name": "sf-exam-posterior-defaults", "params": {}} (sets Posterior Segment/retina exam to defaults - vitreous, disc, macula, vessels, periphery normal)
- {"name": "sf-exam-posterior-cdr", "params": {"od": "string", "os": "string"}} (cup-disc ratio - format as decimal e.g. "0.5", "0.55", "0.7")
- {"name": "sf-insert-diagnostic-test", "params": {"testName": "string", "location": "string (optional: OD, OS, OU - defaults to OU)"}} (orders a diagnostic test - testName can be: "OCT Macula", "OCT RNFL", "IOL Master", "Pentacam", "Corneal Topography", "Visual Field", "Fundus Photo", "Pachymetry", or variations like "OCT of the macula", "macular OCT", "biometry")
- {"name": "sf-insert-diagnostics", "params": {"text": "string"}} (for free-text diagnostic notes only, not for ordering tests)
- {"name": "sf-insert-impplan-diagnosis", "params": {"diagnosis": "string (diagnosis name e.g. 'cataracts', 'glaucoma', 'dry eye')", "eyeLocation": "string (OD, OS, or OU - defaults to OU)", "discussionText": "string (optional - the plan/discussion for this specific diagnosis, e.g. 'Monitor, routine follow up.', 'Discussed risks, benefits, alternatives of cataract surgery.')"}}
- {"name": "sf-insert-impplan", "params": {"text": "string"}} (DEPRECATED - prefer using discussionText param in sf-insert-impplan-diagnosis instead)
- {"name": "sf-insert-followup", "params": {"timeframe": "string (e.g. '2 weeks', '1 month', '3 days')"}}

IMPORTANT: Commands MUST be objects with "name" and "params" properties, NOT strings or function calls.

SECTION MAPPING RULES:
1. Chief complaints (flashes, floaters, blurred vision, pain, etc.) → History section, CC subsection, use sf-insert-CCs command with finding and optional location (OD=right eye, OS=left eye, OU=both eyes)
2. Extended HPI context (patient age, sex, presentation details, duration of symptoms, prior diagnoses, symptom quality like glare/halos, referral info) → History section, Extended HPI subsection, use sf-insert-extended-hpi command. Include relevant patient demographics and chief complaint narrative (e.g. "52-year-old male presenting with blurry vision in both eyes, diagnosed with cataracts 6 months ago by optometrist, noting glare issues")
3. Mental status descriptions (awake, alert, oriented, responsive, consciousness level) → History section, Mental Status Exam subsection, use sf-insert-mental-status command. IMPORTANT: Mental status info should ONLY go here, NOT in Extended HPI
4. Physical exam findings (pupils, reflexes, cardiac exam, lung sounds) → Exam section
5. Past medical history → PSFH/ROS section, PMHx subsection
6. Visual acuity / vision measurements (e.g. "20/20", "20/400", "vision with glasses", "vision without glasses") → V & P section, use sf-insert-vision command. "with glasses"/"with correction"/"cc" = WithGlasses params. "without glasses"/"without correction"/"sc"/"Dsc" = WithoutGlasses params. OD=right eye, OS=left eye.
7. Intraocular pressure / IOP measurements (e.g. "pressure is 12", "IOP 15") → V & P section, use sf-insert-iop command
8. Refraction / manifest refraction / MR / glasses prescription (sphere, cylinder, axis, add) → V & P section, use sf-insert-refraction command. Format values with +/- signs (e.g. "-1.00", "+2.50", "Plano"). Axis as 3-digit number (e.g. "090", "180")
9. External exam findings (pupils, motility, CVF/confrontation visual fields, adnexa, no APD, ortho) → Exam section. If normal/unremarkable, use sf-exam-external-defaults command
10. Anterior Segment exam findings (lids, conjunctiva, sclera, cornea, anterior chamber, iris) → Exam section. If normal/unremarkable, use sf-exam-anterior-defaults command
11. Lens/cataract/IOL findings (NS cataract, PSC, cortical, PCIOL, clear lens, IOL well-centered) → Exam section, use sf-exam-anterior-lens command with od/os params for each eye's findings
12. Posterior Segment/retina exam findings (vitreous, disc, macula, vessels, periphery) → Exam section. If normal/unremarkable, use sf-exam-posterior-defaults command
13. Cup-disc ratio (CDR, C/D ratio, cup to disc) → Exam section, use sf-exam-posterior-cdr command with od/os params. Format: just the decimal value (e.g. "0.5", "0.55")
14. Diagnostic test orders (OCT RNFL, OCT Macula, IOL Master, Pentacam, Visual Field, Fundus Photo, Pachymetry, biometry, A-scan, topography) → Diagnostics section, use sf-insert-diagnostic-test command for each test. Include location (OD, OS, OU) if specified, defaults to OU. IMPORTANT: Recognize test orders from phrases like "did/obtained/performed/got [test]", "we did [test]", "[test] for testing", "[test] was done/obtained". Common test name variations: "OCT of the macula" = OCT Macula, "macular OCT" = OCT Macula, "pentacam" or "topography" = Corneal Topography, "biometry" or "A-scan" = IOL Master, "nerve fiber layer" or "RNFL" = OCT RNFL
15. Diagnostic notes/results (free text about test findings) → Diagnostics section, use sf-insert-diagnostics command
16. Assessment/diagnoses/impressions (cataracts, glaucoma, dry eye, macular degeneration, etc.) → Imp/Plan section, use sf-insert-impplan-diagnosis command with diagnosis name and eyeLocation (OD=right eye, OS=left eye, OU=both eyes). For "cataracts OU" use {"diagnosis": "cataracts", "eyeLocation": "OU"}
17. Treatment plan notes (free text recommendations, instructions) → Imp/Plan section, use sf-insert-impplan command
18. Follow-up instructions (e.g., "follow up in 2 weeks", "see back in 1 month") → Follow Up section, use sf-insert-followup command with timeframe only. Parse timeframe as "X days/weeks/months" format. Doctor defaults to logged-in user.

CRITICAL RULES:
1. Mental status exam information (e.g., "awake, aware, oriented times three", "alert and oriented", "responsive") MUST go ONLY to:
   - target_section: "History"
   - subsection: "Mental Status Exam"
   - command: sf-insert-mental-status
   DO NOT include mental status information in Extended HPI - it belongs ONLY in Mental Status Exam.

2. Extended HPI should include the patient presentation narrative: age, sex, chief complaint description, duration, prior diagnoses, symptom characteristics (glare, halos, etc.). This provides clinical context beyond just the CC finding name.

Example for "Patient has history of Diverticulosis":
{
  "source": "text",
  "raw_input": "Patient has history of Diverticulosis",
  "items": [{
    "target_section": "PSFH/ROS",
    "subsection": "PMHx",
    "selected": true,
    "actions": [{"type": "add_condition", "condition": "Diverticulosis"}],
    "commands": [{"name": "sf-insert-psfhros", "params": {"conditionsToSelect": ["Diverticulosis"]}}]
  }]
}

Example for mental status: "Patient is awake, aware, and oriented times three":
{
  "source": "text",
  "raw_input": "Patient is awake, aware, and oriented times three",
  "items": [{
    "target_section": "History",
    "subsection": "Mental Status Exam",
    "selected": true,
    "actions": [{"type": "insert_text", "field": "Mental Status Exam", "value": "Patient is awake, aware, and oriented times three."}],
    "commands": [{"name": "sf-insert-mental-status", "params": {"text": "Patient is awake, aware, and oriented times three."}}]
  }]
}

Example for chief complaint: "Patient complains of blurred vision in both eyes":
{
  "source": "text",
  "raw_input": "Patient complains of blurred vision in both eyes",
  "items": [{
    "target_section": "History",
    "subsection": "CC",
    "selected": true,
    "actions": [{"type": "insert_text", "field": "CC", "value": "Blurred Vision OU"}],
    "commands": [{"name": "sf-insert-CCs", "params": {"finding": "Blurred Vision", "location": "OU"}}]
  }]
}

Example for Extended HPI with patient presentation: "52-year-old male presenting with blurry vision in both eyes, diagnosed with cataracts 6 months ago by optometrist, noticing glare issues":
{
  "source": "text",
  "raw_input": "52-year-old male presenting with blurry vision in both eyes, diagnosed with cataracts 6 months ago by optometrist, noticing glare issues",
  "items": [
    {
      "target_section": "History",
      "subsection": "CC",
      "selected": true,
      "actions": [{"type": "insert_text", "field": "CC", "value": "Blurred Vision OU"}],
      "commands": [{"name": "sf-insert-CCs", "params": {"finding": "Blurred Vision", "location": "OU"}}]
    },
    {
      "target_section": "History",
      "subsection": "Extended HPI",
      "selected": true,
      "actions": [{"type": "insert_text", "field": "Extended HPI", "value": "52-year-old male presenting with blurry vision in both eyes, diagnosed with cataracts 6 months ago by optometrist, noticing glare issues."}],
      "commands": [{"name": "sf-insert-extended-hpi", "params": {"text": "52-year-old male presenting with blurry vision in both eyes, diagnosed with cataracts 6 months ago by optometrist, noticing glare issues."}}]
    }
  ]
}

Example for vision and pressure: "Vision is 20/20 with glasses in both eyes and 20/400 without glasses in the right eye and 20/200 without glasses in the left eye. The pressure is 12 in both eyes":
{
  "source": "text",
  "raw_input": "Vision is 20/20 with glasses in both eyes and 20/400 without glasses in the right eye and 20/200 without glasses in the left eye. The pressure is 12 in both eyes",
  "items": [{
    "target_section": "V & P",
    "selected": true,
    "actions": [{"type": "set_vision"}, {"type": "set_iop"}],
    "commands": [
      {"name": "sf-insert-vision", "params": {"odWithGlasses": "20/20", "osWithGlasses": "20/20", "odWithoutGlasses": "20/400", "osWithoutGlasses": "20/200"}},
      {"name": "sf-insert-iop", "params": {"od": "12", "os": "12"}}
    ]
  }]
}

Example for external exam: "External exam was normal, no APD, motility full, ortho, CVF full":
{
  "source": "text",
  "raw_input": "External exam was normal, no APD, motility full, ortho, CVF full",
  "items": [{
    "target_section": "Exam",
    "subsection": "External",
    "selected": true,
    "actions": [{"type": "set_external_defaults"}],
    "commands": [{"name": "sf-exam-external-defaults", "params": {}}]
  }]
}

Example for full exam: "External normal, anterior segment clear, 2+ NS cataract in the right eye, PCIOL well-centered in the left, retina normal, CDR 0.5 in both eyes":
{
  "source": "text",
  "raw_input": "External normal, anterior segment clear, 2+ NS cataract in the right eye, PCIOL well-centered in the left, retina normal, CDR 0.5 in both eyes",
  "items": [{
    "target_section": "Exam",
    "selected": true,
    "actions": [{"type": "set_exam_findings"}],
    "commands": [
      {"name": "sf-exam-external-defaults", "params": {}},
      {"name": "sf-exam-anterior-defaults", "params": {}},
      {"name": "sf-exam-anterior-lens", "params": {"od": "2+ NS cataract", "os": "PCIOL well-centered"}},
      {"name": "sf-exam-posterior-defaults", "params": {}},
      {"name": "sf-exam-posterior-cdr", "params": {"od": "0.5", "os": "0.5"}}
    ]
  }]
}

Example for diagnostic tests: "We did OCT of the macula in both eyes, OCT RNFL, and IOL Master":
{
  "source": "text",
  "raw_input": "We did OCT of the macula in both eyes, OCT RNFL, and IOL Master",
  "items": [{
    "target_section": "Diagnostics",
    "selected": true,
    "actions": [{"type": "order_diagnostic_tests"}],
    "commands": [
      {"name": "sf-insert-diagnostic-test", "params": {"testName": "OCT Macula", "location": "OU"}},
      {"name": "sf-insert-diagnostic-test", "params": {"testName": "OCT RNFL", "location": "OU"}},
      {"name": "sf-insert-diagnostic-test", "params": {"testName": "IOL Master", "location": "OU"}}
    ]
  }]
}

Example for diagnoses/impressions: "cataracts OU" or "diagnosis is cataracts in both eyes":
{
  "source": "text",
  "raw_input": "cataracts OU",
  "items": [{
    "target_section": "Imp/Plan",
    "selected": true,
    "actions": [{"type": "add_diagnosis", "diagnosis": "cataracts", "location": "OU"}],
    "commands": [{"name": "sf-insert-impplan-diagnosis", "params": {"diagnosis": "cataracts", "eyeLocation": "OU"}}]
  }]
}

Example for diagnosis with discussion text: "cataracts OU, goal is emmetropia with monofocal":
{
  "source": "text",
  "raw_input": "cataracts OU, goal is emmetropia with monofocal",
  "items": [{
    "target_section": "Imp/Plan",
    "selected": true,
    "actions": [{"type": "add_diagnosis", "diagnosis": "cataracts", "location": "OU", "discussionText": "Goal is emmetropia OU with a monofocal lens."}],
    "commands": [{"name": "sf-insert-impplan-diagnosis", "params": {"diagnosis": "cataracts", "eyeLocation": "OU", "discussionText": "Goal is emmetropia OU with a monofocal lens."}}]
  }]
}

Example for MULTIPLE diagnoses with different discussion texts: "cataracts OU goal is emmetropia with monofocal, myopia OU monitor yearly":
{
  "source": "text",
  "raw_input": "cataracts OU goal is emmetropia with monofocal, myopia OU monitor yearly",
  "items": [
    {
      "target_section": "Imp/Plan",
      "selected": true,
      "actions": [{"type": "add_diagnosis", "diagnosis": "cataracts", "location": "OU", "discussionText": "Goal is emmetropia OU with a monofocal lens."}],
      "commands": [{"name": "sf-insert-impplan-diagnosis", "params": {"diagnosis": "cataracts", "eyeLocation": "OU", "discussionText": "Goal is emmetropia OU with a monofocal lens."}}]
    },
    {
      "target_section": "Imp/Plan",
      "selected": true,
      "actions": [{"type": "add_diagnosis", "diagnosis": "myopia", "location": "OU", "discussionText": "Monitor yearly."}],
      "commands": [{"name": "sf-insert-impplan-diagnosis", "params": {"diagnosis": "myopia", "eyeLocation": "OU", "discussionText": "Monitor yearly."}}]
    }
  ]
}

Example for diagnostic tests with laterality: "Pentacam on the right eye and visual field testing in both eyes":
{
  "source": "text",
  "raw_input": "Pentacam on the right eye and visual field testing in both eyes",
  "items": [{
    "target_section": "Diagnostics",
    "selected": true,
    "actions": [{"type": "order_diagnostic_tests"}],
    "commands": [
      {"name": "sf-insert-diagnostic-test", "params": {"testName": "Corneal Topography", "location": "OD"}},
      {"name": "sf-insert-diagnostic-test", "params": {"testName": "Visual Field", "location": "OU"}}
    ]
  }]
}

Example for diagnostic tests with "obtained/for testing" phrasing: "We did obtain an OCT of the macula for testing":
{
  "source": "text",
  "raw_input": "We did obtain an OCT of the macula for testing",
  "items": [{
    "target_section": "Diagnostics",
    "selected": true,
    "actions": [{"type": "order_diagnostic_tests"}],
    "commands": [
      {"name": "sf-insert-diagnostic-test", "params": {"testName": "OCT Macula", "location": "OU"}}
    ]
  }]
}

Example for follow-up: "follow up in 2 weeks for surgery":
{
  "source": "text",
  "raw_input": "follow up in 2 weeks for surgery",
  "items": [{
    "target_section": "Follow Up",
    "selected": true,
    "actions": [{"type": "schedule_followup", "timeframe": "2 weeks"}],
    "commands": [{"name": "sf-insert-followup", "params": {"timeframe": "2 weeks"}}]
  }]
}

Example for follow-up with different timeframe: "see patient back in 1 month":
{
  "source": "text",
  "raw_input": "see patient back in 1 month",
  "items": [{
    "target_section": "Follow Up",
    "selected": true,
    "actions": [{"type": "schedule_followup", "timeframe": "1 month"}],
    "commands": [{"name": "sf-insert-followup", "params": {"timeframe": "1 month"}}]
  }]
}

Do not invent facts. Only output valid JSON, no markdown, no explanation.`;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  console.log('SightFlow AI: Sidebar loaded');
  await loadAPIKey();
  await checkMicrophonePermission();
  setupEventListeners();
});

// Check microphone permission on load
async function checkMicrophonePermission() {
  try {
    const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
    console.log('SightFlow: Initial microphone permission state:', permissionStatus.state);
    
    if (permissionStatus.state === 'prompt' || permissionStatus.state === 'denied') {
      // Show the permission request button
      requestMicButton.style.display = 'block';
    }
    
    // Listen for permission changes
    permissionStatus.addEventListener('change', () => {
      console.log('SightFlow: Microphone permission changed to:', permissionStatus.state);
      if (permissionStatus.state === 'granted') {
        requestMicButton.style.display = 'none';
      }
    });
  } catch (error) {
    console.log('SightFlow: Could not check microphone permission:', error);
  }
}

// Load API key from chrome.storage.sync
async function loadAPIKey() {
  try {
    const result = await chrome.storage.sync.get(['openai_api_key']);
    if (result.openai_api_key) {
      OPENAI_API_KEY = result.openai_api_key;
    }
  } catch (error) {
    console.error('Failed to load API key:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  requestMicButton.addEventListener('click', requestMicrophonePermission);
  listenButton.addEventListener('click', toggleRecording);
  inputTextarea.addEventListener('input', updateSendButtonState);
  sendToAIButton.addEventListener('click', sendToAI);
  executePlanButton.addEventListener('click', executePlan);
}

// Request microphone permission
async function requestMicrophonePermission() {
  try {
    showStatus('Opening permission page in new tab...', 'success');
    
    // Open in a new tab (more reliable than popup)
    const permissionUrl = chrome.runtime.getURL('popup_mic_permission.html');
    console.log('SightFlow: Opening permission page:', permissionUrl);
    
    chrome.tabs.create({ url: permissionUrl, active: true }, (tab) => {
      console.log('SightFlow: Permission tab created:', tab);
      
      // Make sure the tab is focused
      chrome.windows.update(tab.windowId, { focused: true });
      
      // Check periodically if permission was granted
      const checkInterval = setInterval(async () => {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
          console.log('SightFlow: Checking permission state:', permissionStatus.state);
          
          if (permissionStatus.state === 'granted') {
            clearInterval(checkInterval);
            showStatus('✓ Microphone permission granted!', 'success');
            requestMicButton.style.display = 'none';
            
            // Close the permission tab
            chrome.tabs.remove(tab.id);
          }
        } catch (e) {
          console.log('Could not check permission state:', e);
        }
      }, 500);
      
      // Stop checking after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
      }, 30000);
    });
    
  } catch (error) {
    console.error('SightFlow: Failed to open permission page:', error);
    showStatus('⚠️ Failed to open permission page', 'error');
  }
}

// Toggle recording
async function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

// Start recording
async function startRecording() {
  try {
    // Check if mediaDevices is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('MediaDevices API not supported');
    }

    console.log('SightFlow: Requesting microphone access...');
    
    // First, check if we can query the permission state
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
      console.log('SightFlow: Current microphone permission state:', permissionStatus.state);
      
      if (permissionStatus.state === 'denied') {
        throw new Error('Microphone permission was denied. Please enable it in chrome://settings/content/microphone');
      }
    } catch (permError) {
      console.log('SightFlow: Could not query permission state:', permError);
    }

    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
      } 
    });
    
    console.log('SightFlow: Microphone access granted!');
    
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      await transcribeAudio(audioBlob);
    };

    mediaRecorder.start();
    isRecording = true;
    
    // Update UI
    listenButton.classList.add('listening');
    listenButton.querySelector('.listen-text').textContent = 'Finish';
    showStatus('Listening...', 'success');
  } catch (error) {
    console.error('Failed to start recording:', error);
    let errorMsg = 'Microphone access denied';
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      if (error.message.includes('dismissed')) {
        errorMsg = '⚠️ Please click ALLOW when Chrome asks for microphone access';
        requestMicButton.style.display = 'block';
      } else {
        errorMsg = 'Please allow microphone access in your browser settings';
      }
    } else if (error.name === 'NotFoundError') {
      errorMsg = 'No microphone found';
    }
    
    showStatus(errorMsg, 'error');
  }
}

// Stop recording
function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    isRecording = false;
    
    // Update UI
    listenButton.classList.remove('listening');
    listenButton.querySelector('.listen-text').textContent = 'Listen';
    showStatus('Processing audio...', 'success');
  }
}

// Transcribe audio using OpenAI gpt-4o-transcribe
async function transcribeAudio(audioBlob) {
  if (!OPENAI_API_KEY) {
    showStatus('API key not configured', 'error');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'gpt-4o-transcribe');

    const response = await fetch(`${OPENAI_API_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    inputTextarea.value = data.text;
    updateSendButtonState();
    showStatus('Transcription complete', 'success');
  } catch (error) {
    console.error('Transcription error:', error);
    showStatus('Transcription failed', 'error');
  }
}

// Update send button state
function updateSendButtonState() {
  sendToAIButton.disabled = !inputTextarea.value.trim();
}

// Send to AI for plan generation
async function sendToAI() {
  if (!OPENAI_API_KEY) {
    showStatus('API key not configured', 'error');
    return;
  }

  const inputText = inputTextarea.value.trim();
  if (!inputText) return;

  showStatus('Generating plan...', 'success', 0); // 0 = infinite duration
  sendToAIButton.disabled = true;

  try {
    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: inputText }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('API error response:', errorData);
      const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
      throw new Error(errorMsg);
    }

    const data = await response.json();
    console.log('AI response:', data);
    
    const planJson = JSON.parse(data.choices[0].message.content);
    console.log('Parsed plan:', planJson);
    
    // Set source and raw_input if not present
    planJson.source = planJson.source || 'text';
    planJson.raw_input = inputText;
    
    // Ensure all items have selected property
    planJson.items = planJson.items.map(item => ({
      ...item,
      selected: item.selected !== false
    }));

    currentPlan = planJson;
    displayPlan(currentPlan);
    updateSectionsHighlight();
    showStatus('Plan generated successfully', 'success');
  } catch (error) {
    console.error('AI generation error:', error);
    showStatus(`Failed: ${error.message}`, 'error');
  } finally {
    sendToAIButton.disabled = false;
  }
}

// Display plan cards
function displayPlan(plan) {
  planCardsContainer.innerHTML = '';
  
  if (plan.warnings && plan.warnings.length > 0) {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'plan-card';
    warningDiv.style.borderLeft = '3px solid var(--danger-color)';
    warningDiv.innerHTML = `
      <div style="color: var(--danger-color); font-weight: 600;">Warnings:</div>
      <ul style="margin: 8px 0 0 20px; font-size: 13px;">
        ${plan.warnings.map(w => `<li>${w}</li>`).join('')}
      </ul>
    `;
    planCardsContainer.appendChild(warningDiv);
  }

  plan.items.forEach((item, index) => {
    const card = createPlanCard(item, index);
    planCardsContainer.appendChild(card);
  });

  updateExecuteButtonState();
}

// Generate human-readable description for an action based on the commands
function getActionDescription(action, commands) {
  const type = action.type;
  
  // Find relevant commands for this action type
  const relevantCommands = commands || [];
  
  switch (type) {
    case 'insert_text':
      return `${action.field}: ${action.value}`;
    
    case 'add_condition':
      return `Add condition: ${action.condition}`;
    
    case 'set_vital':
      return `${action.vital}: ${action.value}`;
    
    case 'set_vision': {
      // Extract vision values from sf-insert-vision command
      const visionCmd = relevantCommands.find(c => c.name === 'sf-insert-vision');
      if (visionCmd && visionCmd.params) {
        const parts = [];
        const p = visionCmd.params;
        if (p.odWithGlasses || p.osWithGlasses) {
          const withGlasses = [];
          if (p.odWithGlasses) withGlasses.push(`OD ${p.odWithGlasses}`);
          if (p.osWithGlasses) withGlasses.push(`OS ${p.osWithGlasses}`);
          parts.push(`With glasses: ${withGlasses.join(', ')}`);
        }
        if (p.odWithoutGlasses || p.osWithoutGlasses) {
          const withoutGlasses = [];
          if (p.odWithoutGlasses) withoutGlasses.push(`OD ${p.odWithoutGlasses}`);
          if (p.osWithoutGlasses) withoutGlasses.push(`OS ${p.osWithoutGlasses}`);
          parts.push(`Without glasses: ${withoutGlasses.join(', ')}`);
        }
        if (parts.length > 0) return `Set vision: ${parts.join('; ')}`;
      }
      return 'Set visual acuity';
    }
    
    case 'set_iop': {
      // Extract IOP values from sf-insert-iop command
      const iopCmd = relevantCommands.find(c => c.name === 'sf-insert-iop');
      if (iopCmd && iopCmd.params) {
        const parts = [];
        if (iopCmd.params.od) parts.push(`OD ${iopCmd.params.od}`);
        if (iopCmd.params.os) parts.push(`OS ${iopCmd.params.os}`);
        if (parts.length > 0) return `Set IOP: ${parts.join(', ')} mmHg`;
      }
      return 'Set intraocular pressure';
    }
    
    case 'set_refraction': {
      // Extract refraction values from sf-insert-refraction command
      const refCmd = relevantCommands.find(c => c.name === 'sf-insert-refraction');
      if (refCmd && refCmd.params) {
        const parts = [];
        const p = refCmd.params;
        if (p.od) {
          const od = `${p.od.sphere}/${p.od.cylinder}×${p.od.axis}${p.od.add ? ` add ${p.od.add}` : ''}`;
          parts.push(`OD: ${od}`);
        }
        if (p.os) {
          const os = `${p.os.sphere}/${p.os.cylinder}×${p.os.axis}${p.os.add ? ` add ${p.os.add}` : ''}`;
          parts.push(`OS: ${os}`);
        }
        if (parts.length > 0) return `Set refraction: ${parts.join('; ')}`;
      }
      return 'Set manifest refraction';
    }
    
    case 'set_external_defaults':
      return 'Set external exam to normal (no APD, motility full, ortho, CVF full)';
    
    case 'set_exam_findings': {
      // Build description from exam-related commands
      const descriptions = [];
      
      if (relevantCommands.some(c => c.name === 'sf-exam-external-defaults')) {
        descriptions.push('External exam: normal defaults');
      }
      if (relevantCommands.some(c => c.name === 'sf-exam-anterior-defaults')) {
        descriptions.push('Anterior segment: normal defaults');
      }
      
      const lensCmd = relevantCommands.find(c => c.name === 'sf-exam-anterior-lens');
      if (lensCmd && lensCmd.params) {
        const lensParts = [];
        if (lensCmd.params.od) lensParts.push(`OD: ${lensCmd.params.od}`);
        if (lensCmd.params.os) lensParts.push(`OS: ${lensCmd.params.os}`);
        if (lensParts.length > 0) descriptions.push(`Lens: ${lensParts.join(', ')}`);
      }
      
      if (relevantCommands.some(c => c.name === 'sf-exam-posterior-defaults')) {
        descriptions.push('Posterior segment: normal defaults');
      }
      
      const cdrCmd = relevantCommands.find(c => c.name === 'sf-exam-posterior-cdr');
      if (cdrCmd && cdrCmd.params) {
        const cdrParts = [];
        if (cdrCmd.params.od) cdrParts.push(`OD: ${cdrCmd.params.od}`);
        if (cdrCmd.params.os) cdrParts.push(`OS: ${cdrCmd.params.os}`);
        if (cdrParts.length > 0) descriptions.push(`Cup-to-disc ratio: ${cdrParts.join(', ')}`);
      }
      
      if (descriptions.length > 0) return descriptions.join('; ');
      return 'Set exam findings';
    }
    
    case 'order_diagnostic_tests': {
      // Extract test names from sf-insert-diagnostic-test commands
      const testCmds = relevantCommands.filter(c => c.name === 'sf-insert-diagnostic-test');
      if (testCmds.length > 0) {
        const tests = testCmds.map(c => {
          const name = c.params?.testName || 'test';
          const loc = c.params?.location || 'OU';
          return `${name} (${loc})`;
        });
        return `Order tests: ${tests.join(', ')}`;
      }
      return 'Order diagnostic tests';
    }
    
    case 'add_diagnostic_note': {
      const noteCmd = relevantCommands.find(c => c.name === 'sf-insert-diagnostics');
      if (noteCmd && noteCmd.params?.text) {
        const text = noteCmd.params.text;
        const truncated = text.length > 50 ? text.substring(0, 50) + '...' : text;
        return `Add note: "${truncated}"`;
      }
      return 'Add diagnostic note';
    }
    
    case 'add_diagnosis': {
      // Extract diagnosis info from sf-insert-impplan-diagnosis command
      const diagCmd = relevantCommands.find(c => c.name === 'sf-insert-impplan-diagnosis');
      const legacyTextCmd = relevantCommands.find(c => c.name === 'sf-insert-impplan');
      
      let result = '';
      let discussionText = null;
      
      if (diagCmd && diagCmd.params) {
        const diagnosis = diagCmd.params.diagnosis || action.diagnosis || 'Unknown';
        const location = diagCmd.params.eyeLocation || action.location || 'OU';
        result = `<strong>${diagnosis}</strong> <span style="color: #666;">(${location})</span>`;
        
        // Check for discussionText in the diagnosis command itself (new format)
        if (diagCmd.params.discussionText) {
          discussionText = diagCmd.params.discussionText;
        }
      } else {
        // Fallback to action properties
        const diagnosis = action.diagnosis || 'Unknown';
        const location = action.location || 'OU';
        result = `<strong>${diagnosis}</strong> <span style="color: #666;">(${location})</span>`;
        
        // Check action for discussionText
        if (action.discussionText) {
          discussionText = action.discussionText;
        }
      }
      
      // Fallback to legacy sf-insert-impplan command if no discussionText found
      if (!discussionText && legacyTextCmd && legacyTextCmd.params?.text) {
        discussionText = legacyTextCmd.params.text;
      }
      
      // Add discussion text if present
      if (discussionText) {
        const truncated = discussionText.length > 50 ? discussionText.substring(0, 50) + '...' : discussionText;
        result += `<br><span style="font-size: 12px; color: #555; margin-left: 8px;">📝 "${truncated}"</span>`;
      }
      
      return result;
    }
    
    default:
      // For any unhandled action types, try to provide a readable fallback
      if (action.field && action.value) {
        return `${action.field}: ${action.value}`;
      }
      // Last resort: stringify but try to make it readable
      return JSON.stringify(action).replace(/[{}"]/g, '').replace(/type:/g, '').replace(/,/g, ', ');
  }
}

// Create a plan card element
function createPlanCard(item, index) {
  const card = document.createElement('div');
  card.className = `plan-card ${!item.selected ? 'unselected' : ''}`;
  
  const actionText = item.actions.map(action => {
    return getActionDescription(action, item.commands);
  }).join('; ');

  card.innerHTML = `
    <div class="plan-card-header">
      <input type="checkbox" class="plan-checkbox" ${item.selected ? 'checked' : ''} 
             data-index="${index}">
      <div class="plan-section-wrapper">
        <span class="plan-section">${item.target_section}</span>
        ${item.subsection ? `<span class="plan-subsection">(${item.subsection})</span>` : ''}
      </div>
    </div>
    <div class="plan-content">${actionText}</div>
    ${item.confidence !== undefined ? 
      `<div class="plan-confidence">Confidence: ${Math.round(item.confidence * 100)}%</div>` : ''}
  `;

  // Add checkbox listener
  const checkbox = card.querySelector('.plan-checkbox');
  checkbox.addEventListener('change', (e) => {
    currentPlan.items[index].selected = e.target.checked;
    card.classList.toggle('unselected', !e.target.checked);
    updateSectionsHighlight();
    updateExecuteButtonState();
  });

  return card;
}

// Update sections highlight
function updateSectionsHighlight() {
  // Reset all sections
  document.querySelectorAll('.section-item').forEach(el => {
    el.classList.remove('active');
  });

  if (!currentPlan) return;

  // Get active sections from selected plan items
  const activeSections = new Set();
  currentPlan.items.forEach(item => {
    if (item.selected) {
      activeSections.add(item.target_section);
    }
  });

  // Highlight active sections
  activeSections.forEach(section => {
    const sectionEl = document.querySelector(`.section-item[data-section="${section}"]`);
    if (sectionEl) {
      sectionEl.classList.add('active');
    }
  });
}

// Update execute button state
function updateExecuteButtonState() {
  const hasSelectedItems = currentPlan && 
    currentPlan.items.some(item => item.selected);
  
  executePlanButton.disabled = !hasSelectedItems;
  executePlanButton.classList.toggle('ready', hasSelectedItems);
}

// Execute the plan
async function executePlan() {
  if (!currentPlan) return;

  const selectedItems = currentPlan.items.filter(item => item.selected);
  if (selectedItems.length === 0) return;

  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      showStatus('No active tab found', 'error');
      return;
    }

    // Check if we're on the correct domain
    if (!tab.url.includes('app1.intellechart.net')) {
      showStatus('Please navigate to Intellechart first', 'error');
      return;
    }

    // Send message to content script
    console.log('Sending plan to content script:', selectedItems);
    
    chrome.tabs.sendMessage(tab.id, {
      type: 'EXECUTE_PLAN',
      items: selectedItems
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Chrome runtime error:', chrome.runtime.lastError);
        showStatus(`Failed: ${chrome.runtime.lastError.message}`, 'error');
      } else if (response && !response.success) {
        console.error('Content script error:', response.error);
        showStatus(`Failed: ${response.error}`, 'error');
      } else {
        console.log('Plan executed successfully:', response);
        showStatus('Plan sent to Nextech!', 'success');
        // Clear the plan after successful execution
        currentPlan = null;
        planCardsContainer.innerHTML = '';
        // Keep input text so user can modify and resend to AI
        updateSectionsHighlight();
        updateExecuteButtonState();
      }
    });
  } catch (error) {
    console.error('Execution error:', error);
    showStatus('Error: ' + error.message, 'error');
  }
}

// Status message helper
let statusTimeout;

function showStatus(message, type = 'success', duration = 3000) {
  // Clear existing timeout to prevent premature hiding
  if (statusTimeout) {
    clearTimeout(statusTimeout);
    statusTimeout = null;
  }

  statusMessage.textContent = message;
  statusMessage.className = `status-message show ${type}`;
  
  // Only set auto-hide if duration is positive
  if (duration > 0) {
    statusTimeout = setTimeout(() => {
      statusMessage.classList.remove('show');
      statusTimeout = null;
    }, duration);
  }
}