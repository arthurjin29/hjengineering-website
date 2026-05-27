<script lang="ts">
  import { goto } from '$app/navigation';
  let fileInput: HTMLInputElement;

  async function loadCase(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const text = await f.text();
    try {
      const data = JSON.parse(text);
      if (data.mode === 'mode1' || data.mode === 'mode2') {
        sessionStorage.setItem('dual-lift-case', text);
        goto(`/tools/dual-lift-calculator/${data.mode === 'mode1' ? 'mode-1' : 'mode-2'}`);
      } else {
        alert('Invalid case file: missing or unrecognised "mode" field');
      }
    } catch {
      alert('Invalid JSON in case file');
    }
  }
</script>

<div class="mode-chooser">
  <a href="/tools/dual-lift-calculator/mode-1" class="card mode-tile">
    <h2>Mode 1 — Dual Lift &amp; Place</h2>
    <p>Two cranes lift, transport plumb, set down. Static split + dynamic margin from inclination tolerance α + sequential set-down landing scenarios.</p>
    <span class="cta">Open Mode 1 →</span>
  </a>

  <a href="/tools/dual-lift-calculator/mode-2" class="card mode-tile">
    <h2>Rotation / Tailing</h2>
    <p>Head crane stationary, tail crane walks load upright. Per-crane load vs rotation angle θ (0–90°).</p>
    <span class="cta">Open Mode 2 →</span>
  </a>
</div>

<div class="card load-case">
  <p class="label">Load existing case</p>
  <p style="font-size: 0.85rem; color: var(--text-light); margin: 0 0 0.75rem;">
    Reload a previously saved <code>.case.json</code> file from either mode.
  </p>
  <input type="file" accept=".json" bind:this={fileInput} onchange={loadCase} style="display: none;" />
  <button type="button" class="btn-secondary" onclick={() => fileInput.click()}>
    Choose case file…
  </button>
</div>

<style>
  .mode-chooser {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
    margin-bottom: 1.5rem;
  }
  @media (max-width: 720px) {
    .mode-chooser { grid-template-columns: 1fr; }
  }

  .mode-tile {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    text-decoration: none;
    color: inherit;
    transition: box-shadow 0.15s, transform 0.15s;
  }
  .mode-tile:hover {
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    transform: translateY(-2px);
  }
  .mode-tile p {
    color: var(--text-light);
    font-size: 0.9rem;
    margin: 0;
    line-height: 1.5;
  }
  .mode-tile .cta {
    margin-top: auto;
    color: var(--primary);
    font-weight: 600;
    font-size: 0.95rem;
  }

  .load-case { max-width: 480px; margin: 0 auto; text-align: center; }
  .load-case .label { text-align: left; }
</style>
