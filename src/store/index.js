import Vue from 'vue'
import Vuex from 'vuex'
// (ถ้าจะ persist ให้ uncomment 3 บรรทัดถัดไป)
// import createPersistedState from 'vuex-persistedstate'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    // ข้อมูลที่เลือกจากหน้าแรก
    selection: {
      process: null,   // { stationid, name, lotsize, ... }
      seq: ''          // string/number
    },
    selectionUpdatedAt: 0,
    highlightRhIds: [],
    highlightLhIds: [] // ใช้เช็ค TTL ได้
  },
  getters: {
    highlightRhIds: state => state.highlightRhIds,
    highlightLhIds: state => state.highlightLhIds,
    // ใช้เรียกพารามฯตอนยิง API ได้สะดวก
    selectionParams: (state) => {
      const p = state.selection.process || {}
      return {
        seq: state.selection.seq,
        station_id: p.station_id,
        lotsize: p.lot_size
      }
    },
    hasSelection: (state) => !!(state.selection.process && state.selection.seq)
  },
  mutations: {
    setProcess(state, processObj) {
      state.selection.process = processObj
      state.selectionUpdatedAt = Date.now()
    },
    setSeq(state, seq) {
      state.selection.seq = String(seq || '')
      state.selectionUpdatedAt = Date.now()
    },
    clearSelection(state) {
      state.selection = { process: null, seq: '' }
      state.selectionUpdatedAt = 0
    },
    SET_HIGHLIGHT_RH_IDS(state, ids) {
      state.highlightRhIds = ids;
    },
    SET_HIGHLIGHT_LH_IDS(state, ids) {
      state.highlightLhIds = ids;
    }
  //   ,
  //   setCurrentPartData(state, data) {
  //   state.currentPartData = data
  // }
  },
  // plugins: [createPersistedState({ paths: ['selection','selectionUpdatedAt'] })]
})
