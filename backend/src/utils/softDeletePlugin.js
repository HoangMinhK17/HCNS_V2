export default function softDeletePlugin(schema) {
  // Bỏ qua các bản ghi đã xóa (deletedAt != null) trong các query mặc định
  const excludeDeleted = async function () {
    // Nếu query chưa định nghĩa điều kiện deletedAt, mặc định lấy những cái chưa xóa
    if (this.getQuery && this.getQuery() && this.getQuery().deletedAt === undefined) {
      this.where({ deletedAt: null });
    }
  };

  schema.pre("find", excludeDeleted);
  schema.pre("findOne", excludeDeleted);
  schema.pre("findOneAndUpdate", excludeDeleted);
  schema.pre("countDocuments", excludeDeleted);
  schema.pre("aggregate", async function () {
    // Với aggregate, ta đẩy một stage $match lên đầu pipeline
    this.pipeline().unshift({ $match: { deletedAt: null } });
  });
}
