# Clinical SmartPhrase - AI Documentation Tool

A progressive web app (PWA) that transforms terse clinical shorthand into formatted, problem-oriented assessment/plan notes using local AI inference. Optimized for pediatric and primary care documentation workflows.

## Features

- 🤖 **Selectable AI Models** - Choose from 4 models optimized for different hardware
- 📝 **Smart Expansion** - Converts abbreviated notes into concise clinical shorthand bullets
- 🔒 **HIPAA-Friendly** - Runs completely offline after initial model download
- 📋 **Auto-Boilerplate** - Rule-based system adds appropriate clinical text
- ⚡ **Real-time Preview** - 500ms debounced processing with live formatted output
- 📱 **PWA Support** - Installable, works offline, mobile-friendly
- 🎨 **Clinical Design** - Professional interface optimized for medical workflows

## Available AI Models

**Llama 3.2 1B (Fast)**
- Size: ~0.5GB
- Speed: Very Fast
- Best for: Low-end hardware, quick testing, older laptops

**Llama 3.2 3B (Balanced)** ⭐ Recommended
- Size: ~1.8GB
- Speed: Fast  
- Best for: Balance of speed and quality, most users

**Phi 3.5 Mini (Efficient)**
- Size: ~2.3GB
- Speed: Fast
- Best for: Medical/technical tasks, modern laptops

**Qwen 2.5 3B (Alternative)**
- Size: ~1.9GB
- Speed: Fast
- Best for: Alternative option with good performance

## Supported Boilerplate Templates

The system automatically detects and appends appropriate boilerplate for:

- **Well Child Check** - Forms, labs, immunizations, anticipatory guidance documentation
- **Illness** - General illness return precautions and supportive care
- **Injury** - RICE protocol, Tylenol/Motrin, return precautions
- **Ear Infection** - Risks of untreated otitis media
- **Strep Throat** - Rheumatic fever risk, pending lab statement
- **Dehydration/GI** - IV fluids risk for vomiting/diarrhea
- **Respiratory Distress** - Hospital admission risk for breathing problems
- **ADHD/Obesity** - PCMH reminder flag

## Quick Start

### Easiest Method - Standalone File

The standalone HTML file contains everything in one file and requires no setup:

```bash
# Just open in Chrome or Edge (WebGPU required)
open clinical-smartphrase-standalone.html

# Or serve with any static server
python -m http.server 8000
# Visit: http://localhost:8000/clinical-smartphrase-standalone.html
```

### Deploy to GitHub Pages

```bash
# 1. Create new repository on GitHub
# 2. Clone and add files
git init
git add clinical-smartphrase-standalone.html
git commit -m "Add Clinical SmartPhrase"
git remote add origin https://github.com/YOUR_USERNAME/clinical-smartphrase.git
git branch -M main
git push -u origin main

# 3. Enable GitHub Pages
# Go to: Settings > Pages > Source: main branch > Save
```

Your app will be live at: `https://YOUR_USERNAME.github.io/clinical-smartphrase/clinical-smartphrase-standalone.html`

## Usage

### First Time Setup

1. **Open the app** - Load the HTML file in Chrome or Edge
2. **Select model** - Choose based on your hardware capabilities
3. **Wait for download** - First load takes 1-5 minutes depending on model size
4. **Start documenting** - Model stays cached for future sessions

### Creating Notes

1. **Type shorthand** in left panel:
```
Asthma - wheezing, using albuterol q4h at home

WCC - growing and developing well

Viral URI - supportive care, fluids
```

2. **Auto-format** - System processes after 500ms pause

3. **Review output** in right panel:
```
**Asthma**
        - Wheezing, using albuterol q4h at home
        - Flovent 44mcg 2 puff BID started
        - Continue albuterol PRN
        - Use spacer
        - RTC 3mo/PRN

Patient is at risk for worsening respiratory distress and clinical deterioration, 
which would need emergency room care or hospital admission.
```

4. **Copy to clipboard** - Click button to copy formatted note
5. **Paste into EMR** - Use in your documentation system

## Output Format

The tool follows strict formatting rules:

- **Bold problem names** (no section headers)
- **8-space indented bullets** with clinical shorthand
- **Italicized boilerplate** in highlighted boxes
- **Blank lines** between problems
- **Standard abbreviations** (RTC, PRN, BID, etc.)
- **Concise bullets** (under 10 words ideal)

## Technical Details

### Browser Requirements

- **Chrome 113+** or **Edge 113+** (WebGPU support required)
- **2-4GB RAM** depending on model
- **0.5-2.5GB storage** for model caching
- **HTTPS** for service worker (GitHub Pages provides this)

### Performance by Model

| Model | Download Size | RAM Usage | Inference Speed | Quality |
|-------|--------------|-----------|-----------------|---------|
| Llama 1B | ~0.5GB | ~1GB | 1-2s | Good |
| Llama 3B | ~1.8GB | ~2.5GB | 2-4s | Very Good |
| Phi 3.5 | ~2.3GB | ~3GB | 2-4s | Very Good |
| Qwen 2.5 | ~1.9GB | ~2.5GB | 2-4s | Very Good |

### Architecture

- **Frontend**: React 18 (UMD build, no build step needed)
- **AI Engine**: WebLLM (MLC-LLM) with selectable models
- **Styling**: Inline CSS with IBM Plex fonts
- **Deployment**: Static HTML (works on any web server)

## Customization

### Adding New Boilerplate Rules

Edit the `BOILERPLATE_RULES` object:

```javascript
const BOILERPLATE_RULES = {
  'your_condition': {
    keywords: ['keyword1', 'keyword2'],
    text: 'Your boilerplate text here...'
  }
};
```

### Changing Default Model

Update the initial state:

```javascript
const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[1].id); 
// Change index: 0 = 1B, 1 = 3B (default), 2 = Phi, 3 = Qwen
```

### Adjusting Debounce Time

```javascript
debounceTimerRef.current = setTimeout(() => {
  processInput(input);
}, 500); // Change milliseconds here
```

## Troubleshooting

**Model won't load:**
- Ensure browser supports WebGPU: visit `chrome://gpu` and look for "WebGPU: Enabled"
- Try smaller model (Llama 1B)
- Clear browser cache
- Check available disk space

**Slow processing:**
- Switch to smaller/faster model
- Close other tabs to free RAM
- Check if device is thermal throttling

**Bad formatting:**
- Model may need more context - try being more specific in input
- Try regenerating with the button
- Consider switching to Phi 3.5 for better medical terminology

**Can't install as PWA:**
- Must use HTTPS (GitHub Pages provides this)
- Service worker only works in full PWA version (not standalone HTML)
- Some browsers don't support PWA installation

## Security & Privacy

✅ **No data leaves your device** - All processing is local  
✅ **No API keys required** - Self-contained inference  
✅ **No tracking** - No analytics or external calls  
✅ **Offline-capable** - Works without internet after setup  
⚠️ **Always review output** - AI-generated content requires clinical validation  
⚠️ **Not a medical device** - For documentation assistance only

## Clinical Workflow Integration

This tool is designed to integrate into existing clinical workflows:

1. **During encounter** - Type shorthand as you go
2. **After encounter** - Review and regenerate as needed
3. **Copy to EMR** - Paste formatted note into your system
4. **Edit if needed** - Make any clinical adjustments
5. **Sign note** - Complete documentation

The tool aims to reduce documentation time while maintaining clinical quality.

## License

This tool is provided for informational and educational purposes. Always review and validate AI-generated content before use in patient care documentation.

## Disclaimer

⚠️ **IMPORTANT**: This is a documentation assistance tool, not a medical device. All AI-generated content must be reviewed by a qualified clinician before inclusion in medical records. The creators assume no liability for clinical decisions made based on this tool's output.

## Support

For issues or questions:
- Check browser console for errors
- Verify WebGPU support at `chrome://gpu`
- Try different model if current one fails
- Clear browser cache and reload

---

Built for clinicians who value efficiency without compromising quality.
