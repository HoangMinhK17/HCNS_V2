import Redis from "ioredis";

let redisClient = null;

const connectRedis = async () => {
  if (!process.env.REDIS_URL) {
    console.warn("⚠️  REDIS_URL không được cấu hình — bỏ qua Redis cache.");
    return null;
  }

  try {
    const client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy(times) {
        if (times > 5) {
          console.error("❌ Redis: Không thể kết nối sau 5 lần thử, tắt cache.");
          return null; // Dừng retry
        }
        return Math.min(times * 200, 2000); // tăng dần tối đa 2s
      },
      reconnectOnError(err) {
        const targetErrors = ["READONLY", "ECONNRESET", "ETIMEDOUT"];
        return targetErrors.some((e) => err.message.includes(e));
      },
    });

    client.on("connect", () => console.log("✅ Redis: Đã kết nối thành công"));
    client.on("ready", () => console.log("✅ Redis: Sẵn sàng nhận lệnh"));
    client.on("error", (err) => console.error("❌ Redis Error:", err.message));
    client.on("close", () => console.warn("⚠️  Redis: Kết nối đã đóng"));

    redisClient = client;
    return client;
  } catch (err) {
    console.error("❌ Redis: Lỗi khởi tạo:", err.message);
    return null;
  }
};

export const getRedisClient = () => redisClient;

export default connectRedis;
