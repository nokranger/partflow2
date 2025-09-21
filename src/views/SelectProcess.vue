<!-- src/views/SelectProcess.vue -->
<template>
  <div class="container py-4 select-process-page" style="border-color: black;border-style: solid;">
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
        <b-form-select-option v-for="p in processes" :key="p.station_id" :value="p">
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

    <!-- Debug info (ลบออกได้เมื่อทำงานถูกต้องแล้ว) -->
    <!-- <div class="mt-3 p-2 bg-light" style="font-size: 12px;">
      <div>Selected Process: {{ selectedProcess ? selectedProcess.name : 'ไม่ได้เลือก' }}</div>
      <div>Station ID: {{ selectedProcess ? selectedProcess.station_id : '-' }}</div>
      <div>Seq: {{ seq }}</div>
    </div> -->
  </div>
</template>

<script>
import api from '@/api/api';

export default {
  name: 'SelectProcess',
  data() {
    return {
      // Process dropdown
      loadingProcesses: false,
      processes: [],         // เก็บข้อมูลจาก /allworkstation
      selectedProcess: null, // จะได้ทั้ง object
      // Seq input
      seq: '',
      maxSeqLength: 12
    }
  },
  computed: {
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
        
        console.log('Loaded processes:', this.processes)
      } finally {
        this.loadingProcesses = false
      }
    },

    // แก้ไข method นี้ให้หา process object ที่ตรงกับ station_id
    setProcessFromSessionStorage() {
      const payload = sessionStorage.getItem("checkPayload");
      if (payload) {
        try {
          const data = JSON.parse(payload);
          
          // ดึงข้อมูลจาก payload
          if (data.parts && data.parts.length > 0) {
            this.seq = String(Number(data.parts[5].sequence_no) + 1);
            console.log("Set seq from parts:", this.seq);
          }
          
          console.log("Payload data:", data);
        } catch (error) {
          console.error('Error parsing payload:', error);
        }
      }

      // ตรวจสอบ station_id จาก checkProcess
      const station = sessionStorage.getItem("checkProcess");
      if (station) {
        try {
          const stationData = JSON.parse(station);
          const targetStationId = stationData.station_id;
          
          console.log("Looking for station_id:", targetStationId);
          console.log("Available processes:", this.processes);
          
          // หา process object ที่มี station_id ตรงกัน
          const foundProcess = this.processes.find(p => 
            Number(p.station_id) === Number(targetStationId)
          );
          
          if (foundProcess) {
            this.selectedProcess = foundProcess;
            console.log("Found and selected process:", foundProcess);
          } else {
            console.log("Process not found for station_id:", targetStationId);
          }
          
        } catch (error) {
          console.error('Error parsing station data:', error);
        }
      }
    },

    onPress(btn) {
      const t = btn.text
      if (t === 'Del') {
        this.seq = this.seq.slice(0, -1)
        return
      }
      if (t === 'Go') {
        if (!this.selectedProcess || !this.seq) {
          alert('กรุณาเลือก Process และใส่ Sequence Number')
          return
        }
        
        console.log('Go pressed:', {
          station_id: this.selectedProcess.station_id,
          seq: this.seq,
          lot_size: this.selectedProcess.lot_size
        });
        
        // บันทึกลง store
        this.$store.commit('setProcess', this.selectedProcess)
        this.$store.commit('setSeq', this.seq)
        
        // ไปหน้าถัดไป
        this.$router.push({ name: 'LayoutPage' })
        return
      }
      
      // number
      if (this.seq.length < this.maxSeqLength) {
        this.seq += t
      }
    },

    getBoxStation() {
      // placeholder method
    }
  },

  async mounted() {
    // โหลด processes ก่อน
    await this.loadProcesses()
    
    // จากนั้นค่อยเซ็ต selected process
    // ใช้ nextTick เพื่อให้ processes โหลดเสร็จก่อน
    this.$nextTick(() => {
      this.setProcessFromSessionStorage()
    })
    
    await this.getBoxStation()
  }
}
</script>

<style scoped>
select,
input {
  width: 100%;
  box-sizing: border-box;
}

.form-group {
  width: 100%;
}

.form-group select,
.form-group input {
  width: 100%;
  box-sizing: border-box;
}

.select-process-page {
  max-width: 980px;
}

.floating-label {
  font-weight: 600;
  color: #5b3aa2;
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