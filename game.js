  // How To Play modal
  const howToPlayModal = document.getElementById('howToPlayModal');
  const howCloseBtn = document.getElementById('howCloseBtn');
'use strict';

// Knowledge Quest — Prototype (Vanilla JS)
// Screens: start -> worldSelect -> play -> quiz -> results
// Worlds: Math, Science, English, Social (subject-themed)

(function(){
  // DOM refs
  const startScreen = document.getElementById('startScreen');
  const worldSelectScreen = document.getElementById('worldSelectScreen');
  const playBtn = document.getElementById('playBtn');
  const backToStart = document.getElementById('backToStart');
  const btnWorldMath = document.getElementById('btnWorldMath');
  const btnWorldScience = document.getElementById('btnWorldScience');
  const btnWorldEnglish = document.getElementById('btnWorldEnglish');
  const btnWorldSocial = document.getElementById('btnWorldSocial');

  // Level select
  const levelSelectScreen = document.getElementById('levelSelectScreen');
  const btnLevel1 = document.getElementById('btnLevel1');
  const btnLevel2 = document.getElementById('btnLevel2');
  const btnLevel3 = document.getElementById('btnLevel3');
  const backToWorlds = document.getElementById('backToWorlds');

  const hud = document.getElementById('hud');
  const scoreVal = document.getElementById('scoreVal');
  const starsVal = document.getElementById('starsVal');
  const worldVal = document.getElementById('worldVal');
  const levelVal = document.getElementById('levelVal');
  const levelTimerVal = document.getElementById('levelTimerVal');
  const pauseBtn = document.getElementById('pauseBtn');

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const touchControls = document.getElementById('touchControls');
  const btnLeft = document.getElementById('btnLeft');
  const btnRight = document.getElementById('btnRight');
  const btnJump = document.getElementById('btnJump');
  const howToPlayBtn = document.getElementById('howToPlayBtn');

  const quizModal = document.getElementById('quizModal');
  const quizCounter = document.getElementById('quizCounter');
  const quizWorld = document.getElementById('quizWorld');
  const quizQuestion = document.getElementById('quizQuestion');
  const quizChoices = document.getElementById('quizChoices');
  const hintBtn = document.getElementById('hintBtn');
  const quizHint = document.getElementById('quizHint');
  const quizTimerEl = document.getElementById('quizTimer');

  const resultsModal = document.getElementById('resultsModal');
  const resultsText = document.getElementById('resultsText');
  const resultsContinueBtn = document.getElementById('resultsContinueBtn');

  // Level transition modal
  const levelModal = document.getElementById('levelModal');
  const levelModalTitle = document.getElementById('levelModalTitle');
  const levelModalText = document.getElementById('levelModalText');

  // Redeem modal
  const redeemModal = document.getElementById('redeemModal');
  const redeemTimer = document.getElementById('redeemTimer');
  const redeemWorld = document.getElementById('redeemWorld');
  const redeemQuestion = document.getElementById('redeemQuestion');
  const redeemChoices = document.getElementById('redeemChoices');

  // Constants
  const CANVAS_W = canvas.width;
  const CANVAS_H = canvas.height;
  const GROUND_Y = CANVAS_H - 60;

  const GRAVITY = 1500; // px/s^2
  const MOVE_SPEED = 280; // px/s
  const JUMP_VY = -560; // px/s

  // World themes (colors)
  const THEMES = {
    math:    { sky:'#93c5fd', ground:'#065f46', gate:'#4338ca' },
    science: { sky:'#fde68a', ground:'#7c2d12', gate:'#ea580c' },
    english: { sky:'#c7d2fe', ground:'#3730a3', gate:'#a78bfa' },
    social:  { sky:'#cfd8dc', ground:'#1f2937', gate:'#22c55e' }
  };

  // Audio engine (Web Audio API)
  const audio = {
    ctx: null,
    master: null,
    enabled: true,
    inited: false,
    loaded: false,
    // map SFX keys to asset urls (user should place files in javascript/assets/audio/)
    files: {
      jump: 'assets/audio/jump.ogg',
      coin: 'assets/audio/coin.ogg',
      correct: 'assets/audio/correct.ogg',
      wrong: 'assets/audio/wrong.ogg',
      gate: 'assets/audio/gate_open.ogg',
      tick: 'assets/audio/tick.ogg',
      fail: 'assets/audio/fail.ogg',
      button: 'assets/audio/click.ogg'
    },
    elems: {},
    init(){
      if(this.inited) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if(!Ctx) { this.enabled = false; return; }
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.2;
      this.master.connect(this.ctx.destination);
      this.inited = true;
    },
    resume(){ if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    can(){ return this.enabled && this.ctx; },
    loadAssets(){
      if(this.loaded) return;
      // Preload HTMLAudio elements for each mapped file
      Object.entries(this.files).forEach(([key, url])=>{
        const el = new Audio(url);
        el.preload = 'auto';
        el.volume = 0.6; // master-ish volume for assets
        // prime by loading metadata (non-blocking)
        el.addEventListener('error', ()=>{ /* keep fallback on error */ });
        this.elems[key] = el;
      });
      this.loaded = true;
    },
    playAsset(name){
      const src = this.elems[name];
      if(!src) return false;
      try{
        // clone to allow overlapping plays
        const el = src.cloneNode(true);
        el.volume = src.volume;
        el.play().catch(()=>{});
        return true;
      }catch(e){ return false; }
    },
    beep(freq, dur, type='sine', gain=0.2){
      if(!this.can()) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.02);
    },
    chirp(f0, f1, dur, type='sine', gain=0.15){
      if(!this.can()) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(Math.max(1,f0), t);
      o.frequency.exponentialRampToValueAtTime(Math.max(1,f1), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.02);
    },
    buzz(freq=120, dur=0.2){ this.beep(freq, dur, 'sawtooth', 0.2); },
    success(){ this.chirp(600,1200,0.12,'sine',0.2); setTimeout(()=> this.chirp(800,1600,0.12,'sine',0.2), 100); },
    gate(){ this.chirp(500,1500,0.18,'triangle',0.25); setTimeout(()=> this.chirp(750,2000,0.18,'triangle',0.25), 140); },
    tick(){ this.beep(900,0.05,'square',0.15); },
    button(){ this.beep(500,0.05,'square',0.12); },
    sfx(name){
      // Prefer asset-based playback
      if(this.playAsset(name)) return;
      // Fallback to synth if asset missing or blocked
      switch(name){
        case 'jump': this.beep(300,0.06,'square',0.2); break;
        case 'coin': this.chirp(900,1400,0.09,'triangle',0.2); break;
        case 'correct': this.success(); break;
        case 'wrong': this.buzz(140,0.18); break;
        case 'gate': this.gate(); break;
        case 'tick': this.tick(); break;
        case 'fail': this.buzz(100,0.3); break;
        case 'button': this.button(); break;
      }
    }
  };

  // Storage keys
  const KEYS = {
    profile: 'kq_profile',
    progress: 'kq_progress',
    scores: 'kq_scores',
    questionsSeen: 'kq_questions_seen'
  };

  // State
  const state = {
    screen: 'start',
    paused: false,
    world: null,
    selectedWorld: null,
    level: 1,
    score: 0,
    stars: 0,
    inQuiz: false,
    inRedeem: false,
    redeemCooldownUntil: 0,
    levelTimeLeft: 0,
    levelFinished: false,
    // gameplay
    player: null,
    coins: [],
    obstacles: [],
    gate: null,
    respawn: { x: 0, y: 0 },
    checkpointX: 0,
    // input
    input: { left:false, right:false, jump:false, canJump:true }
  };

  // Question bank
  let QUESTION_BANK = [];
  const DEFAULT_QUESTIONS = [
    { id:'math_frac_001', world:'math', topic:'fractions', difficulty:'easy', question:'Which fraction is equivalent to 1/2?', choices:['2/4','1/3','3/5','2/3'], answerIndex:0, hint:'Multiply numerator and denominator by the same number.', explanation:'1/2 = 2/4.' },
    { id:'math_area_002', world:'math', topic:'area', difficulty:'easy', question:'What is the area of a rectangle 6 by 3?', choices:['9','12','18','24'], answerIndex:2, hint:'Area = length × width.', explanation:'6×3 = 18.' },
    { id:'math_lcm_003', world:'math', topic:'multiples', difficulty:'easy', question:'What is the LCM of 4 and 6?', choices:['6','8','10','12'], answerIndex:3, hint:'List multiples: 4,8,12,... and 6,12,...', explanation:'LCM is 12.' },
    { id:'sci_water_003', world:'science', topic:'water_cycle', difficulty:'easy', question:'Which step turns water vapor into liquid?', choices:['Evaporation','Condensation','Precipitation','Runoff'], answerIndex:1, hint:'It forms droplets on a cold surface.', explanation:'Condensation turns vapor to liquid.' },
    { id:'eng_grammar_010', world:'english', topic:'grammar', difficulty:'medium', question:'Choose the correct sentence.', choices:['The dogs runs fast.','The dog run fast.','The dog runs fast.','The dogs is fast.'], answerIndex:2, hint:'Match subject and verb number.', explanation:"Singular subject 'dog' → 'runs'." },
    { id:'soc_geo_005', world:'social', topic:'geography', difficulty:'easy', question:'What does 0° latitude represent?', choices:['Prime Meridian','Tropic of Cancer','Equator','Arctic Circle'], answerIndex:2, hint:"It's halfway between poles.", explanation:'The Equator is 0° latitude.' }
  ];

  // Utils
  function byId(id){ return document.getElementById(id); }
  function show(el){ el.classList.remove('hidden'); }
  function hide(el){ el.classList.add('hidden'); }
  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

  // Storage helpers
  function load(key, def){
    try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : def; }catch(e){ return def; }
  }
  function save(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }
  // Seen questions tracking
  let _seenSet = null;
  function qid(q){
    if(!q) return '';
    if(q.id) return String(q.id);
    if(q._id) return String(q._id);
    // fallback: stable hash of world+question+choices
    const base = `${q.world||''}|${q.question||''}|${Array.isArray(q.choices)?q.choices.join('|'):''}`;
    let h = 0; for(let i=0;i<base.length;i++){ h = ((h<<5)-h) + base.charCodeAt(i); h |= 0; }
    return `kq_${q.world||'x'}_${(h>>>0).toString(36)}`;
  }
  function getSeenSet(){
    if(!_seenSet){
      const arr = load(KEYS.questionsSeen, []);
      _seenSet = new Set(Array.isArray(arr) ? arr : []);
    }
    return _seenSet;
  }
  function hasSeen(id){ return !!id && getSeenSet().has(String(id)); }
  function markSeen(id){
    if(!id) return;
    const s = getSeenSet();
    const key = String(id);
    if(!s.has(key)){
      s.add(key);
      save(KEYS.questionsSeen, Array.from(s));
    }
  }

  function ensureDefaults(){
    const profile = load(KEYS.profile, { name: 'Player', settings: { audio:true, reducedMotion:false } });
    audio.enabled = !!(profile && profile.settings && profile.settings.audio);
    const progress = load(KEYS.progress, { math:{ stagesUnlocked:1 }, science:{ stagesUnlocked:1 }, english:{ stagesUnlocked:1 }, social:{ stagesUnlocked:1 } });
    const scores = load(KEYS.scores, { math:0, science:0, english:0, social:0 });
    const seen = load(KEYS.questionsSeen, []);

    // Normalize: ensure all subjects at least unlocked (stage 1)
    progress.math = progress.math || { stagesUnlocked:1 };
    progress.science = progress.science || { stagesUnlocked:1 };
    progress.english = progress.english || { stagesUnlocked:1 };
    progress.social = progress.social || { stagesUnlocked:1 };
    if((progress.math.stagesUnlocked ?? 0) <= 0) progress.math.stagesUnlocked = 1;
    if((progress.science.stagesUnlocked ?? 0) <= 0) progress.science.stagesUnlocked = 1;
    if((progress.english.stagesUnlocked ?? 0) <= 0) progress.english.stagesUnlocked = 1;
    if((progress.social.stagesUnlocked ?? 0) <= 0) progress.social.stagesUnlocked = 1;

    save(KEYS.profile, profile); save(KEYS.progress, progress); save(KEYS.scores, scores); save(KEYS.questionsSeen, seen);
    // Unlock buttons based on progress
    btnWorldMath.disabled = progress.math.stagesUnlocked <= 0;
    btnWorldScience.disabled = progress.science.stagesUnlocked <= 0;
    btnWorldEnglish.disabled = progress.english.stagesUnlocked <= 0;
    btnWorldSocial.disabled = progress.social.stagesUnlocked <= 0;
  }

  async function loadQuestionBank(){
    try{
      const res = await fetch('data/questions.json', { cache:'no-store' });
      if(!res.ok) throw new Error('http '+res.status);
      const data = await res.json();
      QUESTION_BANK = Array.isArray(data) ? data : DEFAULT_QUESTIONS;
    }catch(err){
      QUESTION_BANK = DEFAULT_QUESTIONS;
    }
  }

  // Screens
  function gotoStart(){
    state.screen = 'start';
    hide(worldSelectScreen); hide(levelSelectScreen); hide(canvas); hide(hud); hide(touchControls); hide(quizModal); hide(resultsModal); hide(redeemModal); hide(levelModal); hide(howToPlayModal);
    show(startScreen);
  }
  function gotoWorldSelect(){
    state.screen = 'worldSelect';
    hide(startScreen); hide(levelSelectScreen); hide(canvas); hide(hud); hide(touchControls); hide(quizModal); hide(resultsModal); hide(redeemModal); hide(levelModal); hide(howToPlayModal);
    show(worldSelectScreen);
  }

  function gotoLevelSelect(world){
    state.selectedWorld = world;
    state.screen = 'levelSelect';
    hide(startScreen); hide(worldSelectScreen); hide(canvas); hide(hud); hide(touchControls); hide(quizModal); hide(resultsModal); hide(redeemModal);
    // Enable levels based on progress for that world
    const progress = load(KEYS.progress, { [world]: { stagesUnlocked: 1 } });
    const unlocked = (progress[world] && progress[world].stagesUnlocked) || 1;
    btnLevel1.disabled = false;
    btnLevel2.disabled = unlocked < 2;
    btnLevel3.disabled = unlocked < 3;
    show(levelSelectScreen);
  }

  // Gameplay
  function initLevel(world, level){
    state.world = world; state.level = level; state.score = 0; state.stars = 0; state.paused = false; state.inQuiz = false; state.inRedeem = false; state.checkpointX = 0;
    worldVal.textContent = prettyWorld(world);
    levelVal.textContent = String(level);
    state.levelTimeLeft = levelTimeFor(level);
    if(levelTimerVal) levelTimerVal.textContent = formatTime(state.levelTimeLeft);
    state.levelFinished = false;
    // Player
    state.player = { x: 40, y: GROUND_Y-50, w: 40, h: 50, vx:0, vy:0, onGround:true };
    state.respawn = { x: 40, y: GROUND_Y-50 };
    // Layout based on level
    const layout = buildLevelLayout(level);
    state.coins = layout.coins;
    state.obstacles = layout.obstacles;
    state.gate = { x: layout.gateX, y: GROUND_Y-60, w: 40, h: 60, open:false };
  }

  function startGame(world, level){
    initLevel(world, level);
    state.screen = 'play';
    hide(startScreen); hide(worldSelectScreen); hide(levelSelectScreen); hide(resultsModal); hide(quizModal); hide(redeemModal); hide(levelModal); hide(howToPlayModal);
    show(canvas); show(hud); show(touchControls);
  }

  function prettyWorld(w){
    switch(w){ case 'math': return 'Math Jungle'; case 'science': return 'Science Desert'; case 'english': return 'English Castle'; case 'social': return 'Social City'; default: return '-'; }
  }

  function themeFor(world){
    return THEMES[world] || { sky:'#93c5fd', ground:'#065f46', gate:'#4338ca' };
  }

  // Input
  window.addEventListener('keydown', (e)=>{
    if(state.screen !== 'play') return;
    if(e.key === 'ArrowLeft' || e.key === 'a') state.input.left = true;
    if(e.key === 'ArrowRight' || e.key === 'd') state.input.right = true;
    if(e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w') state.input.jump = true;
    if(e.key === 'Escape'){ state.paused = !state.paused; }
  });
  window.addEventListener('keyup', (e)=>{
    if(state.screen !== 'play') return;
    if(e.key === 'ArrowLeft' || e.key === 'a') state.input.left = false;
    if(e.key === 'ArrowRight' || e.key === 'd') state.input.right = false;
    if(e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w') state.input.jump = false;
  });

  // Touch controls
  function bindControl(el, on, off){
    const down = (e)=>{ e.preventDefault(); on(); };
    const up = (e)=>{ e.preventDefault(); off(); };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', up);
    el.addEventListener('pointercancel', up);
  }
  bindControl(btnLeft, ()=>state.input.left=true, ()=>state.input.left=false);
  bindControl(btnRight, ()=>state.input.right=true, ()=>state.input.right=false);
  bindControl(btnJump, ()=>state.input.jump=true, ()=>state.input.jump=false);

  pauseBtn.addEventListener('click', ()=>{ if(state.screen==='play'){ state.paused = !state.paused; audio.sfx('button'); }});
  howToPlayBtn.addEventListener('click', ()=>{ show(howToPlayModal); audio.sfx('button'); });
  howCloseBtn.addEventListener('click', ()=>{ hide(howToPlayModal); audio.sfx('button'); });

  // Loop
  let lastTs = 0;
  function loop(ts){
    requestAnimationFrame(loop);
    const dt = Math.min(0.033, (ts - (lastTs||ts)) / 1000);
    lastTs = ts;
    if(state.screen !== 'play' || state.paused || state.inQuiz || state.inRedeem) return; // stop updating when not playing
    update(dt);
    render();
  }
  requestAnimationFrame(loop);

  function update(dt){
    const p = state.player;
    if(!p) return;

    // Horizontal
    p.vx = 0;
    if(state.input.left) p.vx = -MOVE_SPEED;
    if(state.input.right) p.vx = MOVE_SPEED;
    p.x += p.vx * dt;

    // Gravity + Jump
    p.vy += GRAVITY * dt;
    if(state.input.jump && p.onGround && state.input.canJump){
      p.vy = JUMP_VY; p.onGround = false; state.input.canJump = false; audio.sfx('jump');
    }
    if(!state.input.jump) state.input.canJump = true;

    p.y += p.vy * dt;

    // Ground collision
    if(p.y + p.h >= GROUND_Y){ p.y = GROUND_Y - p.h; p.vy = 0; p.onGround = true; }

    // Bounds
    p.x = clamp(p.x, 0, CANVAS_W - p.w);

    // Coins
    for(const c of state.coins){
      if(c.got) continue;
      const dx = (p.x + p.w/2) - c.x; const dy = (p.y + p.h/2) - c.y; const dist2 = dx*dx + dy*dy;
      if(dist2 <= (c.r + Math.min(p.w,p.h)/2)**2){
        c.got = true; state.stars += 1; state.score += 10; audio.sfx('coin');
      }
    }

    // Checkpoint (mid-level)
    if(!state.checkpointX && p.x > CANVAS_W*0.5){
      state.checkpointX = Math.floor(CANVAS_W*0.5);
      state.respawn.x = state.checkpointX;
      state.respawn.y = GROUND_Y - p.h;
    }

    // Obstacles collision
    for(const o of state.obstacles){
      if(aabb(p.x,p.y,p.w,p.h, o.x,o.y,o.w,o.h)){
        onHitObstacle();
        break;
      }
    }

    // Gate trigger
    const g = state.gate;
    if(!g.open && p.x + p.w >= g.x){
      openQuiz();
    }
    // Finish line: if gate is open and player crosses beyond gate, advance
    if(g.open && !state.levelFinished && p.x >= g.x + g.w){
      onLevelFinish();
      return;
    }

    // HUD
    scoreVal.textContent = String(state.score);
    starsVal.textContent = String(state.stars);
    // Level timer countdown
    if(state.levelTimeLeft > 0){
      state.levelTimeLeft = Math.max(0, state.levelTimeLeft - dt);
      if(levelTimerVal) levelTimerVal.textContent = formatTime(state.levelTimeLeft);
      if(state.levelTimeLeft <= 0){
        onLevelTimeout();
        return;
      }
    }
  }

  function render(){
    ctx.clearRect(0,0,CANVAS_W,CANVAS_H);
    // Sky background (per-world)
    const t = themeFor(state.world);
    ctx.fillStyle = t.sky;
    ctx.fillRect(0, 0, CANVAS_W, GROUND_Y);

    // Ground
    ctx.fillStyle = t.ground;
    ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

    // Obstacles
    ctx.fillStyle = '#dc2626';
    for(const o of state.obstacles){
      ctx.fillRect(o.x, o.y, o.w, o.h);
    }

    // Coins
    for(const c of state.coins){
      if(c.got) continue;
      ctx.beginPath(); ctx.fillStyle = '#f59e0b'; ctx.arc(c.x, c.y, c.r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2; ctx.stroke();
    }

    // Gate
    const g = state.gate;
    ctx.fillStyle = g.open ? '#22c55e' : t.gate;
    ctx.fillRect(g.x, g.y, g.w, g.h);

    // Player
    const p = state.player;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }

  // Quiz system
  let quiz = { list:[], idx:0, correct:0, wrong:0, hintUsed:false };

  // Redeem quiz (3-question sequence with early pass/fail)
  let redeem = { list:[], idx:0, correct:0, wrong:0, timerId:null, lastS:null };

  // Quiz per-question countdown
  let quizCountdown = { timerId:null, end:0 };

  function openQuiz(){
    if(state.inQuiz) return;
    state.inQuiz = true; state.paused = true;
    // build list: 3 questions from current world
    const pool = QUESTION_BANK.filter(q => q.world === state.world);
    const unseen = shuffleInPlace(pool.filter(q=>!hasSeen(qid(q))));
    const list = unseen.slice(0, 3);
    if(list.length < 3){
      const rest = shuffleInPlace(pool.filter(q=>!list.find(x=>qid(x)===qid(q))));
      for(const q of rest){ if(!list.find(x=>qid(x)===qid(q))) list.push(q); if(list.length>=3) break; }
    }
    if(list.length < 3){
      const fallbacks = shuffleInPlace(DEFAULT_QUESTIONS.filter(q=>q.world===state.world && !list.find(x=>qid(x)===qid(q))));
      for(const q of fallbacks){ if(!list.find(x=>qid(x)===qid(q))) list.push(q); if(list.length>=3) break; }
    }
    if(list.length < 3){ // absolute last resort: allow any default
      const any = shuffleInPlace(DEFAULT_QUESTIONS.filter(q=>!list.find(x=>qid(x)===qid(q))));
      for(const q of any){ if(!list.find(x=>qid(x)===qid(q))) list.push(q); if(list.length>=3) break; }
    }
    quiz.list = list.slice(0,3);
    quiz.idx = 0; quiz.correct = 0; quiz.wrong = 0; quiz.hintUsed = false;
    show(quizModal); renderQuiz();
  }

  function onHitObstacle(){
    if(state.inRedeem || state.inQuiz) return;
    if(state.redeemCooldownUntil && Date.now() < state.redeemCooldownUntil) return;
    triggerRedeem();
  }

  function triggerRedeem(){
    state.inRedeem = true; state.paused = true;
    // build 3-question list for current world (prefer unseen)
    const pool = QUESTION_BANK.filter(q => q.world === state.world);
    const unseen = shuffleInPlace(pool.filter(q=>!hasSeen(qid(q))));
    const list = unseen.slice(0,3);
    if(list.length < 3){
      const rest = shuffleInPlace(pool.filter(q=>!list.find(x=>qid(x)===qid(q))));
      for(const q of rest){ if(!list.find(x=>qid(x)===qid(q))) list.push(q); if(list.length>=3) break; }
    }
    if(list.length < 3){
      const fallbacks = shuffleInPlace(DEFAULT_QUESTIONS.filter(q=>q.world===state.world && !list.find(x=>qid(x)===qid(q))));
      for(const q of fallbacks){ if(!list.find(x=>qid(x)===qid(q))) list.push(q); if(list.length>=3) break; }
    }
    if(list.length < 3){ // absolute fallback: allow any default questions
      const any = shuffleInPlace(DEFAULT_QUESTIONS.filter(q=>!list.find(x=>qid(x)===qid(q))));
      for(const q of any){ if(!list.find(x=>qid(x)===qid(q))) list.push(q); if(list.length>=3) break; }
    }
    if(list.length < 3){ // last resort: reuse from pool to reach 3
      while(list.length < 3){
        const pick = pool[Math.floor(Math.random()*Math.max(1,pool.length))] || DEFAULT_QUESTIONS[0];
        list.push(pick);
      }
    }
    redeem.list = list.slice(0,3);
    redeem.idx = 0; redeem.correct = 0; redeem.wrong = 0;
    show(redeemModal);
    renderRedeemQuestion();
  }

  function renderRedeemQuestion(){
    const q = redeem.list[redeem.idx];
    if(!q){ finishRedeemQuiz(); return; }
    markSeen(qid(q));
    redeemWorld.textContent = `${prettyWorld(state.world)}  Q${redeem.idx+1}/3`;
    redeemQuestion.textContent = q.question;
    redeemChoices.innerHTML = '';
    q.choices.forEach((choice, i)=>{
      const b = document.createElement('button');
      b.className = 'primary'; b.textContent = choice;
      b.addEventListener('click', ()=> onRedeemAnswer(i));
      redeemChoices.appendChild(b);
    });
    // per-question timer (shorter at higher levels)
    const seconds = state.level === 1 ? 10 : state.level === 2 ? 8 : 6;
    startRedeemTimer(seconds);
  }

  function startRedeemTimer(seconds){
    const end = Date.now() + seconds*1000;
    clearRedeemTimer();
    redeem.lastS = null;
    redeem.timerId = setInterval(()=>{
      const remaining = Math.max(0, end - Date.now());
      const s = Math.ceil(remaining/1000);
      redeemTimer.textContent = `${s}s`;
      if(s !== redeem.lastS && s <= 3){ audio.sfx('tick'); redeem.lastS = s; }
      if(remaining <= 0){
        clearRedeemTimer();
        onRedeemTimeExpired();
      }
    }, 100);
  }

  function clearRedeemTimer(){ if(redeem.timerId){ clearInterval(redeem.timerId); redeem.timerId = null; } }

  function onRedeemAnswer(index){
    const q = redeem.list[redeem.idx];
    if(!q) return;
    // disable inputs to avoid double answers
    redeemChoices.querySelectorAll('button').forEach(b=> b.disabled = true);
    if(index === q.answerIndex){
      clearRedeemTimer();
      redeem.correct += 1;
      audio.sfx('correct');
      // Early pass if 2 correct
      if(redeem.correct >= 2){ finishRedeemQuiz(true); return; }
    }else{
      clearRedeemTimer();
      audio.sfx('wrong');
      redeem.wrong += 1;
      // Early fail if 2 wrong
      if(redeem.wrong >= 2){ finishRedeemQuiz(false); return; }
    }
    // Next question
    redeem.idx += 1;
    if(redeem.idx >= 3){
      finishRedeemQuiz(redeem.correct >= 2);
    }else{
      renderRedeemQuestion();
    }
  }

  function onRedeemTimeExpired(){
    // Count as wrong and progress or fail
    redeem.wrong += 1;
    if(redeem.wrong >= 2){ finishRedeemQuiz(false); return; }
    redeem.idx += 1;
    if(redeem.idx >= 3){
      finishRedeemQuiz(redeem.correct >= 2);
    }else{
      renderRedeemQuestion();
    }
  }

  function finishRedeemQuiz(passed){
    hide(redeemModal);
    state.inRedeem = false;
    if(passed){
      // resume play without penalty
      state.paused = false;
      state.redeemCooldownUntil = Date.now() + 1200; // 1.2s grace to avoid instant retrigger
      pushPlayerOffObstacles();
      return;
    }
    // fail: clear message and respawn to checkpoint/start
    state.paused = false;
    state.score = Math.max(0, state.score - 20);
    audio.sfx('fail');
    if(state.player){
      state.player.x = state.respawn.x || 40;
      state.player.y = state.respawn.y || (GROUND_Y - state.player.h);
      state.player.vx = 0; state.player.vy = 0; state.player.onGround = true;
    }
    // show clear failure message briefly
    resultsText.textContent = `Redeem failed: 2 incorrect answers. Respawning...`;
    resultsContinueBtn.classList.add('hidden');
    show(resultsModal);
    setTimeout(()=>{ hide(resultsModal); resultsContinueBtn.classList.remove('hidden'); }, 1000);
  }

  // legacy fail (kept in case of other calls)
  function redeemFail(){ finishRedeemQuiz(false); }

  // Ensure player is not overlapping any obstacle (nudge left/right)
  function pushPlayerOffObstacles(){
    const p = state.player; if(!p) return;
    for(const o of state.obstacles){
      if(aabb(p.x,p.y,p.w,p.h, o.x,o.y,o.w,o.h)){
        const pCenter = p.x + p.w/2;
        const oCenter = o.x + o.w/2;
        if(pCenter < oCenter){
          p.x = o.x - p.w - 2; // move to left side
        }else{
          p.x = o.x + o.w + 2; // move to right side
        }
      }
    }
  }

  function renderQuiz(){
    const q = quiz.list[quiz.idx];
    markSeen(qid(q));
    quizCounter.textContent = `Q${quiz.idx+1}/3`;
    quizWorld.textContent = prettyWorld(q.world);
    quizQuestion.textContent = q.question;
    quizChoices.innerHTML = '';
    quizHint.textContent = q.hint || ''; quizHint.classList.add('hidden'); quiz.hintUsed = false;

    q.choices.forEach((choice, i)=>{
      const btn = document.createElement('button');
      btn.className = 'primary'; btn.textContent = choice;
      btn.addEventListener('click', ()=> onAnswer(i));
      quizChoices.appendChild(btn);
    });
    // Start per-question timer (harder on higher levels)
    const seconds = state.level === 1 ? 15 : state.level === 2 ? 12 : 10;
    startQuizTimer(seconds);
  }

  function onAnswer(index){
    const q = quiz.list[quiz.idx];
    // prevent double submissions
    quizChoices.querySelectorAll('button').forEach(b=> b.disabled = true);
    if(index === q.answerIndex){
      clearQuizTimer();
      // correct
      state.score += quiz.hintUsed ? 35 : 50;
      quiz.correct += 1;
      audio.sfx('correct');
      if(quiz.correct >= 2){ finishQuiz(); return; }
      nextQuizStep();
    }else{
      // wrong: count and move on
      flashElement(quizQuestion, '#ef4444'); audio.sfx('wrong');
      quiz.wrong += 1;
      if(quiz.wrong >= 2){ finishQuiz(); return; }
      nextQuizStep();
    }
  }

  function nextQuizStep(){
    quiz.idx += 1;
    if(quiz.idx >= 3){
      finishQuiz();
    }else{
      renderQuiz();
    }
  }

  function finishQuiz(){
    clearQuizTimer(); if(quizTimerEl) quizTimerEl.textContent = '--';
    hide(quizModal);
    const pass = quiz.correct >= 2;
    const progress = load(KEYS.progress, {});
    if(pass){
      const perfect = quiz.correct === 3;
      resultsText.textContent = `Great! You answered ${quiz.correct}/3 correctly. Gate opens! +100 bonus`;
      state.score += 100; // end-of-stage bonus for passing
      // unlock next level for current world
      const w = state.world;
      progress[w] = progress[w] || { stagesUnlocked:1 };
      const next = Math.min(3, (state.level||1) + 1);
      progress[w].stagesUnlocked = Math.max((progress[w].stagesUnlocked || 1), next);
      save(KEYS.progress, progress);
      // update high score for current world
      const scores = load(KEYS.scores, {});
      const prev = scores[w] || 0;
      scores[w] = Math.max(prev, state.score);
      save(KEYS.scores, scores);
      // Open the gate and resume the SAME level immediately (for 2/3 or 3/3)
      if(state.gate) state.gate.open = true;
      audio.sfx('gate');
      state.inQuiz = false; state.paused = false;
      return;
    }else{
      resultsText.textContent = `You answered ${quiz.correct}/3. Need 2/3 to open the gate. Time-outs count as incorrect. Try again!`;
      resultsContinueBtn.classList.remove('hidden');
    }
    show(resultsModal);
  }

  function onLevelTimeout(){
    // Level failed due to time out
    state.paused = true;
    hide(quizModal); clearQuizTimer();
    resultsText.textContent = `Time's up! Level failed.`;
    resultsContinueBtn.classList.remove('hidden');
    show(resultsModal);
  }

  function onLevelFinish(){
    state.levelFinished = true;
    audio.sfx('correct');
    state.paused = true;
    // Show transition text
    if(state.level < 3){
      if(levelModalTitle) levelModalTitle.textContent = `Level ${state.level + 1}`;
      if(levelModalText) levelModalText.textContent = `${prettyWorld(state.world)} — Get ready!`;
      show(levelModal);
      setTimeout(()=>{
        hide(levelModal);
        startGame(state.world, state.level + 1);
      }, 1000);
    }else{
      if(levelModalTitle) levelModalTitle.textContent = `World Complete!`;
      if(levelModalText) levelModalText.textContent = `${prettyWorld(state.world)} — Returning to World Select...`;
      show(levelModal);
      setTimeout(()=>{
        hide(levelModal);
        gotoWorldSelect();
      }, 1200);
    }
  }

  // Level layout helper
  function buildLevelLayout(level){
    const coins = [];
    const obstacles = [];
    const gateX = level === 1 ? 840 : level === 2 ? 880 : 900;
    // coins per level
    const coinCount = level === 1 ? 5 : level === 2 ? 7 : 9;
    for(let i=0;i<coinCount;i++){
      const x = 140 + i * Math.floor((gateX - 240) / coinCount);
      const y = GROUND_Y - 60 - (i % 3)*20; // small variation
      coins.push({ x, y, r:10, got:false });
    }
    // obstacles per level
    const obsCount = level === 1 ? 3 : level === 2 ? 5 : 7;
    for(let i=0;i<obsCount;i++){
      const w = 30, h = 30;
      const x = 220 + i * Math.floor((gateX - 300) / obsCount);
      const y = GROUND_Y - h;
      obstacles.push({ x, y, w, h });
    }
    return { coins, obstacles, gateX };
  }

  // Collision helper
  function aabb(x1,y1,w1,h1, x2,y2,w2,h2){
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  hintBtn.addEventListener('click', ()=>{
    quiz.hintUsed = true;
    quizHint.classList.remove('hidden');
  });

  resultsContinueBtn.addEventListener('click', ()=>{
    hide(resultsModal);
    state.inQuiz = false; state.paused = false;
    audio.sfx('button');
    gotoWorldSelect();
  });

  // Helpers
  function shuffleInPlace(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
  function flashElement(el, color){
    const prev = el.style.color; el.style.color = color; setTimeout(()=>{ el.style.color = prev; }, 220);
  }

  // Quiz timers
  function startQuizTimer(seconds){
    clearQuizTimer();
    const end = Date.now() + seconds*1000;
    quizCountdown.end = end;
    if(quizTimerEl) quizTimerEl.textContent = `${Math.ceil(seconds)}s`;
    quizCountdown.timerId = setInterval(()=>{
      const remaining = Math.max(0, end - Date.now());
      const s = Math.ceil(remaining/1000);
      if(quizTimerEl) quizTimerEl.textContent = `${s}s`;
      if(remaining <= 0){
        clearQuizTimer();
        onQuizTimeExpired();
      }
    }, 100);
  }
  function clearQuizTimer(){ if(quizCountdown.timerId){ clearInterval(quizCountdown.timerId); quizCountdown.timerId = null; } }
  function onQuizTimeExpired(){
    // Count as incorrect and move to next question (early fail at 2 wrong)
    flashElement(quizQuestion, '#ef4444');
    audio.sfx('wrong');
    quiz.wrong += 1;
    if(quiz.wrong >= 2){ finishQuiz(); return; }
    nextQuizStep();
  }

  // Helpers for time formatting
  function formatTime(seconds){
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s/60);
    const r = s%60;
    return `${m}:${r.toString().padStart(2,'0')}`;
  }

  // Per-level time budget (seconds)
  function levelTimeFor(level){
    switch(level){
      case 1: return 60;   // 1:00
      case 2: return 45;   // 0:45
      case 3: return 35;   // 0:35
      default: return 60;
    }
  }

  // Wire up top-level buttons
  playBtn.addEventListener('click', ()=>{ audio.init(); audio.resume(); audio.loadAssets(); gotoWorldSelect(); });
  backToStart.addEventListener('click', ()=> gotoStart());
  btnWorldMath.addEventListener('click', ()=>{ gotoLevelSelect('math'); });
  btnWorldScience.addEventListener('click', ()=>{ gotoLevelSelect('science'); });
  btnWorldEnglish.addEventListener('click', ()=>{ gotoLevelSelect('english'); });
  btnWorldSocial.addEventListener('click', ()=>{ gotoLevelSelect('social'); });

  // Level selection
  btnLevel1.addEventListener('click', ()=>{ if(state.selectedWorld) startGame(state.selectedWorld, 1); });
  btnLevel2.addEventListener('click', ()=>{ if(state.selectedWorld) startGame(state.selectedWorld, 2); });
  btnLevel3.addEventListener('click', ()=>{ if(state.selectedWorld) startGame(state.selectedWorld, 3); });
  backToWorlds.addEventListener('click', ()=> gotoWorldSelect());

  // Init
  (async function init(){
    ensureDefaults();
    await loadQuestionBank();
    gotoStart();
    // show a11y: ensure focus ring visible on tab
    document.body.addEventListener('keydown', (e)=>{ if(e.key==='Tab') document.body.classList.add('kbd'); }, { once:true });
  })();

})();
