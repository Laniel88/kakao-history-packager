<script lang="ts">
  // Decorative-only input area (non-functional)
</script>

<div class="input-area">
  <div class="input-field">
    <span class="placeholder-text">메시지 입력</span>
  </div>
  <div class="input-bottom">
    <div class="input-toolbar">
      <!-- 이모티콘 -->
      <button class="toolbar-icon" disabled>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
          <line x1="9" y1="9" x2="9.01" y2="9"/>
          <line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
      </button>
      <!-- 체크/할일 -->
      <button class="toolbar-icon" disabled>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      </button>
      <!-- 말풍선 -->
      <button class="toolbar-icon" disabled>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
      <!-- 문서/파일 -->
      <button class="toolbar-icon" disabled>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </button>
      <!-- 공유/업로드 -->
      <button class="toolbar-icon" disabled>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3"/>
          <path d="M12 8v8M8 12l4-4 4 4"/>
        </svg>
      </button>
      <!-- 더보기 -->
      <button class="toolbar-icon" disabled>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="1.5" stroke-linecap="round">
          <circle cx="12" cy="6" r="0.5" fill="#aaa"/>
          <circle cx="12" cy="12" r="0.5" fill="#aaa"/>
          <circle cx="12" cy="18" r="0.5" fill="#aaa"/>
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
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: default;
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
