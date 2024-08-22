import React, {useRef, useState } from 'react';
import { SearchOutlined, DeleteOutlined, EditOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { InputRef, TableColumnsType, TableColumnType } from 'antd';
import { Button, Input, Space, Table, Tag } from 'antd';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import Highlighter from 'react-highlight-words';
import { Subject } from '../../../interfaces/subject';



type DataIndex = keyof Subject;

const TablePensum: React.FC<{ subjects: Subject[] | null | undefined }> = ({ subjects }) => {
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
  const searchInput = useRef<InputRef>(null);

  const handleSearch = (
    selectedKeys: string[],
    confirm: FilterDropdownProps['confirm'],
    dataIndex: DataIndex,
  ) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters: () => void) => {
    clearFilters();
    setSearchText('');
  };
 

  const getColumnSearchProps = (dataIndex: DataIndex): TableColumnType<Subject> => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`Buscar en ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Buscar
          </Button>
          <Button
            onClick={() => clearFilters && handleReset(clearFilters)}
            size="small"
            style={{ width: 90 }}
          >
            Reiniciar
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              confirm({ closeDropdown: false });
              setSearchText((selectedKeys as string[])[0]);
              setSearchedColumn(dataIndex);
            }}
          >
            Filtrar
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              close();
            }}
          >
            Cerrar
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
    ),
    onFilter: (value, record) =>
      record[dataIndex]
        .toString()
        .toLowerCase()
        .includes((value as string).toLowerCase()),
    onFilterDropdownOpenChange: (visible) => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
    },
    render: (text) =>
      searchedColumn === dataIndex ? (
        <Highlighter
          highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
          searchWords={[searchText]}
          autoEscape
          textToHighlight={text ? text.toString() : ''}
        />
      ) : (
        text
      ),
  });

  const getRowStyle = (value: string | null | undefined): React.CSSProperties => {
    const error = value === null || value === undefined;
    return {
      textAlign: error ? 'center' : 'left',
    }
  }
  const getRowContent = (value: string | null | undefined | React.ReactNode[]): React.ReactNode | string => {
    return value ?? <Tag icon={<CloseCircleOutlined />} color="error">Vacío</Tag>
  }
  
  const onDelete = (record: Subject) => {
    console.log(record)
  }
  const onEdit = (record: Subject) => {
    console.log(record)
  }

  const columns: TableColumnsType<Subject> = [
    {
      title: 'Programa',
      dataIndex: 'pnf',
      key: 'pnf',
      width: '20%',
      align: 'center',
      ...getColumnSearchProps('pnf', ),
      onFilter: (value, record) => {
        const pnfValue = typeof record.pnf === 'string' ? record.pnf : '';
        return pnfValue.toLowerCase().includes((String(value) || '').toLowerCase());
      },
      sorter: (a, b) =>  a?.subject?.localeCompare(b?.subject),
      sortDirections: ['descend', 'ascend'],
      render: (value) => {
        return <div style={getRowStyle(value)}>{getRowContent(value)}</div>;
      }
    },
    {
      title: 'Materia',
      dataIndex: 'subject',
      key: 'subject',
      width: '30%',
      align: 'center',
      ...getColumnSearchProps('subject'),
      onFilter: (value, record) => {
        const subjectValue = typeof record.subject === 'string' ? record.subject : '';
        return subjectValue.toLowerCase().includes((String(value) || '').toLowerCase());
      },
      sorter: (a, b) => a?.subject?.localeCompare(b?.subject),
      sortDirections: ['descend', 'ascend'],
      render: (value) => {
        return <div style={getRowStyle(value)}>{getRowContent(value)}</div>;
      }
    },
    {
      title: 'Horas',
      dataIndex: 'hours',
      width: '5%',
      key: 'hours',
      align: 'center',
      ...getColumnSearchProps('hours'),
      onFilter: (value, record) => {
        const hoursValue = typeof record.hours === 'number' ? record.hours : '';
        return hoursValue.toString().includes((String(value) || ''));
      },
      sorter: (a, b) => a.hours - b.hours,
      sortDirections: ['descend', 'ascend'],
      render: (value) => {
        return <div >{getRowContent(value)}</div>;
      }

    },
    {
      title: 'Trimestre',
      dataIndex: 'quarter',
      width: '10%',
      align: 'center',
      key: 'quarter',
      render: (value) => {
        const data: React.ReactNode[] = value?.map((val: number) => <Tag color="blue" key={val}>{`${val}`}</Tag>)
        return <div>{getRowContent(data)}</div>;
      }

    },
    {
      title: 'Acciones',
      dataIndex: 'seccion',
      width: '2%',
      key: 'seccion',
      align: 'center',
      render: (_value, record) => {
        return <div style={{ display: 'flex', justifyContent: 'space-evenly' }}>
          <Button type='link' danger shape="circle" icon={<DeleteOutlined />} onClick={() => onDelete(record)} />
          <Button type='link' shape="circle" icon={<EditOutlined />} onClick={() => onEdit(record)} />
        </div>;
      }
    },
  ];


  return <Table pagination={{
    position: ["topLeft", "none"], defaultCurrent: 1, showSizeChanger: true }} rowKey="pensum_id" columns={columns} dataSource={subjects ?? []} />;
};

export default TablePensum;