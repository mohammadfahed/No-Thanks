// DOM Elements
const startScanBtn = document.getElementById('start-scan');
const stopScanBtn = document.getElementById('stop-scan');
const cameraSelect = document.getElementById('camera-select');
const video = document.getElementById('camera');
const canvas = document.getElementById('scanner-canvas');
const resultsContainer = document.getElementById('results');
const ctx = canvas.getContext('2d');
const scanLine = document.querySelector('.scan-line');

// Variables
let stream = null;
let scanning = false;
let animationId = null;

// Country database (first 3 digits of barcode)
const countryCodes = {
    '000': 'USA',
    '030': 'USA',
    '060': 'USA',
    '070': 'Norway',
    '073': 'Sweden',
    '076': 'Switzerland',
    '400': 'Germany',
    '450': 'Japan',
    '460': 'Russia',
    '471': 'Taiwan',
    '474': 'Estonia',
    '475': 'Latvia',
    '477': 'Lithuania',
    '479': 'Sri Lanka',
    '480': 'Philippines',
    '482': 'Ukraine',
    '484': 'Moldova',
    '485': 'Armenia',
    '486': 'Georgia',
    '487': 'Kazakhstan',
    '489': 'Hong Kong',
    '500': 'UK',
    '520': 'Greece',
    '528': 'Lebanon',
    '529': 'Cyprus',
    '530': 'Albania',
    '535': 'Malta',
    '539': 'Ireland',
    '540': 'Belgium',
    '560': 'Portugal',
    '569': 'Iceland',
    '570': 'Denmark',
    '590': 'Poland',
    '594': 'Romania',
    '599': 'Hungary',
    '600': 'South Africa',
    '609': 'Mauritius',
    '611': 'Morocco',
    '613': 'Algeria',
    '619': 'Tunisia',
    '690': 'China',
    '729': 'Israel',
    '740': 'Guatemala',
    '741': 'El Salvador',
    '742': 'Honduras',
    '743': 'Nicaragua',
    '744': 'Costa Rica',
    '750': 'Mexico',
    '759': 'Venezuela',
    '770': 'Colombia',
    '773': 'Uruguay',
    '775': 'Peru',
    '777': 'Bolivia',
    '779': 'Argentina',
    '780': 'Chile',
    '784': 'Paraguay',
    '786': 'Ecuador',
    '789': 'Brazil',
    '800': 'Italy',
    '840': 'Spain',
    '850': 'Cuba',
    '858': 'Slovakia',
    '859': 'Czech Republic',
    '860': 'Serbia',
    '865': 'Mongolia',
    '867': 'North Korea',
    '869': 'Turkey',
    '870': 'Netherlands',
    '880': 'South Korea',
    '884': 'Cambodia',
    '885': 'Thailand',
    '888': 'Singapore',
    '890': 'India',
    '893': 'Vietnam',
    '899': 'Indonesia',
    '900': 'Austria',
    '930': 'Australia',
    '940': 'New Zealand',
    '955': 'Malaysia',
    '958': 'Macau'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Setup camera selection
    setupCameraSelection();
    
    // Event listeners
    startScanBtn.addEventListener('click', startScanner);
    stopScanBtn.addEventListener('click', stopScanner);
    cameraSelect.addEventListener('change', switchCamera);
});

// Get available cameras
async function setupCameraSelection() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length === 0) {
            cameraSelect.innerHTML = '<option value="">No cameras found</option>';
            return;
        }
        
        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Camera ${index + 1}`;
            cameraSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error enumerating devices:', error);
        cameraSelect.innerHTML = '<option value="">Could not access cameras</option>';
    }
}

// Start scanner
async function startScanner() {
    try {
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'environment'
            }
        };
        
        // Use selected camera if available
        if (cameraSelect.value) {
            constraints.video.deviceId = { exact: cameraSelect.value };
        }
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        await video.play();
        
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Update UI
        startScanBtn.disabled = true;
        stopScanBtn.disabled = false;
        scanning = true;
        scanLine.style.display = 'block';
        
        // Start scanning loop
        scanBarcode();
    } catch (error) {
        console.error('Error starting scanner:', error);
        alert('Could not access camera. Please ensure you have granted camera permissions.');
    }
}

// Stop scanner
function stopScanner() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    // Update UI
    startScanBtn.disabled = false;
    stopScanBtn.disabled = true;
    scanning = false;
    scanLine.style.display = 'none';
}

// Switch camera
async function switchCamera() {
    if (scanning) {
        stopScanner();
        startScanner();
    }
}

// Scan for barcode
function scanBarcode() {
    if (!scanning) return;
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data from canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Try to decode barcode
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
    });
    
    // If barcode found
    if (code) {
        showResult(code.data);
        return;
    }
    
    // Continue scanning
    animationId = requestAnimationFrame(scanBarcode);
}

// Show scan result
function showResult(barcode) {
    // Stop scanner
    stopScanner();
    
    // Get country from barcode
    const countryPrefix = barcode.substring(0, 3);
    const country = countryCodes[countryPrefix] || 'Unknown';
    
    // Create result HTML
    const resultHTML = `
        <div class="result-card">
            <h3>Scan Result</h3>
            <div class="barcode-number">${barcode}</div>
            <div class="country-info">
                <img src="https://flagcdn.com/48x36/${getCountryCode(country).toLowerCase()}.png" 
                     alt="${country} flag" class="country-flag">
                <div>
                    <div class="country-name">${country}</div>
                    <div>Product Origin</div>
                </div>
            </div>
        </div>
    `;
    
    // Update results container
    resultsContainer.innerHTML = resultHTML;
}

// Helper function to get country code (simplified)
function getCountryCode(countryName) {
    const countryMap = {
        'USA': 'us',
        'China': 'cn',
        'Germany': 'de',
        'UK': 'gb',
        'Japan': 'jp',
        'France': 'fr',
        'Italy': 'it',
        'Spain': 'es',
        'Canada': 'ca',
        'Australia': 'au',
        'Brazil': 'br',
        'India': 'in',
        'Russia': 'ru',
        'South Korea': 'kr',
        'Mexico': 'mx'
    };
    
    return countryMap[countryName] || 'un';
}