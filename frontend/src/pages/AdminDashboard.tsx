// src/pages/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Button, Table, message, Tag } from 'antd';

interface User {
  userID: string;
  role: string;
}

// Set default to localhost if env variable not set
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentlyDeactivating, setCurrentlyDeactivating] = useState<string | null>(null);
  const { getAccessTokenSilently } = useAuth0();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      message.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const deactivateUser = async (userId: string) => {
    setCurrentlyDeactivating(userId);
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(`${API_BASE_URL}/admin/deactivate/${userId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Deactivation failed');
      
      message.success({
        content: `User ${userId} has been deactivated!`,
        duration: 3,
        style: {
          marginTop: '50vh',
          fontSize: '16px',
        },
      });
      
      fetchUsers();
    } catch (error) {
      message.error({
        content: `Failed to deactivate user ${userId}`,
        duration: 3,
      });
    } finally {
      setCurrentlyDeactivating(null);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getRowClassName = (record: User) => {
    return record.role === 'inactive' ? 'inactive-row' : '';
  };

  const columns = [
    {
      title: 'User ID',
      dataIndex: 'userID',
      key: 'userID',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: User) => (
        <Tag color={record.role === 'inactive' ? 'red' : 'green'}>
          {record.role === 'inactive' ? 'INACTIVE' : 'ACTIVE'}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: User) => (
        <Button
          danger
          onClick={() => deactivateUser(record.userID)}
          disabled={record.role === 'inactive'}
          loading={currentlyDeactivating === record.userID}
        >
          {currentlyDeactivating === record.userID ? 'Deactivating...' : 'Deactivate'}
        </Button>
      ),
    },
  ];

  return (
    <main style={{ padding: '2rem' }}>
      <style>
        {`
          .inactive-row {
            background-color: #fff1f0;
          }
          .inactive-row:hover > td {
            background-color: #ffccc7 !important;
          }
        `}
      </style>
      
      <h1>Admin Dashboard</h1>
      <Table
        columns={columns}
        dataSource={users}
        rowKey="userID"
        loading={loading}
        rowClassName={getRowClassName}
      />
    </main>
  );
};

export default AdminDashboard;