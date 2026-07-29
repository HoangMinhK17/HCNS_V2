import React, { useEffect, useState } from 'react';
import { Card, Table, Typography, Space, Button, message, Tag, Modal, Form, Input, Popconfirm, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getAllPositions, createPosition, updatePosition, deletePosition } from '../../utils/positionApi';

const { Title } = Typography;

export default function PositionsList() {
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
      const res = await getAllPositions();
      if (res.success) {
        setData(res.data);
      } else {
        message.error('Lỗi tải danh sách chức danh');
      }
    } catch (e) {
      message.error('Không thể kết nối API chức danh');
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
        await updatePosition(editingId, values);
        message.success('Cập nhật chức danh thành công!');
      } else {
        await createPosition(values);
        message.success('Thêm chức danh thành công!');
      }
      handleCloseModal();
      fetchData();
    } catch (e) {
      const fallback = editingId ? 'Lỗi khi cập nhật chức danh' : 'Lỗi khi thêm chức danh';
      const errorMsg = e.response?.data?.message;
      message.error(errorMsg || fallback);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletePosition(id);
      message.success('Đã xóa chức danh!');
      fetchData();
    } catch (e) {
      message.error(e.response?.data?.message || 'Không thể xóa chức danh lúc này');
    }
  };

  const columns = [
    { title: 'STT', dataIndex: 'stt', key: 'stt', width: 60, render: (text, record, index) => (pagination.current - 1) * pagination.pageSize + index + 1 },
    { title: 'Tên chức danh', dataIndex: 'name', key: 'name', render: text => <strong>{text}</strong> },
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
        title={<Title level={4} style={{ margin: 0 }}>Danh sách Chức danh</Title>}
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
        title={editingId ? 'Cập nhật Chức danh' : 'Thêm Chức danh mới'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Tên chức danh" rules={[{ required: true, message: 'Vui lòng nhập tên chức danh!' }]}>
            <Input placeholder="Ví dụ: Nhân viên Kinh doanh..." />
          </Form.Item>
          <Form.Item name="code" label="Mã chức danh (Tùy chọn)">
            <Input placeholder="Ví dụ: NVKD" />
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
