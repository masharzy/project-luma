'use client';
import { useState } from 'react';
import { Check, Volume2, Mic, Wifi } from 'lucide-react';
type State = 'idle' | 'ok' | 'error';
/** Device checks while waiting. They unlock audio playback (so Listening can start at once) and confirm the microphone. */
export function MockPreflight({ hasListening, hasSpeaking, online }: { hasListening: boolean; hasSpeaking: boolean; online: boolean }) {
  const [sound, setSound] = useState<'idle' | 'played' | 'ok'>('idle');
  const [mic, setMic] = useState<State>('idle');
  const [micMsg, setMicMsg] = useState('');
  function playTone() {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.frequency.value = 523; gain.gain.value = 0.12;
      osc.connect(gain); gain.connect(ctx.destination); osc.start();
      setTimeout(() => { osc.stop(); void ctx.close(); setSound('played'); }, 600);
    } catch { setSound('idle'); }
  }
  async function checkMic() {
    setMicMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMic('ok');
    } catch { setMic('error'); setMicMsg('Allow microphone access in your browser, then try again.'); }
  }
  const row = (done: boolean, Icon: typeof Wifi, title: string, body: React.ReactNode) => (
    <li className={done ? 'is-done' : ''}><span className="mkr-check" aria-hidden>{done ? <Check size={14} /> : <Icon size={14} />}</span><div><strong>{title}</strong>{body}</div></li>
  );
  return <section className="mkr-preflight" aria-labelledby="mkr-pre-h">
    <h2 id="mkr-pre-h">Check your setup</h2>
    <ul>
      {row(online, Wifi, 'Connection', <small>{online ? 'Connected. Your clock is synced with the exam server.' : 'Connection lost. Reconnecting…'}</small>)}
      {hasListening && row(sound === 'ok', Volume2, 'Sound', <>
        <small>Listening audio starts by itself when the exam begins. You cannot pause or rewind it.</small>
        {sound === 'idle' && <button type="button" onClick={playTone}>Play test sound</button>}
        {sound === 'played' && <span className="mkr-pre-actions"><button type="button" onClick={() => setSound('ok')}>I heard it</button><button type="button" className="is-quiet" onClick={playTone}>Play again</button></span>}
      </>)}
      {hasSpeaking && row(mic === 'ok', Mic, 'Microphone', <>
        <small>Needed for the Speaking module.</small>
        {mic !== 'ok' && <button type="button" onClick={() => void checkMic()}>Check microphone</button>}
        {micMsg && <small role="alert" className="mkr-pre-error">{micMsg}</small>}
      </>)}
    </ul>
  </section>;
}
