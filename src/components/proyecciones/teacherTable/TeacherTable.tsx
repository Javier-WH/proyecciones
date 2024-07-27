import React, { useRef, useContext} from 'react';
import { SearchOutlined } from '@ant-design/icons';
import type { InputRef, TableColumnsType, TableColumnType } from 'antd';
import { Button, Input, Space, Table } from 'antd';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import { MainContext } from '../../../context/mainContext';
import { Teacher } from '../../../interfaces/teacher';
import "./teacherTable.css"



type DataIndex = keyof Teacher;



const TeacherTable: React.FC = () => {

  const searchInput = useRef<InputRef>(null);
  const context = useContext(MainContext);
  if (!context) {
    return <div>Loading...</div>;
  }
  const { teachers, setSelectedTeacherById } = context;
  const data: Teacher[] | null = teachers;
  const handleSearch = (
    confirm: FilterDropdownProps['confirm'],

  ) => {
    confirm();
  };

  const handleReset = (clearFilters: () => void) => {
    clearFilters();

  };

  const getColumnSearchProps = (dataIndex: DataIndex): TableColumnType<Teacher> => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSearch( confirm)}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => handleSearch(confirm)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
          <Button
            onClick={() => clearFilters && handleReset(clearFilters)}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              confirm({ closeDropdown: false });
    
            }}
          >
            Filter
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              close();
            }}
          >
            close
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
    ),
    onFilter: (value, record) =>
      record.id
        .toString()
        .toLowerCase()
        .includes((value as string).toLowerCase()),
    onFilterDropdownOpenChange: (visible) => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
    },
    render: (text) =>
      text
  });

  const columns: TableColumnsType<Teacher> = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      width: '20%',
      ...getColumnSearchProps('name'),
      sorter: (a, b) => a.name.length - b.name.length,
      sortDirections: ['descend', 'ascend'],
    },
    {
      title: 'Apellido',
      dataIndex: 'lastName',
      key: 'lastName',
      width: '20%',
      ...getColumnSearchProps('lastName'),
      sorter: (a, b) => a.lastName.length - b.lastName.length,
      sortDirections: ['descend', 'ascend'],
    },
    {
      title: 'Cédula',
      dataIndex: 'ci',
      key: 'ci',
      width: '10%',
      ...getColumnSearchProps('ci'),
      sorter: (a, b) => Number.parseInt(a.ci) - Number.parseInt(b.ci),
      sortDirections: ['descend', 'ascend'],
    },
    {
      title: 'Tipo de contrato',
      dataIndex: 'title',
      key: 'title',
      width: '10%',
      ...getColumnSearchProps('ci'),
      sorter: (a, b) => a.ci.length - b.ci.length,
      sortDirections: ['descend', 'ascend'],
    },
    {
      title: 'Horas disponibles',
      dataIndex: 'partTime',
      key: 'partTime',
      width: '3%',
      ...getColumnSearchProps('partTime'),
      sorter: (a, b) => a.partTime - b.partTime,
      sortDirections: ['descend', 'ascend'],
    }
  ];

  const onRow = (record: Teacher) => {
    return {
      onClick: () => { setSelectedTeacherById(Number.parseInt(record.id) - 1) },
    };
  }

  return <Table pagination={{ position: ["topLeft", "none"] }} columns={columns} dataSource={data ?? []} rowKey="id" onRow={onRow} style={{ height: "100%" }} />;
};

export default TeacherTable;