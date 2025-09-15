import axios from 'axios';

// ดึงค่า URL จากไฟล์ .env
const api = axios.create({
  baseURL: process.env.VUE_APP_API_BASE_URL,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  transformRequest: [
    (data, headers) => {
      // แปลง object -> x-www-form-urlencoded เฉพาะกรณีที่เป็น object ปกติ
      if (
        headers['Content-Type']?.includes('application/x-www-form-urlencoded') &&
        data &&
        typeof data === 'object' &&
        !(data instanceof FormData)
      ) {
        const params = new URLSearchParams()
        Object.entries(data).forEach(([k, v]) => params.append(k, v))
        return params.toString()
      }
      return data
    }
  ]
});

// ตัวอย่าง interceptors ถ้าต้องการใส่ header เพิ่ม
api.interceptors.request.use(config => {
  // config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;