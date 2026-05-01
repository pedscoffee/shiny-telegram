import React, { useState, useEffect, useRef } from 'react';
import * as webllm from "https://esm.run/@mlc-ai/web-llm";

// Clinical boilerplate templates
const BOILERPLATE_RULES = {
  'chest pain': {
    keywords: ['chest pain', 'cp', 'chest discomfort', 'angina'],
    text: 'Return precautions reviewed: return immediately for worsening chest pain, shortness of breath, syncope, or radiation to arm/jaw. Patient verbalized understanding.'
  },
  'headache': {
    keywords: ['headache', 'ha', 'cephalgia', 'migraine'],
    text: 'Return precautions: return for severe/sudden onset headache, vision changes, weakness, confusion, fever with stiff neck. Patient instructed and verbalizes understanding.'
  },
  'abdominal pain': {
    keywords: ['abdominal pain', 'abd pain', 'belly pain', 'stomach pain'],
    text: 'Return if: fever >101°F, severe pain, vomiting blood, bloody stools, unable to tolerate liquids. Discussed and patient verbalizes understanding.'
  },
  'pediatric fever': {
    keywords: ['fever', 'febrile', 'temperature', 'pyrexia'],
    text: 'Fever management discussed: acetaminophen/ibuprofen dosing provided, adequate hydration emphasized. Return for temperature >104°F, lethargy, rash, difficulty breathing, or parental concern.'
  },
  'antibiotic': {
    keywords: ['antibiotic', 'abx', 'amoxicillin', 'azithromycin', 'cephalexin'],
    text: 'Antibiotic education: complete full course even if feeling better, take with food if GI upset occurs, return for rash/reaction.'
  },
  'stroke risk': {
    keywords: ['tia', 'stroke', 'cva', 'transient ischemic'],
    text: 'STROKE RISK: High-risk features discussed. Urgent neurology referral placed. Return immediately for any weakness, speech changes, vision loss, or severe headache. Code stroke protocol if symptoms recur.'
  },
  'suicidal': {
    keywords: ['suicidal', 'si', 'self-harm', 'suicide'],
    text: 'SAFETY ASSESSMENT: Suicide risk assessed. Crisis resources provided (988 Suicide & Crisis Lifeline). [Specify disposition: psychiatric consultation obtained / safety plan established / family notified]'
  }
};

const ClinicalSmartPhrase = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelName, setModelName] = useState('');
  const [loadingProgress, setLoadingProgress] = useState('');
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  
  const engineRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Initialize WebLLM
  useEffect(() => {
    const initEngine = async () => {
      try {
        setLoadingProgress('Initializing model engine...');
        const engine = await webllm.CreateMLCEngine(
          "Llama-3.2-3B-Instruct-q4f32_1-MLC",
          {
            initProgressCallback: (progress) => {
              setLoadingProgress(progress.text);
            }
          }
        );
        
        engineRef.current = engine;
        setModelName("Llama-3.2-3B-Instruct");
        setModelLoaded(true);
        setLoadingProgress('');
      } catch (err) {
        setError(`Failed to load model: ${err.message}`);
        setLoadingProgress('');
      }
    };

    initEngine();

    return () => {
      if (engineRef.current) {
        engineRef.current = null;
      }
    };
  }, []);

  // Debounced processing
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (input.trim() && modelLoaded) {
      debounceTimerRef.current = setTimeout(() => {
        processInput(input);
      }, 500);
    } else {
      setOutput('');
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [input, modelLoaded]);

  const detectBoilerplate = (text) => {
    const detected = [];
    const lowerText = text.toLowerCase();
    
    for (const [key, rule] of Object.entries(BOILERPLATE_RULES)) {
      if (rule.keywords.some(keyword => lowerText.includes(keyword))) {
        detected.push(rule.text);
      }
    }
    
    return detected;
  };

  const processInput = async (text) => {
    if (!engineRef.current) return;
    
    setIsProcessing(true);
    setError('');
    
    try {
      const prompt = `You are a clinical documentation assistant. Transform the following terse clinical shorthand into a well-formatted assessment and plan note. For each problem mentioned:

1. Create a bold problem name/diagnosis
2. Expand into 3-5 concise, professional bullet points
3. Use clinical language appropriate for medical records
4. Keep bullets focused and actionable

Input shorthand:
${text}

Format your response as:
**Problem Name**
- Bullet point 1
- Bullet point 2
- Bullet point 3

Do not add boilerplate text about return precautions - that will be added separately. Focus on clinical assessment and plan.`;

      const messages = [
        { role: "user", content: prompt }
      ];

      const reply = await engineRef.current.chat.completions.create({
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      let llmOutput = reply.choices[0].message.content;
      
      // Detect and append boilerplate
      const boilerplateTexts = detectBoilerplate(text);
      if (boilerplateTexts.length > 0) {
        llmOutput += '\n\n' + boilerplateTexts.map(bp => `*${bp}*`).join('\n\n');
      }
      
      setOutput(llmOutput);
    } catch (err) {
      setError(`Processing error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegenerate = () => {
    if (input.trim() && modelLoaded) {
      processInput(input);
    }
  };

  const handleCopy = () => {
    // Convert markdown-style formatting to plain text with formatting
    const plainText = output
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
      .replace(/\*(.*?)\*/g, '$1');    // Remove italic markers
    
    navigator.clipboard.writeText(plainText).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const formatOutput = (text) => {
    if (!text) return null;
    
    // Split by lines and process
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Bold problem names (wrapped in **)
      if (line.match(/^\*\*(.*?)\*\*/)) {
        const content = line.replace(/^\*\*(.*?)\*\*/, '$1');
        return <div key={idx} style={styles.problemName}>{content}</div>;
      }
      // Italic boilerplate (wrapped in single *)
      else if (line.match(/^\*(.*?)\*$/)) {
        const content = line.replace(/^\*(.*?)\*$/, '$1');
        return <div key={idx} style={styles.boilerplate}>{content}</div>;
      }
      // Bullet points
      else if (line.trim().startsWith('-')) {
        return <div key={idx} style={styles.bullet}>{line.trim()}</div>;
      }
      // Empty lines
      else if (line.trim() === '') {
        return <div key={idx} style={{ height: '12px' }} />;
      }
      // Regular text
      else {
        return <div key={idx} style={styles.regularText}>{line}</div>;
      }
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.grid} />
      
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.titleSection}>
            <div style={styles.logoMark}>⚕</div>
            <div>
              <h1 style={styles.title}>Clinical SmartPhrase</h1>
              <p style={styles.subtitle}>AI-Powered Clinical Documentation</p>
            </div>
          </div>
          
          {modelLoaded && (
            <div style={styles.modelBadge}>
              <div style={styles.statusDot} />
              <span>{modelName}</span>
            </div>
          )}
        </div>
      </header>

      {loadingProgress && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingCard}>
            <div style={styles.loadingSpinner} />
            <p style={styles.loadingText}>{loadingProgress}</p>
            <p style={styles.loadingSubtext}>First load may take 1-2 minutes to download model</p>
          </div>
        </div>
      )}

      {error && (
        <div style={styles.errorBanner}>
          <span style={styles.errorIcon}>⚠</span>
          {error}
        </div>
      )}

      <main style={styles.main}>
        <div style={styles.panelContainer}>
          {/* Input Panel */}
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <h2 style={styles.panelTitle}>Clinical Shorthand Input</h2>
              <p style={styles.panelSubtitle}>
                Type abbreviated clinical notes • Auto-formats in 500ms
              </p>
            </div>
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Example:&#10;&#10;cp - 45M with substernal cp x2h, radiating L arm. ECG NSR, trop neg. Likely MSK vs GERD.&#10;&#10;Plan: ASA 325mg, GI cocktail, reassess.Cards consulted.&#10;&#10;ha - migraine without aura, moderate severity..."
              style={styles.textarea}
              disabled={!modelLoaded}
            />
            
            <div style={styles.inputFooter}>
              <span style={styles.charCount}>
                {input.length} characters
              </span>
              {isProcessing && (
                <span style={styles.processingIndicator}>
                  <div style={styles.processingDot} />
                  Processing...
                </span>
              )}
            </div>
          </div>

          {/* Output Panel */}
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <h2 style={styles.panelTitle}>Formatted Note Preview</h2>
              <div style={styles.actionButtons}>
                <button
                  onClick={handleRegenerate}
                  disabled={!input.trim() || !modelLoaded || isProcessing}
                  style={{
                    ...styles.button,
                    ...styles.buttonSecondary,
                    ...((!input.trim() || !modelLoaded || isProcessing) && styles.buttonDisabled)
                  }}
                >
                  ↻ Regenerate
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!output}
                  style={{
                    ...styles.button,
                    ...styles.buttonPrimary,
                    ...(!output && styles.buttonDisabled)
                  }}
                >
                  {copySuccess ? '✓ Copied!' : '📋 Copy to Clipboard'}
                </button>
              </div>
            </div>
            
            <div style={styles.outputArea}>
              {output ? (
                <div style={styles.formattedOutput}>
                  {formatOutput(output)}
                </div>
              ) : (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>📝</div>
                  <p style={styles.emptyText}>
                    {modelLoaded 
                      ? 'Start typing in the input panel to see formatted output'
                      : 'Loading model...'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={styles.infoSection}>
          <div style={styles.infoCard}>
            <h3 style={styles.infoTitle}>How It Works</h3>
            <ul style={styles.infoList}>
              <li>Type abbreviated clinical notes in the left panel</li>
              <li>AI automatically expands shorthand into 3-5 professional bullet points per problem</li>
              <li>Rule-based system detects conditions and adds appropriate boilerplate (return precautions, risk statements)</li>
              <li>Copy formatted note directly to your EMR</li>
              <li>Works completely offline after initial model download</li>
            </ul>
          </div>
          
          <div style={styles.infoCard}>
            <h3 style={styles.infoTitle}>Supported Boilerplate</h3>
            <ul style={styles.infoList}>
              <li><strong>Chest Pain:</strong> Cardiac return precautions</li>
              <li><strong>Headache:</strong> Neurological warning signs</li>
              <li><strong>Abdominal Pain:</strong> GI return criteria</li>
              <li><strong>Fever:</strong> Pediatric fever management</li>
              <li><strong>Antibiotics:</strong> Medication education</li>
              <li><strong>TIA/Stroke:</strong> High-risk warnings</li>
              <li><strong>Suicidal Ideation:</strong> Safety assessment documentation</li>
            </ul>
          </div>
        </div>
      </main>

      <footer style={styles.footer}>
        <p style={styles.footerText}>
          Clinical SmartPhrase • Powered by Local AI • HIPAA-Friendly Offline Processing
        </p>
        <p style={styles.footerDisclaimer}>
          For informational purposes. Always review and edit output before use in patient care.
        </p>
      </footer>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
    fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },
  grid: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `
      linear-gradient(rgba(0, 123, 167, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 123, 167, 0.03) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
    zIndex: 0,
  },
  header: {
    background: 'linear-gradient(135deg, #007ba7 0%, #005f8a 100%)',
    padding: '2rem',
    borderBottom: '3px solid #004d6d',
    position: 'relative',
    zIndex: 1,
    boxShadow: '0 4px 20px rgba(0, 123, 167, 0.2)',
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  logoMark: {
    fontSize: '3rem',
    background: 'white',
    width: '70px',
    height: '70px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: 700,
    color: 'white',
    letterSpacing: '-0.02em',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  subtitle: {
    margin: '0.25rem 0 0 0',
    fontSize: '0.95rem',
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: 400,
  },
  modelBadge: {
    background: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
    padding: '0.6rem 1.2rem',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: 'white',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#4ade80',
    boxShadow: '0 0 8px rgba(74, 222, 128, 0.6)',
    animation: 'pulse 2s ease-in-out infinite',
  },
  loadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    background: 'white',
    padding: '3rem',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    textAlign: 'center',
    maxWidth: '500px',
  },
  loadingSpinner: {
    width: '60px',
    height: '60px',
    border: '4px solid #e9ecef',
    borderTop: '4px solid #007ba7',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1.5rem',
  },
  loadingText: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#212529',
    margin: '0 0 0.5rem 0',
  },
  loadingSubtext: {
    fontSize: '0.9rem',
    color: '#6c757d',
    margin: 0,
  },
  errorBanner: {
    background: '#fee',
    color: '#c33',
    padding: '1rem 2rem',
    margin: '1rem 2rem',
    borderRadius: '8px',
    border: '1px solid #fcc',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.95rem',
    position: 'relative',
    zIndex: 1,
  },
  errorIcon: {
    fontSize: '1.3rem',
  },
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem',
    position: 'relative',
    zIndex: 1,
  },
  panelContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem',
    marginBottom: '2rem',
  },
  panel: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(0, 123, 167, 0.1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  panelHeader: {
    padding: '1.5rem',
    borderBottom: '2px solid #e9ecef',
    background: 'linear-gradient(to bottom, #ffffff, #f8f9fa)',
  },
  panelTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#212529',
    letterSpacing: '-0.01em',
  },
  panelSubtitle: {
    margin: 0,
    fontSize: '0.85rem',
    color: '#6c757d',
  },
  actionButtons: {
    marginTop: '1rem',
    display: 'flex',
    gap: '0.75rem',
  },
  button: {
    padding: '0.6rem 1.2rem',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  buttonPrimary: {
    background: '#007ba7',
    color: 'white',
    boxShadow: '0 2px 8px rgba(0, 123, 167, 0.2)',
  },
  buttonSecondary: {
    background: '#e9ecef',
    color: '#495057',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  textarea: {
    flex: 1,
    width: '100%',
    padding: '1.5rem',
    border: 'none',
    fontSize: '0.95rem',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    lineHeight: '1.7',
    resize: 'none',
    outline: 'none',
    background: '#fafbfc',
    color: '#212529',
  },
  inputFooter: {
    padding: '1rem 1.5rem',
    background: '#f8f9fa',
    borderTop: '1px solid #e9ecef',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.85rem',
    color: '#6c757d',
  },
  charCount: {
    fontWeight: 500,
  },
  processingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#007ba7',
    fontWeight: 600,
  },
  processingDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#007ba7',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  outputArea: {
    flex: 1,
    padding: '1.5rem',
    overflowY: 'auto',
    background: '#fafbfc',
  },
  formattedOutput: {
    fontSize: '0.95rem',
    lineHeight: '1.8',
    color: '#212529',
  },
  problemName: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#007ba7',
    marginTop: '1.5rem',
    marginBottom: '0.75rem',
    paddingBottom: '0.5rem',
    borderBottom: '2px solid #007ba7',
  },
  bullet: {
    paddingLeft: '1.5rem',
    marginBottom: '0.5rem',
    color: '#495057',
  },
  boilerplate: {
    fontStyle: 'italic',
    color: '#6c757d',
    background: '#fff8e1',
    padding: '1rem',
    borderLeft: '3px solid #ffc107',
    marginTop: '1rem',
    marginBottom: '1rem',
    borderRadius: '4px',
    fontSize: '0.9rem',
  },
  regularText: {
    marginBottom: '0.5rem',
    color: '#495057',
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: '#adb5bd',
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
    opacity: 0.5,
  },
  emptyText: {
    fontSize: '1rem',
    margin: 0,
  },
  infoSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem',
    marginTop: '2rem',
  },
  infoCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 123, 167, 0.1)',
  },
  infoTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#007ba7',
  },
  infoList: {
    margin: 0,
    paddingLeft: '1.5rem',
    lineHeight: '1.8',
    color: '#495057',
    fontSize: '0.9rem',
  },
  footer: {
    textAlign: 'center',
    padding: '2rem',
    background: 'linear-gradient(to top, #ffffff, #f8f9fa)',
    borderTop: '1px solid #dee2e6',
    marginTop: '3rem',
    position: 'relative',
    zIndex: 1,
  },
  footerText: {
    margin: '0 0 0.5rem 0',
    fontSize: '0.9rem',
    color: '#495057',
    fontWeight: 600,
  },
  footerDisclaimer: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#6c757d',
  },
};

// Add keyframe animations via style tag
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  * {
    box-sizing: border-box;
  }
  
  body {
    margin: 0;
    padding: 0;
  }
  
  button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  }
  
  button:active:not(:disabled) {
    transform: translateY(0);
  }
`;
document.head.appendChild(styleSheet);

export default ClinicalSmartPhrase;
