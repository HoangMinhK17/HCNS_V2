import api from "./api";

// ── Cài đặt chung ─────────────────────────────────────────────────────────────
export const getOnboardingSettings = async () => {
  const res = await api.get("/settings/onboarding");
  return res.data;
};

export const updateOnboardingSettings = async (data) => {
  const res = await api.put("/settings/onboarding", data);
  return res.data;
};

// ── Tài liệu ──────────────────────────────────────────────────────────────────
export const uploadOnboardingDocument = async (file) => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post("/settings/onboarding/upload", form);
  return res.data;
};

export const deleteOnboardingDocument = async (docId) => {
  const res = await api.delete(`/settings/onboarding/documents/${docId}`);
  return res.data;
};

// ── Nhân viên Onboarding ───────────────────────────────────────────────────────
export const getOnboardingEmployees = async () => {
  const res = await api.get("/settings/onboarding/employees");
  return res.data;
};

export const sendOnboardingZalo = async (employeeId) => {
  const res = await api.post(`/settings/onboarding/send/${employeeId}`);
  return res.data;
};
