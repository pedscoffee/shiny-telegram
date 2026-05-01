# Clinical SmartPhrase - AI Documentation Tool

A progressive web app (PWA) that transforms terse clinical shorthand into fully formatted, professionally-written assessment/plan notes using local AI inference.

## Features

- 🤖 **Local AI Processing** - Uses WebLLM for on-device inference (Llama 3.2 3B model)
- 📝 **Smart Expansion** - Converts abbreviated notes into 3-5 professional bullet points per problem
- 🔒 **HIPAA-Friendly** - Runs completely offline after initial model download
- 📋 **Auto-Boilerplate** - Rule-based system detects conditions and adds appropriate return precautions
- ⚡ **Real-time Preview** - 500ms debounced processing with live formatted output
- 📱 **PWA Support** - Installable, works offline, mobile-friendly
- 🎨 **Professional Design** - Clean, clinical interface optimized for medical workflows

## Supported Boilerplate Templates

The system automatically detects and appends appropriate boilerplate for:

- **Chest Pain** - Cardiac return precautions
- **Headache** - Neurological warning signs
- **Abdominal Pain** - GI return criteria
- **Fever** - Pediatric fever management
- **Antibiotics** - Medication education
- **TIA/Stroke** - High-risk warnings
- **Suicidal Ideation** - Safety assessment documentation

## Quick Start

### Option 1: Single-File Deployment (Simplest)

Use `clinical-smartphrase-standalone.html` - everything in one file:

```bash
# Just open in browser
open clinical-smartphrase-standalone.html

# Or serve with any static server
python -m http.server 8000
# Then visit: http://localhost:8000/clinical-smartphrase-standalone.html
```

### Option 2: Full PWA Deployment

1. **Local Testing:**
```bash
# Serve all files
python -m http.server 8000
# Visit: http://localhost:8000
```

2. **Deploy to GitHub Pages:**

```bash
# Create new repository
git init
git add .
git commit -m "Initial commit: Clinical SmartPhrase"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/clinical-smartphrase.git
git branch -M main
git push -u origin main

# Enable GitHub Pages
# Go to: Settings > Pages > Source: main branch > Save
```

Your app will be live at: `https://YOUR_USERNAME.github.io/clinical-smartphrase/`

## Usage

1. **First Load** - Model downloads automatically (1-2 minutes, ~1.8GB)
2. **Type Shorthand** - Enter abbreviated clinical notes in left panel
3. **Auto-Format** - AI expands to professional format after 500ms pause
4. **Review & Edit** - Preview formatted output in right panel
5. **Copy to EMR** - Click "Copy to Clipboard" and paste into your system

### Example Input

```
cp - 45M with substernal cp x2h, radiating L arm. ECG NSR, trop neg. Likely MSK vs GERD.

Plan: ASA 325mg, GI cocktail, reassess. Cards consulted.

ha - migraine without aura, moderate severity. Tried ibuprofen without relief.

Plan: Sumatriptan 100mg, dark room, antiemetics PRN
```

### Example Output

**Chest Pain**
- 45-year-old male presenting with substernal chest pain for 2 hours with radiation to left arm
- ECG shows normal sinus rhythm, troponin negative
- Differential diagnosis includes musculoskeletal pain versus gastroesophageal reflux disease
- Treatment includes aspirin 325mg, GI cocktail administered with plan to reassess
- Cardiology consultation obtained

*Return precautions reviewed: return immediately for worsening chest pain, shortness of breath, syncope, or radiation to arm/jaw. Patient verbalized understanding.*

**Headache - Migraine**
- Patient presents with migraine without aura, moderate severity
- Previously attempted ibuprofen therapy without adequate relief
- Treatment plan includes sumatriptan 100mg, rest in darkened environment
- Antiemetics available as needed for nausea

*Return precautions: return for severe/sudden onset headache, vision changes, weakness, confusion, fever with stiff neck. Patient instructed and verbalizes understanding.*

## Technical Details

### Architecture

- **Frontend**: React 18 with hooks
- **AI Engine**: WebLLM (MLC-LLM) running Llama 3.2 3B Instruct
- **Styling**: Inline CSS with professional medical aesthetic
- **PWA**: Service worker for offline caching
- **Deployment**: Static hosting (GitHub Pages compatible)

### File Structure

```
clinical-smartphrase/
├── index.html                          # Main HTML entry point
├── clinical-smartphrase.jsx            # React component (single file)
├── clinical-smartphrase-standalone.html # All-in-one version
├── manifest.json                       # PWA manifest
├── service-worker.js                   # Offline caching
└── README.md                          # This file
```

### Browser Requirements

- **Modern browser** with WebGPU support (Chrome 113+, Edge 113+)
- **2GB+ RAM** for model inference
- **~2GB storage** for model caching
- **HTTPS** required for service worker (GitHub Pages provides this)

### Performance

- **First load**: 1-2 minutes (model download)
- **Subsequent loads**: Instant (cached)
- **Inference time**: 2-5 seconds per note
- **Offline**: Fully functional after initial download

## Customization

### Adding New Boilerplate Rules

Edit the `BOILERPLATE_RULES` object in `clinical-smartphrase.jsx`:

```javascript
const BOILERPLATE_RULES = {
  'your-condition': {
    keywords: ['keyword1', 'keyword2', 'abbreviation'],
    text: 'Your boilerplate text here with return precautions...'
  }
};
```

### Changing AI Model

Modify the model name in the `initEngine` function:

```javascript
const engine = await webllm.CreateMLCEngine(
  "Llama-3.2-3B-Instruct-q4f32_1-MLC", // Change this
  { /* ... */ }
);
```

Available models: https://github.com/mlc-ai/web-llm#available-models

### Adjusting Debounce Time

Change the timeout in the `useEffect` hook:

```javascript
debounceTimerRef.current = setTimeout(() => {
  processInput(input);
}, 500); // Adjust this value (milliseconds)
```

## Security & Privacy

- ✅ **No data leaves device** - All processing is local
- ✅ **No API keys required** - Self-contained inference
- ✅ **No tracking** - No analytics or external calls
- ✅ **Offline-capable** - Works without internet after setup
- ⚠️ **Review required** - Always review AI output before clinical use
- ⚠️ **Not a medical device** - For documentation assistance only

## Limitations

- Requires WebGPU-capable browser
- Initial model download is large (~1.8GB)
- Processing time varies by device hardware
- AI may occasionally generate incorrect expansions
- Always review and edit output before EMR submission

## Troubleshooting

**Model won't load:**
- Ensure browser supports WebGPU (check chrome://gpu)
- Clear browser cache and reload
- Try incognito mode to rule out extension conflicts

**Slow processing:**
- Close other tabs to free up RAM
- Check device isn't throttling due to heat
- Consider using smaller model variant

**PWA won't install:**
- Ensure you're using HTTPS (required for service workers)
- Check browser console for errors
- Try clearing site data and reloading

## Contributing

To extend functionality:

1. Add new boilerplate rules in `BOILERPLATE_RULES`
2. Modify prompt engineering in `processInput()`
3. Adjust formatting logic in `formatOutput()`
4. Enhance UI/UX in component styles

## License

This tool is provided for informational and educational purposes. Always review and validate AI-generated content before use in patient care documentation.

## Disclaimer

⚠️ **IMPORTANT**: This is a documentation assistance tool, not a medical device. All AI-generated content must be reviewed by a qualified clinician before inclusion in medical records. The creators assume no liability for clinical decisions made based on this tool's output.

---

Built with ⚕️ for clinicians who value efficiency without compromising quality.
