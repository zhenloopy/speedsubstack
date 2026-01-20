/**
 * SpeedSubstack - Content Script Entry Point
 * Speed reading extension for Substack articles
 */

console.log('[SpeedSubstack] Initializing on:', window.location.href);

import { waitForArticle } from './utils/substack-detector';
import { extractArticleContent, getParagraphStart, type ExtractionResult, type ExtractedWord } from './parser/article-extractor';
import { loadSettings, onSettingsChange, type Settings } from './storage/settings';
import { loadProgress, saveProgress, cleanupOldProgress } from './storage/progress';
import { Overlay } from './ui/overlay';
import { Controls } from './ui/controls';
import { WpmSlider } from './ui/wpm-slider';
import { NavButtons } from './ui/nav-buttons';
import { StartButton } from './ui/start-button';
import { Highlighter } from './ui/highlighter';
import { ScrollController } from './ui/scroll-controller';
import { TimingController } from './engine/timing-controller';
import { StateMachine, type ReaderState } from './engine/state-machine';
import { KeyboardHandler } from './engine/keyboard-handler';
import { calculateSkipWords } from './engine/navigation';

class SpeedSubstackApp {
  // Data
  private extractionResult: ExtractionResult | null = null;
  private articleContainer: HTMLElement | null = null;
  private settings: Settings = { wpm: 300, activationMode: 'manual' };

  // Components
  private overlay: Overlay;
  private controls: Controls;
  private wpmSlider: WpmSlider;
  private navButtons: NavButtons;
  private startButton: StartButton;
  private highlighter: Highlighter;
  private scrollController: ScrollController;
  private timingController: TimingController;
  private stateMachine: StateMachine;
  private keyboardHandler: KeyboardHandler;

  // Cleanup
  private unsubscribeSettings: (() => void) | null = null;

  constructor() {
    // Initialize state machine
    this.stateMachine = new StateMachine();

    // Initialize timing controller
    this.timingController = new TimingController(this.settings.wpm, {
      onWordChange: this.handleWordChange.bind(this),
      onComplete: this.handleComplete.bind(this),
      onProgress: this.handleProgress.bind(this),
    });

    // Initialize overlay
    this.overlay = new Overlay();

    // Initialize controls
    this.controls = new Controls({
      onPlayPause: this.togglePlayPause.bind(this),
      onSeek: this.handleSeek.bind(this),
    });

    // Initialize WPM slider
    this.wpmSlider = new WpmSlider(this.settings.wpm, {
      onChange: this.handleWpmChange.bind(this),
    });

    // Initialize nav buttons
    this.navButtons = new NavButtons({
      onRewind: this.handleRewind.bind(this),
      onForward: this.handleForward.bind(this),
    });

    // Initialize start button
    this.startButton = new StartButton({
      onStart: this.startReading.bind(this),
    });

    // Initialize highlighter
    this.highlighter = new Highlighter();

    // Initialize scroll controller
    this.scrollController = new ScrollController({
      onScrollToArticle: this.handleScrollToArticle.bind(this),
      onScrollToReader: this.handleScrollToReader.bind(this),
    });

    // Initialize keyboard handler
    this.keyboardHandler = new KeyboardHandler({
      onPlayPause: this.togglePlayPause.bind(this),
      onSkipForward: this.handleForward.bind(this),
      onSkipBackward: this.handleRewind.bind(this),
      onIncreaseWpm: () => this.wpmSlider.increaseWpm(),
      onDecreaseWpm: () => this.wpmSlider.decreaseWpm(),
      onClose: this.closeReader.bind(this),
    });

    // Listen for state changes
    this.stateMachine.onStateChange(this.handleStateChange.bind(this));
  }

  /**
   * Initialize the app
   */
  async init(): Promise<void> {
    // Load settings
    this.settings = await loadSettings();
    this.timingController.setWpm(this.settings.wpm);

    // Listen for settings changes
    this.unsubscribeSettings = onSettingsChange((changes) => {
      if (changes.wpm !== undefined) {
        this.settings.wpm = changes.wpm;
        this.wpmSlider.setWpm(changes.wpm);
        this.timingController.setWpm(changes.wpm);
      }
      if (changes.activationMode !== undefined) {
        this.settings.activationMode = changes.activationMode;
      }
    });

    // Wait for article detection
    const detection = await waitForArticle();

    if (!detection.isArticle || !detection.articleContainer) {
      console.log('[SpeedSubstack] Not an article page');
      return;
    }

    console.log('[SpeedSubstack] Article detected');
    this.articleContainer = detection.articleContainer;

    // Extract article content
    this.extractionResult = extractArticleContent(this.articleContainer);

    if (this.extractionResult.totalWords === 0) {
      console.log('[SpeedSubstack] No words extracted');
      return;
    }

    // Set up components
    this.timingController.setWords(this.extractionResult.words);
    this.scrollController.setArticleContainer(this.articleContainer);

    // Create UI
    this.overlay.create();
    const overlayElement = this.overlay.getElement();
    if (overlayElement) {
      this.controls.create(overlayElement);
      this.wpmSlider.create(overlayElement.querySelector('#speedsubstack-controls')!);
      this.navButtons.create(overlayElement);
    }

    // Set up close button
    const closeButton = this.overlay.getCloseButton();
    if (closeButton) {
      closeButton.addEventListener('click', () => this.closeReader());
    }

    // Clean up old progress entries
    cleanupOldProgress();

    // Check for saved progress
    const progress = await loadProgress(window.location.href);
    if (progress && progress.paragraphStartIndex > 0) {
      this.timingController.setIndex(progress.paragraphStartIndex);
    }

    // Initialize based on activation mode
    if (this.settings.activationMode === 'auto') {
      this.startReading();
    } else {
      this.startButton.create();
      this.startButton.show();
    }
  }

  /**
   * Start speed reading
   */
  private startReading(): void {
    this.startButton.hide();
    this.overlay.show();
    this.keyboardHandler.enable();
    this.scrollController.enable();
    this.stateMachine.startReading();
    this.timingController.play();
  }

  /**
   * Close the reader
   */
  private closeReader(): void {
    this.saveCurrentProgress();
    this.timingController.pause();
    this.stateMachine.stop();
    this.overlay.hide();
    this.keyboardHandler.disable();
    this.scrollController.disable();
    // Keep the highlight on the article word

    if (this.settings.activationMode === 'manual') {
      this.startButton.show();
    }
  }

  /**
   * Toggle play/pause
   */
  private togglePlayPause(): void {
    const isPlaying = this.timingController.getIsPlaying();

    if (isPlaying) {
      this.timingController.pause();
      this.stateMachine.pauseReading();
    } else {
      this.timingController.play();
      this.stateMachine.startReading();
    }

    this.controls.setPlaying(!isPlaying);
  }

  /**
   * Handle word change from timing controller
   */
  private handleWordChange(word: ExtractedWord, _index: number): void {
    this.overlay.displayWord(word.word);
    this.highlighter.highlight(word.spanId);
  }

  /**
   * Handle reading complete
   */
  private handleComplete(): void {
    this.stateMachine.pauseReading();
    this.controls.setPlaying(false);
  }

  /**
   * Handle progress update
   */
  private handleProgress(current: number, total: number): void {
    this.controls.setProgress(current, total);
  }

  /**
   * Handle seek from progress bar
   */
  private handleSeek(progress: number): void {
    this.timingController.seekToProgress(progress);
  }

  /**
   * Handle WPM change
   */
  private handleWpmChange(wpm: number): void {
    this.timingController.setWpm(wpm);
  }

  /**
   * Handle rewind
   */
  private handleRewind(): void {
    const skipWords = calculateSkipWords(this.timingController.getWpm(), 10);
    this.timingController.skipBackward(skipWords);
  }

  /**
   * Handle forward
   */
  private handleForward(): void {
    const skipWords = calculateSkipWords(this.timingController.getWpm(), 10);
    this.timingController.skipForward(skipWords);
  }

  /**
   * Handle scroll to article
   */
  private handleScrollToArticle(): void {
    this.timingController.pause();
    this.stateMachine.showArticle();
    this.overlay.hide();
    this.highlighter.scrollToHighlight();
  }

  /**
   * Handle scroll to reader
   */
  private handleScrollToReader(): void {
    this.overlay.show();
    this.stateMachine.hideArticle();
    this.timingController.play();
  }

  /**
   * Handle state changes
   */
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

  /**
   * Save current reading progress
   */
  private saveCurrentProgress(): void {
    if (!this.extractionResult) return;

    const currentIndex = this.timingController.getIndex();
    const paragraphStart = getParagraphStart(
      currentIndex,
      this.extractionResult.paragraphStartIndices
    );

    saveProgress(window.location.href, paragraphStart, currentIndex);
  }

  /**
   * Clean up when page unloads
   */
  destroy(): void {
    this.saveCurrentProgress();
    this.unsubscribeSettings?.();
    this.timingController.destroy();
    this.keyboardHandler.destroy();
    this.scrollController.destroy();
    this.overlay.destroy();
    this.controls.destroy();
    this.wpmSlider.destroy();
    this.navButtons.destroy();
    this.startButton.destroy();
    this.highlighter.destroy();
  }
}

// Initialize app
const app = new SpeedSubstackApp();
app.init();

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  app.destroy();
});
