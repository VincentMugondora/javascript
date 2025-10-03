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
    levelTimeLeft: 0,
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

  function ensureDefaults(){
    const profile = load(KEYS.profile, { name: 'Player', settings: { audio:true, reducedMotion:false } });
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
    hide(worldSelectScreen); hide(levelSelectScreen); hide(canvas); hide(hud); hide(touchControls); hide(quizModal); hide(resultsModal); hide(redeemModal);
    show(startScreen);
  }
  function gotoWorldSelect(){
    state.screen = 'worldSelect';
    hide(startScreen); hide(levelSelectScreen); hide(canvas); hide(hud); hide(touchControls); hide(quizModal); hide(resultsModal); hide(redeemModal);
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
    hide(startScreen); hide(worldSelectScreen); hide(levelSelectScreen); hide(resultsModal); hide(quizModal); hide(redeemModal);
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

  pauseBtn.addEventListener('click', ()=>{ if(state.screen==='play'){ state.paused = !state.paused; }});

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
      p.vy = JUMP_VY; p.onGround = false; state.input.canJump = false;
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
        c.got = true; state.stars += 1; state.score += 10;
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
  let quiz = { list:[], idx:0, correct:0, hintUsed:false };

  // Redeem quiz (single timed question)
  let redeem = { q:null, deadline:0, timerId:null };

  // Quiz per-question countdown
  let quizCountdown = { timerId:null, end:0 };

  function openQuiz(){
    if(state.inQuiz) return;
    state.inQuiz = true; state.paused = true;
    // build list: 3 questions from current world
    const pool = QUESTION_BANK.filter(q => q.world === state.world);
    shuffleInPlace(pool);
    quiz.list = pool.slice(0, Math.min(3, pool.length));
    while(quiz.list.length < 3){ // fallback fill from defaults of same world
      const extra = DEFAULT_QUESTIONS.filter(q=>q.world===state.world);
      shuffleInPlace(extra);
      for(const q of extra){ if(!quiz.list.find(x=>x.id===q.id)) quiz.list.push(q); if(quiz.list.length>=3) break; }
      if(quiz.list.length>=3) break;
      // if still short, pad with any question
      if(quiz.list.length<3){ quiz.list.push(DEFAULT_QUESTIONS[0]); }
    }
    quiz.idx = 0; quiz.correct = 0; quiz.hintUsed = false;
    show(quizModal); renderQuiz();
  }

  function onHitObstacle(){
    if(state.inRedeem || state.inQuiz) return;
    triggerRedeem();
  }

  function triggerRedeem(){
    state.inRedeem = true; state.paused = true;
    // pick a single question from current world
    const pool = QUESTION_BANK.filter(q => q.world === state.world);
    const q = pool[Math.floor(Math.random()*pool.length)] || DEFAULT_QUESTIONS[0];
    redeem.q = q;
    redeemWorld.textContent = prettyWorld(state.world);
    redeemQuestion.textContent = q.question;
    redeemChoices.innerHTML = '';
    q.choices.forEach((choice, i)=>{
      const b = document.createElement('button');
      b.className = 'primary'; b.textContent = choice;
      b.addEventListener('click', ()=> onRedeemAnswer(i));
      redeemChoices.appendChild(b);
    });
    // timer: harder at higher levels
    const seconds = state.level === 1 ? 10 : state.level === 2 ? 8 : 6;
    startRedeemTimer(seconds);
    show(redeemModal);
  }

  function startRedeemTimer(seconds){
    const end = Date.now() + seconds*1000;
    clearRedeemTimer();
    redeem.timerId = setInterval(()=>{
      const remaining = Math.max(0, end - Date.now());
      const s = Math.ceil(remaining/1000);
      redeemTimer.textContent = `${s}s`;
      if(remaining <= 0){
        clearRedeemTimer();
        redeemFail();
      }
    }, 100);
  }

  function clearRedeemTimer(){ if(redeem.timerId){ clearInterval(redeem.timerId); redeem.timerId = null; } }

  function onRedeemAnswer(index){
    const q = redeem.q;
    if(!q) return;
    if(index === q.answerIndex){
      // success: continue without penalty
      clearRedeemTimer();
      hide(redeemModal);
      state.inRedeem = false; state.paused = false;
    }else{
      // wrong: allow retry until timer ends
      flashElement(redeemQuestion, '#ef4444');
    }
  }

  function redeemFail(){
    hide(redeemModal);
    state.inRedeem = false; state.paused = false;
    // penalty: respawn to checkpoint/start and reduce some score
    state.score = Math.max(0, state.score - 20);
    if(state.player){
      state.player.x = state.respawn.x || 40;
      state.player.y = state.respawn.y || (GROUND_Y - state.player.h);
      state.player.vx = 0; state.player.vy = 0; state.player.onGround = true;
    }
  }

  function renderQuiz(){
    const q = quiz.list[quiz.idx];
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
    clearQuizTimer();
    const q = quiz.list[quiz.idx];
    if(index === q.answerIndex){
      // correct
      state.score += quiz.hintUsed ? 35 : 50;
      quiz.correct += 1;
      nextQuizStep();
    }else{
      // try again
      flashElement(quizQuestion, '#ef4444');
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
      // Auto-advance: if next level exists, start it shortly; else go to World Select
      resultsContinueBtn.classList.add('hidden');
      show(resultsModal);
      setTimeout(()=>{
        hide(resultsModal);
        state.inQuiz = false; state.paused = false;
        if(state.level < 3){
          startGame(state.world, state.level + 1);
        }else{
          // World complete
          gotoWorldSelect();
        }
      }, 1200);
      return; // prevent showing modal twice
    }else{
      resultsText.textContent = `You got ${quiz.correct}/3. Try again to pass the gate!`;
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
    // Count as incorrect and move to next question
    flashElement(quizQuestion, '#ef4444');
    nextQuizStep();
  }

  // Helpers for time formatting
  function formatTime(seconds){
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s/60);
    const r = s%60;
    return `${m}:${r.toString().padStart(2,'0')}`;
  }

  // Wire up top-level buttons
  playBtn.addEventListener('click', ()=> gotoWorldSelect());
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
