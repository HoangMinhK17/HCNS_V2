import React, { useEffect, useState } from 'react';
import { Card, Table, Typography, Space, Button, Tag, Input, message, Modal, Form, Select, Popconfirm, Tabs, Descriptions } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, getAllEmployeesForDropdown } from '../../utils/employeeApi';
import { getAllDepartments } from '../../utils/departmentApi';
import { getAllPositions } from '../../utils/positionApi';
import { getAllCompanies } from '../../utils/companyApi';

const { Title } = Typography;
const { Option } = Select;

const STATUS_MAP = {
  active: 'Đang làm việc',
  probation: 'Thử việc',
  'maternity-leave': 'Nghỉ thai sản',
  suspended: 'Đình chỉ',
  inactive: 'Đã nghỉ việc',
  terminated: 'Sa thải'
};

const MARITAL_STATUS_MAP = {
  single: 'Độc thân',
  married: 'Đã kết hôn',
  divorced: 'Ly hôn',
};

const EDUCATION_LEVEL_MAP = {
  'high-school': 'Trung học phổ thông',
  college: 'Cao đẳng',
  university: 'Đại học',
  master: 'Thạc sĩ',
  phd: 'Tiến sĩ',
  other: 'Khác'
};

const CONTRACT_TYPE_MAP = {
  probation: 'Thử việc',
  'fixed-term': 'Xác định thời hạn',
  indefinite: 'Không xác định thời hạn'
};

export default function EmployeesList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState(null);

  const [form] = Form.useForm();

  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [employeesForDropdown, setEmployeesForDropdown] = useState([]);

  const [companies, setCompany] = useState([]);

  const fetchEmployeesForDropdown = async () => {
    try {
      const res = await getAllEmployeesForDropdown();
      console.log("fetchEmployeesForDropdown API res:", res);
      if (res.success) {
        setEmployeesForDropdown(res.data.map((emp) => ({ value: emp._id, label: `${emp.empCode} - ${emp.fullName}` })));
      }
    } catch (err) {
      console.error("fetchEmployeesForDropdown error:", err);
      message.error('Không thể tải danh sách nhân viên');
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchData(1, pagination.pageSize);
    fetchEmployeesForDropdown();
  }, [searchText, statusFilter]);

  const fetchData = async (page = pagination.current, limit = pagination.pageSize) => {
    setLoading(true);
    try {
      const res = await getEmployees({ page, limit, search: searchText, status: statusFilter });
      if (res.success) {
        setData(res.data);
        if (res.pagination) {
          setPagination(prev => ({
            ...prev,
            current: res.pagination.page,
            pageSize: res.pagination.limit,
            total: res.pagination.total
          }));
        }
      } else {
        message.error('Lỗi tải danh sách nhân viên');
      }
    } catch (e) {
      message.error('Không thể kết nối API nhân viên');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [deptRes, posRes, comRes] = await Promise.all([
        getAllDepartments(),
        getAllPositions(),
        getAllCompanies()
      ]);
      if (deptRes.success) setDepartments(deptRes.data);
      if (posRes.success) setPositions(posRes.data);
      if (comRes.success) setCompany(comRes.data);
    } catch (error) {
      console.error('Lỗi lấy danh sách phòng ban/chức danh', error);
    }
  };

  const handleOpenModal = (record = null) => {
    if (record) {
      setEditingId(record._id);
      form.setFieldsValue({
        ...record,
        company: record.company?._id || record.company,
        department: record.department?._id || record.department,
        position: record.position?._id || record.position,
        positionName: record.positionName || '',
        reportsTo: record.reportsTo?._id || record.reportsTo,
        birthday: record.birthday ? record.birthday.split('T')[0] : null,
        nationalIdIssuedDate: record.nationalIdIssuedDate ? record.nationalIdIssuedDate.split('T')[0] : null,
        startDate: record.startDate ? record.startDate.split('T')[0] : null,
        officialDate: record.officialDate ? record.officialDate.split('T')[0] : null,
        contractStartDate: record.contractStartDate ? record.contractStartDate.split('T')[0] : null,
        endDateOfContract: record.endDateOfContract ? record.endDateOfContract.split('T')[0] : null,
        socialInsuranceDate: record.socialInsuranceDate ? record.socialInsuranceDate.split('T')[0] : null,
      });
    } else {
      setEditingId(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const handleOpenViewModal = (record) => {
    setViewingEmployee(record);
    setIsViewModalOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingId) {
        await updateEmployee(editingId, values);
        message.success('Cập nhật nhân viên thành công!');
      } else {
        await createEmployee(values);
        message.success('Thêm nhân viên thành công!');
      }
      handleCloseModal();
      fetchData();
    } catch (e) {
      message.error(e.response?.data?.message || (editingId ? 'Lỗi khi cập nhật nhân viên' : 'Lỗi khi thêm nhân viên'));
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteEmployee(id);
      message.success('Đã xóa nhân viên!');
      fetchData();
    } catch (e) {
      message.error('Không thể xóa nhân viên lúc này');
    }
  };

  const columns = [
    { title: 'STT', dataIndex: 'stt', key: 'stt', render: (text, record, index) => { return (pagination.current - 1) * pagination.pageSize + index + 1 } },
    { title: 'Mã NV', dataIndex: 'empCode', key: 'empCode', render: text => <strong>{text}</strong> },
    { title: 'Họ tên', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Phòng ban', key: 'department', render: (_, record) => record.department?.name || '—' },
    { title: 'Chức danh', key: 'position', render: (_, record) => record.position?.name || '—' },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', render: status => (
        <Tag color={status === 'active' ? 'blue' : (status === 'inactive' ? 'red' : 'orange')}>
          {status === 'active' ? 'Đang làm việc' : (status === 'inactive' ? 'Đã nghỉ việc' : 'Khác')}
        </Tag>
      )
    },
    {
      title: 'Thao tác', key: 'action', render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} size="small" type="link" onClick={() => handleOpenViewModal(record)} />
          <Button icon={<EditOutlined />} size="small" type="link" onClick={() => handleOpenModal(record)} />
          <Popconfirm title="Bạn có chắc chắn muốn xóa nhân viên này?" onConfirm={() => handleDelete(record._id)}>
            <Button icon={<DeleteOutlined />} size="small" type="text" danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      <Card
        title={<Title level={4} style={{ margin: 0 }}>Danh sách Nhân viên</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>Thêm mới</Button>}
        style={{ borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
      >
        <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
          <Input
            placeholder="Tìm kiếm nhân viên..."
            prefix={<SearchOutlined />}
            style={{ width: 300, borderRadius: 8 }}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Select
            placeholder="Lọc theo trạng thái"
            allowClear
            style={{ width: 200 }}
            onChange={(value) => setStatusFilter(value)}
          >
            <Option value="active">Đang làm việc</Option>
            <Option value="probation">Thử việc</Option>
            <Option value="maternity-leave">Nghỉ thai sản</Option>
            <Option value="suspended">Đình chỉ</Option>
            <Option value="inactive">Đã nghỉ việc</Option>
            <Option value="terminated">Sa thải</Option>
          </Select>
        </div>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="_id"
          loading={loading}
          pagination={pagination}
          onChange={(newPagination) => {
            fetchData(newPagination.current, newPagination.pageSize);
          }}
        />
      </Card>

      <Modal
        title={editingId ? 'Cập nhật Nhân viên' : 'Thêm Nhân viên mới'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        okText="Lưu"
        cancelText="Hủy"
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Tabs defaultActiveKey="1">
            <Tabs.TabPane tab="Thông tin Cơ bản" key="1">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item name="empCode" label="Mã nhân viên" rules={[{ required: true, message: 'Nhập mã NV!' }]}>
                  <Input placeholder="Ví dụ: NV001" disabled={!!editingId} />
                </Form.Item>
                <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, message: 'Nhập họ tên!' }]}>
                  <Input placeholder="Ví dụ: Nguyễn Văn A" />
                </Form.Item>
                <Form.Item name="gender" label="Giới tính" initialValue="male">
                  <Select>
                    <Option value="male">Nam</Option>
                    <Option value="female">Nữ</Option>
                    <Option value="other">Khác</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="maritalStatus" label="Tình trạng hôn nhân" initialValue="single">
                  <Select>
                    <Option value="single">Độc thân</Option>
                    <Option value="married">Đã kết hôn</Option>
                    <Option value="divorced">Ly hôn</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="birthday" label="Ngày sinh">
                  <Input type="date" />
                </Form.Item>
                <Form.Item name="placeOfBirth" label="Nơi sinh">
                  <Input placeholder="Ví dụ: Hà Nội" />
                </Form.Item>
                <Form.Item name="nationality" label="Quốc tịch" initialValue="Việt Nam">
                  <Input placeholder="Ví dụ: Việt Nam" />
                </Form.Item>
                <Form.Item name="ethnicity" label="Dân tộc" initialValue="Kinh">
                  <Input placeholder="Ví dụ: Kinh" />
                </Form.Item>
                <Form.Item name="religion" label="Tôn giáo" initialValue="Không">
                  <Input placeholder="Ví dụ: Không" />
                </Form.Item>
                <Form.Item name="status" label="Trạng thái" initialValue="active">
                  <Select>
                    <Option value="active">Đang làm việc</Option>
                    <Option value="probation">Thử việc</Option>
                    <Option value="maternity-leave">Nghỉ thai sản</Option>
                    <Option value="suspended">Đình chỉ</Option>
                    <Option value="inactive">Đã nghỉ việc</Option>
                    <Option value="terminated">Sa thải</Option>
                  </Select>
                </Form.Item>
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane tab="Liên hệ & CMND" key="2">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item name="nationalId" label="Số CMND/CCCD">
                  <Input placeholder="Số thẻ CMND/CCCD" />
                </Form.Item>
                <Form.Item name="nationalIdIssuedDate" label="Ngày cấp">
                  <Input type="date" />
                </Form.Item>
                <Form.Item name="nationalIdIssuedPlace" label="Nơi cấp">
                  <Input placeholder="Ví dụ: Cục CS QLHC..." />
                </Form.Item>
                <Form.Item name="phone" label="Số điện thoại">
                  <Input placeholder="Ví dụ: 0912345678" />
                </Form.Item>
                <Form.Item name="email" label="Email Công ty">
                  <Input type="email" placeholder="Ví dụ: nva@congty.com" />
                </Form.Item>
                <Form.Item name="personalEmail" label="Email Cá nhân">
                  <Input type="email" placeholder="Ví dụ: nva@gmail.com" />
                </Form.Item>
              </div>
              <Form.Item name="permanentAddress" label="Địa chỉ thường trú">
                <Input placeholder="Ví dụ: 123 Đường A, Quận B, TP C" />
              </Form.Item>
              <Form.Item name="currentAddress" label="Chỗ ở hiện nay">
                <Input placeholder="Ví dụ: 456 Đường D, Quận E, TP F" />
              </Form.Item>
            </Tabs.TabPane>

            <Tabs.TabPane tab="Học vấn" key="3">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item name="educationLevel" label="Trình độ học vấn" initialValue="university">
                  <Select>
                    <Option value="high-school">Trung học phổ thông</Option>
                    <Option value="college">Cao đẳng</Option>
                    <Option value="university">Đại học</Option>
                    <Option value="master">Thạc sĩ</Option>
                    <Option value="phd">Tiến sĩ</Option>
                    <Option value="other">Khác</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="major" label="Chuyên ngành">
                  <Input placeholder="Ví dụ: Công nghệ thông tin" />
                </Form.Item>
                <Form.Item name="graduatedSchool" label="Trường tốt nghiệp">
                  <Input placeholder="Ví dụ: Đại học Bách Khoa" />
                </Form.Item>
                <Form.Item name="graduatedYear" label="Năm tốt nghiệp">
                  <Input type="number" placeholder="Ví dụ: 2020" />
                </Form.Item>
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane tab="Công việc" key="4">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item name="company" label="Công ty">
                  <Select placeholder="Chọn công ty" allowClear>
                    {companies.map(c => <Option key={c._id} value={c._id} disabled={c.status === 'inactive'}>{c.name}</Option>)}
                  </Select>
                </Form.Item>
                <Form.Item name="department" label="Phòng ban">
                  <Select placeholder="Chọn phòng ban" allowClear>
                    {departments.map(d => <Option key={d._id} value={d._id} disabled={d.status === 'inactive'}>{d.name}</Option>)}
                  </Select>
                </Form.Item>
                <Form.Item name="position" label="Chức danh">
                  <Select placeholder="Chọn chức danh" allowClear>
                    {positions.map(p => <Option key={p._id} value={p._id} disabled={p.status === 'inactive'} >{p.name}</Option>)}
                  </Select>
                </Form.Item>
                <Form.Item name="positionName" label="Chức vụ">
                  <Input type='text' />
                </Form.Item>
                <Form.Item name="reportsTo" label="Quản lý trực tiếp">
                  <Select
                    placeholder="Chọn người quản lý"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    options={employeesForDropdown}
                  />
                </Form.Item>

                <Form.Item name="workLocation" label="Địa điểm làm việc">
                  <Input placeholder="Ví dụ: Trụ sở chính" />
                </Form.Item>
                <Form.Item name="startDate" label="Ngày bắt đầu (Thử việc)">
                  <Input type="date" />
                </Form.Item>
                <Form.Item name="officialDate" label="Ngày chính thức">
                  <Input type="date" />
                </Form.Item>
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane tab="Hợp đồng & Lương" key="5">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item name="contractType" label="Loại hợp đồng" initialValue="fixed-term">
                  <Select>
                    <Option value="probation">Thử việc</Option>
                    <Option value="fixed-term">Xác định thời hạn</Option>
                    <Option value="indefinite">Không xác định thời hạn</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="contractNo" label="Số hợp đồng">
                  <Input placeholder="Ví dụ: HDLD-001/2026" />
                </Form.Item>
                <Form.Item name="contractStartDate" label="Ngày bắt đầu HĐ">
                  <Input type="date" />
                </Form.Item>
                <Form.Item name="endDateOfContract" label="Ngày kết thúc HĐ">
                  <Input type="date" />
                </Form.Item>
                <Form.Item name="salary" label="Mức lương cơ bản">
                  <Input type="number" placeholder="Ví dụ: 10000000" />
                </Form.Item>
                <Form.Item name="salaryGrade" label="Bậc lương">
                  <Input placeholder="Ví dụ: Bậc 3" />
                </Form.Item>
                <Form.Item name="salaryCoefficient" label="Hệ số lương" initialValue={1}>
                  <Input type="number" step="0.1" placeholder="Ví dụ: 1.0" />
                </Form.Item>
                <Form.Item name="allowances" label="Phụ cấp">
                  <Input type="number" placeholder="Ví dụ: 500000" />
                </Form.Item>
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane tab="Thuế & BHXH" key="6">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item name="taxCode" label="Mã số thuế cá nhân">
                  <Input placeholder="Ví dụ: 1234567890" />
                </Form.Item>
                <Form.Item name="socialInsuranceNo" label="Số sổ BHXH">
                  <Input placeholder="Ví dụ: 0123456789" />
                </Form.Item>
                <Form.Item name="healthInsuranceNo" label="Số thẻ BHYT">
                  <Input placeholder="Ví dụ: DN40123456789" />
                </Form.Item>
                <Form.Item name="socialInsuranceDate" label="Ngày tham gia BHXH">
                  <Input type="date" />
                </Form.Item>
              </div>
            </Tabs.TabPane>
            <Tabs.TabPane tab="Tài khoản Ngân hàng" key="7">
              <Form.List name="bankAccounts">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 16, alignItems: 'center', marginBottom: 16, padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                        <Form.Item {...restField} name={[name, 'bankName']} label="Tên Ngân hàng" rules={[{ required: true, message: 'Nhập tên NH!' }]}>
                          <Input placeholder="Ví dụ: Vietcombank" />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'bankBranch']} label="Chi nhánh">
                          <Input placeholder="Ví dụ: Hội Sở" />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'accountNumber']} label="Số tài khoản" rules={[{ required: true, message: 'Nhập STK!' }]}>
                          <Input placeholder="Ví dụ: 0123456789" />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'accountName']} label="Tên Chủ tài khoản">
                          <Input placeholder="Ví dụ: NGUYEN VAN A" />
                        </Form.Item>
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} style={{ marginTop: 8 }} />
                      </div>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        Thêm tài khoản ngân hàng
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Tabs.TabPane>
          </Tabs>
        </Form>
      </Modal>
      <Modal
        title="Chi tiết Nhân viên"
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        footer={[<Button key="close" onClick={() => setIsViewModalOpen(false)}>Đóng</Button>]}
        width={900}
      >
        {viewingEmployee && (
          <Tabs defaultActiveKey="1">
            <Tabs.TabPane tab="Thông tin Cơ bản" key="1">
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Mã NV">{viewingEmployee.empCode}</Descriptions.Item>
                <Descriptions.Item label="Họ tên"><strong>{viewingEmployee.fullName}</strong></Descriptions.Item>
                <Descriptions.Item label="Giới tính">{viewingEmployee.gender === 'male' ? 'Nam' : (viewingEmployee.gender === 'female' ? 'Nữ' : 'Khác')}</Descriptions.Item>
                <Descriptions.Item label="Ngày sinh">{viewingEmployee.birthday ? new Date(viewingEmployee.birthday).toLocaleDateString('vi-VN') : '—'}</Descriptions.Item>
                <Descriptions.Item label="Nơi sinh">{viewingEmployee.placeOfBirth || '—'}</Descriptions.Item>
                <Descriptions.Item label="Quốc tịch">{viewingEmployee.nationality || '—'}</Descriptions.Item>
                <Descriptions.Item label="Dân tộc">{viewingEmployee.ethnicity || '—'}</Descriptions.Item>
                <Descriptions.Item label="Tôn giáo">{viewingEmployee.religion || '—'}</Descriptions.Item>
                <Descriptions.Item label="Trạng Thái">{STATUS_MAP[viewingEmployee.status] || viewingEmployee.status || '—'}</Descriptions.Item>
                <Descriptions.Item label="Tình trạng Hôn nhân">{MARITAL_STATUS_MAP[viewingEmployee.maritalStatus] || viewingEmployee.maritalStatus || '—'}</Descriptions.Item>
              </Descriptions>
            </Tabs.TabPane>

            <Tabs.TabPane tab="Liên hệ & CMND" key="2">
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Số CMND/CCCD">{viewingEmployee.nationalId || '—'}</Descriptions.Item>
                <Descriptions.Item label="Ngày cấp">{viewingEmployee.nationalIdIssuedDate ? new Date(viewingEmployee.nationalIdIssuedDate).toLocaleDateString('vi-VN') : '—'}</Descriptions.Item>
                <Descriptions.Item label="Nơi cấp">{viewingEmployee.nationalIdIssuedPlace || '—'}</Descriptions.Item>
                <Descriptions.Item label="Số ĐT">{viewingEmployee.phone || '—'}</Descriptions.Item>
                <Descriptions.Item label="Email Công ty">{viewingEmployee.email || '—'}</Descriptions.Item>
                <Descriptions.Item label="Email Cá nhân">{viewingEmployee.personalEmail || '—'}</Descriptions.Item>
                <Descriptions.Item label="Địa chỉ thường trú" span={2}>{viewingEmployee.permanentAddress || '—'}</Descriptions.Item>
                <Descriptions.Item label="Chỗ ở hiện nay" span={2}>{viewingEmployee.currentAddress || '—'}</Descriptions.Item>
              </Descriptions>
            </Tabs.TabPane>

            <Tabs.TabPane tab="Học vấn & Công việc" key="3">
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Công ty" span={2}>{viewingEmployee.company?.name || '—'}</Descriptions.Item>
                <Descriptions.Item label="Phòng ban">{viewingEmployee.department?.name || '—'}</Descriptions.Item>
                <Descriptions.Item label="Chức danh">{viewingEmployee.position?.name || '—'}</Descriptions.Item>
                <Descriptions.Item label="Quản lý trực tiếp">{viewingEmployee.reportsTo?.fullName || '—'}</Descriptions.Item>
                <Descriptions.Item label="Chức vụ">{viewingEmployee.positionName || '—'}</Descriptions.Item>
                <Descriptions.Item label="Ngày thử việc">{viewingEmployee.startDate ? new Date(viewingEmployee.startDate).toLocaleDateString('vi-VN') : '—'}</Descriptions.Item>
                <Descriptions.Item label="Ngày chính thức">{viewingEmployee.officialDate ? new Date(viewingEmployee.officialDate).toLocaleDateString('vi-VN') : '—'}</Descriptions.Item>
                <Descriptions.Item label="Trình độ">{EDUCATION_LEVEL_MAP[viewingEmployee.educationLevel] || viewingEmployee.educationLevel || '—'}</Descriptions.Item>
                <Descriptions.Item label="Chuyên ngành">{viewingEmployee.major || '—'}</Descriptions.Item>
                <Descriptions.Item label="Năm TN">{viewingEmployee.graduatedYear || '—'}</Descriptions.Item>
                <Descriptions.Item label="Trường tốt nghiệp">{viewingEmployee.graduatedSchool || '—'}</Descriptions.Item>
              </Descriptions>
            </Tabs.TabPane>

            <Tabs.TabPane tab="Hợp đồng, Lương & Thuế" key="4">
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Loại hợp đồng">{CONTRACT_TYPE_MAP[viewingEmployee.contractType] || viewingEmployee.contractType || '—'}</Descriptions.Item>
                <Descriptions.Item label="Số hợp đồng">{viewingEmployee.contractNo || '—'}</Descriptions.Item>
                <Descriptions.Item label="Ngày bắt đầu HĐ">{viewingEmployee.contractStartDate ? new Date(viewingEmployee.contractStartDate).toLocaleDateString('vi-VN') : '—'}</Descriptions.Item>
                <Descriptions.Item label="Ngày kết thúc HĐ">{viewingEmployee.endDateOfContract ? new Date(viewingEmployee.endDateOfContract).toLocaleDateString('vi-VN') : '—'}</Descriptions.Item>
                <Descriptions.Item label="Lương cơ bản">{viewingEmployee.salary ? viewingEmployee.salary.toLocaleString('vi-VN') + ' đ' : '—'}</Descriptions.Item>
                <Descriptions.Item label="Bậc lương">{viewingEmployee.salaryGrade || '—'}</Descriptions.Item>
                <Descriptions.Item label="Hệ số lương">{viewingEmployee.salaryCoefficient || '—'}</Descriptions.Item>
                <Descriptions.Item label="Phụ cấp">{viewingEmployee.allowances ? viewingEmployee.allowances.toLocaleString('vi-VN') + ' đ' : '—'}</Descriptions.Item>
                <Descriptions.Item label="Mã số thuế">{viewingEmployee.taxCode || '—'}</Descriptions.Item>
                <Descriptions.Item label="Số BHXH">{viewingEmployee.socialInsuranceNo || '—'}</Descriptions.Item>
                <Descriptions.Item label="Số thẻ BHYT">{viewingEmployee.healthInsuranceNo || '—'}</Descriptions.Item>
              </Descriptions>
            </Tabs.TabPane>

            <Tabs.TabPane tab="Tài khoản Ngân hàng" key="5">
              {viewingEmployee.bankAccounts && viewingEmployee.bankAccounts.length > 0 ? (
                <Table
                  dataSource={viewingEmployee.bankAccounts}
                  pagination={false}
                  rowKey="_id"
                  columns={[
                    { title: 'Tên NH', dataIndex: 'bankName' },
                    { title: 'Chi nhánh', dataIndex: 'bankBranch' },
                    { title: 'Số TK', dataIndex: 'accountNumber' },
                    { title: 'Chủ tài khoản', dataIndex: 'accountName' },
                  ]}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 20 }}>Chưa có thông tin tài khoản ngân hàng</div>
              )}
            </Tabs.TabPane>
          </Tabs>
        )}
      </Modal>
    </div>
  );
}
