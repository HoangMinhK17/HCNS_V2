import React, { useEffect, useState } from 'react';
import {
  Card, Table, Typography, Space, Button, Tag, Input, message,
  Modal, Form, Select, Popconfirm, Avatar, Badge, Tooltip, Switch
} from 'antd';
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  UserOutlined, KeyOutlined, LockOutlined, UnlockOutlined
} from '@ant-design/icons';
import { getUsers, createUser, updateUser, deleteUser, assignRole } from '../../utils/userApi';
import { getAll as getAllRoles } from '../../utils/roleApi';
import { getAllEmployeesForDropdown } from '../../utils/employeeApi';

const { Title, Text } = Typography;
const { Option } = Select;

const ROLE_CODE_COLORS = {
  'super-admin': 'red',
  'hr-admin': 'blue',
  'manager': 'purple',
  'employee': 'green',
  'viewer': 'default',
};

const ROLE_CODE_LABELS = {
  'super-admin': 'Super Admin',
  'hr-admin': 'HR Admin',
  'manager': 'Quản lý',
  'employee': 'Nhân viên',
  'viewer': 'Xem',
};

export default function UsersList() {
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  })();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [searchText, setSearchText] = useState('');
  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleForm] = Form.useForm();
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => { fetchOptions(); }, []);
  useEffect(() => { fetchData(1, pagination.pageSize); }, [searchText]);

  const fetchData = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const res = await getUsers({ page, limit, search: searchText });
      if (res.success) {
        let sortedData = [...res.data];
        if (currentUser?._id) {
          sortedData.sort((a, b) => {
            if (a._id === currentUser._id) return -1;
            if (b._id === currentUser._id) return 1;
            return 0;
          });
        }
        setData(sortedData);
        setPagination(prev => ({ ...prev, current: res.pagination.page, pageSize: res.pagination.limit, total: res.pagination.total }));
      }
    } catch (e) { message.error('Không thể tải danh sách người dùng'); }
    finally { setLoading(false); }
  };

  // Lưu toàn bộ dữ liệu nhân viên để dùng auto-fill
  const [employeesRaw, setEmployeesRaw] = useState([]);

  const fetchOptions = async () => {
    try {
      const [rolesRes, empRes] = await Promise.all([getAllRoles(), getAllEmployeesForDropdown()]);
      if (rolesRes.success) setRoles(rolesRes.data);
      if (empRes.success) {
        setEmployeesRaw(empRes.data);
        setEmployees(empRes.data.map(e => ({ value: e._id, label: `${e.empCode} - ${e.fullName}` })));
      }
    } catch (e) { console.error(e); }
  };

  // Hàm chuyển fullName thành username dạng khôngs dấu, viết liền, chữ thường
  const toUsername = (fullName = '') => {
    return fullName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '.');
  };

  const DEFAULT_PASSWORD = 'Fumee@2026';

  // Khi chọn nhân viên liên kết → tự điền username, email, password
  const handleEmployeeSelect = (empId) => {
    if (!empId) {
      form.setFieldsValue({ username: undefined, email: undefined, password: undefined });
      return;
    }
    const emp = employeesRaw.find(e => e._id === empId);
    if (!emp) return;
    form.setFieldsValue({
      username: toUsername(emp.fullName),
      email: emp.email || '',
      password: DEFAULT_PASSWORD,
    });
  };

  const handleOpenModal = (record = null) => {
    setEditingId(record?._id || null);
    setEditingUser(record);
    form.setFieldsValue(record ? {
      username: record.username,
      email: record.email,
      employee: record.employee?._id, isActive: record.isActive,
    } : { isActive: true });
    setIsModalOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingId) {
        const { password, ...rest } = values;
        const updateData = password ? values : rest;
        const res = await updateUser(editingId, updateData);
        if (res.success) { message.success('Cập nhật thành công'); fetchData(pagination.current, pagination.pageSize); }
      } else {
        const res = await createUser(values);
        if (res.success) { message.success('Tạo tài khoản thành công'); fetchData(1, pagination.pageSize); }
      }
      setIsModalOpen(false);
      setEditingUser(null);
      form.resetFields();
    } catch (e) {
      message.error(e.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await deleteUser(id);
      if (res.success) { message.success('Đã xóa tài khoản'); fetchData(pagination.current, pagination.pageSize); }
    } catch (e) {
      message.error(e.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleOpenRoleModal = (user) => {
    setSelectedUser(user);
    roleForm.setFieldsValue({ roleId: user.role?._id, roleCode: user.roleCode });
    setIsRoleModalOpen(true);
  };

  const handleAssignRole = async (values) => {
    try {
      const res = await assignRole(selectedUser._id, values.roleId, values.roleCode);
      if (res.success) {
        message.success('Gán Role thành công');
        fetchData(pagination.current, pagination.pageSize);
        setIsRoleModalOpen(false);
      }
    } catch (e) { message.error(e.response?.data?.message || 'Có lỗi xảy ra'); }
  };

  const columns = [
    {
      title: 'Tài khoản',
      key: 'user',
      render: (_, r) => (
        <Space>
          <Avatar style={{ background: ROLE_CODE_COLORS[r.roleCode] === 'red' ? '#ff4d4f' : '#1677ff', fontWeight: 700 }} icon={<UserOutlined />} size={36} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#111827', display: 'flex', alignItems: 'center' }}>
              {r.fullName || r.username}
              {currentUser?._id === r._id && <Tag color="blue" style={{ marginLeft: 8, fontSize: 10, lineHeight: '16px', border: 'none' }}>Bạn</Tag>}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.email}</div>
          </div>
        </Space>
      )
    },
    {
      title: 'Nhân viên liên kết',
      key: 'employee',
      render: (_, r) => r.employee ? (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{r.employee.fullName}</div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.employee.empCode}</div>
        </div>
      ) : <Text type="secondary">—</Text>
    },
    {
      title: 'Vai trò & Quyền hạn',
      key: 'role',
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <Tag color={ROLE_CODE_COLORS[r.roleCode] || 'default'}>{ROLE_CODE_LABELS[r.roleCode] || r.roleCode}</Tag>
          {r.role && <Text style={{ fontSize: 11, color: '#6b7280' }}>{r.role.name}</Text>}
        </Space>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: active => <Badge status={active ? 'success' : 'error'} text={active ? 'Hoạt động' : 'Bị khóa'} />
    },
    {
      title: 'Đăng nhập cuối',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      render: d => d ? new Date(d).toLocaleString('vi-VN') : '—'
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, r) => (
        <Space>
          <Tooltip title="Gán Role"><Button size="small" icon={<KeyOutlined />} type="link" onClick={() => handleOpenRoleModal(r)} /></Tooltip>
          <Tooltip title="Chỉnh sửa"><Button size="small" icon={<EditOutlined />} type="link" onClick={() => handleOpenModal(r)} /></Tooltip>
          <Popconfirm title="Xóa tài khoản này?" onConfirm={() => handleDelete(r._id)}>
            <Button size="small" icon={<DeleteOutlined />} type="text" danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      <Card
        title={<Title level={4} style={{ margin: 0 }}>Quản lý Người dùng</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>Thêm tài khoản</Button>}
        style={{ borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
      >
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="Tìm kiếm theo tên, username, email..."
            prefix={<SearchOutlined />}
            style={{ width: 320, borderRadius: 8 }}
            onChange={e => setSearchText(e.target.value)}
          />
        </div>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="_id"
          loading={loading}
          pagination={pagination}
          onChange={p => fetchData(p.current, p.pageSize)}
        />
      </Card>

      <Modal
        title={editingId ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); setEditingUser(null); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Lưu" cancelText="Hủy"
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          {/* Liên kết nhân viên - hiển thị trước để auto-fill các trường bên dưới */}
          {!editingId && (
            <Form.Item
              name="employee"
              label={
                <span>
                  Liên kết Nhân viên
                  <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
                    (Chọn để tự điền thông tin)
                  </span>
                </span>
              }
            >
              <Select
                placeholder="Tìm và chọn nhân viên..."
                allowClear
                showSearch
                optionFilterProp="label"
                options={employees}
                onChange={handleEmployeeSelect}
              />
            </Form.Item>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: !editingId, message: 'Bắt buộc!' }]}>
              <Input disabled={!!editingId} placeholder="vd: nguyenvana" />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Email không hợp lệ!' }]}>
              <Input disabled={!!editingId} placeholder="vd: a@company.com" />
            </Form.Item>
            <Form.Item
              name="password"
              label={
                editingId
                  ? 'Mật khẩu mới (để trống = giữ cũ)'
                  : <span>Mật khẩu <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: 12 }}>(mặc định: {DEFAULT_PASSWORD})</span></span>
              }
              rules={!editingId ? [{ required: true, min: 6, message: 'Tối thiểu 6 ký tự!' }] : []}
            >
              <Input.Password placeholder="Nhập mật khẩu" />
            </Form.Item>
            {editingId && (
              <Form.Item name="employee" label="Liên kết Nhân viên">
                <Select placeholder="Chọn nhân viên" allowClear showSearch optionFilterProp="label" options={employees} />
              </Form.Item>
            )}
          </div>
          {editingId && (
            <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
              <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title={<Space><KeyOutlined />{`Gán Role cho: ${selectedUser?.fullName || selectedUser?.username}`}</Space>}
        open={isRoleModalOpen}
        onCancel={() => setIsRoleModalOpen(false)}
        onOk={() => roleForm.submit()}
        okText="Lưu" cancelText="Hủy"
        width={440}
      >
        <Form form={roleForm} layout="vertical" onFinish={handleAssignRole} style={{ marginTop: 16 }}>
          <Form.Item name="roleId" label="Quyền hạn" rules={[{ required: true, message: 'Chọn quyền hạn!' }]}>
            <Select placeholder="Quyền hạn" allowClear>
              {roles.map(r => (
                <Option key={r._id} value={r._id}>
                  <Space>
                    <span>{r.name}</span>
                    <Text type="secondary" style={{ fontSize: 11 }}>({r.permissions?.length || 0} quyền)</Text>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="roleCode" label="Vai trò" rules={[{ required: true, message: 'Chọn role code!' }]}>
            <Select placeholder="Chọn Role Code">
              {Object.entries(ROLE_CODE_LABELS).map(([val, label]) => (
                <Option key={val} value={val}><Tag color={ROLE_CODE_COLORS[val]}>{label}</Tag></Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
