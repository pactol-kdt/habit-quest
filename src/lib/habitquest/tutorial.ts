export const TUTORIAL_REPLAY_EVENT = "habitquest:replay-tutorial";

export function replayTutorial() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(TUTORIAL_REPLAY_EVENT));
}
