import React, { useEffect, useState } from 'react';
import {
  Card, Table, Typography, Space, Button, Tag, Input, message,
  Modal, Form, Checkbox, Popconfirm, Tooltip, Divider, Row, Col, Badge
} from 'antd';
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  SafetyOutlined, CheckOutlined, CloseOutlined
} from '@ant-design/icons';
import { getAll, create, update, remove } from '../../utils/roleApi';

const { Title, Text } = Typography;

// ── Nhóm các permissions theo module ────────────────────────────
const PERMISSION_GROUPS = [
  {
    group: 'Nhân viên',
    color: '#1677ff',
    permissions: [
      { key: 'employee:view', label: 'Xem' },
      { key: 'employee:create', label: 'Thêm mới' },
      { key: 'employee:edit', label: 'Chỉnh sửa' },
      { key: 'employee:delete', label: 'Xóa' },
      { key: 'employee:import', label: 'Import' },
      { key: 'employee:export', label: 'Export' },
    ],
  },
  {
    group: 'Phòng ban',
    color: '#7c3aed',
    permissions: [
      { key: 'department:view', label: 'Xem' },
      { key: 'department:create', label: 'Thêm mới' },
      { key: 'department:edit', label: 'Chỉnh sửa' },
      { key: 'department:delete', label: 'Xóa' },
    ],
  },
  {
    group: 'Chức danh',
    color: '#0891b2',
    permissions: [
      { key: 'position:view', label: 'Xem' },
      { key: 'position:create', label: 'Thêm mới' },
      { key: 'position:edit', label: 'Chỉnh sửa' },
      { key: 'position:delete', label: 'Xóa' },
    ],
  },
  {
    group: 'Công ty',
    color: '#059669',
    permissions: [
      { key: 'company:view', label: 'Xem' },
      { key: 'company:create', label: 'Thêm mới' },
      { key: 'company:edit', label: 'Chỉnh sửa' },
      { key: 'company:delete', label: 'Xóa' },
      { key: 'orgchart:view', label: 'Sơ đồ tổ chức' },
    ],
  },
  {
    group: 'Hợp đồng',
    color: '#d97706',
    permissions: [
      { key: 'contract:view', label: 'Xem' },
      { key: 'contract:create', label: 'Thêm mới' },
      { key: 'contract:edit', label: 'Chỉnh sửa' },
      { key: 'contract:delete', label: 'Xóa' },
    ],
  },
  {
    group: 'Người dùng và Phân quyền',
    color: '#09e376ff',
    permissions: [
      { key: 'role:view', label: 'Xem phân quyền' },
      { key: 'role:create', label: 'Tạo phân quyền' },
      { key: 'role:edit', label: 'Sửa phân quyền' },
      { key: 'role:delete', label: 'Xóa phân quyền' },
      { key: 'user:view', label: 'Xem người dùng' },
      { key: 'user:create', label: 'Tạo người dùng' },
      { key: 'user:edit', label: 'Sửa người dùng' },
      { key: 'user:delete', label: 'Xóa người dùng' },
    ],
  },
  {
    group: 'Báo cáo',
    color: '#f0688bff',
    permissions: [
      { key: 'report:view', label: 'Xem báo cáo' },
    ],
  },
  {
    group: 'Thiết lập',
    color: '#c6c6c7ff',
    permissions: [
      { key: 'system:settings', label: 'Cài đặt hệ thống' },
    ],
  },
  {
    group: 'Ca & Lịch làm việc',
    color: '#8b5cf6',
    permissions: [
      { key: 'shift:view', label: 'Xem' },
      { key: 'shift:create', label: 'Tạo mới' },
      { key: 'shift:edit', label: 'Chỉnh sửa' },
      { key: 'shift:delete', label: 'Xóa' },
      { key: 'shift:assign', label: 'Phân ca' },
    ],
  },
  {
    group: 'Chấm công',
    color: '#3b82f6',
    permissions: [
      { key: 'attendance:view', label: 'Xem' },
      { key: 'attendance:checkin', label: 'Check-in/out' },
      { key: 'attendance:manual-edit', label: 'Chỉnh sửa tay' },
      { key: 'attendance:approve', label: 'Duyệt công' },
      { key: 'attendance:export', label: 'Xuất báo cáo' },
    ],
  },
  {
    group: 'ESS (Cổng nhân viên)',
    color: '#10b981',
    permissions: [
      { key: 'ess:leave', label: 'Nghỉ phép' },
      { key: 'ess:overtime', label: 'Tăng ca' },
      { key: 'ess:asset', label: 'Tài sản' },
    ],
  },
  {
    group: 'Phê duyệt',
    color: '#f59e0b',
    permissions: [
      { key: 'approval:view', label: 'Xem đơn' },
      { key: 'approval:manage', label: 'Quản lý/Duyệt đơn' },
    ],
  },
  {
    group: 'Cấu hình hệ thống',
    color: '#6b7280',
    permissions: [
      { key: 'location:manage', label: 'Quản lý địa điểm' },
      { key: 'holiday:manage', label: 'Quản lý ngày lễ' },
      { key: 'leavetype:manage', label: 'Quản lý loại phép' },
      { key: 'leavebalance:manage', label: 'Quản lý quỹ phép' },
    ],
  },
  {
    group: 'Sinh nhật',
    color: '#6b7280',
    permissions: [
      { key: 'birthday:view', label: 'Xem' },
      { key: 'birthday:create', label: 'Tạo mới' },
      { key: 'birthday:edit', label: 'Chỉnh sửa' },
      { key: 'birthday:delete', label: 'Xóa' },
    ],
  }
];

// ── Component: Hiển thị permission matrix trong bảng ────────────
function PermissionTags({ permissions = [] }) {
  if (!permissions.length) return <Text type="secondary" style={{ fontSize: 12 }}>Không có quyền</Text>;
  // Gom nhóm theo module prefix
  const grouped = {};
  permissions.forEach(p => {
    const prefix = p.split(':')[0];
    if (!grouped[prefix]) grouped[prefix] = [];
    grouped[prefix].push(p);
  });
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {Object.entries(grouped).map(([prefix, perms]) => (
        <Tooltip key={prefix} title={perms.join(', ')}>
          <Tag style={{ fontSize: 11, margin: 0, cursor: 'default' }}>
            {prefix} ×{perms.length}
          </Tag>
        </Tooltip>
      ))}
    </div>
  );
}

// ── Component: Checkbox group theo module ────────────────────────
function PermissionGroupCheckbox({ value = [], onChange }) {
  const allKeys = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));
  const isAllChecked = allKeys.length > 0 && allKeys.every(k => value.includes(k));
  const isSomeChecked = allKeys.some(k => value.includes(k)) && !isAllChecked;

  const toggle = (perm) => {
    const next = value.includes(perm) ? value.filter(p => p !== perm) : [...value, perm];
    onChange?.(next);
  };

  const toggleGroup = (group) => {
    const groupKeys = group.permissions.map(p => p.key);
    const allChecked = groupKeys.every(k => value.includes(k));
    if (allChecked) {
      onChange?.(value.filter(p => !groupKeys.includes(p)));
    } else {
      onChange?.([...new Set([...value, ...groupKeys])]);
    }
  };

  const toggleAll = () => {
    if (isAllChecked) {
      onChange?.([]);
    } else {
      onChange?.(allKeys);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ── Header: Chọn tất cả ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: isAllChecked
          ? 'linear-gradient(135deg, #1677ff14, #1677ff08)'
          : 'linear-gradient(135deg, #f8faff, #f0f4ff)',
        border: `1.5px solid ${isAllChecked ? '#1677ff55' : '#e0e7ff'}`,
        borderRadius: 10, padding: '10px 16px',
        transition: 'all 0.2s',
      }}>
        <Checkbox
          checked={isAllChecked}
          indeterminate={isSomeChecked}
          onChange={toggleAll}
          style={{ fontWeight: 700, fontSize: 13 }}
        >
          <span style={{ fontWeight: 700, fontSize: 13, color: isAllChecked ? '#1677ff' : '#1f2937' }}>
            Chọn tất cả quyền
          </span>
          <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
            ({value.length}/{allKeys.length} quyền)
          </Text>
        </Checkbox>
        {isAllChecked && (
          <Tag color="blue" style={{ fontSize: 11, fontWeight: 600, borderRadius: 20 }}>
            ✓ Toàn quyền
          </Tag>
        )}
      </div>

      {/* ── Các nhóm module ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {PERMISSION_GROUPS.map(group => {
          const groupKeys = group.permissions.map(p => p.key);
          const allChecked = groupKeys.every(k => value.includes(k));
          const someChecked = groupKeys.some(k => value.includes(k)) && !allChecked;
          const checkedCount = groupKeys.filter(k => value.includes(k)).length;

          return (
            <div
              key={group.group}
              style={{
                border: `1.5px solid ${allChecked ? group.color + '55' : someChecked ? group.color + '33' : '#f0f0f0'}`,
                borderRadius: 10,
                overflow: 'hidden',
                transition: 'border-color 0.2s',
                background: allChecked ? group.color + '08' : '#fff',
              }}
            >
              {/* Header nhóm */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px',
                  background: allChecked ? group.color + '18' : someChecked ? group.color + '0a' : '#fafafa',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                }}
                onClick={() => toggleGroup(group)}
              >
                <Checkbox
                  checked={allChecked}
                  indeterminate={someChecked}
                  onChange={(e) => { e.stopPropagation(); toggleGroup(group); }}
                />
                <Tag
                  color={group.color}
                  style={{ fontWeight: 600, fontSize: 11.5, margin: 0, borderRadius: 6 }}
                >
                  {group.group}
                </Tag>
                <span style={{
                  marginLeft: 'auto', fontSize: 11,
                  color: checkedCount > 0 ? group.color : '#9ca3af',
                  fontWeight: checkedCount > 0 ? 600 : 400,
                }}>
                  {checkedCount}/{groupKeys.length}
                </span>
              </div>

              {/* Danh sách quyền */}
              <div style={{ padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {group.permissions.map(p => {
                  const checked = value.includes(p.key);
                  return (
                    <span
                      key={p.key}
                      onClick={() => toggle(p.key)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
                        fontSize: 11.5, fontWeight: checked ? 600 : 400,
                        border: `1px solid ${checked ? group.color + '88' : '#e5e7eb'}`,
                        background: checked ? group.color + '18' : '#f9fafb',
                        color: checked ? group.color : '#6b7280',
                        transition: 'all 0.15s',
                        userSelect: 'none',
                      }}
                    >
                      {checked && <CheckOutlined style={{ fontSize: 9 }} />}
                      {p.label}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RolesList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getAll();
      if (res.success) setData(res.data);
    } catch (e) { message.error('Không thể tải danh sách Role'); }
    finally { setLoading(false); }
  };

  const handleOpenModal = (record = null) => {
    setEditingId(record?._id || null);
    if (record) {
      form.setFieldsValue({ name: record.name, description: record.description, permissions: record.permissions || [] });
    } else {
      form.resetFields();
      form.setFieldsValue({ permissions: [] });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingId) {
        const res = await update(editingId, values);
        if (res.success) { message.success('Cập nhật Role thành công'); fetchData(); }
      } else {
        const res = await create(values);
        if (res.success) { message.success('Tạo Role thành công'); fetchData(); }
      }
      setIsModalOpen(false);
      form.resetFields();
    } catch (e) { message.error(e.response?.data?.message || 'Có lỗi xảy ra'); }
  };

  const handleDelete = async (id) => {
    try {
      const res = await remove(id);
      if (res.success) { message.success('Đã xóa Role'); fetchData(); }
    } catch (e) { message.error(e.response?.data?.message || 'Không thể xóa Role hệ thống'); }
  };

  const columns = [
    {
      title: 'Tên Role',
      key: 'name',
      width: 220,
      render: (_, r) => (
        <Space>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, #1677ff, #0d47a1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SafetyOutlined style={{ color: '#fff', fontSize: 16 }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.description || '—'}</div>
          </div>
        </Space>
      )
    },
    {
      title: 'Số quyền',
      key: 'count',
      width: 100,
      render: (_, r) => (
        <Badge
          count={r.permissions?.length || 0}
          style={{ background: r.permissions?.length ? '#1677ff' : '#d1d5db' }}
          showZero
        />
      )
    },
    {
      title: 'Phân loại',
      dataIndex: 'isSystem',
      key: 'isSystem',
      width: 90,
      render: v => v ? <Tag color="red">Hệ thống</Tag> : <Tag color="default">Tùy chỉnh</Tag>
    },
    {
      title: 'Số người dùng liên kết',
      key: 'userCount',
      align: 'center',
      width: 100,
      render: (_, r) => (
        <Badge
          count={r.userCount || 0}
          style={{ background: r.userCount ? '#037b41ff' : '#00ff77' }}
          showZero
        />
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      render: (_, r) => (
        <Space>
          <Tooltip title="Chỉnh sửa quyền">
            <Button size="small" icon={<EditOutlined />} type="link" onClick={() => handleOpenModal(r)} />
          </Tooltip>
          {!r.isSystem && (
            <Popconfirm title="Xóa Role này?" onConfirm={() => handleDelete(r._id)}>
              <Button size="small" icon={<DeleteOutlined />} type="text" danger />
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      <Card
        title={
          <Space>
            <SafetyOutlined style={{ color: '#1677ff', fontSize: 18 }} />
            <Title level={4} style={{ margin: 0 }}>Phân quyền (RBAC)</Title>
          </Space>
        }
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>Tạo Role mới</Button>}
        style={{ borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
      >
        <Table
          columns={columns}
          dataSource={data}
          rowKey="_id"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={
          <Space>
            <SafetyOutlined style={{ color: '#1677ff' }} />
            {editingId ? 'Chỉnh sửa Role & Quyền' : 'Tạo Role mới'}
          </Space>
        }
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Lưu" cancelText="Hủy"
        width={720}
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto', padding: '16px 24px' } }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
            <Form.Item name="name" label="Tên Role" rules={[{ required: true, message: 'Nhập tên role!' }]}>
              <Input placeholder="vd: HR Manager, Kế toán..." />
            </Form.Item>
            <Form.Item name="description" label="Mô tả">
              <Input placeholder="Mô tả ngắn về role này" />
            </Form.Item>
          </div>

          <Divider style={{ margin: '8px 0 16px' }}>Phân quyền theo Module</Divider>

          <Form.Item name="permissions" valuePropName="value" trigger="onChange">
            <PermissionGroupCheckbox />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
