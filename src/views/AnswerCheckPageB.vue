<template>
  <div class="game-container">
    <b-row>
      <!-- ฝั่งซ้าย: รายการคำถาม -->
      <b-col cols="6">
        <h5 style="font-size: 28px;">Part</h5>
        <div 
          v-for="(part, index) in parts" 
          :key="part.sequence_no || index" 
          class="answer-item"
          :class="{
            'current-question': index === currentIndex,
            'answered-correct': answeredParts.includes(index)
          }"
        >
          <p>{{ formatLine(part) }}</p>
          <!-- <p v-if="!answeredParts.includes(index)" class="not-answered">ยังไม่ได้ตอบ</p> -->
          <!-- <p v-else class="answered">✓ ตอบถูกแล้ว</p> -->
           <br>
        </div>
      </b-col>

      <!-- ฝั่งขวา: คำตอบ -->
      <b-col cols="6">
        <h5 style="font-size: 28px;">Answer</h5>
        
        <!-- แสดงคำตอบเฉพาะเมื่อยังไม่ตอบครบ -->
        <div v-if="!gameCompleted">
          <!-- คู่บน -->
          <div v-if="topPairData" class="answer-section">
            <h6>ตัวเลือก A</h6>
            <div 
              class="answer-pair clickable" 
              @click="checkAnswer('top')"
              :class="{ 
                'correct-answer': showCorrectTop,
                'wrong-answer': showWrongTop 
              }"
            >
              <div class="answer-box">
                <img 
                  :src="buildImg(sb[0].submsg, topPairData.part[sb[0].partName])"
                  :alt="`${sb[0].submsg}-${topPairData.part[sb[0].partName]}`" 
                  @error="onImgError"
                />
                <div class="caption">{{ sb[0].submsg }}</div>
              </div>
              <div class="answer-box">
                <img 
                  :src="buildImg(sb[1].submsg, topPairData.part[sb[1].partName])"
                  :alt="`${sb[1].submsg}-${topPairData.part[sb[1].partName]}`" 
                  @error="onImgError"
                />
                <div class="caption">{{ sb[1].submsg }}</div>
              </div>
            </div>
          </div>

          <!-- คู่ล่าง -->
          <div v-if="bottomPairData" class="answer-section">
            <h6>ตัวเลือก B</h6>
            <div 
              class="answer-pair clickable" 
              @click="checkAnswer('bottom')"
              :class="{ 
                'correct-answer': showCorrectBottom,
                'wrong-answer': showWrongBottom 
              }"
            >
              <div class="answer-box">
                <img 
                  :src="buildImg(sb[0].submsg, bottomPairData.part[sb[0].partName])"
                  :alt="`${sb[0].submsg}-${bottomPairData.part[sb[0].partName]}`" 
                  @error="onImgError"
                />
                <div class="caption">{{ sb[0].submsg }}</div>
              </div>
              <div class="answer-box">
                <img 
                  :src="buildImg(sb[1].submsg, bottomPairData.part[sb[1].partName])"
                  :alt="`${sb[1].submsg}-${bottomPairData.part[sb[1].partName]}`" 
                  @error="onImgError"
                />
                <div class="caption">{{ sb[1].submsg }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ข้อมูล Debug และปุ่ม Next Page -->
        <div class="bottom-section">
          <div class="debug-info">
            <p>ข้อปัจจุบัน: {{ currentIndex + 1 }} / {{ parts.length }}</p>
            <p>ตอบถูกแล้ว: {{ answeredParts.length }} ข้อ</p>
          </div>
          
          <!-- ปุ่ม Next Page -->
          <div class="next-page-section">
            <b-button 
              :variant="gameCompleted ? 'primary' : 'secondary'" 
              :disabled="!gameCompleted"
              size="lg" 
              @click="nextPage"
              class="next-page-btn"
            >
              Confirm Check
            </b-button>
          </div>
        </div>
      </b-col>
    </b-row>
  </div>
</template>

<script>
import api from '@/api/api'

export default {
  data() {
    return {
      parts: [],
      currentIndex: 0,
      answeredParts: [], // เก็บ index ของข้อที่ตอบถูกแล้ว
      imgBase: process.env.VUE_APP_API_BASE_URL || 'http://192.168.1.138:4000',
      sa: [],
      sb: [],
      randomPart: null,
      showCorrectTop: false,
      showCorrectBottom: false,
      showWrongTop: false,
      showWrongBottom: false,
      gameCompleted: false,
      isCorrectAnswerOnTop: true, // สุ่มว่าคำตอบที่ถูกอยู่บนหรือล่าง
    }
  },
  
  computed: {
    currentPart() { 
      return this.parts[this.currentIndex] || null 
    },
    
    topPairData() {
      if (!this.currentPart || !this.randomPart) return null;
      return this.isCorrectAnswerOnTop 
        ? { part: this.currentPart, isCorrect: true }
        : { part: this.randomPart, isCorrect: false };
    },
    
    bottomPairData() {
      if (!this.currentPart || !this.randomPart) return null;
      return this.isCorrectAnswerOnTop 
        ? { part: this.randomPart, isCorrect: false }
        : { part: this.currentPart, isCorrect: true };
    }
  },

  methods: {
    buildImg(submsg, partName) {
      const s = encodeURIComponent(submsg);
      const p = encodeURIComponent(partName);
      console.log(`${this.imgBase}/${s}/${p}.jpg`)
      return `${this.imgBase}/${s}/${p}.jpg`;
    },

    onImgError(e) {
      e.target.src = `${this.imgBase}/placeholder.png`;
    },

    formatLine(part) {
      const list = Array.isArray(this.sb) ? this.sb : [];
      const pieces = list.map(cfg => {
        const val = part?.[cfg.partName] ?? '-';
        return `${cfg.submsg} - ${val}`;
      });
      const joined = pieces.join(' และ ');
      const seq = part?.sequence_no ? `${part.sequence_no} : ` : '';
      return seq + joined;
    },

    getRandomPart() {
      if (!this.parts.length) return null
      
      // หาข้อที่ไม่ใช่ข้อปัจจุบัน
      const availableParts = this.parts.filter((part, index) => 
        index !== this.currentIndex
      );
      
      if (availableParts.length === 0) return null;
      
      const idx = Math.floor(Math.random() * availableParts.length);
      return availableParts[idx];
    },

    randomizeAnswerPosition() {
      // สุ่มว่าคำตอบที่ถูกจะอยู่บนหรือล่าง
      this.isCorrectAnswerOnTop = Math.random() >= 0.5;
    },

    checkAnswer(position) {
      const isCorrectClick = (position === 'top' && this.isCorrectAnswerOnTop) || 
                           (position === 'bottom' && !this.isCorrectAnswerOnTop);
      
      if (isCorrectClick) {
        // ตอบถูก
        if (position === 'top') {
          this.showCorrectTop = true;
        } else {
          this.showCorrectBottom = true;
        }
        
        this.answeredParts.push(this.currentIndex);
        
        setTimeout(() => {
          this.showCorrectTop = false;
          this.showCorrectBottom = false;
          this.goToNextQuestion();
        }, 1000);
        
      } else {
        // ตอบผิด
        if (position === 'top') {
          this.showWrongTop = true;
          setTimeout(() => {
            this.showWrongTop = false;
            this.setupNewRound();
          }, 800);
        } else {
          this.showWrongBottom = true;
          setTimeout(() => {
            this.showWrongBottom = false;
            this.setupNewRound();
          }, 800);
        }
      }
    },

    setupNewRound() {
      // สร้างรอบใหม่: สุ่มคำตอบและตำแหน่ง
      this.randomPart = this.getRandomPart();
      this.randomizeAnswerPosition();
    },

    goToNextQuestion() {
      // หาข้อถัดไปที่ยังไม่ได้ตอบ
      let nextIndex = this.currentIndex + 1;
      
      while (nextIndex < this.parts.length && this.answeredParts.includes(nextIndex)) {
        nextIndex++;
      }
      
      if (nextIndex >= this.parts.length) {
        // ตอบครบทุกข้อแล้ว
        this.gameCompleted = true;
      } else {
        this.currentIndex = nextIndex;
        this.setupNewRound();
      }
    },

        async nextPage() {
      if (this.currentRole === 'A') {
        // เสร็จ Role A แล้ว ไป Role B
        this.goToPartB();
      } else {
        // เสร็จ Role B แล้ว - ส่งข้อมูลอัพเดต
        await this.completeAllParts();
      }
    },

    // แก้ไข method completeAllParts เพื่อส่งข้อมูลอัพเดต
    async completeAllParts() {
      try {
        // ส่งข้อมูลอัพเดตสำหรับทุก part ที่ทำเสร็จ
        await this.updateCompletedParts();
        
        // แสดงข้อความสำเร็จ
        this.$bvToast.toast('บันทึกข้อมูลเสร็จสิ้น', {
          title: 'สำเร็จ',
          variant: 'success',
          solid: true
        });

        // รอสักครู่แล้วไปหน้าใหม่
        setTimeout(() => {
          // ล้าง session
          // sessionStorage.removeItem("checkPayload");
          // กลับไปหน้าเลือกใหม่
          this.$router.push({ name: 'SelectProcess' });
        }, 1500);
        
      } catch (error) {
        console.error('Error updating parts:', error);
        
        // แสดงข้อความผิดพลาด
        this.$bvToast.toast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', {
          title: 'ผิดพลาด',
          variant: 'danger',
          solid: true
        });
      }
    },

    // เพิ่ม method ใหม่สำหรับอัพเดตข้อมูล
    async updateCompletedParts() {
      // อัพเดตทุก part ที่ทำเสร็จแล้ว
      const updatePromises = this.parts.map(async (part, index) => {
        if (this.answeredParts.includes(index)) {
          // part นี้ทำเสร็จแล้ว อัพเดต update_status = 1
          return this.updateSinglePart(part.idseq_alc, 1);
        }
      });

      // รอให้ทุก request เสร็จ
      await Promise.all(updatePromises.filter(Boolean)); // filter(Boolean) เพื่อเอา undefined ออก
    },

    // เพิ่ม method สำหรับอัพเดต part เดียว
    async updateSinglePart(idseq_alc, updateStatus) {
      try {
        const response = await api.post('/update_seq', {
          idseq_alc: idseq_alc,
          update_status: updateStatus
        });
        
        console.log(`Updated part ${idseq_alc} with status ${updateStatus}`);
        return response.data;
      } catch (error) {
        console.error(`Error updating part ${idseq_alc}:`, error);
        throw error;
      }
    },

    // เพิ่ม method สำหรับอัพเดตเฉพาะ parts ที่เสร็จใน role ปัจจุบัน (ถ้าต้องการแยก role)
    async updateCurrentRoleParts() {
      const updatePromises = this.parts.map(async (part, index) => {
        if (this.answeredParts.includes(index)) {
          // กำหนด status ตาม role: 
          // Role A = status 1, Role B = status 2, หรือใช้ค่าอื่นตามที่ต้องการ
          const status = this.currentRole === 'A' ? 1 : 2;
          return this.updateSinglePart(part.idseq_alc, status);
        }
      });

      await Promise.all(updatePromises.filter(Boolean));
    },

    // แก้ไข method goToPartB เพื่อส่งข้อมูล Role A ก่อน (ถ้าต้องการ)
    async goToPartB() {
      try {
        // ถ้าต้องการส่งข้อมูล Role A ก่อนไป Role B
        // await this.updateCurrentRoleParts();
        
        // เก็บสถานะ Role B ลง sessionStorage
        const payload = JSON.parse(sessionStorage.getItem("checkPayload") || '{}');
        payload.currentRole = 'B';
        payload.completedRoles = ['A']; // เก็บว่า A เสร็จแล้ว
        payload.roleAAnswered = [...this.answeredParts]; // เก็บข้อที่ตอบใน Role A
        sessionStorage.setItem("checkProcess", JSON.stringify(this.$store.state.selection.process))
        sessionStorage.setItem("checkPayload", JSON.stringify(payload));
        
        // กลับไป LayoutPage แต่จะเป็น role B  
        this.$router.push({ name: 'SelectProcess' }); // หรือใช้ query parameter
      } catch (error) {
        console.error('Error in :', error);
        // ถ้า error ก็ยังไปต่อ
        const payload = JSON.parse(sessionStorage.getItem("checkPayload") || '{}');
        payload.currentRole = 'B';
        payload.completedRoles = ['A'];
        sessionStorage.setItem("checkProcess", JSON.stringify(this.$store.state.selection.process))
        sessionStorage.setItem("checkPayload", JSON.stringify(payload));
        this.$router.push({ name: 'SelectProcess' });
      }
    },
    resetGame() {
      this.currentIndex = 0;
      this.answeredParts = [];
      this.gameCompleted = false;
      this.showCorrectTop = false;
      this.showCorrectBottom = false;
      this.showWrongTop = false;
      this.showWrongBottom = false;
      this.setupNewRound();
    },

    initializeGame() {
      // เริ่มต้นเกมใหม่
      this.currentIndex = 0;
      this.answeredParts = [];
      this.gameCompleted = false;
      this.setupNewRound();
    }
  },

  mounted() {
    const payload = sessionStorage.getItem("checkPayload");
    if (payload) {
      const data = JSON.parse(payload);
      
      this.parts = data.parts || [];
      this.sa = data.sa || [];
      this.sb = data.sb || [];
      
      // เริ่มต้นเกม
      this.initializeGame();
      
      console.log("parts:", this.parts);
      console.log("sa config:", this.sa);
      console.log("sb config:", this.sb);
    }
  }
}
</script>

<style scoped>
.game-container {
  padding: 20px;
}

.answer-item {
  background: #f9f9fb;
  padding: 20px 24px;
  border-radius: 8px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
}

.answer-item.current-question {
  background: #e3f2fd;
  border: 2px solid #2196f3;
}

.answer-item.answered-correct {
  background: #e8f5e8;
  border: 2px solid #4caf50;
}

.answer-item p {
  margin: 4px 0;
  font-size: 24px;
  color: #333;
}

.not-answered {
  color: #e74c3c;
  font-size: 28px;
}

.answered {
  color: #27ae60;
  font-size: 28px;
  font-weight: bold;
}

.answer-section {
  margin-bottom: 30px;
}

.answer-section h6 {
  margin-bottom: 15px;
  color: #333;
  font-weight: bold;
}

.answer-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
  background: #fff;
  transition: all 0.3s ease;
}

.answer-pair.clickable {
  cursor: pointer;
  user-select: none;
}

.answer-pair.clickable:hover {
  border-color: #007bff;
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.2);
  transform: translateY(-2px);
}

.answer-pair.correct-answer {
  border-color: #28a745;
  background: #d4edda;
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
}

.answer-pair.wrong-answer {
  border-color: #dc3545;
  background: #f8d7da;
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.answer-box {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 10px;
  background: #fafafa;
}

.answer-box img {
  max-width: 200px;
  width: 100%;
  height: auto;
  display: block;
  margin: 0 auto 8px;
  border-radius: 4px;
}

.caption {
  font-weight: bold;
  color: #555;
  font-size: 14px;
}

.debug-info {
  margin-top: 20px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 28px;
  color: #666;
}

.bottom-section {
  margin-top: 30px;
}

.next-page-section {
  margin-top: 20px;
  text-align: center;
}

.next-page-btn {
  min-width: 150px;
  transition: all 0.3s ease;
  font-size: 28px;
}

.next-page-btn:disabled {
  background-color: #6c757d !important;
  border-color: #6c757d !important;
  cursor: not-allowed;
  opacity: 0.6;
}

.game-completed {
  text-align: center;
  padding: 40px;
}

.next-page-container {
  padding: 20px;
}

.ml-2 {
  margin-left: 10px;
}

/* การตอบสนองบนมือถือ */
@media (max-width: 768px) {
  .answer-pair {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .answer-box img {
    max-width: 150px;
  }
}
</style>