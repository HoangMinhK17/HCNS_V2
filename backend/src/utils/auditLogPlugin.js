import AuditLog from "../models/AuditLog.js";

export default function auditLogPlugin(schema) {
  // Ghi log sau khi lưu (CREATE hoặc một số loại UPDATE)
  schema.post("save", async function (doc) {
    try {
      const isNew = doc.$isNew || doc.isNew; 
      
      const action = isNew ? "CREATE" : "UPDATE";
      if (isNew) {
        await AuditLog.create({
          action: "CREATE",
          collectionName: doc.constructor.modelName,
          recordId: doc._id,
          performedBy: doc.updatedBy || doc.createdBy || null,
          newValues: doc.toObject(),
          note: "Record created"
        });
      }
    } catch (err) {
      console.error("[AuditLogPlugin] Error logging save:", err);
    }
  });

  // Ghi log trước khi update để lấy old values
  schema.pre("findOneAndUpdate", async function () {
    try {
      const docToUpdate = await this.model.findOne(this.getQuery());
      if (docToUpdate) {
        this._oldValues = docToUpdate.toObject();
      }
    } catch (err) {
      console.error("[AuditLogPlugin] Error getting old values:", err);
    }
  });

  // Ghi log sau khi update xong
  schema.post("findOneAndUpdate", async function (doc) {
    try {
      if (doc) {
        await AuditLog.create({
          action: "UPDATE",
          collectionName: doc.constructor.modelName,
          recordId: doc._id,
          performedBy: doc.updatedBy || null,
          oldValues: this._oldValues || {},
          newValues: doc.toObject(),
          note: "Record updated"
        });
      }
    } catch (err) {
      console.error("[AuditLogPlugin] Error logging update:", err);
    }
  });
}
