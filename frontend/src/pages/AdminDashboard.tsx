// src/pages/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Button, Table, message } from 'antd';

interface User {
  userID: string;
  role: string;
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch('http://localhost:3000/admin/users', {
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
    try {
      const token = await getAccessTokenSilently();
      await fetch(`http://localhost:3000/admin/deactivate/${userId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      message.success('User deactivated successfully');
      fetchUsers(); // Refresh the list
    } catch (error) {
      message.error('Failed to deactivate user');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const columns = [
    {
      title: 'User ID',
      dataIndex: 'userID',
      key: 'userID',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: User) => (
        <Button
          danger
          onClick={() => deactivateUser(record.userID)}
          disabled={record.role === 'inactive'}
        >
          Deactivate
        </Button>
      ),
    },
  ];

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Admin Dashboard</h1>
      <Table
        columns={columns}
        dataSource={users}
        rowKey="userID"
        loading={loading}
      />
    </main>
  );
};

export default AdminDashboard;