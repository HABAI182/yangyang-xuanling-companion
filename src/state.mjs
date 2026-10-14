export class InputState {
  keyboardHeld = false;
  mouseHeld = false;
  keyboardStarted = -Infinity;
  mouseStarted = -Infinity;
  keyboardRelease = -Infinity;
  mouseRelease = -Infinity;
  reach = 0;
  label = '';
  labelUntil = 0;
  update(frame, now) {
    if (frame.newPress) this.keyboardStarted = now;
    if (frame.newMousePress) this.mouseStarted = now;
    if (this.keyboardHeld && frame.keysHeld === 0) this.keyboardRelease = now;
    if (this.mouseHeld && !frame.mouseDown) this.mouseRelease = now;
    this.keyboardHeld = frame.keysHeld > 0;
    this.mouseHeld = frame.mouseDown;
    if (frame.keysHeld > 0) this.reach = frame.reach;
    if (frame.newPress) { this.label = frame.keyLabel; this.labelUntil = now + 900; }
  }
  snapshot(now) {
    const pulse = (started) => {
      const age = (now - started) / 1000;
      return age >= 0 && age < .45 ? Math.sin(age * 24) * Math.exp(-age * 11) : 0;
    };
    const press = (held, release) => held ? 1 : Math.max(0, 1 - (now - release) / 150);
    return {
      keyboardPress: press(this.keyboardHeld, this.keyboardRelease),
      mousePress: press(this.mouseHeld, this.mouseRelease),
      keyboardBounce: pulse(this.keyboardStarted), mouseBounce: pulse(this.mouseStarted),
      reach: this.reach, label: now < this.labelUntil ? this.label : ''
    };
  }
}
