import { textToStrokes, presetStrokes, imageToStrokes, buildSignal } from './signals.js';
import { initRotaryControls } from './knobs.js';

const $ = (id) => document.getElementById(id);
const scope = $('scope'), waveX = $('wave-x'), waveY = $('wave-y');
const ctx = scope.getContext('2d'), cx = waveX.getContext('2d'), cy = waveY.getContext('2d');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const state = {
  playing: !reducedMotion.matches, phase: 0.34, cycles: 1, frequency: 0.4,
  gainX: 1, gainY: 1, persistence: 0.65, blanking: true, travel: false, grid: true,
  source: 'text', preset: 'heart', image: null, imageURL: null, base: null, signal: null,
  transition: null, dimensions: new Map(), last: 0, lastReadout: 0, dirty: true,
};
const COLORS = {mint:'#79ffff', violet:'#e0da87', grid:'#1c5054', axis:'#3b7a7e', text:'#7eb9ba', white:'#e3ffff', travel:'#aca5a0'};
let wordTimer, imageTimer, uploadSequence = 0;

function message(text, error = false) {
  $('message').textContent = text;
  $('message').dataset.error = String(error);
}

function sizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  state.dimensions.set(canvas, {width, height});
}

function fitSignal() {
  if (!state.base) return;
  const {width, height} = state.dimensions.get(scope) || {width:800, height:440};
  const plotW = width - 76, plotH = height - 62;
  let maxX = 0.001, maxY = 0.001;
  for (let i=0; i<state.base.x.length; i++) {
    maxX = Math.max(maxX, Math.abs(state.base.x[i]));
    maxY = Math.max(maxY, Math.abs(state.base.y[i]));
  }
  const scale = Math.min(plotW * 0.39 / maxX, plotH * 0.38 / maxY);
  const x = Float32Array.from(state.base.x, v => v * scale * 2 / plotW * state.gainX);
  const y = Float32Array.from(state.base.y, v => v * scale * 2 / plotH * state.gainY);
  state.signal = {...state.base, x, y};
  state.dirty = true;
}

function installStrokes(strokes, label, animate = true) {
  if (!strokes?.length) { message('No lines found. Try a clearer image or adjust the threshold.', true); return false; }
  const old = state.signal;
  const next = buildSignal(strokes, {samples:2048});
  if (!next.x.length) { message('There is no trace to draw yet.', true); return false; }
  state.base = next;
  fitSignal();
  if (old && animate && !reducedMotion.matches && old.x.length === state.signal.x.length) {
    state.transition = {old, target:state.signal, started:performance.now()};
    state.signal = {...state.signal, x:old.x.slice(), y:old.y.slice()};
  } else state.transition = null;
  state.cycles = 1;
  $('sample-count').textContent = next.x.length.toLocaleString() + ' samples';
  scope.setAttribute('aria-label', `X–Y oscilloscope drawing ${label}. Horizontal and vertical voltage waveforms are shown below.`);
  message(`${label} · ${next.strokes ?? strokes.length} strokes converted to X and Y signals.`);
  return true;
}

function generateText() {
  const value = $('word-input').value.trim();
  if (!value) { message('Type a word to generate its signals.', true); return; }
  const supported = value.toUpperCase().replace(/[^A-Z0-9 .,!?:;+'"()\-\/&]/g, '');
  if (!supported.trim()) { message('Use letters A–Z, numbers, or basic punctuation.', true); return; }
  installStrokes(textToStrokes(supported), supported);
  if (supported !== value.toUpperCase()) message('Unsupported characters were skipped. Use A–Z, numbers, or basic punctuation.');
}

function convertImage() {
  if (!state.image) return;
  try {
    const result = imageToStrokes(state.image, {threshold:Number($('threshold').value), detail:Number($('detail').value)});
    installStrokes(result.strokes, 'Image trace');
  } catch (error) { message('This image could not be traced. Try a PNG or a simple high-contrast drawing.', true); }
}

async function loadFile(file) {
  if (!file) return;
  if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type) && !/\.(png|jpe?g|webp|svg)$/i.test(file.name)) {
    message('Choose a PNG, JPG, WebP, or SVG image.', true); return;
  }
  if (file.size > 10*1024*1024) { message('Choose an image smaller than 10 MB.', true); return; }
  const sequence = ++uploadSequence;
  const url = URL.createObjectURL(file), image = new Image();
  message('Finding the lines in your image…');
  try {
    image.src = url; await image.decode();
    if (sequence !== uploadSequence) { URL.revokeObjectURL(url); return; }
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth*image.naturalHeight > 40000000) throw new Error('Image dimensions');
    if (state.imageURL) URL.revokeObjectURL(state.imageURL);
    state.imageURL = url; state.image = image;
    $('image-preview').src = url; $('image-preview').hidden = false;
    $('image-preview').alt = `Uploaded source: ${file.name}`;
    $('upload-label').textContent = file.name;
    setSource('image', false);
    convertImage();
  } catch {
    URL.revokeObjectURL(url);
    if (sequence === uploadSequence) message('Could not read that image. Try a smaller PNG, JPG, WebP, or self-contained SVG.', true);
  }
}

function setSource(source, generate = true) {
  clearTimeout(wordTimer); clearTimeout(imageTimer);
  if (state.source === 'image' && source !== 'image') uploadSequence++;
  state.source = source;
  document.querySelectorAll('[data-source]').forEach(button => {
    const selected = button.dataset.source === source;
    button.setAttribute('aria-selected', selected); button.classList.toggle('active', selected);
    button.tabIndex = selected ? 0 : -1;
  });
  $('text-panel').hidden = source !== 'text';
  $('image-panel').hidden = source !== 'image';
  $('preset-panel').hidden = source !== 'presets';
  if(source==='presets') document.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.preset===state.preset));
  if (generate && source === 'text') generateText();
  if (generate && source === 'presets') installStrokes(presetStrokes(state.preset), state.preset);
  if (generate && source === 'image' && state.image) convertImage();
}

function syncPlayButton() {
  $('play').title = state.playing ? 'Pause animation' : 'Play animation';
  $('play').innerHTML = state.playing
    ? '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 3h3v10H4zm5 0h3v10H9z"/></svg><span>Pause</span>'
    : '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="m5 2 9 6-9 6z"/></svg><span>Play</span>';
  $('play').setAttribute('aria-label', state.playing ? 'Pause simulation' : 'Play simulation');
  $('status').textContent = state.playing ? 'TRACING' : 'PAUSED';
  $('status').dataset.playing = String(state.playing);
  state.dirty = true;
}

function plotBounds(canvas) {
  const {width:w, height:h} = state.dimensions.get(canvas);
  return {w, h, left:38, right:w-38, top:24, bottom:h-38, width:w-76, height:h-62};
}

function drawScope() {
  const b = plotBounds(scope), sig = state.signal, n = sig.x.length;
  const sx = v => b.left + (v+1)*b.width/2, sy = v => b.top + (1-v)*b.height/2;
  ctx.clearRect(0,0,b.w,b.h);
  ctx.font = '10px "SFMono-Regular", Consolas, monospace';
  ctx.textBaseline = 'middle';
  if (state.grid) {
    ctx.strokeStyle = '#0b393b'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i=0;i<=10;i++) {
      const x = b.left+b.width*i/10, y = b.top+b.height*i/10;
      ctx.moveTo(x,b.top); ctx.lineTo(x,b.bottom); ctx.moveTo(b.left,y); ctx.lineTo(b.right,y);
    }
    ctx.stroke();
    ctx.strokeStyle = COLORS.axis; ctx.beginPath();
    ctx.moveTo(b.left,sy(0));ctx.lineTo(b.right,sy(0));ctx.moveTo(sx(0),b.top);ctx.lineTo(sx(0),b.bottom);ctx.stroke();
  }
  ctx.fillStyle=COLORS.text;ctx.textAlign='center';
  [-5,0,5].forEach(v => ctx.fillText(`${v>0?'+':''}${v}`, sx(v/5), b.bottom+16));
  ctx.textAlign='right';[-5,0,5].forEach(v=>ctx.fillText(`${v>0?'+':''}${v}`,b.left-10,sy(v/5)));
  ctx.textAlign='left';ctx.fillText('Y / V',b.left,b.top-12);
  ctx.textAlign='center';ctx.fillText('X / V',b.left+b.width/2,b.bottom+30);
  ctx.save();ctx.beginPath();ctx.rect(b.left,b.top,b.width,b.height);ctx.clip();
  // All three views read the same time-indexed voltage arrays.
  const cursor=Math.min(n-1,Math.floor(state.phase*n)), buckets=14;
  const paths = Array.from({length:buckets},()=>new Path2D());
  const travelPath = new Path2D();
  for(let i=1;i<n;i++) {
    const isTravel = Boolean(sig.blank[i] || sig.blank[i-1]);
    const x0=sx(sig.x[i-1]), y0=sy(sig.y[i-1]), x1=sx(sig.x[i]), y1=sy(sig.y[i]);
    if(isTravel && state.blanking) {
      if(state.travel){travelPath.moveTo(x0,y0);travelPath.lineTo(x1,y1);} continue;
    }
    if(!state.cycles && i>cursor) continue;
    const age=(state.phase-i/n+1)%1;
    const brightness=Math.exp(-age/(state.persistence*1.15));
    const bin=Math.min(buckets-1,Math.floor(brightness*(buckets-1)));
    paths[bin].moveTo(x0,y0);paths[bin].lineTo(x1,y1);
  }
  ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=COLORS.mint;
  for(let j=0;j<buckets;j++) {
    ctx.globalAlpha=(0.035+j/(buckets-1)*0.965);
    ctx.shadowColor=COLORS.mint;ctx.shadowBlur=j>5?11:5;ctx.lineWidth=2.3;
    ctx.stroke(paths[j]);
  }
  ctx.globalAlpha=.4;ctx.shadowBlur=0;ctx.strokeStyle=COLORS.travel;ctx.setLineDash([3,5]);ctx.lineWidth=.8;ctx.stroke(travelPath);ctx.setLineDash([]);
  const on = !sig.blank[cursor] || !state.blanking;
  if(on) {
    const x=sx(sig.x[cursor]), y=sy(sig.y[cursor]);
    ctx.globalAlpha=.15;ctx.fillStyle=COLORS.mint;ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;ctx.shadowColor=COLORS.mint;ctx.shadowBlur=17;ctx.fillStyle=COLORS.white;ctx.beginPath();ctx.arc(x,y,2.7,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();ctx.globalAlpha=1;ctx.shadowBlur=0;
}

function drawWave(canvas, context, values, color) {
  const {width:w,height:h}=state.dimensions.get(canvas), left=36,right=w-18,top=12,bottom=h-24;
  const x=i=>left+i/(values.length-1)*(right-left), y=v=>top+(1-v/1.3)*(bottom-top)/2;
  context.clearRect(0,0,w,h);context.font='10px "SFMono-Regular", Consolas, monospace';
  context.strokeStyle=COLORS.grid;context.lineWidth=.65;context.beginPath();
  for(let i=0;i<=4;i++){const px=left+(right-left)*i/4;context.moveTo(px,top);context.lineTo(px,bottom);}
  [0,1,-1].forEach(v=>{context.moveTo(left,y(v));context.lineTo(right,y(v));});context.stroke();
  context.fillStyle=COLORS.text;context.textAlign='right';context.textBaseline='middle';
  context.fillText('+5',left-8,y(1));context.fillText('0',left-8,y(0));context.fillText('−5',left-8,y(-1));
  context.textBaseline='alphabetic';context.textAlign='left';context.fillText('0 s',left,h-6);
  context.textAlign='right';context.fillText(`${(1/state.frequency).toFixed(2)} s`,right,h-6);
  const cursor=Math.min(values.length-1,Math.floor(state.phase*values.length));
  const path=new Path2D();
  values.forEach((v,i)=>i?path.lineTo(x(i),y(v)):path.moveTo(x(i),y(v)));
  context.strokeStyle=color;context.lineWidth=1.3;context.globalAlpha=.4;context.stroke(path);
  context.save();context.beginPath();context.rect(left,top,x(cursor)-left,bottom-top);context.clip();context.globalAlpha=.95;context.stroke(path);context.restore();context.globalAlpha=1;
  context.strokeStyle='#768b81';context.lineWidth=1;context.setLineDash([2,4]);context.beginPath();context.moveTo(x(cursor),top);context.lineTo(x(cursor),bottom);context.stroke();context.setLineDash([]);
  context.fillStyle=color;context.beginPath();context.arc(x(cursor),y(values[cursor]),3,0,Math.PI*2);context.fill();
}

function readouts(now) {
  if(now-state.lastReadout<80 && state.playing) return;
  state.lastReadout=now;
  const i=Math.min(state.signal.x.length-1,Math.floor(state.phase*state.signal.x.length));
  const volts=v=>`${v>=0?'+':''}${(v*5).toFixed(2)} V`;
  $('x-value').textContent=volts(state.signal.x[i]);$('y-value').textContent=volts(state.signal.y[i]);
  $('phase-value').textContent=`${Math.round(state.phase*100)}%`;
  $('progress').value=Math.round(state.phase*1000);
  $('progress').setAttribute('aria-valuetext',`${Math.round(state.phase*100)} percent through cycle`);
}

function frame(now) {
  const dt=state.last?Math.min((now-state.last)/1000,.06):0;state.last=now;
  if(document.hidden){requestAnimationFrame(frame);return;}
  if(state.playing) {state.phase+=dt*state.frequency;if(state.phase>=1){state.cycles++;state.phase%=1;}state.dirty=true;}
  if(state.transition) {
    const t=Math.min(1,(now-state.transition.started)/650), eased=t*t*(3-2*t);
    const {old,target}=state.transition;
    for(let i=0;i<target.x.length;i++) {
      state.signal.x[i]=old.x[i]+(target.x[i]-old.x[i])*eased;
      state.signal.y[i]=old.y[i]+(target.y[i]-old.y[i])*eased;
    }
    if(t===1)state.transition=null;
    state.dirty=true;
  }
  if(state.dirty && state.signal) {
    drawScope();drawWave(waveX,cx,state.signal.x,COLORS.mint);drawWave(waveY,cy,state.signal.y,COLORS.violet);readouts(now);state.dirty=false;
  }
  requestAnimationFrame(frame);
}

document.querySelectorAll('[data-source]').forEach((button,index,buttons)=>{
  button.addEventListener('click',()=>setSource(button.dataset.source));
  button.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();let next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
    buttons[next].focus();setSource(buttons[next].dataset.source);
  });
});
$('generate').addEventListener('click',()=>{clearTimeout(wordTimer);generateText();});
$('word-input').addEventListener('input',()=>{clearTimeout(wordTimer);wordTimer=setTimeout(()=>{if(state.source==='text')generateText();},350);});
$('word-input').addEventListener('keydown',e=>{if(e.key==='Enter'){clearTimeout(wordTimer);generateText();}});
document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>{
  state.preset=button.dataset.preset;
  document.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',b===button));
  installStrokes(presetStrokes(state.preset),button.textContent.trim());
}));
$('file-input').addEventListener('change',e=>{loadFile(e.target.files[0]);e.target.value='';});
['dragenter','dragover'].forEach(name=>$('dropzone').addEventListener(name,event=>{event.preventDefault();$('dropzone').classList.add('dragover');}));
['dragleave','drop'].forEach(name=>$('dropzone').addEventListener(name,event=>{event.preventDefault();$('dropzone').classList.remove('dragover');}));
$('dropzone').addEventListener('drop',e=>loadFile(e.dataTransfer.files[0]));
if($('dropzone').tagName==='BUTTON')$('dropzone').addEventListener('click',()=>$('file-input').click());
['threshold','detail'].forEach(id=>$(id).addEventListener('input',()=>{
  $(`${id}-value`).textContent=$(id).value+(id==='detail'?'%':'');clearTimeout(imageTimer);imageTimer=setTimeout(()=>{if(state.source==='image')convertImage();},180);
}));
$('play').addEventListener('click',()=>{state.playing=!state.playing;syncPlayButton();});
$('restart').addEventListener('click',()=>{state.phase=0;state.cycles=0;state.playing=true;syncPlayButton();});
$('progress').addEventListener('input',()=>{state.phase=Math.min(.999999,Number($('progress').value)/1000);state.cycles=1;state.playing=false;syncPlayButton();});
for(const [id,key,format] of [
  ['frequency','frequency',v=>`${v.toFixed(1)} Hz`],
  ['gain-x','gainX',v=>`${v.toFixed(2)}×`],['gain-y','gainY',v=>`${v.toFixed(2)}×`],
  ['persistence','persistence',v=>`${Math.round(v*100)}%`]
]) $(id).addEventListener('input',()=>{
  state[key]=Number($(id).value);$(`${id}-value`).textContent=format(state[key]);
  if(id.startsWith('gain')){state.transition=null;fitSignal();}
  state.dirty=true;
});
['blanking','travel','grid'].forEach(id=>$(id).addEventListener('change',()=>{state[id]=$(id).checked;state.dirty=true;}));
$('download').addEventListener('click',()=>{
  if(!state.signal)return;
  const {x,y,blank}=state.signal,n=x.length,rows=['time_s,x_volts,y_volts,beam_on'];
  for(let i=0;i<n;i++)rows.push(`${(i/(n*state.frequency)).toFixed(7)},${(x[i]*5).toFixed(6)},${(y[i]*5).toFixed(6)},${state.blanking&&blank[i]?0:1}`);
  const url=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download='phosphor-xy-signals.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
  message('Exported one cycle: time in seconds, X and Y in volts, and beam on/off.');
});
$('how-it-works').addEventListener('click',()=>$('info-dialog').showModal());
$('close-info').addEventListener('click',()=>$('info-dialog').close());
$('info-dialog').addEventListener('click',e=>{if(e.target===$('info-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
document.addEventListener('keydown',event=>{
  if(event.code==='Space' && !/INPUT|TEXTAREA|BUTTON|SELECT/.test(event.target.tagName) && !$('info-dialog').open){event.preventDefault();state.playing=!state.playing;syncPlayButton();}
});
reducedMotion.addEventListener('change',e=>{if(e.matches){state.playing=false;state.transition=null;syncPlayButton();}});
const resize = new ResizeObserver(()=>{
  [scope,waveX,waveY].forEach(sizeCanvas);state.transition=null;fitSignal();state.dirty=true;
});
[scope,waveX,waveY].forEach(canvas=>{sizeCanvas(canvas);resize.observe(canvas);});
initRotaryControls();generateText();syncPlayButton();requestAnimationFrame(frame);
