'use strict';

// Knowledge Quest — Prototype (Vanilla JS)
// Screens: start -> worldSelect -> play -> quiz -> results
// World in MVP: Math Jungle

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

  const hud = document.getElementById('hud');
  const scoreVal = document.getElementById('scoreVal');
  const starsVal = document.getElementById('starsVal');
  const worldVal = document.getElementById('worldVal');
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

  const resultsModal = document.getElementById('resultsModal');
  const resultsText = document.getElementById('resultsText');
  const resultsContinueBtn = document.getElementById('resultsContinueBtn');

  // Constants
  const CANVAS_W = canvas.width;
  const CANVAS_H = canvas.height;
  const GROUND_Y = CANVAS_H - 60;

  const GRAVITY = 1500; // px/s^2
  const MOVE_SPEED = 280; // px/s
  const JUMP_VY = -560; // px/s

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
    score: 0,
    stars: 0,
    inQuiz: false,
    // gameplay
    player: null,
    coins: [],
    gate: null,
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
    const progress = load(KEYS.progress, { math:{ stagesUnlocked:1 }, science:{ stagesUnlocked:0 }, english:{ stagesUnlocked:0 }, social:{ stagesUnlocked:0 } });
    const scores = load(KEYS.scores, { math:0, science:0, english:0, social:0 });
    const seen = load(KEYS.questionsSeen, []);
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
    hide(worldSelectScreen); hide(canvas); hide(hud); hide(touchControls); hide(quizModal); hide(resultsModal);
    show(startScreen);
  }
  function gotoWorldSelect(){
    state.screen = 'worldSelect';
    hide(startScreen); hide(canvas); hide(hud); hide(touchControls); hide(quizModal); hide(resultsModal);
    show(worldSelectScreen);
  }

  // Gameplay
  function initLevel(world){
    state.world = world; state.score = 0; state.stars = 0; state.paused = false; state.inQuiz = false;
    worldVal.textContent = prettyWorld(world);
    // Player
    state.player = { x: 40, y: GROUND_Y-50, w: 40, h: 50, vx:0, vy:0, onGround:true };
    // Coins
    state.coins = [
      {x:160,y:GROUND_Y-80, r:10, got:false},
      {x:260,y:GROUND_Y-120, r:10, got:false},
      {x:420,y:GROUND_Y-60, r:10, got:false},
      {x:620,y:GROUND_Y-100, r:10, got:false},
      {x:760,y:GROUND_Y-80, r:10, got:false}
    ];
    // Gate
    state.gate = { x: 840, y: GROUND_Y-60, w: 40, h: 60, open:false };
  }

  function startGame(world){
    initLevel(world);
    state.screen = 'play';
    hide(startScreen); hide(worldSelectScreen); hide(resultsModal); hide(quizModal);
    show(canvas); show(hud); show(touchControls);
  }

  function prettyWorld(w){
    switch(w){ case 'math': return 'Math Jungle'; case 'science': return 'Science Desert'; case 'english': return 'English Castle'; case 'social': return 'Social City'; default: return '-'; }
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
    if(state.screen !== 'play' || state.paused || state.inQuiz) return; // stop updating when not playing
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

    // Gate trigger
    const g = state.gate;
    if(!g.open && p.x + p.w >= g.x){
      openQuiz();
    }

    // HUD
    scoreVal.textContent = String(state.score);
    starsVal.textContent = String(state.stars);
  }

  function render(){
    ctx.clearRect(0,0,CANVAS_W,CANVAS_H);
    // Background (simple sky gradient simulated by CSS background on canvas)

    // Ground
    ctx.fillStyle = '#065f46';
    ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

    // Coins
    for(const c of state.coins){
      if(c.got) continue;
      ctx.beginPath(); ctx.fillStyle = '#f59e0b'; ctx.arc(c.x, c.y, c.r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2; ctx.stroke();
    }

    // Gate
    const g = state.gate;
    ctx.fillStyle = g.open ? '#22c55e' : '#4338ca';
    ctx.fillRect(g.x, g.y, g.w, g.h);

    // Player
    const p = state.player;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }

  // Quiz system
  let quiz = { list:[], idx:0, correct:0, hintUsed:false };

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
  }

  function onAnswer(index){
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
    hide(quizModal);
    const pass = quiz.correct >= 2;
    const progress = load(KEYS.progress, {});
    if(pass){
      resultsText.textContent = `Great! You answered ${quiz.correct}/3 correctly. Gate opens! +100 bonus`;
      state.score += 100; // end-of-stage bonus for passing
      // unlock next stage in math (simple demo)
      if(state.world==='math') progress.math.stagesUnlocked = Math.max(2, progress.math.stagesUnlocked||1);
      save(KEYS.progress, progress);
      // update high score
      const scores = load(KEYS.scores, {});
      scores.math = Math.max(scores.math||0, state.score);
      save(KEYS.scores, scores);
    }else{
      resultsText.textContent = `You got ${quiz.correct}/3. Try again to pass the gate!`;
    }
    show(resultsModal);
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

  // Wire up top-level buttons
  playBtn.addEventListener('click', ()=> gotoWorldSelect());
  backToStart.addEventListener('click', ()=> gotoStart());
  btnWorldMath.addEventListener('click', ()=>{ worldVal.textContent = 'Math Jungle'; startGame('math'); });
  btnWorldScience.addEventListener('click', ()=>{});
  btnWorldEnglish.addEventListener('click', ()=>{});
  btnWorldSocial.addEventListener('click', ()=>{});

  // Init
  (async function init(){
    ensureDefaults();
    await loadQuestionBank();
    gotoStart();
    // show a11y: ensure focus ring visible on tab
    document.body.addEventListener('keydown', (e)=>{ if(e.key==='Tab') document.body.classList.add('kbd'); }, { once:true });
  })();

})();
