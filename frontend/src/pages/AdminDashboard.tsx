// src/pages/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Table, Button, message, Modal, Tag, Typography, Space } from 'antd';
import { LockOutlined, SyncOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAdmin } from '../context/AdminContext';
import api from '../utils/api';

const { Text, Title } = Typography;

interface User {
  userID: string;
  role: string;
}

const ROLE_COLORS = {
  admin: 'purple',
  seller: 'blue',
  buyer: 'green',
  inactive: 'red',
};

const AdminDashboard: React.FC = () => {
  const { users, fetchUsers, setUsers  } = useAdmin();
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const { user: currentUser, getAccessTokenSilently } = useAuth0();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchUsers();
      } catch (error) {
        message.error('Failed to load users');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [fetchUsers]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchUsers();
      message.success('Users refreshed successfully');
    } catch (error) {
      message.error('Failed to refresh users');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Update the error handling in the handleDeactivate function
  const handleDeactivate = async (userId: string) => {
    if (userId === currentUser?.sub) {
      message.warning("You can't deactivate your own account");
      return;
    }
  
    Modal.confirm({
      title: 'Confirm Deactivation',
      icon: <LockOutlined />,
      content: 'This will revoke the user\'s access to the platform.',
      okText: 'Deactivate',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setDeactivatingId(userId);
          
          // Simple fetch API - no axios
          const token = await getAccessTokenSilently();
          const response = await fetch(`${api.defaults.baseURL}/admin/deactivate/${userId}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
  
          const data = await response.json();
          
          if (!response.ok) throw new Error(data.message || 'Deactivation failed');
  
          // Immediate UI update
          setUsers(users.map(u => 
            u.userID === userId ? { ...u, role: 'inactive' } : u
          ));
          
          message.success(data.message);
        } catch (error) {
          message.error(error instanceof Error ? error.message : 'Deactivation failed');
          console.error('Raw error:', error);
        } finally {
          setDeactivatingId(null);
        }
      }
    });
  };

  const columns: ColumnsType<User> = [
    {
      title: 'User ID',
      dataIndex: 'userID',
      key: 'userID',
      render: (id: string) => <Text copyable>{id}</Text>,
      width: '40%',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={ROLE_COLORS[role as keyof typeof ROLE_COLORS] || 'default'}>
          {role.toUpperCase()}
        </Tag>
      ),
      filters: Object.entries(ROLE_COLORS).map(([value]) => ({
        text: value.toUpperCase(),
        value,
      })),
      onFilter: (value, record) => record.role === value,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          danger
          onClick={() => handleDeactivate(record.userID)}
          disabled={record.role === 'inactive' || deactivatingId === record.userID}
          loading={deactivatingId === record.userID}
          icon={<LockOutlined />}
        >
          {record.role === 'inactive' ? 'Deactivated' : 'Deactivate'}
        </Button>
      ),
      width: '30%',
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center'
        }}>
          <Title level={2} style={{ margin: 0 }}>User Management</Title>
          <Button 
            type="primary" 
            onClick={handleRefresh}
            loading={isRefreshing}
            icon={<SyncOutlined />}
          >
            Refresh
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={users}
          rowKey="userID"
          loading={isLoading || isRefreshing}
          bordered
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `Total ${total} users`
          }}
          scroll={{ x: true }}
          style={{ background: 'white' }}
          locale={{
            emptyText: 'No users found'
          }}
        />
      </Space>
    </div>
  );
};

export default AdminDashboard;