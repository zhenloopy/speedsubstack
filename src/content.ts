console.log('[SpeedSubstack] Initializing on:', window.location.href);

import { waitForArticle } from './utils/substack-detector';
import { extractArticleContent, getParagraphStart, type ExtractionResult, type ExtractedWord } from './parser/article-extractor';
import { loadSettings, onSettingsChange, type Settings } from './storage/settings';
import { loadProgress, saveProgress, cleanupOldProgress } from './storage/progress';
import { Overlay } from './ui/overlay';
import { Controls } from './ui/controls';
import { WpmSlider } from './ui/wpm-slider';
import { StartButton } from './ui/start-button';
import { Highlighter } from './ui/highlighter';
import { ScrollController } from './ui/scroll-controller';
import { TimingController } from './engine/timing-controller';
import { StateMachine, type ReaderState } from './engine/state-machine';
import { KeyboardHandler } from './engine/keyboard-handler';
import { calculateSkipWords } from './engine/navigation';

class SpeedSubstackApp {
  private extractionResult: ExtractionResult | null = null;
  private articleContainer: HTMLElement | null = null;
  private settings: Settings = { wpm: 300, activationMode: 'manual', fontSize: 64 };

  private overlay: Overlay;
  private controls: Controls;
  private wpmSlider: WpmSlider;
  private startButton: StartButton;
  private highlighter: Highlighter;
  private scrollController: ScrollController;
  private timingController: TimingController;
  private stateMachine: StateMachine;
  private keyboardHandler: KeyboardHandler;

  private unsubscribeSettings: (() => void) | null = null;
  private autoPlayTimer: number | null = null;
  
  // Store bound handlers for cleanup
  private boundCloseHandler: (() => void) | null = null;
  private boundVisibilityHandler: (() => void) | null = null;
  private boundBeforeUnloadHandler: (() => void) | null = null;
  private wasPlayingBeforeHidden = false;

  constructor() {
    this.stateMachine = new StateMachine();

    this.timingController = new TimingController(this.settings.wpm, {
      onWordChange: this.handleWordChange.bind(this),
      onComplete: this.handleComplete.bind(this),
      onProgress: this.handleProgress.bind(this),
    });

    this.overlay = new Overlay();

    this.controls = new Controls({
      onPlayPause: this.togglePlayPause.bind(this),
      onSeek: this.handleSeek.bind(this),
      onRewind: this.handleRewind.bind(this),
      onForward: this.handleForward.bind(this),
    });

    this.wpmSlider = new WpmSlider(this.settings.wpm, {
      onChange: this.handleWpmChange.bind(this),
    });

    this.startButton = new StartButton({
      onStart: this.startReading.bind(this),
    });

    this.highlighter = new Highlighter();

    this.scrollController = new ScrollController({
      onScrollToArticle: this.handleScrollToArticle.bind(this),
      onScrollToReader: this.handleScrollToReader.bind(this),
    });

    this.keyboardHandler = new KeyboardHandler({
      onPlayPause: this.togglePlayPause.bind(this),
      onSkipForward: this.handleForward.bind(this),
      onSkipBackward: this.handleRewind.bind(this),
      onIncreaseWpm: () => this.wpmSlider.increaseWpm(),
      onDecreaseWpm: () => this.wpmSlider.decreaseWpm(),
      onClose: this.closeReader.bind(this),
    });

    this.stateMachine.onStateChange(this.handleStateChange.bind(this));
    
    // Setup lifecycle handlers
    this.setupLifecycleHandlers();
  }

  private setupLifecycleHandlers(): void {
    // Pause when tab becomes hidden, resume when visible
    this.boundVisibilityHandler = () => {
      if (document.hidden) {
        this.wasPlayingBeforeHidden = this.timingController.getIsPlaying();
        if (this.wasPlayingBeforeHidden) {
          this.timingController.pause();
          this.stateMachine.pauseReading();
          this.controls.setPlaying(false);
        }
      } else {
        // Resume if was playing before
        if (this.wasPlayingBeforeHidden && this.stateMachine.getState() === 'paused') {
          this.timingController.play();
          this.stateMachine.startReading();
          this.controls.setPlaying(true);
        }
      }
    };
    document.addEventListener('visibilitychange', this.boundVisibilityHandler);

    // Cleanup on page unload
    this.boundBeforeUnloadHandler = () => this.destroy();
    window.addEventListener('beforeunload', this.boundBeforeUnloadHandler);
  }

  async init(): Promise<void> {
    this.settings = await loadSettings();
    this.timingController.setWpm(this.settings.wpm);
    this.overlay.setFontSize(this.settings.fontSize);

    this.unsubscribeSettings = onSettingsChange((changes) => {
      if (changes.wpm !== undefined) {
        this.settings.wpm = changes.wpm;
        this.wpmSlider.setWpm(changes.wpm);
        this.timingController.setWpm(changes.wpm);
      }
      if (changes.activationMode !== undefined) {
        this.settings.activationMode = changes.activationMode;
      }
      if (changes.fontSize !== undefined) {
        this.settings.fontSize = changes.fontSize;
        this.overlay.setFontSize(changes.fontSize);
      }
    });

    const detection = await waitForArticle();

    if (!detection.isArticle || !detection.articleContainer) {
      console.log('[SpeedSubstack] Not an article page');
      return;
    }

    console.log('[SpeedSubstack] Article detected');
    this.articleContainer = detection.articleContainer;

    this.extractionResult = extractArticleContent(this.articleContainer);

    if (this.extractionResult.totalWords === 0) {
      console.log('[SpeedSubstack] No words extracted');
      return;
    }

    this.timingController.setWords(this.extractionResult.words);
    this.scrollController.setArticleContainer(this.articleContainer);

    this.overlay.create();
    const overlayElement = this.overlay.getElement();
    if (overlayElement) {
      this.controls.create(overlayElement);
      this.wpmSlider.create(overlayElement.querySelector('#speedsubstack-controls')!);
    }

    // Store close button handler for cleanup
    const closeButton = this.overlay.getCloseButton();
    if (closeButton) {
      this.boundCloseHandler = () => this.closeReader();
      closeButton.addEventListener('click', this.boundCloseHandler);
    }

    cleanupOldProgress();

    const progress = await loadProgress(window.location.href);
    if (progress && progress.paragraphStartIndex > 0) {
      this.timingController.setIndex(progress.paragraphStartIndex);
    }

    if (this.settings.activationMode === 'auto') {
      this.startReading();
    } else {
      this.startButton.create();
      this.startButton.show();
    }
  }

  private startReading(): void {
    this.startButton.hide();
    this.overlay.show();
    this.keyboardHandler.enable();
    this.scrollController.enable();
    this.stateMachine.transition('paused');
    this.controls.setPlaying(false);
    
    // Auto-play after 3 seconds
    this.autoPlayTimer = window.setTimeout(() => {
      this.autoPlayTimer = null;
      if (this.stateMachine.getState() === 'paused') {
        this.timingController.play();
        this.stateMachine.startReading();
      }
    }, 3000);
  }

  private closeReader(): void {
    if (this.autoPlayTimer !== null) {
      clearTimeout(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
    this.saveCurrentProgress();
    this.timingController.pause();
    this.stateMachine.stop();
    this.overlay.hide();
    this.keyboardHandler.disable();
    this.scrollController.disable();

    if (this.settings.activationMode === 'manual') {
      this.startButton.show();
    }
  }

  private togglePlayPause(): void {
    const isPlaying = this.timingController.getIsPlaying();

    if (isPlaying) {
      this.timingController.pause();
      this.stateMachine.pauseReading();
    } else {
      // Cancel auto-play timer if user manually starts playing
      if (this.autoPlayTimer !== null) {
        clearTimeout(this.autoPlayTimer);
        this.autoPlayTimer = null;
      }
      this.timingController.play();
      this.stateMachine.startReading();
    }

    this.controls.setPlaying(!isPlaying);
  }

  private handleWordChange(word: ExtractedWord, _index: number): void {
    this.overlay.displayWord(word.word);
    this.highlighter.highlight(word);
  }

  private handleComplete(): void {
    this.stateMachine.pauseReading();
    this.controls.setPlaying(false);
  }

  private handleProgress(current: number, total: number): void {
    this.controls.setProgress(current, total);
  }

  private handleSeek(progress: number): void {
    this.timingController.seekToProgress(progress);
  }

  private handleWpmChange(wpm: number): void {
    this.timingController.setWpm(wpm);
  }

  private handleRewind(): void {
    const skipWords = calculateSkipWords(this.timingController.getWpm(), 10);
    this.timingController.skipBackward(skipWords);
  }

  private handleForward(): void {
    const skipWords = calculateSkipWords(this.timingController.getWpm(), 10);
    this.timingController.skipForward(skipWords);
  }

  private handleScrollToArticle(): void {
    this.timingController.pause();
    this.stateMachine.showArticle();
    this.overlay.hide();
    this.highlighter.scrollToHighlight();
  }

  private handleScrollToReader(): void {
    this.overlay.show();
    this.stateMachine.hideArticle();
    this.timingController.play();
  }

  private handleStateChange({ to }: { from: ReaderState; to: ReaderState }): void {
    switch (to) {
      case 'reading':
        this.controls.setPlaying(true);
        break;
      case 'paused':
      case 'article-view':
        this.controls.setPlaying(false);
        break;
      case 'idle':
        this.controls.setPlaying(false);
        break;
    }
  }

  private saveCurrentProgress(): void {
    if (!this.extractionResult) return;

    const currentIndex = this.timingController.getIndex();
    const paragraphStart = getParagraphStart(
      currentIndex,
      this.extractionResult.paragraphStartIndices
    );

    saveProgress(window.location.href, paragraphStart, currentIndex);
  }

  destroy(): void {
    // Clear timers
    if (this.autoPlayTimer !== null) {
      clearTimeout(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }

    this.saveCurrentProgress();
    this.unsubscribeSettings?.();
    
    // Remove close button listener
    const closeButton = this.overlay.getCloseButton();
    if (closeButton && this.boundCloseHandler) {
      closeButton.removeEventListener('click', this.boundCloseHandler);
    }
    
    // Remove lifecycle listeners
    if (this.boundVisibilityHandler) {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
    }
    if (this.boundBeforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.boundBeforeUnloadHandler);
    }
    
    // Destroy components
    this.timingController.destroy();
    this.keyboardHandler.destroy();
    this.scrollController.destroy();
    this.overlay.destroy();
    this.controls.destroy();
    this.wpmSlider.destroy();
    this.startButton.destroy();
    this.highlighter.destroy();
  }
}

const app = new SpeedSubstackApp();
app.init();
