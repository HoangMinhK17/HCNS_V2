import React, { useEffect, useState } from 'react';
import { Card, Table, Typography, Space, Button, message, Modal, Form, Input, Popconfirm, Tag, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getAllDepartments, createDepartment, updateDepartment, deleteDepartment } from '../../utils/departmentApi';

const { Title } = Typography;

export default function DepartmentsList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getAllDepartments();
      if (res.success) {
        setData(res.data);
      } else {
        message.error('Lỗi tải danh sách phòng ban');
      }
    } catch (e) {
      message.error('Không thể kết nối API phòng ban');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (record = null) => {
    if (record) {
      setEditingId(record._id);
      form.setFieldsValue({ name: record.name, code: record.code, status: record.status });
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

  const handleSubmit = async (values) => {
    try {
      if (editingId) {
        await updateDepartment(editingId, values);
        message.success('Cập nhật phòng ban thành công!');
      } else {
        await createDepartment(values);
        message.success('Thêm phòng ban thành công!');
      }
      handleCloseModal();
      fetchData();
    } catch (e) {
      const fallbackMsg = editingId ? 'Lỗi khi cập nhật phòng ban!' : 'Lỗi khi thêm phòng ban!';
      const errorMsg = e?.response?.data?.message || fallbackMsg;
      message.error(errorMsg);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await deleteDepartment(id);
      const successMsg = res?.data?.message || 'Đã xóa phòng ban!';

      message.success(successMsg);
      fetchData();
    } catch (e) {
      const errorMsg = e?.response?.data?.message || 'Lỗi khi xóa phòng ban!';
      message.error(errorMsg);
    }
  };

  const columns = [
    { title: 'STT', dataIndex: 'stt', key: 'stt', width: 60, render: (text, record, index) => (pagination.current - 1) * pagination.pageSize + index + 1 },
    { title: 'Tên phòng ban', dataIndex: 'name', key: 'name', render: text => <strong>{text}</strong> },
    { title: 'Nhân sự hiện tại', dataIndex: 'currentHeadcount', key: 'currentHeadcount', render: text => <span>{text || 0} người</span> },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (text) => text === 'active' ? (
        <Tag color="success">Đang hoạt động</Tag>
      ) : (
        <Tag color="default">Ngừng hoạt động</Tag>
      )
    },
    {
      title: 'Thao tác', key: 'action', render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" type="link" onClick={() => handleOpenModal(record)} />
          <Popconfirm title="Bạn có chắc chắn muốn xóa?" onConfirm={() => handleDelete(record._id)}>
            <Button icon={<DeleteOutlined />} size="small" type="text" danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      <Card
        title={<Title level={4} style={{ margin: 0 }}>Danh sách Phòng ban</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>Thêm mới</Button>}
        style={{ borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
      >
        <Table
          columns={columns}
          dataSource={data}
          rowKey="_id"
          loading={loading}
          pagination={pagination}
          onChange={(newPagination) => setPagination(newPagination)}
        />
      </Card>

      <Modal
        title={editingId ? 'Cập nhật Phòng ban' : 'Thêm Phòng ban mới'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Tên phòng ban" rules={[{ required: true, message: 'Vui lòng nhập tên phòng ban!' }]}>
            <Input placeholder="Ví dụ: Phòng Kế toán..." />
          </Form.Item>
          <Form.Item name="code" label="Mã phòng ban (Tùy chọn)">
            <Input placeholder="Ví dụ: PB001" />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" rules={[{ required: true, message: 'Vui lòng chọn trạng thái!' }]}>
            <Select placeholder="Chọn trạng thái">
              <Option value="active">Đang hoạt động</Option>
              <Option value="inactive">Ngừng hoạt động</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
