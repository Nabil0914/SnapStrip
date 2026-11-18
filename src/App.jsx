import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';

import { Camera, RefreshCw, Download, Heart, RotateCcw, Sparkles, Timer, Check, X, ImagePlus } from 'lucide-react';

const FILTERS = [
  { id: 'original', name: 'Original', css: 'none' },
  { id: 'warm', name: 'Golden', css: 'sepia(.18) saturate(1.2) brightness(1.04)' },
  { id: 'mono', name: 'B&W', css: 'grayscale(1) contrast(1.08)' },
  { id: 'soft', name: 'Soft glow', css: 'brightness(1.08) saturate(.82) contrast(.92)' },
  { id: 'retro', name: 'Retro', css: 'sepia(.32) saturate(.8) contrast(.92)' },
];
const PROPS = [
  { id: 'sparkles', label: 'Sparkles', emoji: '✨' },
  { id: 'heart', label: 'Hearts', emoji: '💗' },
  { id: 'glasses', label: 'Glasses', emoji: '🕶️' },
  { id: 'crown', label: 'Crown', emoji: '👑' },
  { id: 'bunny', label: 'Bunny ears', emoji: '🐰' },
];

export default function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [photos, setPhotos] = useState([]);
  const [filter, setFilter] = useState('original');
  const [prop, setProp] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [shooting, setShooting] = useState(false);
  const [stripColor, setStripColor] = useState('#fffaf2');
  const [caption, setCaption] = useState('little moments');
  const [layout, setLayout] = useState('classic');
  const [facing, setFacing] = useState('user');
  const [flash, setFlash] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  const startCamera = useCallback(async (mode = facing) => {
    setCameraError('');
    stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access needs a secure connection (HTTPS) or localhost. You can still upload photos below.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setCameraError('We couldn’t open your camera. Check browser permissions, or upload photos instead.');
    }
  }, [facing, stopCamera]);

  useEffect(() => () => streamRef.current?.getTracks().forEach(track => track.stop()), []);

  const capture = () => {
    if (!videoRef.current || !cameraOn || photos.length >= 4 || shooting) return;
    setShooting(true);
    let n = 3;
    setCountdown(n);
    const tick = () => {
      n -= 1;
      if (n > 0) {
        setCountdown(n);
        window.setTimeout(tick, 750);
      } else {
        setCountdown('✦');
        window.setTimeout(() => {
          const video = videoRef.current;
          if (!video) { setCountdown(null); setShooting(false); return; }
          const c = document.createElement('canvas');
          const w = video.videoWidth || 960;
          const h = video.videoHeight || 720;
          c.width = w; c.height = h;
          const ctx = c.getContext('2d');
          if (facing === 'user') { ctx.translate(w, 0); ctx.scale(-1, 1); }
          ctx.drawImage(video, 0, 0, w, h);
          const data = c.toDataURL('image/jpeg', .94);
          setPhotos(p => [...p, { id: crypto.randomUUID(), data, filter, prop }].slice(0, 4));
          setFlash(true);
          window.setTimeout(() => setFlash(false), 180);
          setCountdown(null);
          setShooting(false);
        }, 250);
      }
    };
    window.setTimeout(tick, 750);
  };

  const addUploads = async (event) => {
    const selected = [...event.target.files || []].slice(0, 4 - photos.length);
    const loaded = await Promise.all(selected.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve({ id: crypto.randomUUID(), data: reader.result, filter, prop });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    })));
    setPhotos(p => [...p, ...loaded.filter(Boolean)].slice(0, 4));
    event.target.value = '';
  };

  const removePhoto = (id) => setPhotos(p => p.filter(x => x.id !== id));
  const updatePhoto = (id, patch) => setPhotos(p => p.map(x => x.id === id ? { ...x, ...patch } : x));

 
// const exportStrip = async () => {
//   if (!photos.length) {
//     setCameraError('Take or upload at least one photo first.');
//     return;
//   }

//   try {
//     const width = 900;
//     const pad = 48;
//     const gap = 18;
//     const imageH = 560;
//     const hasCaption = caption.trim().length > 0;
//     const footer = hasCaption ? 130 : 54;

//     const canvas = document.createElement('canvas');
//     canvas.width = width;
//     canvas.height =
//       pad * 2 +
//       photos.length * imageH +
//       (photos.length - 1) * gap +
//       footer;

//     const ctx = canvas.getContext('2d');

//     if (!ctx) {
//       throw new Error('Canvas is not supported by this browser.');
//     }

//     ctx.fillStyle = stripColor;
//     ctx.fillRect(0, 0, canvas.width, canvas.height);

//     const loadImage = (src) =>
//       new Promise((resolve, reject) => {
//         const img = new Image();

//         img.onload = () => {
//           if (img.naturalWidth === 0 || img.naturalHeight === 0) {
//             reject(new Error('The selected photo has invalid dimensions.'));
//           } else {
//             resolve(img);
//           }
//         };

//         img.onerror = () =>
//           reject(
//             new Error(
//               'A photo could not be loaded. Try a JPG or PNG image.'
//             )
//           );

//         img.src = src;
//       });

//     const images = await Promise.all(
//       photos.map((photo) => loadImage(photo.data))
//     );

//     images.forEach((img, i) => {
//       const photo = photos[i];
//       const x = pad;
//       const y = pad + i * (imageH + gap);
//       const boxW = width - pad * 2;

//       // Crop the image to fill its photo frame.
//       const scale = Math.max(
//         boxW / img.naturalWidth,
//         imageH / img.naturalHeight
//       );

//       const sourceW = boxW / scale;
//       const sourceH = imageH / scale;
//       const sourceX = (img.naturalWidth - sourceW) / 2;
//       const sourceY = (img.naturalHeight - sourceH) / 2;

//       ctx.save();
//       ctx.beginPath();
//       ctx.rect(x, y, boxW, imageH);
//       ctx.clip();

//       ctx.filter =
//         FILTERS.find((f) => f.id === photo.filter)?.css || 'none';

//       ctx.drawImage(
//         img,
//         sourceX,
//         sourceY,
//         sourceW,
//         sourceH,
//         x,
//         y,
//         boxW,
//         imageH
//       );

//       ctx.filter = 'none';

//       // Add the selected prop overlay.
//       if (photo.prop) {
//         const overlay = PROPS.find((p) => p.id === photo.prop);

//         if (overlay) {
//           ctx.font = '76px sans-serif';
//           ctx.textAlign = 'center';
//           ctx.fillText(overlay.emoji, width / 2, y + 100);
//         }
//       }

//       ctx.restore();
//     });

//     // Draw the caption.
//     if (hasCaption) {
//       ctx.fillStyle = '#302b28';
//       ctx.textAlign = 'center';
//       ctx.font = 'italic 34px Georgia, serif';
//       ctx.fillText(
//         caption.trim().slice(0, 48),
//         width / 2,
//         canvas.height - 65
//       );
//     }

//     // Export as a PNG Blob for better memory handling.
//     const blob = await new Promise((resolve, reject) => {
//       try {
//         canvas.toBlob((result) => {
//           if (result) {
//             resolve(result);
//           } else {
//             reject(new Error('PNG generation failed.'));
//           }
//         }, 'image/png');
//       } catch (error) {
//         reject(error);
//       }
//     });

//     const url = URL.createObjectURL(blob);
//     const link = document.createElement('a');

//     link.href = url;
//     link.download = 'snapstrip-photobooth.png';
//     document.body.appendChild(link);
//     link.click();
//     link.remove();

//     // Revoke after the browser has had time to start the download.
//     window.setTimeout(() => URL.revokeObjectURL(url), 2000);

//     setCameraError('');
//   } catch (error) {
//     console.error('Photo strip export failed:', error);

//     setCameraError(
//       error instanceof Error
//         ? `Export failed: ${error.message}`
//         : 'Export failed. Please try another photo.'
//     );
//   }
// };

const exportStrip = async () => {
  if (!photos.length) {
    setCameraError('Take or upload at least one photo first.');
    return;
  }

  try {
    const width = 900;
    const pad = 48;
    const gap = 18;
    const imageH = 560;
    const hasCaption = caption.trim().length > 0;

    // Reserve additional space for caption and footer.
    const footer = hasCaption ? 150 : 90;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height =
      pad * 2 +
      photos.length * imageH +
      (photos.length - 1) * gap +
      footer;

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas is not supported by this browser.');
    }

    // Background
    ctx.fillStyle = stripColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const loadImage = (src) =>
      new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
          if (img.naturalWidth === 0 || img.naturalHeight === 0) {
            reject(
              new Error('The selected photo has invalid dimensions.')
            );
          } else {
            resolve(img);
          }
        };

        img.onerror = () =>
          reject(
            new Error(
              'A photo could not be loaded. Try a JPG or PNG image.'
            )
          );

        img.src = src;
      });

    const images = await Promise.all(
      photos.map((photo) => loadImage(photo.data))
    );

    // Draw all photos.
    images.forEach((img, i) => {
      const photo = photos[i];
      const x = pad;
      const y = pad + i * (imageH + gap);
      const boxW = width - pad * 2;

      // Crop image to fill its photo frame.
      const scale = Math.max(
        boxW / img.naturalWidth,
        imageH / img.naturalHeight
      );

      const sourceW = boxW / scale;
      const sourceH = imageH / scale;
      const sourceX = (img.naturalWidth - sourceW) / 2;
      const sourceY = (img.naturalHeight - sourceH) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, boxW, imageH);
      ctx.clip();

      // Apply selected filter.
      ctx.filter =
        FILTERS.find((f) => f.id === photo.filter)?.css || 'none';

      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceW,
        sourceH,
        x,
        y,
        boxW,
        imageH
      );

      ctx.filter = 'none';

      // Add selected prop overlay.
      if (photo.prop) {
        const overlay = PROPS.find((p) => p.id === photo.prop);

        if (overlay) {
          ctx.font = '76px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(overlay.emoji, width / 2, y + 100);
        }
      }

      ctx.restore();
    });

    // Draw caption.
    if (hasCaption) {
      ctx.save();

      ctx.fillStyle = '#302b28';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'italic 34px Georgia, serif';

      ctx.fillText(
        caption.trim().slice(0, 48),
        width / 2,
        canvas.height - 92
      );

      ctx.restore();
    }

    // Draw Made with ❤️ footer.
    ctx.save();

    ctx.fillStyle = '#777777';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '24px Arial, sans-serif';

    ctx.fillText(
      'Made with ❤️',
      width / 2,
      canvas.height - 38
    );

    ctx.restore();

    // Export as PNG Blob.
    const blob = await new Promise((resolve, reject) => {
      try {
        canvas.toBlob((result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error('PNG generation failed.'));
          }
        }, 'image/png');
      } catch (error) {
        reject(error);
      }
    });

    // Download image.
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'snapstrip-photobooth.png';

    document.body.appendChild(link);
    link.click();
    link.remove();

    // Release memory.
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);

    setCameraError('');

  } catch (error) {
    console.error('Photo strip export failed:', error);

    setCameraError(
      error instanceof Error
        ? `Export failed: ${error.message}`
        : 'Export failed. Please try another photo.'
    );
  }
};

  const currentFilter = FILTERS.find(f => f.id === filter)?.css || 'none';

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="SnapStrip home"><span className="brand-mark"><Camera size={20}/></span> snapstrip<span className="brand-dot">.</span></a>
        <span className="top-note"><span className="status-dot" /> your pocket photobooth</span>
        <button className="icon-button top-heart" aria-label="Made with love"><Heart size={19}/></button>
      </header>

      <section className="intro">
        <p className="eyebrow"><Sparkles size={14}/> A LITTLE MOMENT, FOREVER</p>
        <h1>Your own little<br/><em>photobooth.</em></h1>
        <p className="intro-copy">Get silly. Take a few pictures. Keep the memories.</p>
      </section>

      <section className="studio">
        <div className="capture-panel">
          <div className="panel-heading">
            <div><span className="step">01</span><div><h2>Strike a pose</h2><p>Take up to four pictures</p></div></div>
            <span className="shot-count">{photos.length}/4 shots</span>
          </div>
          <div className="camera-frame">
            <video ref={videoRef} className={`camera-video ${facing === 'user' ? 'mirror' : ''}`} playsInline muted style={{ filter: currentFilter }} />
            {!cameraOn && <div className="camera-placeholder"><div className="camera-icon"><Camera size={30}/></div><strong>Ready when you are</strong><span>Turn on your camera or add photos</span></div>}
            {cameraOn && prop && <span className="live-prop" aria-hidden="true">{PROPS.find(p => p.id === prop)?.emoji}</span>}
            {countdown !== null && <div className="countdown"><span>{countdown}</span></div>}
            {flash && <div className="flash-layer"/>}
            <div className="camera-frame-label"><span>SNAPSTRIP STUDIO</span><span>● REC</span></div>
          </div>
          {cameraError && <p className="error-note" role="status">{cameraError}</p>}
          <div className="camera-actions">
            {!cameraOn ? <button className="primary-button" onClick={() => startCamera()}><Camera size={17}/> Open camera</button> :
              <button className="primary-button" onClick={capture} disabled={photos.length >= 4 || shooting}><Camera size={17}/> {shooting ? 'Get ready…' : photos.length >= 4 ? 'All shots taken' : 'Take photo'}</button>}
            {cameraOn && <button className="secondary-button" onClick={() => { const next = facing === 'user' ? 'environment' : 'user'; setFacing(next); startCamera(next); }} aria-label="Switch camera"><RefreshCw size={17}/></button>}
            {cameraOn && <button className="secondary-button" onClick={stopCamera} aria-label="Turn off camera"><X size={17}/></button>}
            <label className="secondary-button upload-button" title="Upload photos"><ImagePlus size={17}/><input type="file" accept="image/*" multiple onChange={addUploads} disabled={photos.length >= 4} /></label>
          </div>
          <p className="privacy-note">Your photos stay in this browser session. No account needed.</p>

          <div className="tool-section">
            <div className="tool-title"><span>01A</span><div><h3>Pick your mood</h3><p>Choose a look for your next shot</p></div></div>
            <div className="filter-list">
              {FILTERS.map(f => <button key={f.id} className={`filter-option ${filter === f.id ? 'selected' : ''}`} onClick={() => setFilter(f.id)}>
                <span className={`filter-swatch ${f.id}`}><span style={{filter:f.css}}>✿</span></span><span>{f.name}</span>{filter === f.id && <Check size={13}/>}
              </button>)}
            </div>
          </div>

          <div className="tool-section props-section">
            <div className="tool-title"><span>01B</span><div><h3>Add a little drama</h3><p>Playful starter overlays for your photos</p></div></div>
            <div className="props-list">
              {PROPS.map(p => <button key={p.id} className={`prop-option ${prop === p.id ? 'selected' : ''}`} onClick={() => setProp(prop === p.id ? null : p.id)}><span>{p.emoji}</span><small>{p.label}</small></button>)}
            </div>
            <p className="micro-note">These are prototype overlays. Realistic transparent prop assets and face-aware placement are planned next.</p>
          </div>
        </div>

        <aside className="preview-panel">
          <div className="panel-heading preview-heading">
            <div><span className="step">02</span><div><h2>Your photo strip</h2><p>A tiny keepsake, made by you</p></div></div>
            <span className="preview-tag">PREVIEW</span>
          </div>
          <div className="strip-stage">
            <div className="strip" style={{backgroundColor: stripColor}}>
              {photos.length === 0 ? <div className="empty-strip"><div className="empty-camera"><Camera size={24}/></div><strong>Your memories go here</strong><span>Your photo strip will appear<br/>as you take pictures.</span><div className="empty-sparkle">✳</div></div> :
                photos.map((p, i) => <div className="strip-photo-wrap" key={p.id}>
                  <div className="strip-photo"><img src={p.data} alt={`Photo ${i+1}`} style={{filter:FILTERS.find(f=>f.id===p.filter)?.css || 'none'}}/>{p.prop && <span className="strip-prop">{PROPS.find(v=>v.id===p.prop)?.emoji}</span>}</div>
                  <button className="remove-photo" onClick={() => removePhoto(p.id)} aria-label={`Remove photo ${i+1}`}><X size={13}/></button>
                </div>)
              }
              <div className="strip-footer"><span>{caption || ' '}</span><small>made with ♥</small></div>
            </div>
          </div>
          <div className="customize">
            <div className="customize-title"><Sparkles size={15}/><h3>Make it yours</h3></div>
            <label className="field-label" htmlFor="caption">Strip caption</label>
            <input id="caption" className="caption-input" value={caption} onChange={e => setCaption(e.target.value)} maxLength={48} placeholder="e.g. best day ever"/>
            <div className="field-row"><span className="field-label">Paper color</span><div className="color-options">
              {[['#fffaf2','Cream'],['#f5e4e8','Blush'],['#e5edf4','Sky'],['#292725','Midnight']].map(([c,n])=><button key={c} className={`color-dot ${stripColor===c?'active':''}`} style={{backgroundColor:c}} onClick={()=>setStripColor(c)} aria-label={n} title={n}/>)}
            </div></div>
            <div className="field-row"><span className="field-label">Layout</span><div className="layout-options">
              <button className={layout==='classic'?'active':''} onClick={()=>setLayout('classic')}><span className="layout-icon classic-icon"><i/><i/><i/></span>Classic</button>
              <button className={layout==='compact'?'active':''} onClick={()=>setLayout('compact')}><span className="layout-icon compact-icon"><i/><i/><i/><i/></span>Compact</button>
            </div></div>
            <button className="download-button" onClick={exportStrip} disabled={!photos.length}><Download size={18}/> Download photo strip <span>PNG</span></button>
            <p className="download-note">{photos.length ? `${photos.length} photo${photos.length===1?'':'s'} · high-quality PNG` : 'Take or upload at least one photo to download'}</p>
            {photos.length > 0 && <button className="reset-button" onClick={() => setPhotos([])}><RotateCcw size={13}/> Start a new strip</button>}
          </div>
          <canvas ref={canvasRef} className="hidden-canvas"/>
        </aside>
      </section>
      <footer className="footer"><span>snapstrip<span className="brand-dot">.</span></span><span>Made for memories, big and small.</span><span>✳ 2026</span></footer>
    </main>
  );
}