<script lang="ts">
  let { date }: { date: string } = $props();
</script>

<div class="date-separator">
  <div class="date-pill">
    <svg class="calendar-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
    </svg>
    <span>{date}</span>
  </div>
</div>

<style>
  .date-separator {
    display: flex;
    justify-content: center;
    padding: 12px 0;
  }

  .date-pill {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    background: var(--date-separator-bg);
    border-radius: 14px;
    font-size: 11px;
    color: var(--date-separator-text);
    white-space: nowrap;
  }

  .calendar-icon {
    flex-shrink: 0;
    opacity: 0.9;
  }
</style>
