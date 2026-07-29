import React, { useEffect, useState } from 'react';
import {
  Card, Typography, Button, message, Descriptions, Spin, Tag, Modal, Form, Input, Select, DatePicker, Row, Col, Space
} from 'antd';
import { EditOutlined, BankOutlined, GlobalOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getAllCompanies, updateCompany, createCompany } from '../../utils/companyApi';

const { Title, Text } = Typography;
const { Option } = Select;

const BUSINESS_TYPE_LABELS = {
  'joint-stock': 'Công ty Cổ phần',
  'limited': 'Công ty TNHH',
  'sole-proprietorship': 'Doanh nghiệp tư nhân',
  'partnership': 'Công ty hợp danh',
  'other': 'Khác',
};

export default function CompanyProfile() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      const res = await getAllCompanies();
      if (res.success && res.data && res.data.length > 0) {
        setCompany(res.data[0]); // Chỉ lấy 1 công ty đầu tiên
      } else {
        setCompany(null);
      }
    } catch (error) {
      message.error('Không thể tải thông tin công ty');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    if (company) {
      form.setFieldsValue({
        ...company,
        foundedDate: company.foundedDate ? dayjs(company.foundedDate) : null,
      });
    } else {
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleSave = async (values) => {
    try {
      if (company && company._id) {
        const res = await updateCompany(company._id, values);
        if (res.success) {
          message.success('Cập nhật thông tin thành công');
          fetchCompanyData();
        }
      } else {
        const res = await createCompany(values);
        if (res.success) {
          message.success('Đã lưu thông tin công ty');
          fetchCompanyData();
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, display: 'flex', justifyContent: 'center', marginTop: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      <Card
        style={{ borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', maxWidth: 900, margin: '0 auto' }}
        title={
          <Space>
            <BankOutlined style={{ fontSize: 24, color: '#1677ff' }} />
            <Title level={3} style={{ margin: 0 }}>Hồ sơ Pháp nhân</Title>
          </Space>
        }
        extra={
          <Button type="primary" icon={<EditOutlined />} onClick={handleEditClick}>
            Chỉnh sửa
          </Button>
        }
      >
        {!company ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text type="secondary">Chưa có thông tin công ty. Vui lòng bấm "Chỉnh sửa" để cập nhật.</Text>
          </div>
        ) : (
          <Descriptions
            bordered
            column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
            labelStyle={{ fontWeight: 600, background: '#fafafa', width: '25%' }}
            contentStyle={{ background: '#fff' }}
          >
            <Descriptions.Item label="Mã công ty">
              <Text strong>{company.code}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={company.status === 'active' ? 'green' : 'red'}>
                {company.status === 'active' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Tên công ty" span={2}>
              <Text strong style={{ fontSize: 16, color: '#1677ff' }}>{company.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Tên viết tắt">
              {company.shortName || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Mã số thuế">
              <Text copyable>{company.taxCode}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Loại hình">
              {BUSINESS_TYPE_LABELS[company.businessType] || company.businessType || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Người đại diện">
              {company.legalRepresentative || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày thành lập">
              {company.foundedDate ? dayjs(company.foundedDate).format('DD/MM/YYYY') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">
              <Space>
                <PhoneOutlined />
                {company.phone || '—'}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              <Space>
                <MailOutlined />
                {company.email || '—'}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Website">
              <Space>
                <GlobalOutlined />
                {company.website ? <a href={company.website} target="_blank" rel="noreferrer">{company.website}</a> : '—'}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Địa chỉ" span={2}>
              {company.address || '—'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Modal
        title={<Space><BankOutlined style={{ color: '#1677ff' }} /> Cập nhật thông tin công ty</Space>}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        width={720}
        okText="Lưu thông tin"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="code" label="Mã công ty" rules={[{ required: true, message: 'Bắt buộc nhập!' }]}>
                <Input placeholder="Vd: CTY-01" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="taxCode" label="Mã số thuế">
                <Input placeholder="Nhập MST" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="name" label="Tên công ty (Đầy đủ)" rules={[{ required: true, message: 'Bắt buộc nhập!' }]}>
                <Input placeholder="Nhập tên đầy đủ của công ty" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="shortName" label="Tên viết tắt">
                <Input placeholder="Vd: FPT, VNG..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="businessType" label="Loại hình doanh nghiệp">
                <Select placeholder="Chọn loại hình">
                  {Object.entries(BUSINESS_TYPE_LABELS).map(([key, label]) => (
                    <Option key={key} value={key}>{label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="legalRepresentative" label="Người đại diện pháp luật">
                <Input placeholder="Họ và tên người đại diện" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="foundedDate" label="Ngày thành lập">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Số điện thoại">
                <Input placeholder="Nhập số điện thoại" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input placeholder="Nhập địa chỉ email" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="website" label="Website">
                <Input placeholder="https://" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="address" label="Địa chỉ trụ sở">
                <Input.TextArea rows={2} placeholder="Nhập địa chỉ đầy đủ" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Trạng thái">
                <Select>
                  <Option value="active">Đang hoạt động</Option>
                  <Option value="inactive">Ngừng hoạt động</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
