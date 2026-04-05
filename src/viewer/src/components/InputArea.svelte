<script lang="ts">
  // Decorative-only input area (non-functional)
</script>

<div class="input-area">
  <div class="input-field">
    <span class="placeholder-text">메시지 입력</span>
  </div>
  <div class="input-bottom">
    <div class="input-toolbar">
      <button class="toolbar-icon" disabled>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke-linecap="round"/>
          <circle cx="9" cy="9.5" r="1" fill="#999" stroke="none"/>
          <circle cx="15" cy="9.5" r="1" fill="#999" stroke="none"/>
        </svg>
      </button>
      <button class="toolbar-icon" disabled>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5">
          <path d="M5 12h14M13 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button class="toolbar-icon" disabled>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 15l5-5 4 4 3-3 6 6" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="15.5" cy="8.5" r="1.5" fill="#999" stroke="none"/>
        </svg>
      </button>
      <button class="toolbar-icon" disabled>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button class="toolbar-icon" disabled>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button class="toolbar-icon" disabled>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#999" stroke="none">
          <circle cx="12" cy="6" r="1.5"/>
          <circle cx="12" cy="12" r="1.5"/>
          <circle cx="12" cy="18" r="1.5"/>
        </svg>
      </button>
    </div>
    <button class="send-button" disabled>전송</button>
  </div>
</div>

<style>
  .input-area {
    display: flex;
    flex-direction: column;
    background: var(--input-area-bg);
    border-top: 1px solid var(--input-area-border);
  }

  .input-field {
    display: flex;
    align-items: flex-start;
    min-height: 36px;
    padding: 10px 12px 4px;
  }

  .placeholder-text {
    color: #ccc;
    font-size: 13px;
  }

  .input-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px 8px;
  }

  .input-toolbar {
    display: flex;
    gap: 0;
  }

  .toolbar-icon {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: default;
    opacity: 0.55;
  }

  .send-button {
    padding: 4px 12px;
    border: none;
    background: transparent;
    color: #ccc;
    font-size: 13px;
    cursor: default;
  }
</style>
