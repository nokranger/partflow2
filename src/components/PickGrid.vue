<template>
  <div class="pickgrid" :style="{ '--cols': lotSize }" v-if="lotSize > 0">
    <!-- RH (แถวบน) -->
    <div v-for="c in lotSize" :key="'top-' + c" class="cell" :class="{ 'active-rh': c - 1 === activeIndex }">
      <span v-if="c - 1 === activeIndex" style="font-size: 30px;">LH</span>
    </div>

    <!-- LH (แถวล่าง) -->
    <div v-for="c in lotSize" :key="'bot-' + c" class="cell" :class="{ 'active-lh': c - 1 === activeIndex }">
      <span v-if="c - 1 === activeIndex" style="font-size: 30px;">RH</span>
    </div>

    <!-- ดัชนีล่าง -->
    <div v-for="c in lotSize" :key="'idx-' + c" class="cell index" style="font-size: 30px;">
      {{ c }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'PickGrid',
  props: {
    lotSize: { type: Number, required: true },    // จำนวนคอลัมน์ (เช่น 6)
    activeIndex: { type: Number, default: 0 },    // คอลัมน์ที่กำลังทำ (0-based)
    topLabel: { type: String, default: 'RH' },
    bottomLabel: { type: String, default: 'LH' },
    activeIndex: { type: Number, default: null }, // 0-based index ที่จะไฮไลต์
  }
}
</script>

<style scoped>
.pickgrid {
  display: grid;
  grid-template-columns: repeat(var(--cols), 1fr);
  grid-auto-rows: 56px;
  border: 2px solid #222;
  border-radius: 6px;
  overflow: hidden;
}

.cell {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-right: 2px solid #222;
  border-bottom: 2px solid #222;
  font-weight: 600;
}

.cell:nth-child(var(--cols)n) {
  border-right: none;
}

.cell.index {
  background: #9e9e9e;
  color: #fff;
  border-bottom: none;
  font-weight: 700;
}

/* สี RH / LH */
.cell.active-rh {
  background: #2ecc71;
  color: #fff;
}

.cell.active-lh {
  background: #ff9800;
  color: #fff;
}
</style>
