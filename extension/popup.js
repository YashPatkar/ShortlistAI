// Backend URL configuration (internal only, not user-facing)
const DEFAULT_BACKEND_URL = 'http://localhost:8000';

// Store pasted image data
let pastedImageFile = null;

// Load backend URL from storage (internal use only)
async function getBackendUrl() {
    const result = await chrome.storage.local.get(['backendUrl']);
    return result.backendUrl || DEFAULT_BACKEND_URL;
}

// Save backend URL to storage (internal use only)
async function saveBackendUrl(url) {
    await chrome.storage.local.set({ backendUrl: url });
}

// Show status message
function showStatus(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `status ${type}`;
    element.style.display = 'block';
}

// Clear status message
function clearStatus(elementId) {
    const element = document.getElementById(elementId);
    element.textContent = '';
    element.className = 'status';
    element.style.display = 'none';
}

// Format date for display
function formatDate(isoString) {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Check resume status on popup load
async function checkResumeStatus() {
    try {
        const backendUrl = await getBackendUrl();
        const response = await fetch(`${backendUrl}/resume/status`);
        
        if (response.ok) {
            const data = await response.json();
            if (data.exists) {
                showResumeUploadedState(data.filename, data.updated_at);
            } else {
                showResumeUploadState();
            }
        } else {
            // If status check fails, show upload state
            showResumeUploadState();
        }
    } catch (error) {
        // If status check fails, show upload state
        showResumeUploadState();
    }
}

// Show upload state (no resume)
function showResumeUploadState() {
    document.getElementById('resumeUploadState').classList.remove('hidden');
    document.getElementById('resumeUploadedState').classList.add('hidden');
}

// Show uploaded state (resume exists)
function showResumeUploadedState(filename, updatedAt) {
    document.getElementById('resumeUploadState').classList.add('hidden');
    document.getElementById('resumeUploadedState').classList.remove('hidden');
    
    // Update collapsed view (summary row)
    if (filename) {
        document.getElementById('resumeSummaryFilename').textContent = filename;
    } else {
        document.getElementById('resumeSummaryFilename').textContent = '';
    }
    
    if (updatedAt) {
        const formattedDate = formatDate(updatedAt);
        document.getElementById('resumeSummaryUpdated').textContent = formattedDate;
    } else {
        document.getElementById('resumeSummaryUpdated').textContent = '';
    }
    
    // Update expanded view (details)
    if (filename) {
        document.getElementById('resumeFilename').textContent = `File: ${filename}`;
    } else {
        document.getElementById('resumeFilename').textContent = '';
    }
    
    if (updatedAt) {
        const formattedDate = formatDate(updatedAt);
        document.getElementById('resumeUpdatedAt').textContent = `Last updated: ${formattedDate}`;
    } else {
        document.getElementById('resumeUpdatedAt').textContent = '';
    }
    
    // Collapse by default
    collapseResumeDetails();
}

// Toggle resume details
function toggleResumeDetails() {
    const summaryRow = document.getElementById('resumeSummaryRow');
    const details = document.getElementById('resumeDetails');
    const toggleIcon = document.querySelector('.toggle-icon');
    const toggleIconExpanded = document.querySelector('.toggle-icon-expanded');
    
    if (details.style.display === 'none' || !details.style.display) {
        // Expand: hide summary row, show details
        summaryRow.style.display = 'none';
        details.style.display = 'block';
        details.style.height = 'auto';
        details.style.overflow = 'visible';
        if (toggleIcon) toggleIcon.textContent = '▲';
        if (toggleIconExpanded) toggleIconExpanded.textContent = '▲';
    } else {
        // Collapse: show summary row, hide details
        summaryRow.style.display = 'flex';
        details.style.display = 'none';
        details.style.height = '0';
        details.style.overflow = 'hidden';
        if (toggleIcon) toggleIcon.textContent = '▼';
        if (toggleIconExpanded) toggleIconExpanded.textContent = '▼';
    }
}

// Collapse resume details
function collapseResumeDetails() {
    const summaryRow = document.getElementById('resumeSummaryRow');
    const details = document.getElementById('resumeDetails');
    const toggleIcon = document.querySelector('.toggle-icon');
    const toggleIconExpanded = document.querySelector('.toggle-icon-expanded');
    
    // Show collapsed view, hide expanded view
    if (summaryRow) summaryRow.style.display = 'flex';
    if (details) {
        details.style.display = 'none';
        // Ensure it doesn't reserve space
        details.style.height = '0';
        details.style.overflow = 'hidden';
    }
    if (toggleIcon) toggleIcon.textContent = '▼';
    if (toggleIconExpanded) toggleIconExpanded.textContent = '▼';
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update content
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`${tab}Tab`).classList.add('active');
        
        // Clear previous input and reset states when switching tabs
        if (tab === 'image') {
            // Clear textarea when switching to image tab
            document.getElementById('jdText').value = '';
            // Clear any status messages
            clearStatus('analyzeStatus');
            // Focus paste zone
            document.getElementById('imagePasteZone').focus();
        } else if (tab === 'text') {
            // Clear pasted image when switching to text tab
            pastedImageFile = null;
            document.getElementById('imagePreview').classList.add('hidden');
            document.getElementById('imagePasteZone').classList.remove('has-image');
            document.getElementById('jdImage').value = '';
            // Clear any status messages
            clearStatus('analyzeStatus');
        }
    });
});

// Handle paste event for image
document.addEventListener('paste', async (e) => {
    const imageTab = document.getElementById('imageTab');
    if (!imageTab.classList.contains('active')) {
        return; // Only handle paste when image tab is active
    }
    
    e.preventDefault();
    
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            const file = new File([blob], 'pasted-image.png', { type: blob.type });
            await handleImageInput(file);
            break;
        }
    }
});

// Handle image input (from file or paste)
async function handleImageInput(file) {
    pastedImageFile = file;
    
    // Show preview
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImage');
    const pasteZone = document.getElementById('imagePasteZone');
    
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        preview.classList.remove('hidden');
        pasteZone.classList.add('has-image');
    };
    reader.readAsDataURL(file);
    
    // Clear file input to avoid confusion
    document.getElementById('jdImage').value = '';
}

// Handle file input change
document.getElementById('jdImage').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        await handleImageInput(file);
    }
});

// Clear image button
document.getElementById('clearImageBtn').addEventListener('click', () => {
    pastedImageFile = null;
    document.getElementById('jdImage').value = '';
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('imagePasteZone').classList.remove('has-image');
});

// Upload Resume (initial upload)
document.getElementById('uploadResumeBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('resumeFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showStatus('resumeStatus', 'Please select a PDF file', 'error');
        return;
    }
    
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showStatus('resumeStatus', 'File must be a PDF', 'error');
        return;
    }
    
    // Validate file size (1 MB = 1048576 bytes)
    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB
    if (file.size > MAX_FILE_SIZE) {
        showStatus('resumeStatus', 'Resume file size must be less than 1 MB.', 'error');
        fileInput.value = ''; // Clear the file input
        return;
    }
    
    await uploadResumeFile(file);
});

// Resume toggle button and summary row
const resumeToggleBtn = document.getElementById('resumeToggleBtn');
const resumeToggleBtnExpanded = document.getElementById('resumeToggleBtnExpanded');
const resumeSummaryRow = document.getElementById('resumeSummaryRow');

if (resumeToggleBtn) {
    resumeToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleResumeDetails();
    });
}

if (resumeToggleBtnExpanded) {
    resumeToggleBtnExpanded.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleResumeDetails();
    });
}

if (resumeSummaryRow) {
    resumeSummaryRow.addEventListener('click', (e) => {
        // Don't toggle if clicking on toggle button (it has its own handler)
        if (!e.target.closest('.resume-toggle-btn')) {
            toggleResumeDetails();
        }
    });
}

// Replace Resume button
document.getElementById('replaceResumeBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('replaceResumeFile').click();
});

// Replace Resume file input
document.getElementById('replaceResumeFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            showStatus('resumeStatus', 'File must be a PDF', 'error');
            e.target.value = ''; // Clear the file input
            return;
        }
        
        // Validate file size (1 MB = 1048576 bytes)
        const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB
        if (file.size > MAX_FILE_SIZE) {
            showStatus('resumeStatus', 'Resume file size must be less than 1 MB.', 'error');
            e.target.value = ''; // Clear the file input
            return;
        }
        
        await uploadResumeFile(file);
        // Reset file input
        e.target.value = '';
    }
});

// Upload resume file (shared function)
async function uploadResumeFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const backendUrl = await getBackendUrl();
        const response = await fetch(`${backendUrl}/resume/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showStatus('resumeStatus', `Resume uploaded: ${data.filename}`, 'success');
            // Refresh resume status to get updated filename
            await checkResumeStatus();
            // Clear file inputs
            document.getElementById('resumeFile').value = '';
            document.getElementById('replaceResumeFile').value = '';
            // Auto-collapse after replacing
            collapseResumeDetails();
        } else {
            showStatus('resumeStatus', data.detail || 'Upload failed', 'error');
        }
    } catch (error) {
        showStatus('resumeStatus', `Error: ${error.message}`, 'error');
    }
}

// Set loading state
function setLoadingState(isLoading) {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const analyzeBtnText = document.getElementById('analyzeBtnText');
    const analyzeBtnSpinner = document.getElementById('analyzeBtnSpinner');
    const jdTextInput = document.getElementById('jdText');
    const jdImageInput = document.getElementById('jdImage');
    const imagePasteZone = document.getElementById('imagePasteZone');
    
    if (isLoading) {
        // Enable loading state
        analyzeBtn.disabled = true;
        analyzeBtnText.textContent = 'Analyzing...';
        analyzeBtnSpinner.classList.remove('hidden');
        jdTextInput.disabled = true;
        jdImageInput.disabled = true;
        if (imagePasteZone) {
            imagePasteZone.style.pointerEvents = 'none';
            imagePasteZone.style.opacity = '0.6';
        }
        // Disable tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.disabled = true;
        });
    } else {
        // Disable loading state
        analyzeBtn.disabled = false;
        analyzeBtnText.textContent = 'Analyze';
        analyzeBtnSpinner.classList.add('hidden');
        jdTextInput.disabled = false;
        jdImageInput.disabled = false;
        if (imagePasteZone) {
            imagePasteZone.style.pointerEvents = '';
            imagePasteZone.style.opacity = '';
        }
        // Enable tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.disabled = false;
        });
    }
}

// Analyze JD
document.getElementById('analyzeBtn').addEventListener('click', async () => {
    const textTab = document.getElementById('textTab');
    const jdTextInput = document.getElementById('jdText');
    const jdImageInput = document.getElementById('jdImage');
    
    const isTextTab = textTab.classList.contains('active');
    let formData = new FormData();
    
    if (isTextTab) {
        const jdText = jdTextInput.value.trim();
        if (!jdText) {
            showStatus('analyzeStatus', 'Please enter job description text', 'error');
            return;
        }
        formData.append('jd_text', jdText);
    } else {
        // Check for pasted image first, then file input
        const file = pastedImageFile || jdImageInput.files[0];
        if (!file) {
            showStatus('analyzeStatus', 'Please paste an image or select an image file', 'error');
            return;
        }
        formData.append('jd_image', file);
    }
    
    // Set loading state
    setLoadingState(true);
    clearStatus('analyzeStatus');
    
    try {
        const backendUrl = await getBackendUrl();
        const response = await fetch(`${backendUrl}/analyze-jd`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displayResults(data);
            await saveAnalysisResults(data);
            showStatus('analyzeStatus', 'Analysis complete', 'success');
        } else {
            showStatus('analyzeStatus', data.detail || 'Analysis failed', 'error');
            document.getElementById('results').classList.add('hidden');
        }
    } catch (error) {
        showStatus('analyzeStatus', `Error: ${error.message}`, 'error');
        document.getElementById('results').classList.add('hidden');
    } finally {
        // Always restore button state
        setLoadingState(false);
    }
});

// Save analysis results to storage
async function saveAnalysisResults(data) {
    const resultsData = {
        match_score: data.match_score,
        missing_skills: data.missing_skills || [],
        contact_mode: data.contact_mode || 'email',
        warnings: data.warnings || [],
        timestamp: new Date().toISOString()
    };
    
    // Save mode-specific fields
    if (data.contact_mode === 'email') {
        resultsData.destination_email = data.destination_email;
        resultsData.email_subject = data.email_subject;
        resultsData.email_body = data.email_body;
    } else if (data.contact_mode === 'dm') {
        resultsData.dm_message = data.dm_message;
    } else if (data.contact_mode === 'both') {
        resultsData.destination_email = data.destination_email;
        resultsData.email_subject = data.email_subject;
        resultsData.email_body = data.email_body;
        resultsData.dm_message = data.dm_message;
    }
    
    await chrome.storage.local.set({ cachedAnalysisResults: resultsData });
}

// Load cached analysis results from storage
async function loadCachedResults() {
    const result = await chrome.storage.local.get(['cachedAnalysisResults']);
    return result.cachedAnalysisResults || null;
}

// Clear cached analysis results
async function clearCachedResults() {
    await chrome.storage.local.remove(['cachedAnalysisResults']);
}

// Display results
function displayResults(data) {
    // Switch to RESULT MODE
    switchToResultMode();
    
    // Warnings
    const warningsSection = document.getElementById('warningsSection');
    const warningsList = document.getElementById('warningsList');
    if (data.warnings && data.warnings.length > 0) {
        warningsSection.classList.remove('hidden');
        warningsList.innerHTML = '';
        data.warnings.forEach(warning => {
            const li = document.createElement('li');
            li.textContent = warning;
            warningsList.appendChild(li);
        });
    } else {
        warningsSection.classList.add('hidden');
        warningsList.innerHTML = '';
    }
    
    // Match Score
    const score = data.match_score || 0;
    const scoreElement = document.getElementById('matchScore');
    scoreElement.textContent = `${score}%`;
    // Update background gradient based on score
    if (score >= 70) {
        scoreElement.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
        scoreElement.style.borderColor = '#86efac';
        scoreElement.style.color = '#166534';
    } else if (score >= 50) {
        scoreElement.style.background = 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)';
        scoreElement.style.borderColor = '#fde68a';
        scoreElement.style.color = '#92400e';
    } else {
        scoreElement.style.background = 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)';
        scoreElement.style.borderColor = '#fecaca';
        scoreElement.style.color = '#991b1b';
    }
    
    // Missing Skills
    const missingSkillsList = document.getElementById('missingSkills');
    missingSkillsList.innerHTML = '';
    if (data.missing_skills && data.missing_skills.length > 0) {
        data.missing_skills.forEach(skill => {
            const li = document.createElement('li');
            li.textContent = skill;
            missingSkillsList.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = 'None';
        li.style.background = '#d4edda';
        li.style.borderColor = '#4CAF50';
        missingSkillsList.appendChild(li);
    }
    
    // Handle contact mode (email, dm, or both)
    const contactMode = data.contact_mode || 'email'; // Default to email for backward compatibility
    
    // Hide all contact blocks first
    document.getElementById('emailOnlyBlock').classList.add('hidden');
    document.getElementById('dmOnlyBlock').classList.add('hidden');
    document.getElementById('bothBlock').classList.add('hidden');
    
    if (contactMode === 'email') {
        // Show email only block
        document.getElementById('emailOnlyBlock').classList.remove('hidden');
        
        // Populate email fields
        document.getElementById('destinationEmail').textContent = data.destination_email || '';
        document.getElementById('emailSubject').textContent = data.email_subject || '';
        document.getElementById('emailBody').textContent = data.email_body || '';
    } else if (contactMode === 'dm') {
        // Show DM only block
        document.getElementById('dmOnlyBlock').classList.remove('hidden');
        
        // Populate DM message
        document.getElementById('dmMessage').textContent = data.dm_message || '';
    } else if (contactMode === 'both') {
        // Show both block
        document.getElementById('bothBlock').classList.remove('hidden');
        
        // Populate email fields
        document.getElementById('destinationEmailBoth').textContent = data.destination_email || '';
        document.getElementById('emailSubjectBoth').textContent = data.email_subject || '';
        document.getElementById('emailBodyBoth').textContent = data.email_body || '';
        
        // Populate DM message
        document.getElementById('dmMessageBoth').textContent = data.dm_message || '';
    }
}

// Switch to INPUT MODE (show input sections, hide results)
function switchToInputMode() {
    document.getElementById('extensionTitle').classList.remove('hidden');
    document.getElementById('inputMode').classList.remove('hidden');
    document.getElementById('results').classList.add('hidden');
}

// Switch to RESULT MODE (hide input sections, show results)
function switchToResultMode() {
    document.getElementById('extensionTitle').classList.add('hidden');
    document.getElementById('inputMode').classList.add('hidden');
    document.getElementById('results').classList.remove('hidden');
}

// Clear results UI
function clearResults() {
    document.getElementById('results').classList.add('hidden');
    document.getElementById('matchScore').textContent = '';
    document.getElementById('missingSkills').innerHTML = '';
    
    // Clear email only fields
    document.getElementById('destinationEmail').textContent = '';
    document.getElementById('emailSubject').textContent = '';
    document.getElementById('emailBody').textContent = '';
    
    // Clear DM only field
    document.getElementById('dmMessage').textContent = '';
    
    // Clear both mode fields
    document.getElementById('destinationEmailBoth').textContent = '';
    document.getElementById('emailSubjectBoth').textContent = '';
    document.getElementById('emailBodyBoth').textContent = '';
    document.getElementById('dmMessageBoth').textContent = '';
    
    // Clear warnings
    document.getElementById('warningsList').innerHTML = '';
    document.getElementById('warningsSection').classList.add('hidden');
    
    // Hide all contact blocks
    document.getElementById('emailOnlyBlock').classList.add('hidden');
    document.getElementById('dmOnlyBlock').classList.add('hidden');
    document.getElementById('bothBlock').classList.add('hidden');
    
    switchToInputMode();
}

// Copy to clipboard functionality
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch (err) {
            document.body.removeChild(textArea);
            return false;
        }
    }
}

// Handle copy button clicks
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('copy-btn') || e.target.classList.contains('dm-copy-btn')) {
        const targetId = e.target.getAttribute('data-copy-target');
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
            const textToCopy = targetElement.textContent.trim();
            
            if (textToCopy && textToCopy !== 'N/A' && textToCopy !== 'Not specified') {
                const success = await copyToClipboard(textToCopy);
                
                if (success) {
                    const originalText = e.target.textContent;
                    const originalBg = e.target.style.background;
                    const originalColor = e.target.style.color;
                    const originalBorder = e.target.style.borderColor;
                    
                    e.target.textContent = 'Copied!';
                    e.target.style.background = '#4CAF50';
                    e.target.style.color = 'white';
                    e.target.style.borderColor = '#4CAF50';
                    
                    setTimeout(() => {
                        e.target.textContent = originalText;
                        e.target.style.background = originalBg || '';
                        e.target.style.color = originalColor || '';
                        e.target.style.borderColor = originalBorder || '';
                    }, 1000);
                }
            }
        }
    }
});

// Clear Results button handler
document.getElementById('clearResultsBtn').addEventListener('click', async () => {
    await clearCachedResults();
    clearResults();
    // Status message not needed in input mode, but keep it minimal
    clearStatus('analyzeStatus');
});

// Initialize on page load
(async () => {
    await checkResumeStatus();
    
    // Load cached analysis results if they exist
    const cachedResults = await loadCachedResults();
    if (cachedResults) {
        // Show results directly in RESULT MODE
        displayResults(cachedResults);
    } else {
        // Show INPUT MODE
        switchToInputMode();
    }
})();
