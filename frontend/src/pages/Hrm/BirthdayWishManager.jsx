import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Popconfirm, Card, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import birthDayWishApi from '../../utils/birthDayWishApi';

const { Title } = Typography;
export default function BirthdayWishManager() {
  const [wishes, setWishes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  const fetchWishes = async () => {
    setLoading(true);
    try {
      const response = await birthDayWishApi.getWishBirths();
      setWishes(response.data || []);
    } catch (error) {
      message.error('Không thể tải danh sách lời chúc.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishes();
  }, []);

  const handleOpenModal = (record = null) => {
    if (record) {
      setEditingId(record._id);
      form.setFieldsValue(record);
    } else {
      setEditingId(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
    setEditingId(null);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await birthDayWishApi.updateWishBirth(editingId, values);
        message.success('Cập nhật lời chúc thành công');
      } else {
        await birthDayWishApi.createWishBirth(values);
        message.success('Thêm lời chúc thành công');
      }
      setIsModalOpen(false);
      fetchWishes();
    } catch (error) {
      message.error('Có lỗi xảy ra. Vui lòng thử lại.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await birthDayWishApi.deleteWishBirth(id);
      message.success('Xóa lời chúc thành công');
      fetchWishes();
    } catch (error) {
      message.error('Không thể xóa lời chúc.');
    }
  };

  const columns = [
    {
      title: 'Lời chúc',
      dataIndex: 'birthDayWish',
      key: 'birthDayWish',
      render: (text) => <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>
    },
    {
      title: 'Dành cho (Giới tính)',
      dataIndex: 'gender',
      key: 'gender',
      width: 150,
      render: (gender) => {
        if (gender === 'male') return 'Nam';
        if (gender === 'female') return 'Nữ';
        return 'Tất cả / Khác';
      }
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined style={{ color: '#1677ff' }}/>}
            onClick={() => handleOpenModal(record)} 
          />
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa lời chúc này?"
            onConfirm={() => handleDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Card
      title={<Title level={4} style={{ margin: 0 }}>Danh sách Lời chúc mừng sinh nhật</Title>}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
        Thêm lời chúc
      </Button>}>

      <Table
        columns={columns}
        dataSource={wishes}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingId ? 'Cập nhật lời chúc' : 'Thêm lời chúc mới'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCancel}
        okText={editingId ? 'Cập nhật' : 'Thêm mới'}
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="birthDayWish"
            label="Nội dung lời chúc"
            rules={[{ required: true, message: 'Vui lòng nhập nội dung lời chúc!' }]}
          >
            <Input.TextArea rows={4} placeholder="Nhập nội dung lời chúc..." />
          </Form.Item>
          
          <Form.Item
            name="gender"
            label="Áp dụng cho giới tính"
            rules={[{ required: true, message: 'Vui lòng chọn giới tính!' }]}
            initialValue="male"
          >
            <Select>
              <Select.Option value="male">Nam</Select.Option>
              <Select.Option value="female">Nữ</Select.Option>
              <Select.Option value="other">Tất cả / Khác</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
