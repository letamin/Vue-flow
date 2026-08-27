<template>
  <aside class="sidebar">
    <div>
      <p class="eyebrow">Flow workspace</p>
      <h1>Canvas boundary</h1>
      <p class="description">Choose the exact working area for your flow.</p>
    </div>
    <form class="controls" @submit.prevent>
      <label
        ><span>Width</span>
        <div class="number-input">
          <input v-model.number="dimensions.width" type="number" min="300" max="2000" step="10" /><span>px</span>
        </div></label
      >
      <label
        ><span>Height</span>
        <div class="number-input">
          <input v-model.number="dimensions.height" type="number" min="300" max="2000" step="10" /><span>px</span>
        </div></label
      >
      <div class="preset-heading">Presets</div>
      <div class="presets">
        <button v-for="preset in presets" :key="preset.label" type="button" @click="applyPreset(preset)">{{ preset.label }}</button>
      </div>
    </form>
    <div class="boundary-readout">
      <span>Active area</span><strong>{{ dimensions.width }} × {{ dimensions.height }} px</strong>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { CanvasDimensions } from '../interface/Flow';

const dimensions = defineModel<CanvasDimensions>('dimensions', { required: true });
const props = defineProps<{ presets: (CanvasDimensions & { label: string })[] }>();
const emit = defineEmits<{ applyPreset: [preset: CanvasDimensions] }>();
const presets = props.presets;
const applyPreset = (preset: CanvasDimensions): void => emit('applyPreset', preset);
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 40px 28px 28px;
  background: #18242b;
  border-right: 1px solid #34434a;
}
.eyebrow,
.preset-heading,
.boundary-readout span {
  margin: 0;
  color: #7dc9bd;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}
h1 {
  margin: 10px 0 8px;
  color: #f4f7f5;
  font-family: Georgia, serif;
  font-size: 30px;
  font-weight: 400;
}
.description {
  max-width: 230px;
  margin: 0;
  color: #9aabb0;
  font-size: 14px;
  line-height: 1.5;
}
.controls {
  display: grid;
  gap: 20px;
}
label {
  display: grid;
  gap: 8px;
  color: #c6d1d2;
  font-size: 13px;
  font-weight: 700;
}
.number-input {
  display: flex;
  align-items: center;
  border: 1px solid #46575c;
  background: #111a20;
}
input {
  width: 100%;
  min-width: 0;
  padding: 11px 12px;
  border: 0;
  outline: 0;
  background: transparent;
  color: #f4f7f5;
  font: inherit;
  font-size: 16px;
}
.number-input span {
  padding-right: 12px;
  color: #7c8e92;
  font-size: 12px;
}
.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: -10px;
}
.presets button {
  padding: 8px 12px;
  border: 1px solid #46575c;
  background: transparent;
  color: #c6d1d2;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}
.presets button:hover,
.presets button:focus-visible {
  border-color: #7dc9bd;
  color: #7dc9bd;
}
.boundary-readout {
  display: grid;
  gap: 8px;
  margin-top: auto;
  padding-top: 20px;
  border-top: 1px solid #34434a;
}
.boundary-readout strong {
  color: #f4f7f5;
  font-family: Georgia, serif;
  font-size: 20px;
  font-weight: 400;
}
@media (max-width: 700px) {
  .sidebar {
    gap: 20px;
    padding: 24px;
  }
  .boundary-readout {
    margin-top: 0;
  }
}
</style>
