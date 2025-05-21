import { Subject } from "../../../../interfaces/subject";
import { List, Typography, Empty } from "antd";
import { BookOutlined } from "@ant-design/icons"; // Importamos un icono genérico

export default function TabSubject({ subjects }: { subjects: Subject[] }) {
  if (subjects.length === 0) {
    return (
      <div style={{ padding: "20px 0" }}>
        <Empty description="Sin materias asignadas" />
      </div>
    );
  }

  return (
    <List
      itemLayout="horizontal"
      dataSource={subjects}
      renderItem={(subject) => (
        <List.Item
          style={{
            padding: "15px 10px",
            borderBottom: "1px solid #f0f0f0",
            transition: "background-color 0.3s",
          }}>
          <List.Item.Meta
            avatar={<BookOutlined style={{ fontSize: "20px", color: "#1890ff" }} />}
            title={
              <Typography.Text style={{ fontSize: "16px", fontWeight: 500 }}>
                {subject.subject}
              </Typography.Text>
            }
          />
        </List.Item>
      )}
      style={{ backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}
    />
  );
}

