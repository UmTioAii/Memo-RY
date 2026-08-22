type FloatingRecorderMode = 'recording' | 'paused' | 'done';

interface FloatingRecorderMarkupOptions {
  mode: FloatingRecorderMode;
  title: string;
  status: string;
  elapsed: string;
  canSaveOrDelete: boolean;
  isAudio: boolean;
  labels: {
    pause: string;
    resume: string;
    stop: string;
    save: string;
    delete: string;
    close: string;
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getFloatingRecorderMarkup({
  mode,
  title,
  status,
  elapsed,
  canSaveOrDelete,
  isAudio,
  labels,
}: FloatingRecorderMarkupOptions): string {
  const isDone = mode === 'done';
  const isPaused = mode === 'paused';
  const accentClass = isDone ? 'done' : isPaused ? 'paused' : 'recording';

  return `
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #0b1120;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-width: 312px;
        background:
          radial-gradient(circle at 20% 0%, rgba(59, 130, 246, 0.22), transparent 34%),
          radial-gradient(circle at 90% 10%, rgba(16, 185, 129, 0.12), transparent 32%),
          #0b1120;
        color: #f8fafc;
        overflow: hidden;
      }

      .shell {
        min-height: 150px;
        padding: 12px;
      }

      .card {
        min-height: 126px;
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 18px;
        background: rgba(15, 23, 42, 0.86);
        box-shadow: 0 18px 50px rgba(2, 6, 23, 0.38);
        padding: 13px;
        display: grid;
        gap: 13px;
      }

      .top {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
        align-items: start;
      }

      .identity {
        display: flex;
        gap: 10px;
        min-width: 0;
      }

      .badge {
        width: 34px;
        height: 34px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        background: rgba(148, 163, 184, 0.10);
        border: 1px solid rgba(148, 163, 184, 0.14);
      }

      .glyph {
        width: 15px;
        height: 15px;
        position: relative;
      }

      .glyph.audio::before,
      .glyph.video::before {
        content: "";
        position: absolute;
        inset: 2px;
        border: 2px solid currentColor;
      }

      .glyph.audio::before {
        border-radius: 999px 999px 7px 7px;
      }

      .glyph.audio::after {
        content: "";
        position: absolute;
        left: 6px;
        bottom: -2px;
        width: 3px;
        height: 5px;
        border-radius: 999px;
        background: currentColor;
      }

      .glyph.video::before {
        border-radius: 4px;
      }

      .glyph.video::after {
        content: "";
        position: absolute;
        right: -2px;
        top: 5px;
        border-left: 6px solid currentColor;
        border-top: 4px solid transparent;
        border-bottom: 4px solid transparent;
      }

      .meta {
        min-width: 0;
      }

      .title {
        font-size: 13px;
        line-height: 1.2;
        font-weight: 760;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .status {
        margin-top: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
        color: #cbd5e1;
        font-size: 11px;
        line-height: 1.2;
        min-width: 0;
      }

      .dot {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        flex: 0 0 auto;
      }

      .recording .dot {
        background: #ef4444;
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5);
        animation: pulse 1.35s ease-out infinite;
      }

      .paused .dot {
        background: #f59e0b;
      }

      .done .dot {
        background: #22c55e;
      }

      .statusText {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .time {
        padding: 6px 8px;
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.72);
        border: 1px solid rgba(148, 163, 184, 0.12);
        font: 760 19px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        letter-spacing: 0;
        color: #f8fafc;
      }

      .actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }

      button {
        height: 36px;
        border: 0;
        border-radius: 12px;
        color: #e5e7eb;
        background: rgba(148, 163, 184, 0.13);
        cursor: pointer;
        font-size: 11px;
        font-weight: 760;
        letter-spacing: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
      }

      button:hover:not(:disabled) {
        background: rgba(148, 163, 184, 0.22);
      }

      button:disabled {
        opacity: 0.42;
        cursor: default;
      }

      .primary {
        color: #eff6ff;
        background: linear-gradient(180deg, #2563eb, #1d4ed8);
      }

      .primary:hover:not(:disabled) {
        background: linear-gradient(180deg, #3b82f6, #2563eb);
      }

      .success {
        color: #ecfdf5;
        background: linear-gradient(180deg, #059669, #047857);
      }

      .success:hover:not(:disabled) {
        background: linear-gradient(180deg, #10b981, #059669);
      }

      .danger {
        color: #fff7ed;
        background: linear-gradient(180deg, #ef4444, #dc2626);
      }

      .danger:hover:not(:disabled) {
        background: linear-gradient(180deg, #f87171, #ef4444);
      }

      .ghost {
        color: #cbd5e1;
        background: rgba(15, 23, 42, 0.62);
      }

      .icon {
        width: 12px;
        height: 12px;
        position: relative;
        flex: 0 0 auto;
      }

      .icon.pause::before,
      .icon.pause::after {
        content: "";
        position: absolute;
        top: 1px;
        bottom: 1px;
        width: 3px;
        border-radius: 2px;
        background: currentColor;
      }

      .icon.pause::before {
        left: 2px;
      }

      .icon.pause::after {
        right: 2px;
      }

      .icon.play::before {
        content: "";
        position: absolute;
        left: 3px;
        top: 1px;
        border-left: 8px solid currentColor;
        border-top: 5px solid transparent;
        border-bottom: 5px solid transparent;
      }

      .icon.stop::before {
        content: "";
        position: absolute;
        inset: 2px;
        border-radius: 3px;
        background: currentColor;
      }

      .icon.save::before {
        content: "";
        position: absolute;
        inset: 1px;
        border: 2px solid currentColor;
        border-radius: 3px;
      }

      .icon.save::after {
        content: "";
        position: absolute;
        left: 4px;
        right: 4px;
        bottom: 3px;
        height: 3px;
        background: currentColor;
        border-radius: 2px;
      }

      .icon.delete::before {
        content: "";
        position: absolute;
        left: 3px;
        right: 3px;
        top: 4px;
        bottom: 1px;
        border: 2px solid currentColor;
        border-top: 0;
        border-radius: 2px;
      }

      .icon.delete::after {
        content: "";
        position: absolute;
        left: 2px;
        right: 2px;
        top: 1px;
        height: 2px;
        border-radius: 999px;
        background: currentColor;
      }

      .icon.close::before,
      .icon.close::after {
        content: "";
        position: absolute;
        left: 1px;
        right: 1px;
        top: 5px;
        height: 2px;
        border-radius: 999px;
        background: currentColor;
      }

      .icon.close::before {
        transform: rotate(45deg);
      }

      .icon.close::after {
        transform: rotate(-45deg);
      }

      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.46); }
        75% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
        100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
      }
    </style>

    <div class="shell">
      <section class="card ${accentClass}" aria-label="${escapeHtml(title)}">
        <div class="top">
          <div class="identity">
            <div class="badge">
              <span class="glyph ${isAudio ? 'audio' : 'video'}" aria-hidden="true"></span>
            </div>
            <div class="meta">
              <div class="title">${escapeHtml(title)}</div>
              <div class="status">
                <span class="dot" aria-hidden="true"></span>
                <span class="statusText">${escapeHtml(status)}</span>
              </div>
            </div>
          </div>
          <div class="time">${escapeHtml(elapsed)}</div>
        </div>

        <div class="actions">
          ${isDone ? `
            <button id="save" class="success" ${canSaveOrDelete ? '' : 'disabled'}>
              <span class="icon save" aria-hidden="true"></span>
              ${escapeHtml(labels.save)}
            </button>
            <button id="delete" class="danger" ${canSaveOrDelete ? '' : 'disabled'}>
              <span class="icon delete" aria-hidden="true"></span>
              ${escapeHtml(labels.delete)}
            </button>
          ` : `
            <button id="togglePause" class="primary">
              <span class="icon ${isPaused ? 'play' : 'pause'}" aria-hidden="true"></span>
              ${escapeHtml(isPaused ? labels.resume : labels.pause)}
            </button>
            <button id="stop" class="danger">
              <span class="icon stop" aria-hidden="true"></span>
              ${escapeHtml(labels.stop)}
            </button>
          `}
          <button id="close" class="ghost">
            <span class="icon close" aria-hidden="true"></span>
            ${escapeHtml(labels.close)}
          </button>
        </div>
      </section>
    </div>
  `;
}
