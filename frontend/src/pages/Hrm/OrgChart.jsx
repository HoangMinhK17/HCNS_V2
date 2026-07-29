import React, { useEffect, useState } from 'react';
import { Card, Typography, Spin, message, Avatar, Empty, Alert, Space } from 'antd';
import { UserOutlined, ClusterOutlined } from '@ant-design/icons';
import api from '../../utils/api';
import '../../styles/OrgChart.css';
import { getOrgChart } from '../../utils/employeeApi';

const { Title, Text } = Typography;

const OrgNode = ({ node, isRoot }) => {
  return (
    <div className="org-node-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Connector from parent */}
      {!isRoot && <div className="connector-vertical" style={{ width: 2, height: 20, background: '#ccc' }}></div>}

      <div className="org-node" style={{
        background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center',
        width: 180, zIndex: 1, position: 'relative'
      }}>
        <Avatar src={node.img} icon={!node.img && <UserOutlined />} size={48} />
        <div style={{ marginTop: 12, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Text strong style={{ fontSize: 14, color: '#1f2937' }}>{node.name}</Text>
          <Text type="secondary" style={{ fontSize: 12, color: '#1677ff', fontWeight: 500 }}>{node.title}</Text>
          <Text type="secondary" style={{ fontSize: 11, color: '#9ca3af' }}>{node.department}</Text>
        </div>
      </div>

      {node.children && node.children.length > 0 && (
        <>
          {/* Connector to children */}
          <div className="connector-vertical" style={{ width: 2, height: 20, background: '#ccc' }}></div>
          <div className="org-children-container" style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
            {/* Horizontal line connecting siblings */}
            {node.children.length > 1 && (
              <div style={{
                position: 'absolute', top: 0,
                left: `calc(50% / ${node.children.length})`,
                right: `calc(50% / ${node.children.length})`,
                height: 2, background: '#ccc'
              }}></div>
            )}

            {node.children.map(child => (
              <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 10px' }}>
                <OrgNode node={child} isRoot={false} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default function OrgChart() {
  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState([]);
  const [msgApi, contextHolder] = message.useMessage();

  useEffect(() => {
    fetchOrgChart();
  }, []);

  const fetchOrgChart = async () => {
    try {
      const res = await getOrgChart();
      if (res.success) {
        const data = res.data;
        const map = {};
        const roots = [];
        data.forEach(node => {
          map[node.id] = { ...node, children: [] };
        });
        data.forEach(node => {
          if (node.pid && map[node.pid]) {
            map[node.pid].children.push(map[node.id]);
          } else {
            roots.push(map[node.id]);
          }
        });
        setTreeData(roots);
      } else {
        msgApi.error(res.message);
      }
    } catch (err) {
      msgApi.error('Lỗi khi tải sơ đồ tổ chức');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#f5f5f5' }}>
      {contextHolder}
      <Card
        title={
          <Space>
            <ClusterOutlined style={{ color: '#1677ff' }} />
            <Title level={4} style={{ margin: 0 }}>Sơ đồ Tổ chức (Org Chart)</Title>
          </Space>
        }
        bordered={false}
        style={{ borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflowX: 'auto' }}
      >
        <Alert
          message="Sơ đồ này được tạo tự động dựa trên thiết lập 'Quản lý trực tiếp (reportsTo)' của Nhân viên và Vị trí."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
        {loading ? (
          <div style={{ textAlign: 'center', padding: 50 }}>
            <Spin size="large" />
          </div>
        ) : treeData.length > 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20, minWidth: 'max-content' }}>
            {treeData.map(root => (
              <OrgNode key={root.id} node={root} isRoot={true} />
            ))}
          </div>
        ) : (
          <Empty description="Chưa có dữ liệu sơ đồ tổ chức" />
        )}
      </Card>
    </div>
  );
}
