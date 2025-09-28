<template>
  <!-- กล่องครอบที่ยืดตามคอลัมน์ และบังคับไม่ให้ล้น -->
  <div class="layout-wrap" ref="wrap">
    <!-- เนื้อผ้าใบจริง ใช้ขนาดฐาน แล้ว scale ให้พอดีกับคอลัมน์ -->
    <div class="canvas" :style="{
      width: baseWidth + 'px',
      height: baseHeight + 'px',
      transform: `scale(${scale})`
    }">
      <div v-for="b in boxes" :key="b.boxid" class="grid-box" :class="{
        'is-rh': isRhHighlighted(b.boxid),
        'is-lh': isLhHighlighted(b.boxid)
      }" :style="styleFor(b)" :title="`${b.submsg} - ${b.conversion_char}`">
        <span v-if="isRhHighlighted(b.boxid)" class="badge rh">LH</span>
        <span v-if="isLhHighlighted(b.boxid)" class="badge lh">RH</span>
        <!-- {{ b.submsg }} -->
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GridBoxes',
  props: {
    boxes: { type: Array, default: () => [] },
    // ขนาดฐาน (จากตอนออกแบบ layout/scale)
    baseWidth: { type: Number, default: 960 },
    baseHeight: { type: Number, default: 560 },
    // ถ้าอยากให้ขยายเกินคอลัมน์ได้ ให้ตั้ง allowUpscale = true
    allowUpscale: { type: Boolean, default: false },
    // รายการ boxid ที่ต้องไฮไลต์ แยก RH/LH
    highlightRhIds: { type: Array, default: () => [] },
    highlightLhIds: { type: Array, default: () => [] },
  },
  data() {
    return {
      scale: 1,
      _ro: null
    }
  },
  mounted() {
    // ให้ scale ตามความกว้างจริงของคอลัมน์
    this._ro = new ResizeObserver(this.recalcScale)
    this._ro.observe(this.$refs.wrap)
    this.$nextTick(this.recalcScale)
  },
  beforeDestroy() {
    if (this._ro) this._ro.disconnect()
  },
  methods: {
    recalcScale() {
      const el = this.$refs.wrap
      if (!el) return
      const w = el.clientWidth
      if (!w || !this.baseWidth) return
      const s = w / this.baseWidth
      this.scale = this.allowUpscale ? s : Math.min(s, 1) // ไม่ให้ยืดเกินฐาน
    },

    styleFor(b) {
      return {
        left: (b.left_scaled || 0) + 'px',
        top: (b.top_scaled || 0) + 'px',
        width: (b.width_scaled || 0) + 'px',
        height: (b.height_scaled || 0) + 'px'
      }
    },

    // ตรวจสอบว่า boxid นี้ควรไฮไลต์เป็น RH หรือไม่
    isRhHighlighted(boxid) {
      return this.highlightRhIds.includes(boxid)
    },

    // ตรวจสอบว่า boxid นี้ควรไฮไลต์เป็น LH หรือไม่  
    isLhHighlighted(boxid) {
      return this.highlightLhIds.includes(boxid)
    }
  }
}
</script>

<style scoped>
.layout-wrap {
  position: relative;
  width: 100%;
  background: #f6f7f9;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #eef0f4;
  padding: 8px;
}

/* ผ้าใบจริงใช้ขนาดฐาน แล้ว scale เอา */
.canvas {
  position: relative;
  transform-origin: top left;
}

/* กล่องใน layout */
.grid-box {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #454647;
  color: #555;
  font-size: 12px;
  text-align: center;
  line-height: 1.2;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .04);
}

/* RH = ส้ม */
.grid-box.is-rh {
  outline: 3px solid black;

  background: #d1d0cf;
  z-index: 2;
}

/* LH = เขียว */
.grid-box.is-lh {
  outline: 3px solid black;
  outline: 3px solid black;
  background: #d1d0cf;
  z-index: 2;
}

/* badge RH/LH มุมกล่อง */
.badge {
  position: absolute;
  left: 4px;
  top: 4px;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
}

.badge.rh {
  background: black;
}

.badge.lh {

  background: black;
}
</style>