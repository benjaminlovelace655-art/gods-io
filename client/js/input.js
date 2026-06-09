class InputManager {
  constructor(canvas) {
    this.keys = {};
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.rightMouseDown = false;
    this.canvas = canvas;

    this.bindings = {
      'KeyW': 'up',
      'KeyA': 'left',
      'KeyS': 'down',
      'KeyD': 'right',
      'Space': 'attack',
    };

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Enter') this.onEnter?.();
      if (e.code === 'KeyQ') this.onAbility?.('primary');
      if (e.code === 'KeyE') this.onAbility?.('secondary');
      if (e.code === 'KeyR') this.onAbility?.('ultimate');
      if (e.code === 'KeyF') this.onSummon?.();
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
      this.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseDown = true;
      if (e.button === 2) this.rightMouseDown = true;
    });

    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.rightMouseDown = false;
    });

    canvas.addEventListener('click', (e) => {
      if (e.button === 0) this.onClick?.();
    });
  }

  getInput() {
    return {
      up: !!this.keys['KeyW'],
      down: !!this.keys['KeyS'],
      left: !!this.keys['KeyA'],
      right: !!this.keys['KeyD'],
      aiming: true,
      targetX: this.mouseX,
      targetY: this.mouseY,
    };
  }

  isPressed(code) {
    return !!this.keys[code];
  }
}
