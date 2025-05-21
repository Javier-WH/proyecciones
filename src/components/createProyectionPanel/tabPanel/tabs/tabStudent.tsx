import { List, Typography, Empty, Tabs } from "antd";
import { StarOutlined, DisconnectOutlined } from "@ant-design/icons";
import { Student, StudentList } from "../tabPanel";

export default function TabStudent({ students }: { students: StudentList | null }) {
  const listStudent = (students: Student[], type: 1 | 2) => {
    if (students.length === 0) {
      return (
        <div style={{ padding: "20px 0" }}>
          <Empty description="No se encontraron estudiantes" />
        </div>
      );
    }

    return (
      <List
        itemLayout="horizontal"
        dataSource={students}
        renderItem={(student) => (
          <List.Item
            style={{
              padding: "15px 10px",
              borderBottom: "1px solid #f0f0f0",
              transition: "background-color 0.3s",
            }}>
            <List.Item.Meta
              avatar={
                type === 1 ? (
                  <StarOutlined style={{ fontSize: "20px", color: "#1890ff" }} />
                ) : (
                  <DisconnectOutlined style={{ fontSize: "20px", color: "red" }} />
                )
              }
              title={
                <Typography.Text style={{ fontSize: "16px", fontWeight: 500 }}>
                  {`${student.last_name} ${student.name} C.I. ${student.ci}`.toLocaleUpperCase()}
                </Typography.Text>
              }
            />
          </List.Item>
        )}
        style={{ backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}
      />
    );
  };

  return (
    <Tabs
      defaultActiveKey="1"
      items={[
        {
          label: "Aprobados",
          key: "1",
          children: listStudent(students?.pass || [], 1),
        },
        {
          label: "Reprobados",
          key: "2",
          children: listStudent(students?.fail || [], 2),
        },
      ]}
    />
  );
}

