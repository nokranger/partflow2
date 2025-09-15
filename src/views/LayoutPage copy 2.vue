<template>
  <div class="container py-3">
    <div class="text-center mb-3">
      <h3>Select Process NO: {{ headerSeq }}</h3>
    </div>

    <div class="row">
      <!-- ซ้าย: Layout -->
      <div class="col-md-6 mb-4">
        <h5 class="text-center">Layout location</h5>
        <div v-if="load.layout" class="text-center text-muted py-5">กำลังโหลด layout…</div>
        <GridBoxes :boxes="boxes" :baseWidth="860" :baseHeight="520" :allowUpscale="false"
          :highlightIds="activeBoxIds" />
      </div>

      <!-- ขวา: Part + Setting + ปุ่ม -->
      <div class="col-md-6">
        <div v-if="load.setting || load.parts" class="text-center text-muted py-5">
          กำลังโหลดข้อมูลฝั่งขวา…
        </div>

        <template v-else>
          <!-- หัวข้อ LH/RH ตาม setting.sa -->
          <div class="row mb-3">
            <div class="col text-left" style="color:#ff9800">
              <div>LH : Submsg: {{ headerLH.submsg }}</div>
              <div>Part Name: {{ headerLH.partName }}</div>
            </div>
            <div class="col text-success">
              <div>RH : Submsg: {{ headerRH.submsg }}</div>
              <div>Part Name: {{ headerRH.partName }}</div>
            </div>
          </div>

          <!-- รูป (placeholder) -->
          <!-- <div class="d-flex justify-content-around my-3">
            <div class="img-placeholder">LH: {{ currentPart?.fr_coil_lh || '-' }}</div>
            <div class="img-placeholder">RH: {{ currentPart?.fr_coil_rh || '-' }}</div>
          </div> -->
          <!-- รูป (LH/RH) -->
          <div class="part-images my-3">
            <!-- LH -->
            <div class="part-img-box">
              <img v-if="imgLH && !imgErrLH" :src="imgLH" alt="LH" class="part-img" @error="imgErrLH = true" />
              <div v-else class="part-img-fallback">
                LH: {{ headerLH.submsg }}
              </div>
            </div>

            <!-- RH -->
            <div class="part-img-box">
              <img v-if="imgRH && !imgErrRH" :src="imgRH" alt="RH" class="part-img" @error="imgErrRH = true" />
              <div v-else class="part-img-fallback">
                RH: {{ headerRH.submsg }}
              </div>
            </div>
          </div>

          <!-- ปุ่ม -->
          <div class="d-flex justify-content-center my-3">
            <button class="btn btn-primary mx-2" @click="prevPart" :disabled="currentIndex === 0">Back</button>
            <button class="btn btn-outline-primary mx-2" @click="nextPart"
              :disabled="currentIndex >= parts.length - 1">Next</button>
            <button class="btn btn-secondary mx-2">Confirm Check</button>
          </div>

          <!-- แถบ lot -->
          <!-- <div class="text-center mb-2">
            เตรียม Part ชิ้นที่ : {{ currentIndex + 1 }} / {{ lotSizeInt }}
          </div>
          <div class="lot-grid">
            <div v-for="n in lotSizeInt" :key="n" :class="['lot-cell', { active: n === currentIndex + 1 }]">
              {{ n }}
            </div>
          </div> -->
          <!-- ตรง template ส่วนฝั่งขวา -->
          <PickGrid class="mt-3" :lotSize="lotSizeInt" :activeIndex="currentIndex" topLabel="RH" bottomLabel="LH" />
        </template>
      </div>
    </div>

    <!-- เออร์เรอร์รวม -->
    <div v-if="errorMsg" class="alert alert-danger mt-3">
      {{ errorMsg }}
    </div>
  </div>
</template>

<script>
import api from '@/api/api'
import GridBoxes from '@/components/GridBoxes.vue'
import PickGrid from '@/components/PickGrid.vue'

export default {
  name: 'LayoutPage',
  components: { GridBoxes, PickGrid },
  data() {
    return {
      boxes: [],             // layout ซ้าย
      stationSetting: null,  // setting จาก /Callallstation
      parts: [],             // รายการ part จาก /allseq
      currentIndex: 0,       // index สำหรับ Next/Back
      errorMsg: '',          // แสดง error (ถ้ามี)
      load: { layout: true, setting: true, parts: true }, // สถานะโหลดม
      imgErrLH: false,
      imgErrRH: false
    }
  },
  computed: {
    // จาก store: seq + station_id + lotsize
    params() {
      const p = this.$store.state.selection.process || {}
      return {
        seq: this.$store.state.selection.seq,
        station_id: p.station_id,
        lotsize: p.lot_size
      }
    },
    lotSizeInt() {
      const n = Number(this.params.lotsize)
      return Number.isFinite(n) && n > 0 ? n : 0
    },
    currentPart() {
      return this.parts[this.currentIndex] || null
    },
    // ----------------- ใหม่: parse setting.sa / setting.sb -----------------
    saList() {
      try {
        // stationSetting.sa เป็น JSON string
        const raw = this.stationSetting?.sa || '[]'
        const arr = JSON.parse(raw)
        return Array.isArray(arr) ? arr : []
      } catch {
        return []
      }
    },
    sbList() {
      try {
        const raw = this.stationSetting?.sb || '[]'
        const arr = JSON.parse(raw)
        return Array.isArray(arr) ? arr : []
      } catch {
        return []
      }
    },
    /**
   * headerLH / headerRH จะ:
   * - submsg อ่านจาก setting.sa โดยตรง
   * - partName อ่านค่าจริงจาก currentPart[part_name]
   *
   * หมายเหตุสำคัญ:
   * ผู้ใช้บอก “LH = sa[1], RH = sa[2]” (index แบบ 1-based)
   * ด้านล่างผม map เป็น 0-based ให้ LH=saList[0], RH=saList[1]
   * ถ้าอยากสลับ ก็แค่สลับ index เป็น [1] และ [0] ได้ทันที
   */
    headerLH() {
      const item = this.saList[0] || null   // LH = sa[1] (1-based) -> index 0 (0-based)
      const key = item?.part_name
      return {
        submsg: item?.submsg || '-',
        partName: (key && this.currentPart && this.currentPart[key]) ? this.currentPart[key] : '-'
      }
    },
    headerRH() {
      const item = this.saList[1] || null   // RH = sa[2] (1-based) -> index 1 (0-based)
      const key = item?.part_name
      return {
        submsg: item?.submsg || '-',
        partName: (key && this.currentPart && this.currentPart[key]) ? this.currentPart[key] : '-'
      }
    },
    headerSeq() {
      const seq = this.currentPart?.sequence_no
      return seq ? String(seq) : String(this.params.seq || '-')
    },
    // ---------- สร้าง key ไว้เทียบ ----------
    boxPriorityMap() {
      // Map<priority, Set<key>>
      const m = new Map()
      for (const b of this.boxes || []) {
        const p = Number(b.priority) || 0
        if (!p) continue
        const key = this.pairKey(b.submsg, b.conversion_char)
        if (!m.has(p)) m.set(p, new Set())
        m.get(p).add(key)
      }
      return m
    },
    imgBase() {
      // ลำดับความสำคัญ: IMG_BASE > API_BASE > ค่าดีฟอลต์
      return (
        process.env.VUE_APP_IMG_BASE_URL ||
        process.env.VUE_APP_API_BASE_URL ||
        'http://192.168.1.138:4000'
      )
    },

    // URL ของรูป LH/RH ตาม setting.sa
    imgLH() {
      return this.buildImgUrlFromSA(0)  // LH = sa[1] (index 0)
    },
    imgRH() {
      return this.buildImgUrlFromSA(1)  // RH = sa[2] (index 1)
    }
  },
  async mounted() {
    // guard: ถ้ายังไม่ได้เลือกจากหน้าแรกให้ย้อนกลับ
    if (!this.params.station_id || !this.params.seq) {
      this.$router.replace({ name: 'SelectProcess' })
      return
    }

    // ดึงข้อมูลทั้งหมด
    await Promise.all([
      this.fetchLayout(),
      this.fetchSetting(),
      this.fetchParts()
    ])
  },
  methods: {
    pairKey(submsg, name) {
      return `${String(submsg || '')}|${String(name || '')}`
    },
    // ซ้าย: layout
    async fetchLayout() {
      this.load.layout = true
      try {
        const { data } = await api.post('/allboxstationCanva2', {
          station_id: this.params.station_id
        })
        this.boxes = Array.isArray(data?.result) ? data.result : []
      } catch (e) {
        this.errorMsg = 'โหลด Layout ไม่สำเร็จ'
        console.error('fetchLayout error', e)
      } finally {
        this.load.layout = false
      }
    },

    // ขวา: setting (ใช้ข้อมูลหลังบ้าน เช่น sa/sb/lot_size/condition)
    async fetchSetting() {
      this.load.setting = true
      try {
        const { data } = await api.post('/Callallstation', {
          station_id: this.params.station_id
        })
        this.stationSetting = (data?.result && data.result[0]) || null
      } catch (e) {
        this.errorMsg = 'โหลด Setting สถานีไม่สำเร็จ'
        console.error('fetchSetting error', e)
      } finally {
        this.load.setting = false
      }
    },

    // ขวา: parts ตาม seq + lot_size
    async fetchParts() {
      this.load.parts = true
      try {
        const { data } = await api.post('/allseq', {
          sequence_no: Number(this.params.seq),     // <<< ต้องใช้ชื่อนี้
          lot_size: Number(this.params.lotsize)     // <<< และเป็น number
        })
        this.parts = Array.isArray(data?.result) ? data.result : []
        this.currentIndex = 0
      } catch (e) {
        // อย่าให้ไฟล์พังถ้า 500
        this.parts = []
        this.currentIndex = 0
        this.errorMsg = 'โหลด Part (allseq) ไม่สำเร็จ: ' + (e?.message || '')
        console.error('fetchParts error', e)
      } finally {
        this.load.parts = false
      }
    },

    // ปุ่ม
    nextPart() {
      if (this.currentIndex < this.parts.length - 1) this.currentIndex++
    },
    prevPart() {
      if (this.currentIndex > 0) this.currentIndex--
    },
    buildImgUrlFromSA(index) {
      const item = this.saList[index]
      if (!item || !this.currentPart) return null

      const folder = item.submsg
      const key = item.part_name               // เช่น 'fr_coil_lh'
      const filename = this.currentPart?.[key] // เช่น 'GRA2-WH'

      if (!folder || !filename) return null

      // encode เผื่อชื่อมีช่องว่าง/อักขระพิเศษ
      return `${this.imgBase}/${encodeURIComponent(folder)}/${encodeURIComponent(
        filename
      )}.jpg`
    }
  }
}
</script>

<style scoped>
.img-placeholder {
  width: 180px;
  height: 130px;
  background: #eee;
  border: 1px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.lot-grid {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
}

.lot-cell {
  width: 40px;
  height: 40px;
  border: 1px solid #aaa;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.lot-cell.active {
  background: #ffd54f;
  font-weight: bold;
}

/* วางรูป 2 ใบแบบ grid ให้ช่องไฟชัดเจน */
.part-images {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  /* แต่ละฝั่งกิน 1 ส่วนเท่าๆ กัน */
  gap: 20px;
  /* ปรับช่องไฟเพิ่ม/ลดได้ */
  align-items: start;
}

/* กล่องรูป: ให้กว้างเท่าคอลัมน์เสมอ (ไม่กำหนด width เอง) */
.part-img-box {
  width: 100%;
  aspect-ratio: 4 / 3;
  /* เปลี่ยนสัดส่วนได้ เช่น 16/9 หรือ 3/2 */
  border: 1px solid #e1e3e8;
  border-radius: 10px;
  background: #fafafa;
  overflow: hidden;
  /* กันไส้ล้น */
  box-sizing: border-box;
  /* รวม border/padding ในความกว้างคอลัมน์ */
}

/* รูปไม่ล้นกรอบและไม่ยืด */
.part-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

/* placeholder ตอนรูปโหลดไม่ได้ */
.part-img-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eee;
  color: #444;
  border-radius: 10px;
  font-weight: 600;
}

/* จอเล็กให้เรียงลง */
@media (max-width: 992px) {
  .part-images {
    grid-template-columns: 1fr;
  }
}
</style>
