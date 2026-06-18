export const audioState = {
    audioBuffer: null as AudioBuffer | null,
    playStartTime: 0,
    pausedAt: 0,
    isPlaying: false,
    currentWavBlob: null as Blob | null,
    activeAudioUrl: null as string | null,
    visualizerAnimationId: null as any | null
};

export const AudioMemoryRegistry = {
    activeBlobs: new Set<string>(),
    register(blob: Blob): string {
        const url = URL.createObjectURL(blob);
        this.activeBlobs.add(url);
        return url;
    },
    revoke(url: string | null): void {
        if (url && this.activeBlobs.has(url)) {
            URL.revokeObjectURL(url);
            this.activeBlobs.delete(url);
        }
    },
    revokeAll(): void {
        this.activeBlobs.forEach(url => {
            try { URL.revokeObjectURL(url); } catch (e) {}
        });
        this.activeBlobs.clear();
    }
};

export function pcmToWav(pcm16: Int16Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + pcm16.length * 2);
    const view = new DataView(buffer);

    function writeString(viewObj: DataView, offset: number, stringVal: string) {
        for (let i = 0; i < stringVal.length; i++) {
            viewObj.setUint8(offset + i, stringVal.charCodeAt(i));
        }
    }

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcm16.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, pcm16.length * 2, true);

    for (let i = 0; i < pcm16.length; i++) {
        view.setInt16(44 + i * 2, pcm16[i], true);
    }

    return new Blob([view], { type: 'audio/wav' });
}

export function responseToWavBuffer(blob: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
    });
}

function formatTime(seconds: number): string {
    if (isNaN(seconds)) return "00:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export const AudioEngine: any = {
    ctx: null,
    gainNode: null,
    analyser: null,
    source: null,
    buffer: null,

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (!this.analyser) {
            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 256;
        }
        if (!this.gainNode) {
            this.gainNode = this.ctx.createGain();
            const volEl = document.getElementById('volumeControl') as HTMLInputElement;
            const currentVol = volEl ? parseFloat(volEl.value) : 1;
            this.gainNode.gain.setValueAtTime(currentVol, this.ctx.currentTime);
            
            this.analyser.connect(this.gainNode);
            this.gainNode.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch((e: any) => console.warn("AudioContext resume rejected:", e));
        }
    },

    play(audioBufferData: AudioBuffer, offset = 0, onendedCallback?: () => void) {
        this.init();
        this.stopSourceOnly();

        this.buffer = audioBufferData;
        audioState.audioBuffer = audioBufferData;
        this.source = this.ctx.createBufferSource();
        this.source.buffer = audioBufferData;

        this.source.connect(this.analyser);

        if (offset >= audioBufferData.duration) offset = 0;
        this.source.start(0, offset);
        audioState.playStartTime = this.ctx.currentTime - offset;
        audioState.isPlaying = true;

        document.getElementById('playIcon')?.classList.add('hidden');
        document.getElementById('pauseIcon')?.classList.remove('hidden');

        this.source.onended = () => {
            if (audioState.isPlaying) {
                audioState.isPlaying = false;
                audioState.pausedAt = 0;
                document.getElementById('playIcon')?.classList.remove('hidden');
                document.getElementById('pauseIcon')?.classList.add('hidden');
                const curTimeEl = document.getElementById('currentTime');
                if (curTimeEl) curTimeEl.innerText = formatTime(audioBufferData.duration);
                if (audioState.visualizerAnimationId) {
                    cancelAnimationFrame(audioState.visualizerAnimationId);
                    audioState.visualizerAnimationId = null;
                }
                const canvasEl = document.getElementById('canvasVisualizer') as HTMLCanvasElement;
                if (canvasEl) {
                    const ctx = canvasEl.getContext('2d');
                    if (ctx) {
                        ctx.fillStyle = '#040507';
                        ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
                    }
                }
                if (onendedCallback) onendedCallback();
            }
        };
    },

    stopSourceOnly() {
        if (this.source) {
            try { this.source.stop(); } catch (e) {}
            this.source.disconnect();
            this.source = null;
        }
    },

    stop() {
        this.stopSourceOnly();
        audioState.isPlaying = false;
        document.getElementById('playIcon')?.classList.remove('hidden');
        document.getElementById('pauseIcon')?.classList.add('hidden');
        if (audioState.visualizerAnimationId) {
            cancelAnimationFrame(audioState.visualizerAnimationId);
            audioState.visualizerAnimationId = null;
        }
        const canvasEl = document.getElementById('canvasVisualizer') as HTMLCanvasElement;
        if (canvasEl) {
            const ctx = canvasEl.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#040507';
                ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
            }
        }
    }
};
