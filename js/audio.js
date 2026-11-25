// Romantic Web Audio Synthesizer (Zero external dependencies, 100% offline & reliable)
class RomanticAudio {
    constructor() {
        this.ctx = null;
        this.isPlaying = false;
        this.tempo = 65; // BPM
        this.step = 0;
        this.timer = null;
        this.volume = 0.35;
        this.masterGain = null;

        // Romantic Chord Progression & Melody (C major / A minor dreamy vibe)
        // [Chord notes (Hz), Melody note (Hz)]
        this.sequence = [
            // Cmaj9
            { chord: [261.63, 329.63, 392.00, 493.88], melody: [523.25, 659.25, 783.99, 659.25] },
            // Em7
            { chord: [164.81, 246.94, 329.63, 392.00], melody: [659.25, 587.33, 493.88, 587.33] },
            // Am9
            { chord: [220.00, 261.63, 329.63, 440.00], melody: [440.00, 523.25, 659.25, 523.25] },
            // Fmaj7
            { chord: [174.61, 220.00, 261.63, 349.23], melody: [349.23, 440.00, 523.25, 440.00] },
            // Dm7
            { chord: [146.83, 220.00, 261.63, 349.23], melody: [440.00, 523.25, 587.33, 523.25] },
            // Gsus4 -> G
            { chord: [196.00, 261.63, 293.66, 392.00], melody: [587.33, 493.88, 440.00, 392.00] },
            // Cmaj7
            { chord: [261.63, 329.63, 392.00, 523.25], melody: [659.25, 783.99, 987.77, 783.99] },
            // Fmaj9
            { chord: [174.61, 261.63, 329.63, 392.00], melody: [523.25, 440.00, 392.00, 329.63] },
        ];
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

            // Simple warm lowpass filter for soft warm acoustic feel
            this.filter = this.ctx.createBiquadFilter();
            this.filter.type = 'lowpass';
            this.filter.frequency.setValueAtTime(1400, this.ctx.currentTime);

            // Delay / Reverb effect
            this.delay = this.ctx.createDelay();
            this.delay.delayTime.setValueAtTime(0.38, this.ctx.currentTime);
            this.feedback = this.ctx.createGain();
            this.feedback.gain.setValueAtTime(0.28, this.ctx.currentTime);

            this.delay.connect(this.feedback);
            this.feedback.connect(this.delay);

            this.filter.connect(this.masterGain);
            this.filter.connect(this.delay);
            this.delay.connect(this.masterGain);
            this.masterGain.connect(this.ctx.destination);
        }
    }

    playNote(freq, time, duration, isMelody = false) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = isMelody ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, time);

        // Gentle attack, long singing decay
        const attack = isMelody ? 0.04 : 0.08;
        const decay = duration * 0.9;
        const peakGain = isMelody ? 0.15 : 0.08;

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(peakGain, time + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);

        // Subtle harmonic overtone for celesta/music box sparkle
        if (isMelody) {
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(freq * 2, time);
            gain2.gain.setValueAtTime(0, time);
            gain2.gain.linearRampToValueAtTime(peakGain * 0.3, time + attack);
            gain2.gain.exponentialRampToValueAtTime(0.0001, time + attack + (decay * 0.6));
            osc2.connect(gain2);
            gain2.connect(this.filter);
            osc2.start(time);
            osc2.stop(time + attack + decay);
        }

        osc.connect(gain);
        gain.connect(this.filter);

        osc.start(time);
        osc.stop(time + attack + decay);
    }

    playMeasure() {
        if (!this.isPlaying || !this.ctx) return;
        const barIndex = Math.floor(this.step / 4) % this.sequence.length;
        const beatIndex = this.step % 4;
        const currentData = this.sequence[barIndex];
        const now = this.ctx.currentTime;
        const beatSec = 60 / this.tempo;

        // Play chord on the first beat of the measure, arpeggiated gently
        if (beatIndex === 0) {
            currentData.chord.forEach((freq, idx) => {
                this.playNote(freq, now + idx * 0.07, beatSec * 3.8, false);
            });
        }

        // Play melody note on each beat
        const melodyNote = currentData.melody[beatIndex];
        if (melodyNote) {
            this.playNote(melodyNote, now, beatSec * 1.5, true);
        }

        this.step++;
        this.timer = setTimeout(() => this.playMeasure(), beatSec * 1000);
    }

    toggle() {
        this.init();
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        if (this.isPlaying) {
            this.stop();
            return false;
        } else {
            this.start();
            return true;
        }
    }

    start() {
        this.isPlaying = true;
        this.step = 0;
        this.playMeasure();
    }

    stop() {
        this.isPlaying = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    setVolume(val) {
        this.volume = val;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(val, this.ctx.currentTime);
        }
    }

    playChime() {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
        notes.forEach((freq, i) => {
            this.playNote(freq, now + i * 0.12, 1.8, true);
        });
    }
}

window.romanticAudio = new RomanticAudio();
