<!-- src/views/SelectProcess.vue -->
<template>
  <div class="container py-4 select-process-page" style="border-color: black;border-style: solid;">
    <!-- Allbox status -->
    <!-- <div class="text-center mb-3">
      <span :class="{
        'text-danger': connectState === 'connecting' || connectState === 'error',
        'text-success': connectState === 'ok'
      }" class="h4">
        {{ connectMessage }}
      </span>
    </div> -->

    <!-- Dropdown: Select Process -->
    <b-form-group label="" label-size="lg" label-class="floating-label" class="mb-3">
      <b-form-select v-model="selectedProcess" :disabled="loadingProcesses" class="big-control">
        <!-- option แรก -->
        <template #first>
          <b-form-select-option :value="null" disabled style="text-align: center;">
            {{ loadingProcesses ? 'กำลังโหลดรายการ...' : '— เลือก Process —' }}
          </b-form-select-option>
        </template>

        <!-- วนลูปสร้าง option -->
        <b-form-select-option v-for="p in processes" :key="p.stationid" :value="p">
          {{ p.name }}
        </b-form-select-option>
      </b-form-select>
    </b-form-group>

    <!-- Seq input (read-only) -->
    <b-form-group label="" label-size="lg" label-class="floating-label" class="mb-4">
      <b-form-input v-model="seq" readonly class="big-control text-left seq-box" placeholder="" />
    </b-form-group>

    <!-- Keypad -->
    <div class="row no-gutters" v-for="(row, rowIndex) in keypadRows" :key="'row-' + rowIndex">
      <div class="col d-flex justify-content-center" v-for="(btn, btnIndex) in row"
        :key="'btn-' + rowIndex + '-' + btnIndex">
        <b-button :variant="btn.variant || 'light'" class="pad-btn my-2" @click="onPress(btn)">
          {{ btn.text }}
        </b-button>
      </div>
    </div>

  </div>
</template>

<script>
import api from '@/api/api';
export default {
  name: 'SelectProcess',
  data() {
    return {
      // Allbox status
      connectState: 'connecting', // 'connecting' | 'ok' | 'error'
      // Process dropdown
      loadingProcesses: true,
      processes: [],         // เก็บข้อมูลจาก /allworkstation
      selectedProcess: null, // จะได้ทั้ง object
      loadingProcesses: false,
      // Seq input
      seq: '',
      maxSeqLength: 12
    }
  },
  computed: {
    connectMessage() {
      if (this.connectState === 'connecting') return 'กำลังเชื่อมต่อ API Allbox...'
      if (this.connectState === 'ok') return 'เชื่อมต่อ API Allbox สำเร็จ'
      return 'เชื่อมต่อ API Allbox ล้มเหลว'
    },
    processOptions() {
      return this.processes.map(p => ({ value: p.id, text: p.name }))
    },
    keypadRows() {
      // จัด layout ปุ่มให้เหมือนภาพ
      const rows = [
        [{ text: '1' }, { text: '2' }, { text: '3' }],
        [{ text: '4' }, { text: '5' }, { text: '6' }],
        [{ text: '7' }, { text: '8' }, { text: '9' }],
        [{ text: 'Del', variant: 'light' }, { text: '0' }, { text: 'Go', variant: 'light' }]
      ]
      return rows
    }
  },
  methods: {
    async pingAllbox() {
      try {
        await axios.get('/api/allbox/ping') // ปรับเป็น endpoint จริงของคุณ
        this.connectState = 'ok'
      } catch (e) {
        this.connectState = 'error'
      }
    },
    async loadProcesses() {
      this.loadingProcesses = true
      try {
        const { data } = await api.get('/allworkstation')
        this.processes = Array.isArray(data.result)
          ? data.result.map(x => ({
            station_id: x.station_id,
            name: x.name,
            lot_size: x.lot_size
          }))
          : []
      } finally {
        this.loadingProcesses = false
      }
    },
    onPress(btn) {
      const t = btn.text
      if (t === 'Del') {
        this.seq = this.seq.slice(0, -1)
        return
      }
      if (t === 'Go') {
        console.log('select and seq ============', this.selectedProcess.station_id + this.seq + this.selectedProcess.lot_size)
        // ใน SelectProcess.vue
        this.$store.commit('setProcess', this.selectedProcess) // {station_id, name, lot_size, ...}
        this.$store.commit('setSeq', this.seq)
        this.$router.push({ name: 'LayoutPage' })
        // let selectBox = {
        //   station_id: this.selectedProcess.station_id
        // }
        // api.post('/allboxstationCanva2', selectBox).then(response => {
        //   console.log('show allbox', response.data.result)
        // }).catch(error => {
        //   console.error('Error fetching data:', error.message);
        // })
        // let selectSeq = {
        //   sequence_no: this.seq,
        //   lot_size: this.selectedProcess.lot_size
        // }
        // api.post('/allseq', selectSeq).then(response => {
        //   console.log('show allbox', response.data.result)
        // }).catch(error => {
        //   console.error('Error fetching data:', error.message);
        // })
        // if (!this.selectedProcessId || !this.seq) return
        // ไปหน้าถัดไป: Layout + Part
        // this.$router.push({
        //   name: 'LayoutPage',
        //   query: { processId: this.selectedProcessId, seq: this.seq }
        // })
        return
      }
      // number
      if (this.seq.length < this.maxSeqLength) {
        this.seq += t
      }
    },
    getBoxStation() {
      ///allboxstationCanva
      // api.get('/allworkstation').then(response => {
      //   console.log('show allbox', response.data.result)
      // }).catch(error => {
      //   console.error('Error fetching data:', error.message);
      // })
    }
  },
  async mounted() {
    const payload = sessionStorage.getItem("checkPayload");
    if (payload) {
      const data = JSON.parse(payload);

      this.parts = data.parts || [];
      this.sa = data.sa || [];
      this.sb = data.sb || [];
      console.log("parts:", this.parts[5].sequence_no);
      console.log("sa config:", this.sa);
      console.log("sb config:", this.sb);
      this.seq = Number(this.parts[5].sequence_no) + 1
    }
    // await this.pingAllbox()
    await this.loadProcesses()
    await this.getBoxStation()
  }
}
</script>

<style scoped>
select,
input {
  width: 100%;
  box-sizing: border-box;
  /* ให้รวม padding/border ใน width */
}

.form-group {
  width: 100%
    /* หรือใช้ % ตาม layout */
}

.form-group select,
.form-group input {
  width: 100%;
  box-sizing: border-box;
}

/* โทนใกล้ภาพ: ขอบม่วง, ตัวอักษรใหญ่, ปุ่ม pill */
.select-process-page {
  max-width: 980px;
}


.floating-label {
  font-weight: 600;
  color: #5b3aa2;
  /* ม่วงอมน้ำเงิน */
}

.big-control {
  height: 56px;
  font-size: 28px;
  border: 2px solid #7a56d8 !important;
  border-radius: 10px;
  box-shadow: none;
}

.seq-box {
  text-indent: 16px;
}

.keypad {
  max-width: 520px;
}

.pad-btn {
  min-width: 110px;
  min-height: 66px;
  font-size: 32px;
  border-radius: 28px;
  border: 1px solid #e7e3f5;
  box-shadow: 0 4px 10px rgba(64, 36, 144, 0.08);
  color: #6a4ac5;
  background-color: #f6f3ff;
}

.pad-btn:active,
.pad-btn:focus {
  transform: translateY(1px);
}

.text-success {
  color: #2eaf2e !important;
}

.text-danger {
  color: #e74c3c !important;
}
</style>
