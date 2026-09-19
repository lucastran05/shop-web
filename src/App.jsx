import { useState } from 'react';
import { ConfigProvider, Button, Typography, Space, Card } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { antThemeConfig } from './styles/theme';
import './styles/global.css';

const { Title, Text, Paragraph } = Typography;

function App() {
  const [count, setCount] = useState(0);

  return (
    <ConfigProvider theme={antThemeConfig} locale={viVN}>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Card
          style={{
            maxWidth: 500,
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            borderRadius: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 20 }}>
            <a href="https://vite.dev" target="_blank" rel="noreferrer">
              <img
                src="https://vite.dev/logo.svg"
                alt="Vite logo"
                style={{ height: 64, transition: 'filter 300ms' }}
              />
            </a>
            <a href="https://react.dev" target="_blank" rel="noreferrer">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg"
                alt="React logo"
                style={{ height: 64, transition: 'filter 300ms' }}
              />
            </a>
            <a href="https://ant.design" target="_blank" rel="noreferrer">
              <img
                src="https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg"
                alt="Ant Design logo"
                style={{ height: 64, transition: 'filter 300ms' }}
              />
            </a>
          </div>

          <Title level={2} style={{ marginBottom: 16 }}>
            Vite + React + Ant Design
          </Title>

          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Button type="primary" size="large" onClick={() => setCount((prev) => prev + 1)}>
                count is {count}
              </Button>
            </div>

            <Paragraph type="secondary" style={{ margin: 0 }}>
              Chỉnh sửa <Text code>src/App.jsx</Text> và lưu lại để kiểm tra HMR.
            </Paragraph>

            <Text type="secondary" style={{ fontSize: 13 }}>
              Cấu hình màu sắc Ant Design tại <Text code>src/styles/theme.js</Text>
            </Text>
          </Space>
        </Card>
      </div>
    </ConfigProvider>
  );
}

export default App;
