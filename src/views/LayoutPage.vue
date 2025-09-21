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
        <GridBoxes v-else :boxes="boxes" :baseWidth="860" :baseHeight="520" :allowUpscale="false"
          :highlightRhIds="highlightRhIds" :highlightLhIds="highlightLhIds" />
      </div>

      <!-- ฝั่งขวา: Part + Setting + ปุ่ม -->
      <div class="col-md-6">
        <div v-if="load.setting || load.parts" class="text-center text-muted py-5">
          Loading...
        </div>

        <template v-else>
          <!-- หัวข้อ LH/RH ตาม setting.sa -->
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
  name: 'LayoutPage',
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

    // แปลง setting.sa เป็น array
    saList() {
      try {
        const raw = this.stationSetting?.sa || '[]'
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

    // หัวข้อ LH จาก setting.sa
    headerLH() {
      const item = this.saList[0] || null   // LH = sa[0] 
      const key = item?.part_name
      return {
        submsg: item?.submsg || '-',
        partName: (key && this.currentPart && this.currentPart[key]) ? this.currentPart[key] : '-'
      }
    },

    // หัวข้อ RH จาก setting.sa  
    headerRH() {
      const item = this.saList[1] || null   // RH = sa[1]
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

    // ไฮไลต์กล่อง RH - จับคู่ submsg กับ fr_coil_rh
    highlightRhIds() {
      if (!this.currentPart) return [];

      const rhSetting = this.saList[1]; // RH setting
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

    // ไฮไลต์กล่อง LH - จับคู่ submsg กับ fr_coil_lh  
    highlightLhIds() {
      if (!this.currentPart) return [];

      const lhSetting = this.saList[0]; // LH setting
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

    // URL รูป LH
    imgLH() {
      return this.buildImgUrlFromSA(0)  // LH = sa[0]
    },

    // URL รูป RH
    imgRH() {
      return this.buildImgUrlFromSA(1)  // RH = sa[1]
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

    // เช็คการเข้าถึงหน้าก่อน
    if (!(await this.validatePageAccess())) {
      return;
    }

    // โหลดข้อมูลทั้งหมด
    await Promise.all([
      this.fetchLayout(),
      this.fetchSetting(),
      this.fetchParts() // fetchParts จะเช็ค lotsize เองแล้ว
    ]);
  },

  // เพิ่ม method สำหรับ debug (สามารถลบได้)
  debugInfo() {
    return {
      expectedLotSize: Number(this.params.lotsize),
      actualPartsCount: this.parts.length,
      partsSequences: this.parts.map(p => p.sequence_no),
      storeData: this.$store.state.selection
    };
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
    // เพิ่ม method สำหรับเช็ค lotsize
    validateLotSize() {
      const expectedLotSize = Number(this.params.lotsize);
      const actualPartsCount = this.parts.length;

      console.log('Expected lotsize:', expectedLotSize);
      console.log('Actual parts count:', actualPartsCount);
      console.log('Parts data:', this.parts);

      // เช็คว่า parts ที่ได้มามีจำนวนครบตาม lotsize หรือไม่
      if (actualPartsCount < expectedLotSize) {
        console.warn(`Parts count (${actualPartsCount}) is less than expected lotsize (${expectedLotSize})`);

        // แสดง alert แจ้งเตือน
        alert(`จำนวน Lot size ไม่ครบ!\nต้องการ: ${expectedLotSize} parts\nได้รับ: ${actualPartsCount} parts\nกรุณาเลือก Process ใหม่`);

        // กลับไปหน้า SelectProcess
        this.$router.replace({ name: 'SelectProcess' });
        return false;
      }

      // เช็คว่ามี parts ที่จำเป็นหรือไม่
      if (actualPartsCount === 0) {
        console.warn('No parts found');
        alert('ไม่พบข้อมูล Parts\nกรุณาเลือก Process และ Sequence Number ใหม่');
        this.$router.replace({ name: 'SelectProcess' });
        return false;
      }

      return true;
    },
    async validatePageAccess() {
      // เช็ค params พื้นฐาน
      if (!this.params.station_id || !this.params.seq) {
        console.warn('Missing station_id or seq');
        this.$router.replace({ name: 'SelectProcess' });
        return false;
      }

      // เช็ค lotsize ว่าเป็นตัวเลขที่ถูกต้อง
      const lotsize = Number(this.params.lotsize);
      if (!lotsize || lotsize <= 0) {
        console.warn('Invalid lotsize:', this.params.lotsize);
        alert('Lot Size ไม่ถูกต้อง\nกรุณาเลือก Process ใหม่');
        this.$router.replace({ name: 'SelectProcess' });
        return false;
      }

      return true;
    },

    // โหลด parts data
    async fetchParts() {
      this.load.parts = true;
      try {
        const { data } = await api.post('/allseq', {
          sequence_no: Number(this.params.seq),
          lot_size: Number(this.params.lotsize)
        });

        this.parts = Array.isArray(data?.result) ? data.result : [];
        this.currentIndex = 0;

        console.log('Fetched parts:', this.parts.length, 'items');

        // เช็ค lotsize หลังจากโหลดข้อมูลเสร็จ
        if (!this.validateLotSize()) {
          return; // ถ้าไม่ผ่านการเช็ค จะ redirect แล้ว
        }

      } catch (e) {
        this.parts = [];
        this.currentIndex = 0;
        this.errorMsg = 'โหลด Part (allseq) ไม่สำเร็จ: ' + (e?.message || '');
        console.error('fetchParts error', e);

        // ถ้า error ก็ให้กลับไปหน้า select
        setTimeout(() => {
          this.$router.replace({ name: 'SelectProcess' });
        }, 3000);

      } finally {
        this.load.parts = false;
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
    confirmCheck() {
      // บันทึกข้อมูลปัจจุบันลง store
      this.$store.commit('setCurrentPartData', {
        currentIndex: this.currentIndex,
        currentPart: this.currentPart,
        priority: this.currentPartPriority
      })

      // ไปหน้าตรวจคำตอบ
      this.$router.push({ name: 'AnswerCheckPage' })
    },
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

      // เก็บ payload ลง sessionStorage
      const payload = {
        parts: this.parts || [],
        index: this.currentIndex || 0,
        sa: saData,
        sb: sbData
      }
      sessionStorage.setItem("checkProcess", JSON.stringify(this.$store.state.selection.process))
      sessionStorage.setItem("checkPayload", JSON.stringify(payload))
      this.$router.push({ name: "AnswerCheckPage" })
    },
    // สร้าง URL รูปภาพจาก setting.sa
    buildImgUrlFromSA(index) {
      const item = this.saList[index]
      if (!item || !this.currentPart) return null

      const folder = item.submsg
      const key = item.part_name
      const filename = this.currentPart?.[key]

      if (!folder || !filename) return null

      // encode เพื่อความปลอดภัย
      return `${this.imgBase}/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}.jpg`
    },

    // หา priority ของ part จากการจับคู่กับกล่อง
    getPartPriority(part) {
      if (!part || !this.saList.length) return null;

      // ตรวจสอบทั้ง LH และ RH
      for (let i = 0; i < this.saList.length; i++) {
        const setting = this.saList[i];
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
.part-images {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  align-items: start;
}

.part-img-box {
  width: 100%;
  aspect-ratio: 4 / 3;
  border: 1px solid #e1e3e8;
  border-radius: 10px;
  background: #fafafa;
  overflow: hidden;
  box-sizing: border-box;
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
}

@media (max-width: 992px) {
  .part-images {
    grid-template-columns: 1fr;
  }
}
</style>