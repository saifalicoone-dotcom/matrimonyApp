# Face Verification Integration Guide

## Overview
This guide explains how to integrate face verification using Face-api.js (client-side) with server-side comparison.

## Technology Stack
- **Frontend**: Face-api.js (free, open-source)
- **Backend**: Node.js with Euclidean distance comparison
- **Cost**: FREE (no external APIs)

## Frontend Implementation

### 1. Install Face-api.js

```bash
npm install face-api.js
```

Or use CDN:
```html
<script src="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"></script>
```

### 2. Load Models

```javascript
// Load face-api.js models
async function loadModels() {
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights';
  
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
  ]);
  
  console.log('Models loaded');
}
```

### 3. Extract Face Encoding from Photo

```javascript
async function extractFaceEncoding(imageElement) {
  // Detect face and get descriptor (encoding)
  const detection = await faceapi
    .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
  
  if (!detection) {
    throw new Error('No face detected');
  }
  
  // Return face encoding (128 numbers array)
  return Array.from(detection.descriptor);
}
```

### 4. Store Face Encoding (After Photo Upload)

```javascript
async function storeFaceEncoding(photoId, imageElement) {
  try {
    // Extract face encoding
    const faceEncoding = await extractFaceEncoding(imageElement);
    
    // Send to backend
    const response = await fetch('/api/users/me/face-verification/store', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        faceEncoding: faceEncoding,
        photoId: photoId // Optional
      })
    });
    
    const data = await response.json();
    console.log('Face encoding stored:', data);
  } catch (error) {
    console.error('Error storing face encoding:', error);
  }
}
```

### 5. Verify Face with Live Capture

```javascript
async function verifyFace(videoElement) {
  try {
    // Extract face encoding from live video
    const faceEncoding = await extractFaceEncoding(videoElement);
    
    // Send to backend for verification
    const response = await fetch('/api/users/me/face-verification/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        faceEncoding: faceEncoding
      })
    });
    
    const data = await response.json();
    
    if (data.status === 'success' && data.data.verified) {
      console.log('Face verified successfully!');
      console.log('Similarity:', data.data.similarity + '%');
    } else {
      console.log('Face verification failed');
      console.log('Distance:', data.data.distance);
    }
    
    return data;
  } catch (error) {
    console.error('Error verifying face:', error);
  }
}
```

### 6. Complete Example: Photo Upload with Face Detection

```javascript
// After photo upload
const photoInput = document.getElementById('photoInput');
const photoPreview = document.getElementById('photoPreview');

photoInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const imageUrl = URL.createObjectURL(file);
  
  // Show preview
  photoPreview.src = imageUrl;
  
  // Wait for image to load
  photoPreview.onload = async () => {
    try {
      // Extract face encoding
      const faceEncoding = await extractFaceEncoding(photoPreview);
      
      // Upload photo first (your existing photo upload API)
      const uploadResponse = await uploadPhoto(file);
      const photoId = uploadResponse.data.photo.id;
      
      // Store face encoding
      await storeFaceEncoding(photoId, photoPreview);
      
      alert('Photo uploaded and face encoding stored!');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };
});
```

### 7. Complete Example: Live Face Verification

```javascript
// Start camera for live verification
async function startFaceVerification() {
  const video = document.getElementById('videoElement');
  
  // Request camera access
  const stream = await navigator.mediaDevices.getUserMedia({ 
    video: { 
      width: 640, 
      height: 480,
      facingMode: 'user' // Front camera
    } 
  });
  
  video.srcObject = stream;
  video.play();
  
  // Verify button click
  document.getElementById('verifyBtn').addEventListener('click', async () => {
    try {
      const result = await verifyFace(video);
      
      if (result.data.verified) {
        alert('Face verified successfully!');
        // Stop camera
        stream.getTracks().forEach(track => track.stop());
      } else {
        alert('Face verification failed. Please try again.');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  });
}
```

## API Endpoints

### 1. Store Face Encoding
```
POST /api/users/me/face-verification/store
Authorization: Bearer <token>
Body: {
  "faceEncoding": [0.123, 0.456, ...], // 128-512 numbers array
  "photoId": "uuid" // Optional
}
```

### 2. Verify Face
```
POST /api/users/me/face-verification/verify
Authorization: Bearer <token>
Body: {
  "faceEncoding": [0.123, 0.456, ...] // Live capture encoding
}
```

### 3. Get Verification Status
```
GET /api/users/me/face-verification/status
Authorization: Bearer <token>
```

### 4. Reset Verification
```
DELETE /api/users/me/face-verification/reset
Authorization: Bearer <token>
```

## Response Examples

### Store Encoding Success
```json
{
  "status": "success",
  "message": "Face encoding stored successfully.",
  "data": {
    "faceEncodingStored": true,
    "faceVerified": false
  }
}
```

### Verify Face Success
```json
{
  "status": "success",
  "message": "Face verification successful!",
  "data": {
    "verified": true,
    "distance": 0.3456,
    "similarity": 42.33,
    "faceVerified": true
  }
}
```

### Verify Face Failure
```json
{
  "status": "error",
  "message": "Face verification failed.",
  "data": {
    "verified": false,
    "distance": 0.7890,
    "similarity": 18.50,
    "threshold": 0.6,
    "suggestion": "Please ensure good lighting and face the camera directly."
  }
}
```

## Threshold Values

- **Distance < 0.6**: Face match (verified)
- **Distance >= 0.6**: Face mismatch (not verified)

You can adjust the threshold in `faceVerificationController.js`:
```javascript
const threshold = 0.6; // Adjust as needed (lower = stricter)
```

## Best Practices

1. **Good Lighting**: Ensure proper lighting for better accuracy
2. **Front-Facing**: User should face camera directly
3. **Multiple Attempts**: Allow 2-3 attempts for verification
4. **Error Handling**: Handle cases where no face is detected
5. **User Feedback**: Show clear messages about verification status

## Troubleshooting

### No Face Detected
- Check image quality
- Ensure face is clearly visible
- Try different photo angle

### Low Similarity Score
- Ensure same person in both photos
- Check lighting conditions
- Verify face is front-facing

### Encoding Length Mismatch
- Ensure using same face-api.js model version
- Check encoding extraction code

## Security Notes

- Face encodings are stored as JSON in database
- Encodings cannot be reverse-engineered to images
- Comparison happens server-side
- No raw images stored after encoding extraction

