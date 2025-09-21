<template>
  <div class="container py-3">
    <div class="text-center mb-3">
      <h3>Select Process NO: {{ headerSeq }}</h3>
    </div>

    <div class="row">
      <!-- ฝั่งซ้าย: Layout -->
      <div class="col-md-6 mb-4">
        <h5 class="text-center">Layout location</h5>
        <div v-if="load.layout" class="text-center text-muted py-5">Loading...</div>
        <GridBoxes v-else :boxes="boxes" :baseWidth="860" :baseHeight="660" :allowUpscale="false"
          :highlightRhIds="highlightRhIds" :highlightLhIds="highlightLhIds" />
      </div>

      <!-- ฝั่งขวา: Part + Setting + ปุ่ม -->
      <div class="col-md-6">
        <div v-if="load.setting || load.parts" class="text-center text-muted py-5">
          Loading...
        </div>

        <template v-else>
          <!-- หัวข้อ LH/RH ตาม setting.sb -->
          <div class="row mb-3">
            <div class="col text-left" style="color:#ff9800">
              <div>LH : Submsg: {{ headerLH.submsg }}</div>
              <div>Part Name: {{ headerLH.partName }}</div>
              <div class="small text-muted">Priority: {{ currentPartPriority || 'N/A' }}</div>
            </div>
            <div class="col text-success">
              <div>RH : Submsg: {{ headerRH.submsg }}</div>
              <div>Part Name: {{ headerRH.partName }}</div>
              <div class="small text-muted">Index: {{ currentIndex + 1 }}/{{ orderedParts.length }}</div>
            </div>
          </div>

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
              :disabled="currentIndex >= orderedParts.length - 1">Next</button>
            <b-button class="ml-2" @click="onConfirmCheck">Confirm Check</b-button>
          </div>
          <PickGrid :lot-size="Number(params.lotsize)" :active-index="activeIndex" />
        </template>
      </div>
    </div>

    <!-- แสดงข้อผิดพลาด -->
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
  name: 'LayoutPageB',
  components: { GridBoxes, PickGrid },
  data() {
    return {
      boxes: [],
      stationSetting: null,
      parts: [],
      currentIndex: 0,
      errorMsg: '',
      load: { layout: true, setting: true, parts: true },
      imgErrLH: false,
      imgErrRH: false,
    }
  },
  computed: {
    params() {
      const p = this.$store.state.selection.process || {}
      return {
        seq: this.$store.state.selection.seq,
        station_id: p.station_id,
        lotsize: p.lot_size
      }
    },

    // แปลง setting.sb เป็น array (เปลี่ยนจาก sa เป็น sb)
    sbList() {
      try {
        const raw = this.stationSetting?.sb || '[]'
        const arr = JSON.parse(raw)
        return Array.isArray(arr) ? arr : []
      } catch {
        return []
      }
    },

    // Part ปัจจุบันที่แสดง
    currentPart() {
      return this.orderedParts[this.currentIndex] || null;
    },

    // เรียงลำดับ parts ตาม sequence_no
    partsAsc() {
      return [...this.parts].sort((a, b) => Number(a.sequence_no) - Number(b.sequence_no));
    },

    // Parts เรียงตาม priority ในกล่อง
    orderedParts() {
      // สร้าง map ของ priority -> parts ที่ตรงกับกล่องนั้น
      const priorityMap = new Map();

      // วนผ่าน parts แต่ละตัว
      for (const part of this.parts) {
        // หา priority ของ part นี้จากกล่อง
        const partPriority = this.getPartPriority(part);
        if (partPriority) {
          if (!priorityMap.has(partPriority)) {
            priorityMap.set(partPriority, []);
          }
          priorityMap.get(partPriority).push(part);
        }
      }

      // เรียง parts ตาม priority จากน้อยไปมาก
      const ordered = [];
      const sortedPriorities = Array.from(priorityMap.keys()).sort((a, b) => a - b);

      for (const priority of sortedPriorities) {
        const partsInPriority = priorityMap.get(priority);
        // ถ้ามีหลาย part ใน priority เดียวกัน ให้เรียงตาม sequence_no
        partsInPriority.sort((a, b) => Number(a.sequence_no) - Number(b.sequence_no));
        ordered.push(...partsInPriority);
      }

      // ใส่ parts ที่ไม่มี priority ไว้ท้าย
      const partsWithoutPriority = this.parts.filter(part => !this.getPartPriority(part));
      partsWithoutPriority.sort((a, b) => Number(a.sequence_no) - Number(b.sequence_no));
      ordered.push(...partsWithoutPriority);

      return ordered;
    },

    // Index ปัจจุบันใน partsAsc (สำหรับ PickGrid)
    activeIndex() {
      if (!this.currentPart) return null;
      return this.partsAsc.findIndex(p => String(p.sequence_no) === String(this.currentPart.sequence_no));
    },

    // หัวข้อ LH จาก setting.sb (เปลี่ยนจาก saList เป็น sbList)
    headerLH() {
      const item = this.sbList[0] || null   // LH = sb[0] 
      const key = item?.part_name
      return {
        submsg: item?.submsg || '-',
        partName: (key && this.currentPart && this.currentPart[key]) ? this.currentPart[key] : '-'
      }
    },

    // หัวข้อ RH จาก setting.sb (เปลี่ยนจาก saList เป็น sbList)
    headerRH() {
      const item = this.sbList[1] || null   // RH = sb[1]
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

    // ไฮไลต์กล่อง RH - จับคู่ submsg กับ fr_coil_rh (ใช้ sbList แทน saList)
    highlightRhIds() {
      if (!this.currentPart) return [];

      const rhSetting = this.sbList[1]; // RH setting จาก sb
      if (!rhSetting) return [];

      const targetSubmsg = rhSetting.submsg; // submsg จาก setting
      const targetValue = this.currentPart[rhSetting.part_name]; // ค่าจาก part data เช่น YE2-BL1

      return this.boxes
        .filter(box =>
          box.submsg === targetSubmsg &&
          box.conversion_char === targetValue
        )
        .map(box => box.boxid);
    },

    // ไฮไลต์กล่อง LH - จับคู่ submsg กับ fr_coil_lh (ใช้ sbList แทน saList)
    highlightLhIds() {
      if (!this.currentPart) return [];

      const lhSetting = this.sbList[0]; // LH setting จาก sb
      if (!lhSetting) return [];

      const targetSubmsg = lhSetting.submsg; // submsg จาก setting
      const targetValue = this.currentPart[lhSetting.part_name]; // ค่าจาก part data เช่น YE2-BL1

      return this.boxes
        .filter(box =>
          box.submsg === targetSubmsg &&
          box.conversion_char === targetValue
        )
        .map(box => box.boxid);
    },

    // Base URL สำหรับรูปภาพ
    imgBase() {
      return (
        process.env.VUE_APP_IMG_BASE_URL ||
        process.env.VUE_APP_API_BASE_URL ||
        'http://192.168.1.138:4000'
      )
    },

    // URL รูป LH (ใช้ buildImgUrlFromSB แทน buildImgUrlFromSA)
    imgLH() {
      return this.buildImgUrlFromSB(0)  // LH = sb[0]
    },

    // URL รูป RH (ใช้ buildImgUrlFromSB แทน buildImgUrlFromSA)
    imgRH() {
      return this.buildImgUrlFromSB(1)  // RH = sb[1]
    },

    // Priority ของ part ปัจจุบัน (สำหรับแสดงผล)
    currentPartPriority() {
      return this.currentPart ? this.getPartPriority(this.currentPart) : null;
    }
  },

  async mounted() {
    if (!this.params.station_id || !this.params.seq) {
      this.$router.replace({ name: 'SelectProcess' })
      return
    }

    // โหลดข้อมูลทั้งหมด
    await Promise.all([
      this.fetchLayout(),
      this.fetchSetting(),
      this.fetchParts()
    ])
  },

  methods: {
    // โหลด layout boxes
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

    // โหลด station setting
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

    // โหลด parts data
    async fetchParts() {
      this.load.parts = true
      try {
        const { data } = await api.post('/allseq', {
          sequence_no: Number(this.params.seq),
          lot_size: Number(this.params.lotsize)
        })
        this.parts = Array.isArray(data?.result) ? data.result : []
        this.currentIndex = 0
      } catch (e) {
        this.parts = []
        this.currentIndex = 0
        this.errorMsg = 'โหลด Part (allseq) ไม่สำเร็จ: ' + (e?.message || '')
        console.error('fetchParts error', e)
      } finally {
        this.load.parts = false
      }
    },

    // ปุ่ม Next
    nextPart() {
      if (this.currentIndex < this.orderedParts.length - 1) {
        this.currentIndex++
      }
    },

    // ปุ่ม Back
    prevPart() {
      if (this.currentIndex > 0) {
        this.currentIndex--
      }
    },

    // ปุ่ม Confirm Check - ไปหน้าตรวจคำตอบ
    onConfirmCheck() {
      if (!this.stationSetting) {
        console.error("stationSetting is null, ต้อง fetchSetting() ให้เสร็จก่อน")
        return
      }

      // parse ค่า sa / sb จาก setting
      let saConfig = []
      let sbConfig = []
      try {
        saConfig = this.stationSetting.sa ? JSON.parse(this.stationSetting.sa) : []
        sbConfig = this.stationSetting.sb ? JSON.parse(this.stationSetting.sb) : []
      } catch (e) {
        console.error("parse sa/sb error:", e)
      }

      // map ให้สื่อความหมายมากขึ้น
      const saData = saConfig.map(c => ({
        submsg: c.submsg,
        partName: c.part_name
      }))
      const sbData = sbConfig.map(c => ({
        submsg: c.submsg,
        partName: c.part_name
      }))

      // เก็บ payload ลง sessionStorage พร้อมระบุว่าเป็น role B
      const payload = {
        parts: this.parts || [],
        index: this.currentIndex || 0,
        sa: saData,
        sb: sbData,
        currentRole: 'B' // ระบุว่าเป็น role B
      }

      sessionStorage.setItem("checkProcess", JSON.stringify(this.$store.state.selection.process))
      sessionStorage.setItem("checkPayload", JSON.stringify(payload))
      this.$router.push({ name: "AnswerCheckPageB" })
    },
    
    // สร้าง URL รูปภาพจาก setting.sb (เปลี่ยนจาก buildImgUrlFromSA เป็น buildImgUrlFromSB)
    buildImgUrlFromSB(index) {
      const item = this.sbList[index]
      if (!item || !this.currentPart) return null

      const folder = item.submsg
      const key = item.part_name
      const filename = this.currentPart?.[key]

      if (!folder || !filename) return null

      // encode เพื่อความปลอดภัย
      return `${this.imgBase}/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}.jpg`
    },

    // หา priority ของ part จากการจับคู่กับกล่อง (ใช้ sbList แทน saList)
    getPartPriority(part) {
      if (!part || !this.sbList.length) return null;

      // ตรวจสอบทั้ง LH และ RH
      for (let i = 0; i < this.sbList.length; i++) {
        const setting = this.sbList[i];
        if (!setting) continue;

        const targetSubmsg = setting.submsg;
        const targetValue = part[setting.part_name];

        if (!targetSubmsg || !targetValue) continue;

        // หากล่องที่มี submsg และ conversion_char ตรงกัน
        const matchedBox = this.boxes.find(box =>
          box.submsg === targetSubmsg &&
          box.conversion_char === targetValue &&
          box.priority > 0
        );

        if (matchedBox) {
          return Number(matchedBox.priority);
        }
      }

      return null;
    },
  }
}
</script>

<style scoped>
/* === TABLET OPTIMIZED STYLES === */

/* Container adjustments */
.container {
  max-width: 100%;
  padding: 15px;
}

/* Header styling */
h3 {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
}

h5 {
  font-size: 20px;
  font-weight: 600;
  color: #444;
  margin-bottom: 15px;
}

/* Part info sections */
.row.mb-3 .col div {
  font-size: 16px;
  font-weight: 500;
  line-height: 1.4;
  margin-bottom: 8px;
}

.small.text-muted {
  font-size: 14px !important;
}

/* Part images container */
.part-images {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  align-items: start;
  margin: 25px 0;
}

.part-img-box {
  width: 100%;
  aspect-ratio: 4 / 3;
  border: 2px solid #e1e3e8;
  border-radius: 12px;
  background: #fafafa;
  overflow: hidden;
  box-sizing: border-box;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.part-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

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
  font-size: 18px;
}

/* Button styling */
.btn {
  font-size: 18px !important;
  font-weight: 600 !important;
  padding: 12px 24px !important;
  border-radius: 10px !important;
  min-height: 50px;
  border-width: 2px !important;
  transition: all 0.3s ease;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.15);
}

.btn:active {
  transform: translateY(0);
}

.btn-primary {
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%) !important;
}

.btn-outline-primary {
  border-color: #007bff !important;
  color: #007bff !important;
  background: transparent !important;
}

.btn-outline-primary:hover {
  background: #007bff !important;
  color: white !important;
}

/* Button container */
.d-flex.justify-content-center {
  gap: 15px;
  margin: 25px 0;
  flex-wrap: wrap;
}

/* Loading states */
.text-center.text-muted.py-5 {
  font-size: 18px;
  font-weight: 500;
}

/* Error messages */
.alert {
  font-size: 16px;
  font-weight: 500;
  border-radius: 10px;
  border-width: 2px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .part-images {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  h3 {
    font-size: 24px;
  }
  
  h5 {
    font-size: 18px;
  }
  
  .row.mb-3 .col div {
    font-size: 15px;
  }
  
  .btn {
    font-size: 16px !important;
    padding: 10px 20px !important;
    min-height: 45px;
  }
}

/* High DPI / Retina screens */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .part-img-box {
    border-width: 1px;
  }
  
  .btn {
    border-width: 1px !important;
  }
}

/* Large tablet landscape */
@media (min-width: 1200px) {
  h3 {
    font-size: 32px;
  }
  
  h5 {
    font-size: 22px;
  }
  
  .row.mb-3 .col div {
    font-size: 18px;
  }
  
  .btn {
    font-size: 20px !important;
    padding: 14px 28px !important;
    min-height: 55px;
  }
  
  .part-img-fallback {
    font-size: 20px;
  }
}

/* Specific adjustments for tablet in landscape with browser tabs */
@media (max-height: 900px) and (min-width: 1024px) {
  .container {
    padding: 10px;
  }
  
  h3 {
    font-size: 26px;
    margin-bottom: 15px;
  }
  
  h5 {
    font-size: 19px;
    margin-bottom: 12px;
  }
  
  .part-images {
    margin: 20px 0;
  }
  
  .d-flex.justify-content-center {
    margin: 20px 0;
  }
}
</style>