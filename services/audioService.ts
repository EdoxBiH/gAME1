
const SFX_URLS = {
  correct: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3', // Bright chime
  wrong: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',   // Low buzzer
  tick: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',    // Sharp tick
  timesUp: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3',   // Alarm
  playAgain: 'https://assets.mixkit.co/active_storage/sfx/2021/2021-preview.mp3', // High energy transition
  exit: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',      // Neutral pop
  click: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'     // Snappy UI click
};

type SfxType = keyof typeof SFX_URLS;

class AudioService {
  private sfx: Record<string, HTMLAudioElement> = {};
  private isMuted: boolean = false;
  private activeSounds: Set<HTMLAudioElement> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      Object.entries(SFX_URLS).forEach(([key, url]) => {
        const audio = new Audio(url);
        audio.addEventListener('ended', () => this.activeSounds.delete(audio));
        this.sfx[key] = audio;
      });
    }
  }

  unlock() {
    if (typeof window !== 'undefined') {
      Object.values(this.sfx).forEach(audio => {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            audio.pause();
            audio.currentTime = 0;
          }).catch(err => console.debug('Audio unlock skipped:', err));
        }
      });
    }
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted) this.stopAll();
  }

  stopAll() {
    this.activeSounds.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.activeSounds.clear();
  }

  playSfx(type: SfxType | string, volume: number = 0.3, interruptAll: boolean = false) {
    if (this.isMuted) return;
    
    if (interruptAll) {
      this.stopAll();
    }

    const audio = this.sfx[type];
    if (audio) {
      // If playing same sound, reset it
      audio.pause();
      audio.currentTime = 0;
      audio.volume = volume;
      
      this.activeSounds.add(audio);
      audio.play().catch(err => {
        console.debug('SFX blocked:', err);
        this.activeSounds.delete(audio);
      });
    }
  }

  stopSfx(type: SfxType | string) {
    const audio = this.sfx[type];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      this.activeSounds.delete(audio);
    }
  }

  setBgMusic(playing: boolean) {
    // Background music is currently disabled as per previous requests
  }
}

export const audioService = new AudioService();
