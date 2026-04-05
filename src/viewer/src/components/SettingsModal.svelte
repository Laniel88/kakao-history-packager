<script lang="ts">
  import { isSettingsOpen } from '../stores/ui';
  import { settings } from '../stores/settings';

  let nameInput = $state($settings.otherName);
  let photoPreview = $state($settings.otherProfilePhoto);

  function close() {
    isSettingsOpen.set(false);
  }

  function save() {
    settings.update(s => ({
      ...s,
      otherName: nameInput,
      otherProfilePhoto: photoPreview,
    }));
    close();
  }

  function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      photoPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    photoPreview = null;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  $effect(() => {
    if ($isSettingsOpen && typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeydown);
      return () => window.removeEventListener('keydown', handleKeydown);
    }
  });

  // Sync when settings change externally
  $effect(() => {
    nameInput = $settings.otherName;
    photoPreview = $settings.otherProfilePhoto;
  });
</script>

{#if $isSettingsOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={close} onkeydown={() => {}}></div>
  <div class="modal">
    <div class="modal-header">
      <h3>설정</h3>
      <button class="close-btn" onclick={close}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#555">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>

    <div class="modal-body">
      <div class="setting-group">
        <label class="setting-label">상대 프로필 사진</label>
        <div class="photo-setting">
          <div class="photo-preview">
            {#if photoPreview}
              <img src={photoPreview} alt="프로필" />
            {:else}
              <div class="photo-placeholder">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#aaa">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            {/if}
          </div>
          <div class="photo-actions">
            <label class="file-btn">
              사진 선택
              <input type="file" accept="image/*" onchange={handleFileChange} hidden />
            </label>
            {#if photoPreview}
              <button class="remove-btn" onclick={removePhoto}>제거</button>
            {/if}
          </div>
        </div>
      </div>

      <div class="setting-group">
        <label class="setting-label" for="other-name">상대 이름</label>
        <input
          id="other-name"
          type="text"
          bind:value={nameInput}
          placeholder="이름을 입력하세요"
          class="name-input"
        />
      </div>
    </div>

    <div class="modal-footer">
      <button class="cancel-btn" onclick={close}>취소</button>
      <button class="save-btn" onclick={save}>저장</button>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 400;
  }

  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border-radius: 12px;
    width: 360px;
    max-width: 90vw;
    z-index: 401;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #eee;
  }

  .modal-header h3 {
    font-size: 16px;
    font-weight: 600;
  }

  .close-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
  }

  .close-btn:hover {
    background: #f0f0f0;
  }

  .modal-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .setting-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .setting-label {
    font-size: 13px;
    font-weight: 600;
    color: #555;
  }

  .photo-setting {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .photo-preview {
    width: 56px;
    height: 56px;
    border-radius: 18px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .photo-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .photo-placeholder {
    width: 100%;
    height: 100%;
    background: #e8e8e8;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .photo-actions {
    display: flex;
    gap: 8px;
  }

  .file-btn {
    padding: 6px 14px;
    background: #f0f0f0;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    color: #333;
  }

  .file-btn:hover {
    background: #e5e5e5;
  }

  .remove-btn {
    padding: 6px 14px;
    background: transparent;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    color: #999;
  }

  .name-input {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 13px;
    outline: none;
  }

  .name-input:focus {
    border-color: #aaa;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 20px;
    border-top: 1px solid #eee;
  }

  .cancel-btn {
    padding: 8px 20px;
    border: none;
    background: transparent;
    font-size: 13px;
    cursor: pointer;
    color: #666;
    border-radius: 6px;
  }

  .cancel-btn:hover {
    background: #f5f5f5;
  }

  .save-btn {
    padding: 8px 20px;
    border: none;
    background: #fee500;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border-radius: 6px;
    color: #333;
  }

  .save-btn:hover {
    background: #f5dc00;
  }
</style>
