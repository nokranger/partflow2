<template>
  <div class="game-container">
    <b-row>
      <!-- ฝั่งซ้าย: รายการคำถาม -->
      <b-col cols="6">
        <h5>Part</h5>
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
          <p v-if="!answeredParts.includes(index)" class="not-answered">ยังไม่ได้ตอบ</p>
          <p v-else class="answered">✓ ตอบถูกแล้ว</p>
        </div>
      </b-col>

      <!-- ฝั่งขวา: คำตอบ -->
      <b-col cols="6">
        <h5>Answer</h5>
        
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
                  :src="buildImg(sa[0].submsg, topPairData.part[sa[0].partName])"
                  :alt="`${sa[0].submsg}-${topPairData.part[sa[0].partName]}`" 
                  @error="onImgError"
                />
                <div class="caption">{{ sa[0].submsg }}</div>
              </div>
              <div class="answer-box">
                <img 
                  :src="buildImg(sa[1].submsg, topPairData.part[sa[1].partName])"
                  :alt="`${sa[1].submsg}-${topPairData.part[sa[1].partName]}`" 
                  @error="onImgError"
                />
                <div class="caption">{{ sa[1].submsg }}</div>
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
                  :src="buildImg(sa[0].submsg, bottomPairData.part[sa[0].partName])"
                  :alt="`${sa[0].submsg}-${bottomPairData.part[sa[0].partName]}`" 
                  @error="onImgError"
                />
                <div class="caption">{{ sa[0].submsg }}</div>
              </div>
              <div class="answer-box">
                <img 
                  :src="buildImg(sa[1].submsg, bottomPairData.part[sa[1].partName])"
                  :alt="`${sa[1].submsg}-${bottomPairData.part[sa[1].partName]}`" 
                  @error="onImgError"
                />
                <div class="caption">{{ sa[1].submsg }}</div>
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
              Next Page
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
      const list = Array.isArray(this.sa) ? this.sa : [];
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

    nextPage() {
      // ไปหน้าใหม่ หรือโหลดชุดข้อมูลใหม่
      // this.$emit('next-page');
      // sessionStorage.setItem("checkPayload", JSON.stringify(payload))
      this.$router.push({ name: "LayoutPageB" })
      // หรือ redirect ไปหน้าใหม่
      // this.$router.push('/next-page');
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
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
}

.answer-item.current-question {
  background: #e3f2fd;
  border: 2px solid #2196f3;
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
}

.answer-item.answered-correct {
  background: #e8f5e8;
  border: 2px solid #4caf50;
}

.answer-item p {
  margin: 4px 0;
  font-size: 15px;
  color: #333;
}

.not-answered {
  color: #e74c3c;
  font-size: 14px;
}

.answered {
  color: #27ae60;
  font-size: 14px;
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
  font-size: 13px;
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