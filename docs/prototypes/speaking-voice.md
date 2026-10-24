# Speaking preview voice

The standalone speaking-room HTML embeds ten MP3 clips generated with the same en-GB-RyanNeural voice, at -8% rate. It does not use browser/OS speech synthesis. The clips cover the introduction, Parts 1–3 questions, Part 2 instructions and replay. Playback starts from a user action; recording remains disabled until the current clip ends. Changing part pauses the previous clip.

No API key, runtime TTS call or external audio URL is embedded. The HTML can play its voice offline after download. The audio is for the UI prototype; a production TTS provider and its commercial terms still need to be selected for bulk generation. This change does not implement AI evaluation or upload recordings.
