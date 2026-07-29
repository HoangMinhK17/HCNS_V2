import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000000,
});

// ── Request Interceptor: Tự động đính Access Token vào header ─────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Nếu data là FormData (dùng khi submit form có file/ảnh),
    // ta xóa Content-Type mặc định (application/json) để trình duyệt tự động set lại thành multipart/form-data kèm boundary.
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Tự động làm mới Access Token khi hết hạn ─
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu bị lỗi 401 TOKEN_EXPIRED và chưa retry
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('Không có refresh token');

        const { data } = await axios.post(
          `${api.defaults.baseURL}/users/refresh-token`,
          { refreshToken }
        );

        const newAccessToken = data.accessToken;
        localStorage.setItem('accessToken', newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // Thực hiện lại request gốc với token mới
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token cũng hết hạn => Logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.reload();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
