import { useState, useEffect } from 'react';
import {
  Card, Button, Form, Input, Select, DatePicker, Row, Col,
  Avatar, Tag, Space, Typography, Divider, Alert, Steps, message, Spin, Upload,
} from 'antd';
import {
  ArrowLeftOutlined, DownloadOutlined, CheckCircleFilled,
  HistoryOutlined, EditOutlined, UserOutlined,
  IdcardOutlined, ShopOutlined, BankOutlined,
  RobotOutlined, UploadOutlined, FileWordOutlined, FileImageOutlined,
} from '@ant-design/icons';


import { renewContract, renewAndGenerateContract } from '../../utils/contractApi';
import { getEmployeesByIds } from '../../utils/employeeApi';
import { getAllPositions } from '../../utils/positionApi';
import { getAllDepartments } from '../../utils/departmentApi';

const { Title, Text } = Typography;
const { TextArea } = Input;

const CONTRACT_TYPE_OPTIONS = [
  { value: 'probation', label: 'Hợp đồng Thử việc' },
  { value: 'fixed-term', label: 'Hợp đồng Xác định thời hạn' },
  { value: 'indefinite', label: 'Hợp đồng Không xác định thời hạn' },
];

const CONTRACT_TYPE_LABEL = {
  probation: 'Hợp đồng Thử việc',
  'fixed-term': 'Hợp đồng Xác định thời hạn',
  indefinite: 'Hợp đồng Không xác định thời hạn',
};

const STEP_ITEMS = [
  { title: 'Cảnh báo hết hạn', description: 'AI phát hiện & thông báo' },
  { title: 'Kế thừa dữ liệu', description: 'AI nạp thông tin cũ' },
  { title: 'Cập nhật trường mới', description: 'HCNS nhập thông tin mới' },
  { title: 'Xuất hợp đồng', description: 'Tạo file .docx hoàn chỉnh' },
];

export default function ContractRenewal({ employee, onNavigate }) {
  const [currentStep, setCurrentStep] = useState(2);
  const [exported, setExported] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [positions, setPositions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [freshEmp, setFreshEmp] = useState(null);
  const [templateFile, setTemplateFile] = useState(null);
  const [cccdFront, setCccdFront] = useState(null);
  const [cccdBack, setCccdBack] = useState(null);
  const [form] = Form.useForm();
  const [msgApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (!employee) return;
    const fetchMeta = async () => {
      setLoadingMeta(true);
      try {
        const [posData, deptData, empDataRes] = await Promise.all([
          getAllPositions(),
          getAllDepartments(),
          getEmployeesByIds([employee._id || employee.id]).catch(() => null)
        ]);
        const posArray = Array.isArray(posData) ? posData : (posData.data || posData.positions || []);
        const deptArray = Array.isArray(deptData) ? deptData : (deptData.data || deptData.departments || []);
        setPositions(posArray.map((p) => ({ value: p._id || p.id, label: p.name })));
        setDepartments(deptArray.map((d) => ({ value: d._id || d.id, label: d.name })));

        let latestEmp = employee;
        if (empDataRes && empDataRes.success && empDataRes.employees?.length) {
          latestEmp = empDataRes.employees[0];
          setFreshEmp(latestEmp);
        }

        const currentPosId = (latestEmp.positionId || latestEmp.position?._id || latestEmp.position)?.toString();
        const currentDeptId = (latestEmp.departmentId || latestEmp.department?._id || latestEmp.department)?.toString();

        form.setFieldsValue({
          positionId: currentPosId || undefined,
          positionName: latestEmp.positionName || latestEmp.position?.name || undefined,
          departmentId: currentDeptId || undefined,
          salary: latestEmp.salary ? String(latestEmp.salary) : undefined,
        });
      } catch (err) {
        msgApi.warning(`Lỗi tải dữ liệu: ${err.message}`);
      } finally {
        setLoadingMeta(false);
      }
    };
    fetchMeta();
  }, [employee]);

  // ── Nếu không có employee prop => quay lại ──
  if (!employee) {
    return (
      <div style={{ padding: '40px 32px', textAlign: 'center' }}>
        <Alert
          type="warning"
          showIcon
          message="Không có thông tin nhân viên"
          description="Vui lòng chọn nhân viên từ danh sách hợp đồng."
          action={
            <Button onClick={() => onNavigate('contracts')}>
              Về danh sách
            </Button>
          }
        />
      </div>
    );
  }

  // Ưu tiên dùng data mới nhất lấy từ DB nếu có
  const activeEmp = freshEmp || employee;

  // ── Map dữ liệu từ API sang biến cục bộ ──
  const empName = activeEmp.fullName || '—';
  const empCode = activeEmp.empCode || '—';
  const empPos = activeEmp.positionName || activeEmp.position?.name || '—';
  const empDept = activeEmp.departmentName || activeEmp.department?.name || '—';
  const empEmail = activeEmp.email || null;

  // Thông tin hợp đồng cũ
  const oldContractType = CONTRACT_TYPE_LABEL[activeEmp.contractType] || activeEmp.contractType || '—';
  const oldEndDate = activeEmp.endDateOfContract ? new Date(activeEmp.endDateOfContract).toLocaleDateString('vi-VN') : activeEmp.expiryFormatted || '—';
  const oldStartDate = activeEmp.startDate
    ? new Date(activeEmp.startDate).toLocaleDateString('vi-VN')
    : '—';
  const oldStartDateOffice = activeEmp.startDateOffice
    ? new Date(activeEmp.startDateOffice).toLocaleDateString('vi-VN')
    : '—';
  const oldSalary = activeEmp.salary
    ? Number(activeEmp.salary).toLocaleString('vi-VN')
    : '—';

  // ── Xử lý lưu & xuất hợp đồng ──
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      // Tìm positionName và departmentName từ ID đã chọn
      const selectedPos = positions.find((p) => p.value === values.positionId);
      const selectedDept = departments.find((d) => d.value === values.departmentId);

      const payload = {
        contractType: values.contractType,
        startDate: values.startDate?.toISOString(),
        endDate: values.endDate?.toISOString() || null,
        salary: values.salary ? String(values.salary).replace(/[^0-9]/g, '') : null,
        positionId: values.positionId || null,
        positionName: values.positionName || selectedPos?.label || empPos,
        departmentId: values.departmentId || null,
        departmentName: selectedDept?.label || empDept,
        notes: values.notes || '',
      };

      if (templateFile) {
        msgApi.loading({ content: 'Đang trích xuất OCR và tạo hợp đồng...', key: 'generate' });
        const formData = new FormData();
        Object.keys(payload).forEach(key => {
          if (payload[key] !== null && payload[key] !== undefined) {
            formData.append(key, payload[key]);
          }
        });
        formData.append('template', templateFile);
        if (cccdFront) formData.append('cccdFront', cccdFront);
        if (cccdBack) formData.append('cccdBack', cccdBack);

        const res = await renewAndGenerateContract(activeEmp._id, formData);

        // Tạo url để tải file
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;

        let filename = `HopDong_${activeEmp.empCode}.docx`;
        const contentDisposition = res.headers && res.headers['content-disposition'];
        if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
          if (fileNameMatch && fileNameMatch.length === 2) {
            filename = fileNameMatch[1];
          }
        }

        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();

        setExported(true);
        setCurrentStep(3);
        msgApi.success({ content: '✅ Gia hạn và xuất hợp đồng thành công!', key: 'generate' });
      } else {
        const data = await renewContract(activeEmp._id, payload);

        if (data.success) {
          setExported(true);
          setCurrentStep(3);
          msgApi.success('✅ Gia hạn hợp đồng thành công! Thông tin đã được cập nhật vào hệ thống.');
        } else {
          msgApi.error(`❌ Lỗi: ${data.message}`);
        }
      }
    } catch (err) {
      if (err?.errorFields) {
        msgApi.error('Vui lòng điền đầy đủ các trường bắt buộc.');
      } else {
        msgApi.error({ content: `❌ Lỗi kết nối: ${err.message}`, key: 'generate' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 28px) clamp(12px, 3vw, 32px)', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {contextHolder}

      {/* Back */}
      <Button
        type="link" icon={<ArrowLeftOutlined />}
        id="renewal-back"
        onClick={() => onNavigate('contracts')}
        style={{ padding: 0, marginBottom: 8, color: '#6b7280' }}
      >
        Quay lại danh sách hợp đồng
      </Button>

      {/* Header */}
      <Title level={3} style={{ margin: '0 0 4px', fontWeight: 700 }}>
        Xử lý gia hạn hợp đồng
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 22 }}>
        Kiểm tra thông tin hiện tại và nhập dữ liệu cho kỳ hạn hợp đồng mới.
      </Text>

      {/* Steps */}
      <Card style={{ borderRadius: 12, marginBottom: 22 }} styles={{ body: { padding: '16px 20px' } }}>
        <Steps
          current={currentStep}
          items={STEP_ITEMS}
          size="small"
          style={{ maxWidth: '100%' }}
        />
      </Card>

      {/* Success alert */}
      {exported && (
        <Alert
          type="success"
          icon={<CheckCircleFilled />}
          showIcon
          message="Gia hạn hợp đồng thành công!"
          description="Thông tin hợp đồng mới đã được cập nhật vào hệ thống. Bạn có thể xuất file hợp đồng hoặc về danh sách."
          style={{ marginBottom: 22, borderRadius: 10 }}
          action={
            <Space>
              <Button size="small" icon={<DownloadOutlined />} id="renewal-download-docx">
                Tải .docx
              </Button>
              <Button size="small" type="primary" icon={<DownloadOutlined />} id="renewal-download-pdf">
                Tải .pdf
              </Button>
            </Space>
          }
        />
      )}

      {/* Employee header */}
      <Card style={{ borderRadius: 12, marginBottom: 22 }} styles={{ body: { padding: '16px 22px' } }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar
            size={52}
            style={{ background: '#1677ff', fontWeight: 700, fontSize: 18 }}
          >
            {empName[0]?.toUpperCase() || <UserOutlined />}
          </Avatar>
          <div style={{ flex: 1 }}>
            <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
              {empName}
            </Title>
            <Space size={16} style={{ marginTop: 5, flexWrap: 'wrap' }}>
              <Text type="secondary" style={{ fontSize: 12.5 }}>
                <IdcardOutlined style={{ marginRight: 4 }} />
                ID: {empCode}
              </Text>
              <Text type="secondary" style={{ fontSize: 12.5 }}>
                <ShopOutlined style={{ marginRight: 4 }} />
                {empPos}
              </Text>
              <Text type="secondary" style={{ fontSize: 12.5 }}>
                <BankOutlined style={{ marginRight: 4 }} />
                {empDept}
              </Text>
              {empEmail && (
                <Text type="secondary" style={{ fontSize: 12.5 }}>
                  ✉ {empEmail}
                </Text>
              )}
            </Space>
          </div>
          <Tag color="orange" style={{ fontSize: 13, padding: '4px 12px', borderRadius: 20 }}>
            ⚠ Sắp hết hạn
          </Tag>
        </div>
      </Card>

      {/* Two-column grid */}
      <Spin spinning={loadingMeta} tip="Đang tải dữ liệu...">
        <Row gutter={[20, 20]} align="top">

          {/* Left: Old contract */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <HistoryOutlined style={{ color: '#6b7280' }} />
                  <span>Thông tin Hợp đồng cũ</span>
                </Space>
              }
              style={{ borderRadius: 12, background: '#fafafa', border: '1.5px solid #e5e7eb' }}
              styles={{ body: { padding: '18px 22px' }, header: { background: '#f9fafb' } }}
            >
              <Form layout="vertical" size="small">
                <Form.Item label="Loại hợp đồng">
                  <Input value={oldContractType} readOnly style={{ background: '#fff' }} />
                </Form.Item>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item label="Ngày bắt đầu">
                      <Input value={oldStartDate} readOnly style={{ background: '#fff' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Ngày vào chính thức">
                      <Input value={oldStartDateOffice} readOnly style={{ background: '#fff' }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label="Ngày kết thúc">
                  <Input
                    value={oldEndDate + ' ⚠'}
                    readOnly
                    style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#dc2626', fontWeight: 600 }}
                  />
                </Form.Item>
                <Form.Item label="Mức lương cơ bản">
                  <Input
                    value={oldSalary !== '—' ? oldSalary + ' VND' : '—'}
                    readOnly
                    style={{ background: '#fff' }}
                  />
                </Form.Item>
                <Form.Item label="Chức vụ hiện tại">
                  <Input value={empPos} readOnly style={{ background: '#fff' }} />
                </Form.Item>
                <Form.Item label="Phòng ban hiện tại">
                  <Input value={empDept} readOnly style={{ background: '#fff' }} />
                </Form.Item>
              </Form>

              {/* AI note */}
              <Alert
                icon={<RobotOutlined />}
                showIcon
                type="info"
                message="AI đã kế thừa thông tin: CCCD, Ngày sinh, Địa chỉ, Bằng cấp và các trường cố định khác từ Database."
                style={{ borderRadius: 8, fontSize: 12 }}
              />
            </Card>
          </Col>

          {/* Right: New contract form */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <EditOutlined style={{ color: '#1677ff' }} />
                  <span style={{ color: '#1677ff' }}>Cập nhật Gia hạn mới</span>
                </Space>
              }
              style={{ borderRadius: 12, border: '1.5px solid #dbeafe', boxShadow: '0 2px 12px rgba(22,119,255,0.07)' }}
              styles={{ header: { background: '#eff6ff', borderBottom: '1px solid #dbeafe' } }}
            >
              <Form
                form={form}
                layout="vertical"
                size="middle"
                disabled={exported}
              >
                <Form.Item
                  label="Loại hợp đồng mới"
                  name="contractType"
                  rules={[{ required: true, message: 'Vui lòng chọn loại hợp đồng' }]}
                >
                  <Select
                    id="renewal-contract-type"
                    placeholder="Chọn loại hợp đồng..."
                    options={CONTRACT_TYPE_OPTIONS}
                  />
                </Form.Item>

                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item
                      label="Ngày bắt đầu mới"
                      name="startDate"
                      rules={[{ required: true, message: 'Chọn ngày bắt đầu' }]}
                    >
                      <DatePicker
                        style={{ width: '100%' }}
                        format="DD/MM/YYYY"
                        id="renewal-start-date"
                        placeholder="DD/MM/YYYY"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Ngày kết thúc mới" name="endDate">
                      <DatePicker
                        style={{ width: '100%' }}
                        format="DD/MM/YYYY"
                        id="renewal-end-date"
                        placeholder="DD/MM/YYYY"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  label="Mức lương cơ bản mới (VND)"
                  name="salary"
                  rules={[{ required: true, message: 'Nhập mức lương mới' }]}
                >
                  <Input
                    id="renewal-salary"
                    prefix="💰"
                    placeholder="VD: 20000000"
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>

                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item label="Chức vụ mới (từ danh sách)" name="positionId">
                      <Select
                        id="renewal-position"
                        placeholder="Giữ nguyên hoặc chọn mới..."
                        options={positions}
                        allowClear
                        showSearch
                        optionFilterProp="label"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Tên chức vụ hiển thị (Tuỳ chọn)" name="positionName">
                      <Input id="renewal-position-name" placeholder="Tên chức vụ tuỳ chỉnh..." />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={12}>
                  <Col span={24}>
                    <Form.Item label="Phòng ban mới (nếu thay đổi)" name="departmentId">
                      <Select
                        id="renewal-dept"
                        placeholder="Giữ nguyên hoặc chọn mới..."
                        options={departments}
                        allowClear
                        showSearch
                        optionFilterProp="label"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item label="Ghi chú & Điều khoản bổ sung" name="notes">
                  <TextArea
                    id="renewal-notes"
                    rows={3}
                    placeholder="Nhập ghi chú hoặc điều khoản phụ cấp điều chỉnh..."
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>

                <Divider style={{ margin: '16px 0' }} />

                <Text strong style={{ display: 'block', marginBottom: 12 }}>
                  <RobotOutlined style={{ color: '#1677ff', marginRight: 6 }} /> Sinh Hợp đồng tự động & Quét CCCD
                </Text>

                <Form.Item label="File Mẫu Hợp đồng (.docx) - Tuỳ chọn">
                  <Upload
                    beforeUpload={(file) => { setTemplateFile(file); return false; }}
                    maxCount={1}
                    onRemove={() => setTemplateFile(null)}
                    accept=".docx"
                  >
                    <Button icon={<FileWordOutlined />}>Chọn File Mẫu (.docx)</Button>
                  </Upload>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    Nếu có tải lên, hệ thống sẽ điền thông tin và tải Hợp đồng về máy. File mẫu có thể chứa các biến như {'{fullName}'}, {'{cccd_number}'}...
                  </Text>
                </Form.Item>

                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item label="Mặt trước CCCD">
                      <Upload
                        beforeUpload={(file) => { setCccdFront(file); return false; }}
                        maxCount={1}
                        onRemove={() => setCccdFront(null)}
                        accept="image/*"
                      >
                        <Button icon={<FileImageOutlined />}>Tải ảnh mặt trước</Button>
                      </Upload>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Mặt sau CCCD">
                      <Upload
                        beforeUpload={(file) => { setCccdBack(file); return false; }}
                        maxCount={1}
                        onRemove={() => setCccdBack(null)}
                        accept="image/*"
                      >
                        <Button icon={<FileImageOutlined />}>Tải ảnh mặt sau</Button>
                      </Upload>
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Card>
          </Col>
        </Row>
      </Spin>

      {/* Footer actions */}
      <Divider style={{ margin: '22px 0 18px' }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <Button
          id="renewal-cancel"
          onClick={() => onNavigate('contracts')}
          style={{ borderRadius: 8 }}
        >
          Hủy bỏ
        </Button>
        {!exported ? (
          <Button
            type="primary"
            size="large"
            icon={<CheckCircleFilled />}
            id="renewal-export"
            loading={submitting}
            onClick={handleSubmit}
            style={{ borderRadius: 8, fontWeight: 600 }}
          >
            Lưu & Gia hạn Hợp đồng
          </Button>
        ) : (
          <Button
            size="large"
            id="renewal-done"
            onClick={() => onNavigate('contracts')}
            style={{ borderRadius: 8 }}
          >
            ← Về danh sách
          </Button>
        )}
      </div>
    </div>
  );
}
