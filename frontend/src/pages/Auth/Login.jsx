import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, message } from 'antd';
import { UserOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { login } from '../../utils/userApi';

export default function Login({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await login(values.username, values.password);
      if (res.success) {
        const { user, accessToken, refreshToken } = res.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        message.success(`Xin chào, ${user.fullName || user.username}!`);
        onLoginSuccess?.(user);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.bgCircle1} />
      <div style={styles.bgCircle2} />

      <div style={styles.card}>
        <div style={styles.brandArea}>
          <div style={styles.logoBox}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#fff" opacity="0.9" />
              <path d="M2 17l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              <path d="M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={styles.brand}>FumeeTech HRM</h1>
          <p style={styles.brandSub}>Hệ thống Quản lý Nhân sự</p>
        </div>

        {/* Login form */}
        <div style={styles.formArea}>
          <h2 style={styles.title}>Đăng nhập</h2>
          <p style={styles.subtitle}>Vui lòng nhập thông tin tài khoản của bạn</p>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
            style={{ marginTop: 24 }}
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}
            >
              <Input
                id="login-username"
                prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
                placeholder="Tên đăng nhập hoặc Email"
                size="large"
                style={styles.input}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
            >
              <Input.Password
                id="login-password"
                prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                placeholder="Mật khẩu"
                size="large"
                style={styles.input}
                iconRender={(visible) =>
                  visible ? <EyeTwoTone twoToneColor="#1677ff" /> : <EyeInvisibleOutlined />
                }
              />
            </Form.Item>

            <div style={styles.rowBetween}>
              <Form.Item name="remember" valuePropName="checked" style={{ margin: 0 }}>
                <Checkbox style={{ fontSize: 13, color: '#6b7280' }}>Nhớ đăng nhập</Checkbox>
              </Form.Item>
              <a href="#" style={styles.forgotLink}>Quên mật khẩu?</a>
            </div>

            <Form.Item style={{ marginTop: 24 }}>
              <Button
                id="login-submit"
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
                style={styles.submitBtn}
              >
                {loading ? '' : 'Đăng nhập'}
              </Button>
            </Form.Item>
          </Form>
        </div>

        {/* Footer */}
        <p style={styles.footer}>
          © {new Date().getFullYear()} FumeeTech · HR Management System
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1677ff 100%)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    position: 'relative',
    overflow: 'hidden',
    padding: '20px',
  },
  bgCircle1: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: '50%',
    background: 'rgba(22, 119, 255, 0.12)',
    top: -150,
    right: -100,
    pointerEvents: 'none',
  },
  bgCircle2: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: '50%',
    background: 'rgba(22, 119, 255, 0.08)',
    bottom: -100,
    left: -80,
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    background: 'rgba(255,255,255,0.97)',
    borderRadius: 20,
    boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  },
  brandArea: {
    background: 'linear-gradient(135deg, #1677ff 0%, #0d47a1 100%)',
    padding: '36px 40px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.3)',
  },
  brand: {
    margin: 0,
    color: '#fff',
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.5px',
  },
  brandSub: {
    margin: 0,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: 400,
  },
  formArea: {
    padding: '32px 40px 24px',
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#111827',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    margin: '6px 0 0',
    fontSize: 13,
    color: '#6b7280',
  },
  input: {
    borderRadius: 10,
    border: '1.5px solid #e5e7eb',
    height: 46,
    fontSize: 14,
  },
  rowBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -8,
  },
  forgotLink: {
    fontSize: 13,
    color: '#1677ff',
    textDecoration: 'none',
    fontWeight: 500,
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    fontWeight: 600,
    fontSize: 15,
    background: 'linear-gradient(90deg, #1677ff 0%, #0d47a1 100%)',
    border: 'none',
    boxShadow: '0 4px 15px rgba(22, 119, 255, 0.4)',
    letterSpacing: '0.3px',
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9ca3af',
    padding: '0 40px 24px',
    margin: 0,
  },
};
