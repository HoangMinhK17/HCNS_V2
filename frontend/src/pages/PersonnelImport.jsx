import { useState } from 'react';
import '../styles/PersonnelImport.css';
import {
  Card, Button, Typography, Space, Upload, message, Divider
} from 'antd';
import {
  DownloadOutlined, UploadOutlined, FileExcelOutlined
} from '@ant-design/icons';
import api from '../utils/api'; // Axios instance

const { Title, Text, Paragraph } = Typography;

export default function PersonnelImport({ onNavigate }) {
  const [uploading, setUploading] = useState(false);
  const [msgApi, contextHolder] = message.useMessage();

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/excel/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Template_Import_NhanSu.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      msgApi.error('Lỗi khi tải file template!');
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/excel/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Export_NhanSu.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      msgApi.error('Lỗi khi xuất file Excel!');
    }
  };

  const uploadProps = {
    name: 'file',
    multiple: false,
    showUploadList: false,
    customRequest: async ({ file, onSuccess, onError }) => {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await api.post('/excel/import', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (response.data.success) {
          msgApi.success(response.data.message);
          onSuccess(response.data);
        } else {
          msgApi.error(response.data.message || 'Import thất bại');
          onError(new Error(response.data.message));
        }
      } catch (error) {
        msgApi.error(error.response?.data?.message || 'Lỗi khi upload file');
        onError(error);
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div className="import-container" style={{ padding: 24 }}>
      {contextHolder}
      <Card className="import-card" bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <div className="import-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div className="title-group" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="icon-wrap" style={{ background: '#e6f4ff', padding: 12, borderRadius: 8, color: '#1677ff', fontSize: 24 }}>
              <FileExcelOutlined />
            </div>
            <div>
              <Title level={3} style={{ margin: 0, fontWeight: 700 }}>Nhập liệu & Đồng bộ Nhân sự</Title>
              <Text type="secondary">Sử dụng Excel để quản lý dữ liệu nhân viên nhanh chóng</Text>
            </div>
          </div>
          <Button onClick={() => onNavigate('/dashboard')}>Về trang chủ</Button>
        </div>

        <Divider />

        <div className="import-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          <Card type="inner" title="1. Tải File Mẫu" className="action-card" style={{ borderColor: '#d9d9d9' }}>
            <Paragraph type="secondary" style={{ height: 60 }}>
              Tải file Excel mẫu với cấu trúc chuẩn. Vui lòng không sửa tên các cột trong file mẫu này.
            </Paragraph>
            <Button type="primary" ghost icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
              Tải Template Excel
            </Button>
          </Card>

          <Card type="inner" title="2. Upload Dữ Liệu" className="action-card" style={{ borderColor: '#d9d9d9' }}>
            <Paragraph type="secondary" style={{ height: 60 }}>
              Tải lên file Excel đã điền dữ liệu. Hệ thống tự động thêm mới hoặc cập nhật nếu nhân viên đã tồn tại.
            </Paragraph>
            <Upload {...uploadProps}>
              <Button type="primary" icon={<UploadOutlined />} loading={uploading}>
                Click để Upload File Excel
              </Button>
            </Upload>
          </Card>

          <Card type="inner" title="3. Xuất Dữ Liệu" className="action-card" style={{ borderColor: '#d9d9d9' }}>
            <Paragraph type="secondary" style={{ height: 60 }}>
              Xuất toàn bộ danh sách nhân viên hiện hành trên hệ thống ra file Excel để sao lưu hoặc báo cáo.
            </Paragraph>
            <Button icon={<FileExcelOutlined />} onClick={handleExport}>
              Xuất danh sách hiện hành
            </Button>
          </Card>
        </div>
      </Card>
    </div>
  );
}
