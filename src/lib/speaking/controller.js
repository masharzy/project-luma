const $ = id => document.getElementById(id);
const S = ROOM.steps;
const stage = $('stage');
const answers = new Map();
const downloadUrls = [];
const timings = ROOM.questions.timing || {};
const mockServerOffset = ROOM.mockServerNow ? ROOM.mockServerNow - Date.now() : 0;
const speakingNow = () => Date.now() + mockServerOffset;
const fmt = n => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
const player = new Audio();
const bars = [...stage.querySelectorAll('.wave i')];
let phase = 'welcome', generation = 0, si = 0, part = S[0]?.p;
let voiceTimer, prepTimer, timer, practiceInterval, toastTimer;
let recorder, stream, recorded = [], seconds = 0, clipUrl = '';
let context, examinerAnalyser, micSource, frame;
let practiceDeadline = 0, deadlineExpired = false;
let currentCard;

function action(label) { $('main-action').textContent = label; }
function notify(text) {
 $('toast').textContent = text;
 $('toast').hidden = false;
 clearTimeout(toastTimer);
 toastTimer = setTimeout(() => { $('toast').hidden = true; }, 5500);
}
function status(title, detail, roomStatus = title) {
 $('status-title').textContent = title;
 $('status-detail').textContent = detail;
 $('room-status').textContent = roomStatus;
}
function wakeAudio() {
 try {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!context && AudioContext) context = new AudioContext();
  if (context?.state === 'suspended') void context.resume().catch(() => {});
 } catch {}
}
function stopWave() {
 cancelAnimationFrame(frame);
 bars.forEach(bar => bar.style.removeProperty('transform'));
 stage.classList.remove('voice-fallback');
}
function showWave(analyser, active) {
 stopWave();
 if (!analyser) { stage.classList.add('voice-fallback'); return; }
 const data = new Uint8Array(analyser.frequencyBinCount);
 const draw = () => {
  if (!active()) return;
  analyser.getByteFrequencyData(data);
  bars.forEach((bar, i) => {
   const level = Math.max(.10, Math.min(1, data[2 + i * 2] / 200));
   bar.style.transform = 'scaleY(' + level + ')';
  });
  frame = requestAnimationFrame(draw);
 };
 frame = requestAnimationFrame(draw);
}
function stopSpeech() {
 generation++;
 clearTimeout(voiceTimer);
 player.onplaying = player.onended = player.onerror = null;
 player.pause();
 player.removeAttribute('src');
 player.load();
 stage.classList.remove('is-speaking');
 stopWave();
}
function speak(step, done) {
 stopSpeech();
 const token = generation;
 phase = 'speaking';
 $('main-action').disabled = true;
 $('replay').disabled = true;
 $('skip').hidden = true;
 action('Listen…');
 status('Listen to the examiner', 'Your microphone is off.', 'Loading examiner audio…');
 const finishVoice = (message) => {
  if (generation !== token) return;
  stopSpeech();
  if (message) notify(message);
  done();
 };
 player.onplaying = () => {
  if (generation !== token) return;
  clearTimeout(voiceTimer);
  stage.classList.add('is-speaking');
  $('room-status').textContent = 'Examiner speaking';
  if (!examinerAnalyser && context?.state === 'running') {
   try {
    const source = context.createMediaElementSource(player);
    examinerAnalyser = context.createAnalyser();
    examinerAnalyser.fftSize = 128;
    source.connect(examinerAnalyser);
    examinerAnalyser.connect(context.destination);
   } catch {}
  }
  showWave(examinerAnalyser, () => generation === token && !player.paused);
 };
 const failed = () => finishVoice('Examiner audio is unavailable. Read the question or try replay.');
 player.onerror = failed;
 player.onended = () => finishVoice();
 voiceTimer = setTimeout(failed, 45000);
 player.src = '/api/speaking/voice?' + new URLSearchParams({ test: ROOM.testId, step: String(step), examiner: 'male' });
 void player.play().catch(failed);
}
function showPreparation(cardOpen, notesOpen) {
 $('paper-overlay').hidden = !cardOpen;
 $('notes-panel').hidden = !notesOpen;
 $('preparation').hidden = !cardOpen && !notesOpen;
 $('desk-card').setAttribute('aria-expanded', String(cardOpen));
 $('desk-notes').setAttribute('aria-expanded', String(notesOpen));
}
function loadCard() {
 const source = ROOM.questions.sourceParts?.find((entry, i) => (entry.part ?? i + 1) === part);
 if (source) {
  const upcoming = S.slice(si).find(s => s.p === part && s.long);
  return source.questions.find(q => q.taskCard && q.text === upcoming?.q) || null;
 }
 return part === 2 ? ROOM.questions.cueCard : null;
}
function renderCard(card) {
 $('cue-title').textContent = card.topic ?? card.paragraphs[0];
 const details = $('cue-details');
 details.replaceChildren();
 const paragraph = value => { const p = document.createElement('p'); p.textContent = value; details.append(p); };
 if (card.points) {
  paragraph('You should say:');
  const list = document.createElement('ul');
  for (const point of card.points) { const li = document.createElement('li'); li.textContent = point; list.append(li); }
  details.append(list);
  paragraph(card.explain);
 } else {
  for (const value of card.paragraphs.slice(1)) paragraph(value);
  for (const src of card.images || []) {
   const img = document.createElement('img');
   img.src = src;
   img.alt = 'Cue card reference';
   img.className = 'source-card-image';
   details.append(img);
  }
 }
}
function updatePart() {
 document.querySelectorAll('[data-part]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.part) === part)));
 const card = loadCard();
 if (card !== currentCard) {
  currentCard = card;
  $('room-tools').hidden = $('desk-card').hidden = $('desk-notes').hidden = true;
  $('prep-clock').textContent = '';
  showPreparation(false, false);
  if (card) renderCard(card);
 }
}
function revealTools() {
 if (!currentCard) return;
 $('room-tools').hidden = $('desk-card').hidden = $('desk-notes').hidden = false;
}
function advance() { si++; runStep(); }
function prep() {
 phase = 'preparing';
 revealTools();
 showPreparation(true, true);
 const deadline = Date.now() + (timings.preparationSeconds ?? 60) * 1000;
 $('question-meta').textContent = 'Part ' + part + ' · Preparation';
 $('question').textContent = 'Read your cue card and make a few notes.';
 $('main-action').disabled = false;
 action('Ready to speak');
 status('Preparation time', 'Use your notes to plan your answer.');
 function tick() {
  const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  $('prep-clock').textContent = fmt(left);
  if (!left) endPrep();
 }
 clearInterval(prepTimer);
 prepTimer = setInterval(tick, 250);
 tick();
}
function endPrep() {
 clearInterval(prepTimer);
 $('prep-clock').textContent = '';
 advance();
}
function ready() {
 phase = 'ready';
 const cap = S[si]?.long ? timings.longTurnSeconds ?? 120 : timings.shortAnswerSeconds ?? 90;
 status('Your turn', 'You can record up to ' + cap + ' seconds.', 'Examiner listening');
 $('replay').disabled = false;
 $('skip').hidden = !!S[si]?.long;
 $('main-action').disabled = false;
 action('Record answer');
}
function after(step) {
 if (step.t === 'ask') { ready(); return; }
 if (step.t === 'end') { finish(); return; }
 if (step.t === 'say' || step.t === 'deal') { advance(); return; }
 phase = 'confirm';
 status('Ready to continue?', 'Your microphone is off.');
 $('main-action').disabled = false;
 $('replay').disabled = false;
 action(step.btn || 'Continue');
}
function runStep() {
 const step = S[si];
 if (!step) { finish(); return; }
 startPracticeClock();
 part = step.p;
 updatePart();
 $('tp').style.width = (si / S.length * 100) + '%';
 if (step.t === 'prep') { prep(); return; }
 if (step.long) revealTools();
 const number = S.slice(0, si + 1).filter(s => s.p === part && s.t === 'ask').length;
 $('question-meta').textContent = step.m || (step.t === 'ask' ? 'Part ' + part + ' · Question ' + number : 'Your examiner');
 $('question').textContent = step.q || step.say || '';
 if (step.t === 'deal' && currentCard) {
  revealTools();
  showPreparation(step.what === 'desk-card' || !$('paper-overlay').hidden, step.what === 'desk-notes' || !$('notes-panel').hidden);
 }
 if (step.say) speak(si, () => after(step)); else after(step);
}
function releaseMedia() {
 if (recorder && recorder.state !== 'inactive') {
  recorder.onstop = null;
  recorder.stop();
 }
 stream?.getTracks().forEach(track => track.stop());
 stream = null;
 recorder = null;
 clearInterval(timer);
 micSource?.disconnect();
 micSource = null;
 stage.classList.remove('is-recording');
 stopWave();
}
function resetClip() {
 const playback = $('playback');
 playback.pause();
 playback.removeAttribute('src');
 if (clipUrl) URL.revokeObjectURL(clipUrl);
 clipUrl = '';
 $('review').hidden = true;
 recorded = [];
 seconds = 0;
}
function keepCurrentAnswer() {
 if (recorded.length) answers.set(si, {
  blob: new Blob(recorded, { type: recorder?.mimeType || 'audio/webm' }),
  notes: $('notes').value,
  seconds,
 });
}
function updateSavedCount() {
 const count = new Set([...(ROOM.savedSteps || []), ...answers.keys()]).size;
 $('saved-count').textContent = count ? count + ' saved ' + (count === 1 ? 'answer' : 'answers') : '';
}
function next(save = true) {
 if (save && phase !== 'review') return;
 if (save) keepCurrentAnswer();
 resetClip();
 updateSavedCount();
 advance();
}
function stopRecording() {
 if (recorder?.state !== 'recording') return;
 clearInterval(timer);
 phase = 'processing';
 $('main-action').disabled = true;
 recorder.stop();
 stream?.getTracks().forEach(track => track.stop());
 stream = null;
 micSource?.disconnect();
 micSource = null;
 stage.classList.remove('is-recording');
 stopWave();
}
async function record() {
 if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
  notify('Microphone recording needs a supported browser on HTTPS.');
  return;
 }
 const token = generation;
 phase = 'requesting';
 $('main-action').disabled = true;
 $('replay').disabled = true;
 $('skip').hidden = true;
 try {
  const input = await navigator.mediaDevices.getUserMedia({ audio: true });
  if (token !== generation) { input.getTracks().forEach(track => track.stop()); return; }
  stream = input;
  recorder = new MediaRecorder(input, { audioBitsPerSecond: 64000 });
  recorded = [];
  recorder.ondataavailable = event => { if (event.data.size) recorded.push(event.data); };
  recorder.onstop = () => {
   if (token !== generation) return;
   if (deadlineExpired) { keepCurrentAnswer(); finish(); return; }
   if (!recorded.length) { notify('No recording was captured. Try again.'); ready(); return; }
   clipUrl = URL.createObjectURL(new Blob(recorded, { type: recorder.mimeType || 'audio/webm' }));
   $('playback').src = clipUrl;
   $('review').hidden = false;
   phase = 'review';
   status('Review your answer', fmt(seconds) + ' recorded. Listen back or retake it.');
   $('main-action').disabled = false;
   action('Save & continue');
  };
  recorder.start();
  seconds = 0;
  phase = 'recording';
  stage.classList.add('is-recording');
  let analyser;
  if (context?.state === 'running') {
   try {
    analyser = context.createAnalyser();
    analyser.fftSize = 128;
    micSource = context.createMediaStreamSource(input);
    micSource.connect(analyser);
   } catch {}
  }
  showWave(analyser, () => phase === 'recording');
  status('Recording answer', '00:00 · Recording', 'Examiner listening');
  $('main-action').disabled = false;
  action('Stop recording');
  const cap = S[si]?.long ? timings.longTurnSeconds ?? 120 : timings.shortAnswerSeconds ?? 90;
  const started = Date.now();
  timer = setInterval(() => {
   seconds = Math.floor((Date.now() - started) / 1000);
   $('status-detail').textContent = fmt(seconds) + ' / ' + fmt(cap) + ' · Recording';
   if (S[si]?.long) $('prep-clock').textContent = fmt(Math.max(0, cap - seconds));
   if (seconds >= cap) stopRecording();
  }, 250);
 } catch (error) {
  if (token !== generation) return;
  releaseMedia();
  ready();
  notify(error.name === 'NotAllowedError' ? 'Allow microphone access in your browser, then try again.' : 'The microphone could not start. Try again.');
 }
}
function stopPracticeClock(reset = false) {
 clearInterval(practiceInterval);
 practiceInterval = null;
 if (reset) {
  deadlineExpired = false;
  practiceDeadline = 0;
  $('room-clock').textContent = fmt((ROOM.durationMinutes || 15) * 60);
 }
}
function startPracticeClock() {
 if (ROOM.mockUntimed || practiceInterval || deadlineExpired || phase === 'complete') return;
 practiceDeadline = ROOM.mockDeadline || speakingNow() + (ROOM.durationMinutes || 15) * 60000;
 const tick = () => {
  const left = Math.max(0, Math.ceil((practiceDeadline - speakingNow()) / 1000));
  $('room-clock').textContent = fmt(left);
  if (left) return;
  deadlineExpired = true;
  stopPracticeClock();
  clearInterval(prepTimer);
  notify('Speaking time has ended. Your recorded answers are ready to review.');
  if (recorder?.state === 'recording') { stopRecording(); return; }
  if (phase === 'processing' || phase === 'uploading') return;
  stopSpeech();
  keepCurrentAnswer();
  finish();
 };
 practiceInterval = setInterval(tick, 1000);
}
function finish() {
 stopPracticeClock();
 phase = 'complete';
 $('tp').style.width = '100%';
 $('complete').hidden = false;
 $('complete-text').textContent = 'Submit your saved recordings for feedback.';
 $('main-action').disabled = $('replay').disabled = true;
 $('skip').hidden = true;
 action('Complete');
 const downloads = $('answer-downloads');
 downloads.replaceChildren();
 for (const [step, answer] of answers) {
  if (!answer.blob?.size) continue;
  const link = document.createElement('a');
  const url = URL.createObjectURL(answer.blob);
  downloadUrls.push(url);
  link.href = url;
  link.download = 'speaking-part-' + S[step].p + '-answer-' + step + (answer.blob.type.includes('mp4') ? '.m4a' : '.webm');
  link.textContent = 'Part ' + S[step].p + ' · Download answer';
  downloads.append(link);
 }
 $('restart').focus();
}
function selectPart(value) {
 if (phase === 'uploading' || deadlineExpired || ROOM.mockAttemptId) return;
 if (phase === 'recording' && !confirm('Discard the current recording and change part?')) return;
 const step = S.findIndex(item => item.p === value);
 if (step < 0) return;
 wakeAudio();
 stopSpeech();
 releaseMedia();
 resetClip();
 clearInterval(prepTimer);
 showPreparation(false, false);
 currentCard = undefined;
 si = step;
 runStep();
}
const parts = [...new Set(S.map(step => step.p))];
for (const value of parts) {
 const button = document.createElement('button');
 button.type = 'button';
 button.className = 'part-tab';
 button.dataset.part = value;
 button.textContent = 'Part ' + value;
 button.disabled = !!ROOM.mockAttemptId;
 button.onclick = () => selectPart(value);
 document.querySelector('.part-tabs').append(button);
}
$('main-action').onclick = () => {
 wakeAudio();
 if (phase === 'welcome') runStep();
 else if (phase === 'confirm') advance();
 else if (phase === 'preparing') endPrep();
 else if (phase === 'ready') void record();
 else if (phase === 'recording') stopRecording();
 else if (phase === 'review') void next();
};
$('replay').onclick = () => {
 const step = S[si];
 if (step?.say && (phase === 'ready' || phase === 'confirm')) {
  wakeAudio();
  speak(si, () => after(step));
 }
};
$('skip').onclick = () => next(false);
$('retake').onclick = () => { resetClip(); ready(); };
$('desk-card').onclick = () => showPreparation($('paper-overlay').hidden, !$('notes-panel').hidden);
$('desk-notes').onclick = () => showPreparation(!$('paper-overlay').hidden, $('notes-panel').hidden);
$('close-paper').onclick = () => { showPreparation(false, !$('notes-panel').hidden); $('desk-card').focus(); };
$('close-notes').onclick = () => { showPreparation(!$('paper-overlay').hidden, false); $('desk-notes').focus(); };
$('restart').hidden = !!ROOM.mockAttemptId;
$('restart').onclick = () => {
 stopSpeech();
 releaseMedia();
 resetClip();
 stopPracticeClock(true);
 clearInterval(prepTimer);
 answers.clear();
 downloadUrls.splice(0).forEach(URL.revokeObjectURL);
 $('notes').value = '';
 $('complete').hidden = true;
 $('tp').style.width = '0';
 showPreparation(false, false);
 currentCard = undefined;
 si = 0;
 part = S[0]?.p;
 phase = 'welcome';
 updatePart();
 updateSavedCount();
 $('question-meta').textContent = 'Your examiner';
 $('question').textContent = 'Listen to each question, then record your answer.';
 status('Start the interview', 'Your microphone turns on when you record.', 'Ready when you are.');
 $('main-action').disabled = false;
 action('Start speaking test');
 $('main-action').focus();
};
window.addEventListener('pagehide', () => {
 stopSpeech();
 releaseMedia();
 resetClip();
 clearInterval(prepTimer);
 stopPracticeClock();
 downloadUrls.forEach(URL.revokeObjectURL);
});
$('room-clock').hidden = !!ROOM.mockUntimed;
$('room-clock').textContent = fmt((ROOM.durationMinutes || 15) * 60);
updatePart();
updateSavedCount();
if (ROOM.mockDeadline) startPracticeClock();
window.LumaSpeaking = {
 mode: ROOM.mode,
 get steps() { return S; },
 get phase() { return phase; },
 get answerCount() { return answers.size; },
 get remainingSeconds() { return practiceDeadline ? Math.max(0, Math.ceil((practiceDeadline - speakingNow()) / 1000)) : (ROOM.durationMinutes || 15) * 60; },
};
