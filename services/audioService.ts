
const SFX_URLS = {
  correct: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  wrong: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  tick: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  // Nova dinamična sportska muzika
  bg: 'https://assets.mixkit.co/music/preview/mixkit-sports-highlights-51.mp3' 
};

class AudioService {
  private sfx: Record<string, HTMLAudioElement> = {};
  private bgMusic: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private hasStarted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.sfx.correct = new Audio(SFX_URLS.correct);
      this.sfx.wrong = new Audio(SFX_URLS.wrong);
      this.sfx.tick = new Audio(SFX_URLS.tick);
      
      this.bgMusic = new Audio(SFX_URLS.bg);
      this.bgMusic.loop = true;
      this.bgMusic.volume = 0.15; // Blago pojačan volumen muzike
    }
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.bgMusic) {
      if (muted) {
        this.bgMusic.pause();
      } else if (this.hasStarted) {
        this.bgMusic.play().catch(e => console.debug('Resume blocked:', e));
      }
    }
  }

  playSfx(type: 'correct' | 'wrong' | 'tick', volume: number = 0.3) {
    if (this.isMuted) return;
    const audio = this.sfx[type];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = volume;
      audio.play().catch(err => console.debug('SFX blocked:', err));
    }
  }

  stopSfx(type: 'correct' | 'wrong' | 'tick') {
    const audio = this.sfx[type];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  setBgMusic(playing: boolean) {
    if (!this.bgMusic) return;
    if (playing && !this.isMuted) {
      this.hasStarted = true;
      this.bgMusic.play().catch(err => {
        console.debug('BG Music blocked:', err);
      });
    } else {
      this.bgMusic.pause();
    }
  }
}

export const audioService = new AudioService();
