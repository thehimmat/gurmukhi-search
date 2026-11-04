// Keeps only the newest request alive. Starting one aborts the one before, and
// cancel() aborts whatever is in flight: clearing the box or switching mode
// must do that before returning, or a slow response for the old query lands
// afterwards and overwrites the screen (#49).
export class LatestRequest {
  private ctrl: AbortController | null = null;

  start(): AbortSignal {
    this.ctrl?.abort();
    this.ctrl = new AbortController();
    return this.ctrl.signal;
  }

  cancel(): void {
    this.ctrl?.abort();
    this.ctrl = null;
  }
}
