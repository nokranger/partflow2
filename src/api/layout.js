// src/api/layout.js
import api from './api'   // <- อยู่ใน src/api/api.js

export async function fetchLayoutByStation(station_id) {
  const { data } = await api.get('/layout', { params: { station_id } })
  return data
}