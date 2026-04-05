<script lang="ts">
  import { mediaPopup } from '../stores/ui';

  function close() {
    mediaPopup.set(null);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  $effect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeydown);
      return () => window.removeEventListener('keydown', handleKeydown);
    }
  });
</script>

{#if $mediaPopup}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="popup-overlay" onclick={close} onkeydown={() => {}}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="popup-content" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
      {#if $mediaPopup.type === 'image'}
        <img src={$mediaPopup.src} alt="사진" class="popup-image" />
      {:else}
        <!-- svelte-ignore a11y_media_has_caption -->
        <video src={$mediaPopup.src} controls autoplay class="popup-video">
        </video>
      {/if}
    </div>
    <button class="close-btn" onclick={close}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </button>
  </div>
{/if}

<style>
  .popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 500;
    cursor: pointer;
  }

  .popup-content {
    max-width: 90vw;
    max-height: 90vh;
    cursor: default;
  }

  .popup-image {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    border-radius: 4px;
  }

  .popup-video {
    max-width: 90vw;
    max-height: 90vh;
    border-radius: 4px;
    outline: none;
  }

  .close-btn {
    position: fixed;
    top: 16px;
    right: 16px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 50%;
    cursor: pointer;
    transition: background 0.2s;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }
</style>
